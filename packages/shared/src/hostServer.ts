import { createRoom, reduce, viewFor, GameState, GameAction } from './engine';
import { Settings, StateSync } from './types';
import { ClientMsgSchema, ClientMsg, ServerWelcome, ServerPong, ServerError, ServerProbeOk } from './protocol';
import { NdjsonFramer } from './ndjson';

export const MAX_LINE_BYTES = 8192; // 8 KB max line per spec
export const MAX_MSG_PER_SEC = 20;  // 20 msgs/s rate limit per spec
export const AWAY_TIMEOUT_MS = 15000; // Away if silent for 15 s per spec

export interface SocketLike {
  write(data: string): boolean | void;
  destroy(): void;
  end?(data?: string | any): void;
  on(event: 'data', listener: (data: string | Uint8Array | any) => void): this;
  on(event: 'close', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  remoteAddress?: string;
  remotePort?: number;
}

export interface ServerLike {
  listen(options: { port: number; host?: string }, callback?: () => void): this;
  close(callback?: (err?: Error) => void): this;
  on(event: 'connection', listener: (socket: SocketLike) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
}

export type CreateServerFactory = (connectionListener: (socket: SocketLike) => void) => ServerLike;

export function createLocalSocketPair(): [SocketLike, SocketLike] {
  type Listener = (...args: any[]) => void;

  class LocalSocket implements SocketLike {
    private peer: LocalSocket | null = null;
    private listeners = new Map<string, Listener[]>();
    public remoteAddress = '127.0.0.1';
    public remotePort = 47777;

    setPeer(peer: LocalSocket) {
      this.peer = peer;
    }

    on(event: string, listener: Listener): this {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(listener);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const list = this.listeners.get(event);
      if (list) {
        for (const fn of [...list]) {
          try {
            fn(...args);
          } catch {}
        }
      }
    }

    write(data: string): boolean {
      if (this.peer) {
        const peer = this.peer;
        Promise.resolve().then(() => {
          peer.emit('data', data);
        });
        return true;
      }
      return false;
    }

    destroy(): void {
      if (this.peer) {
        const peer = this.peer;
        this.peer = null;
        peer.peer = null;
        Promise.resolve().then(() => {
          peer.emit('close');
          this.emit('close');
        });
      }
    }
  }

  const serverSide = new LocalSocket();
  const clientSide = new LocalSocket();
  serverSide.setPeer(clientSide);
  clientSide.setPeer(serverSide);

  return [serverSide, clientSide];
}

export interface HostServerOptions {
  roomCode: string;
  hostId: string;
  port?: number;
  settings?: Partial<Settings>;
  createServer: CreateServerFactory;
  onLog?: (msg: string) => void;
  rng?: () => number;
}

/**
 * HostServer
 * Authoritative host coordinator for phone-hosted LAN mode:
 * - Pure TypeScript with injected createServer factory (runs on Node net or react-native-tcp-socket)
 * - Wraps deterministic engine reducer
 * - Enforces hostId checks, 20 msg/s rate limit, 8 KB max line
 * - Sequences updates (monotonic seq), cmdId deduplication, hello/resume
 * - Heartbeat tracking with Away status after 15 s of silence
 */
export class HostServer {
  private state: GameState;
  private server: ServerLike | null = null;
  private port: number;
  private createServerFactory: CreateServerFactory;
  private onLogCallback?: (msg: string) => void;
  private rng: () => number;

  private socketsByPlayerId = new Map<string, SocketLike>();
  private playerIdBySocket = new Map<SocketLike, string>();
  private resumeTokens = new Map<string, string>();
  private lastActivity = new Map<string, number>();
  private rateLimitBuckets = new Map<SocketLike, { count: number; resetAt: number }>();
  private probeCount = 0;
  private probeResetAt = 0;
  private awayCheckTimer: any = null;
  private initialPlayerJoined = false;

  constructor(options: HostServerOptions) {
    this.port = options.port ?? 47777;
    this.createServerFactory = options.createServer;
    this.onLogCallback = options.onLog;
    this.rng = options.rng ?? Math.random;
    this.state = createRoom(options.roomCode, options.hostId, options.settings);
  }

  /**
   * Connects a local in-process client socket directly to the HostServer.
   * Completely bypasses TCP loopback to avoid loopback drops on mobile devices.
   */
  /**
   * Returns the hostId that the server was created with,
   * so LocalTransport can send `hello` with the correct identity.
   */
  public getHostId(): string {
    return this.state.hostId;
  }

  public connectLocalClient(): SocketLike {
    const [serverSocket, clientSocket] = createLocalSocketPair();
    this.handleNewConnection(serverSocket);
    return clientSocket;
  }

  private log(message: string): void {
    if (this.onLogCallback) {
      this.onLogCallback(`[HostServer] ${message}`);
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getConnectedPlayerCount(): number {
    return this.socketsByPlayerId.size;
  }

  private async bindServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let settled = false;

        const timeoutId = setTimeout(() => {
          if (!settled) {
            settled = true;
            try {
              this.server?.close();
            } catch {}
            this.server = null;
            reject(new Error(`Host server timed out binding to port ${this.port}`));
          }
        }, 5000);

        this.server = this.createServerFactory((socket: SocketLike) => {
          this.handleNewConnection(socket);
        });

        this.server.on('error', (err: Error) => {
          this.log(`Server error: ${err.message}`);
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            try {
              this.server?.close();
            } catch {}
            this.server = null;
            reject(err);
          }
        });

        this.server.listen({ port: this.port, host: '0.0.0.0', reuseAddress: true } as any, () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            this.log(`Listening on 0.0.0.0:${this.port} (Room: ${this.state.room})`);
            this.startAwayCheck();
            resolve();
          }
        });
      } catch (err) {
        try {
          this.server?.close();
        } catch {}
        this.server = null;
        reject(err);
      }
    });
  }

  public async start(maxRetries = 4, retryDelayMs = 400): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.bindServer();
        return;
      } catch (err: any) {
        const isAddrInUse =
          err?.message?.includes('EADDRINUSE') ||
          err?.code === 'EADDRINUSE' ||
          err?.message?.includes('already in use');

        if (isAddrInUse && attempt < maxRetries) {
          this.log(
            `Port ${this.port} busy (attempt ${attempt}/${maxRetries}), retrying in ${retryDelayMs}ms...`
          );
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        throw err;
      }
    }
  }

  public closeRoom(message = 'The host has closed the room.'): void {
    const roomClosedMsg: ServerError = {
      v: 1,
      t: 'error',
      code: 'ROOM_CLOSED',
      message,
    };
    for (const socket of this.playerIdBySocket.keys()) {
      try {
        this.sendToSocket(socket, roomClosedMsg);
      } catch {}
    }
  }

  public async stop(): Promise<void> {
    if (this.awayCheckTimer) {
      clearInterval(this.awayCheckTimer);
      this.awayCheckTimer = null;
    }

    // Inform clients that room was closed before destroying sockets
    this.closeRoom();

    // Close all connected sockets
    for (const socket of [...this.playerIdBySocket.keys()]) {
      try {
        socket.destroy();
      } catch {}
    }
    this.socketsByPlayerId.clear();
    this.playerIdBySocket.clear();
    this.rateLimitBuckets.clear();

    if (this.server) {
      const s = this.server;
      this.server = null;
      await new Promise<void>((resolve) => {
        let finished = false;
        const done = () => {
          if (!finished) {
            finished = true;
            this.log('Server stopped.');
            resolve();
          }
        };
        try {
          s.close(done);
        } catch {
          done();
        }
        setTimeout(done, 1000);
      });
    }
  }

  public handleNewConnection(socket: SocketLike): void {
    const framer = new NdjsonFramer();

    socket.on('data', (rawChunk: any) => {
      const chunk = typeof rawChunk === 'string' ? rawChunk : rawChunk.toString('utf8');
      const lines = framer.push(chunk);

      for (const line of lines) {
        // Enforce 8 KB max line size
        if (line.length > MAX_LINE_BYTES) {
          this.log('Line exceeds 8 KB limit. Dropping message.');
          this.sendToSocket(socket, {
            v: 1,
            t: 'error',
            code: 'MESSAGE_TOO_LARGE',
            message: 'Line exceeds 8 KB limit',
          });
          continue;
        }

        // Enforce 20 msg/sec rate limit
        if (!this.checkRateLimit(socket)) {
          this.log('Rate limit exceeded (max 20 msg/s). Dropping message.');
          this.sendToSocket(socket, {
            v: 1,
            t: 'error',
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded (max 20 msg/s)',
          });
          continue;
        }

        this.handleMessage(socket, line);
      }
    });

    socket.on('close', () => {
      this.handleSocketClose(socket);
    });

    socket.on('error', (err: Error) => {
      this.log(`Socket error: ${err.message}`);
    });
  }

  private checkRateLimit(socket: SocketLike): boolean {
    const now = Date.now();
    let bucket = this.rateLimitBuckets.get(socket);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 1, resetAt: now + 1000 };
      this.rateLimitBuckets.set(socket, bucket);
      return true;
    }

    bucket.count++;
    return bucket.count <= MAX_MSG_PER_SEC;
  }

  private handleSocketClose(socket: SocketLike): void {
    const playerId = this.playerIdBySocket.get(socket);
    if (playerId) {
      this.log(`Player socket closed: ${playerId}`);
      this.playerIdBySocket.delete(socket);
      this.socketsByPlayerId.delete(playerId);
      this.rateLimitBuckets.delete(socket);

      // On socket drop, mark player not present (allows reconnect with resume token)
      this.dispatch({ type: 'SET_PRESENT', playerId, present: false });
    }
  }

  private handleMessage(socket: SocketLike, rawLine: string): void {
    let parsed: any;
    try {
      parsed = JSON.parse(rawLine);
    } catch {
      this.sendToSocket(socket, {
        v: 1,
        t: 'error',
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload',
      });
      return;
    }

    const validation = ClientMsgSchema.safeParse(parsed);
    if (!validation.success) {
      this.sendToSocket(socket, {
        v: 1,
        t: 'error',
        code: 'INVALID_PROTOCOL',
        message: validation.error.message,
      });
      return;
    }

    const msg: ClientMsg = validation.data;
    const socketPlayerId = this.playerIdBySocket.get(socket);

    if (socketPlayerId) {
      this.lastActivity.set(socketPlayerId, Date.now());
    }

    switch (msg.t) {
      case 'hello':
        this.handleHello(socket, msg);
        break;

      case 'ping':
        this.handlePing(socket, msg);
        break;

      case 'resync':
        this.handleResync(socket);
        break;

      case 'leave':
        this.handleLeave(socket);
        break;

      case 'submit_vote':
        this.handleSubmitVote(socket, msg);
        break;

      case 'probe':
        this.handleProbe(socket);
        break;

      // Host-only commands
      case 'set_settings':
      case 'start_game':
      case 'deal':
      case 'open_vote':
      case 'next_round':
      case 'kick':
      case 'transfer_host':
      case 'play_again':
        this.handleHostCommand(socket, msg);
        break;
    }
  }

  private handleProbe(socket: SocketLike): void {
    const now = Date.now();
    if (now >= this.probeResetAt) {
      this.probeCount = 0;
      this.probeResetAt = now + 1000;
    }

    if (this.probeCount >= 60) {
      this.log('Probe rate limit exceeded (max 60/s). Closing socket.');
      try {
        socket.destroy();
      } catch {}
      return;
    }

    this.probeCount++;

    const srcIp = socket.remoteAddress || 'unknown';
    const srcPort = socket.remotePort ? `:${socket.remotePort}` : '';
    this.log(`Probe received from ${srcIp}${srcPort} at ${new Date().toISOString()}`);

    const hostPlayer = this.state.players[this.state.hostId];
    const hostName = hostPlayer ? hostPlayer.name : 'Host';
    const hostAvatar = hostPlayer ? hostPlayer.avatar : 'fox';
    const playerCount = this.state.playerOrder.length;
    const joinable = this.state.phase === 'LOBBY' && playerCount < 10;

    const probeOk: ServerProbeOk = {
      v: 1,
      t: 'probe_ok',
      app: 'imposter',
      room: this.state.room,
      hostName,
      hostAvatar,
      players: playerCount,
      max: 10,
      phase: this.state.phase,
      joinable,
    };

    this.sendToSocket(socket, probeOk);

    // Give 500 ms deadline for probe socket teardown, but initiate close immediately
    const deadlineTimer = setTimeout(() => {
      try {
        socket.destroy();
      } catch {}
    }, 500);

    const cleanup = () => {
      clearTimeout(deadlineTimer);
    };
    socket.on('close', cleanup);

    if (typeof socket.end === 'function') {
      try {
        socket.end();
      } catch {
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  }

  private handleHello(socket: SocketLike, msg: Extract<ClientMsg, { t: 'hello' }>): void {
    if (msg.room === 'SCAN' || msg.room === 'DISCOVER') {
      this.sendToSocket(socket, {
        v: 1,
        t: 'error',
        code: 'ROOM_DISCOVERED',
        message: `Room: ${this.state.room}`,
      });
      return;
    }

    if (msg.room !== this.state.room) {
      this.sendToSocket(socket, {
        v: 1,
        t: 'error',
        code: 'ROOM_NOT_FOUND',
        message: `Room code mismatch (expected ${this.state.room})`,
      });
      return;
    }

    // Reconnect case: playerId + resume token provided
    if (msg.playerId && msg.resume) {
      const storedToken = this.resumeTokens.get(msg.playerId);
      const playerExists = this.state.players[msg.playerId];

      if (storedToken && storedToken === msg.resume && playerExists) {
        this.log(`Player reconnected: ${msg.playerId} (${msg.name})`);
        this.socketsByPlayerId.set(msg.playerId, socket);
        this.playerIdBySocket.set(socket, msg.playerId);
        this.lastActivity.set(msg.playerId, Date.now());

        // Send welcome
        const welcome: ServerWelcome = {
          v: 1,
          t: 'welcome',
          playerId: msg.playerId,
          resume: msg.resume,
          hostId: this.state.hostId,
          room: this.state.room,
        };
        this.sendToSocket(socket, welcome);

        // Mark player Present and broadcast state
        this.dispatch({ type: 'SET_PRESENT', playerId: msg.playerId, present: true });
        return;
      } else if (this.state.phase === 'LOBBY') {
        // Stale session credentials presented to a fresh lobby: welcome as new player
        this.log(`Stale resume credentials for ${msg.name} in lobby. Registering as new player.`);
      } else {
        this.sendToSocket(socket, {
          v: 1,
          t: 'error',
          code: 'INVALID_RESUME',
          message: 'Session cannot be resumed with provided credentials',
        });
        return;
      }
    }

    // New player join case
    if (this.state.phase !== 'LOBBY') {
      this.sendToSocket(socket, {
        v: 1,
        t: 'error',
        code: 'GAME_ALREADY_STARTED',
        message: 'Cannot join game in progress. Reconnect only.',
      });
      return;
    }

    const playerId = msg.playerId || `p-${Math.floor(this.rng() * 9000 + 1000)}`;
    const resumeToken = `tok-${Math.floor(this.rng() * 1000000)}`;

    this.socketsByPlayerId.set(playerId, socket);
    this.playerIdBySocket.set(socket, playerId);
    this.resumeTokens.set(playerId, resumeToken);
    this.lastActivity.set(playerId, Date.now());

    this.log(`New player joined: ${playerId} (${msg.name})`);

    // The server was initialized with an authoritative hostId.
    // Do NOT assign the first connecting player as host if their ID doesn't match.
    const prevHostId = this.state.hostId;
    if (this.initialPlayerJoined && this.state.hostId !== prevHostId) {
      this.log(`[WARN] state.hostId reassigned after initial player join: ${prevHostId} -> ${this.state.hostId}`);
    }
    this.initialPlayerJoined = true;

    const welcome: ServerWelcome = {
      v: 1,
      t: 'welcome',
      playerId,
      resume: resumeToken,
      hostId: this.state.hostId,
      room: this.state.room,
    };
    this.sendToSocket(socket, welcome);

    this.dispatch({
      type: 'JOIN',
      player: {
        id: playerId,
        name: msg.name,
        avatar: msg.avatar,
      },
    });
  }

  private handlePing(socket: SocketLike, msg: Extract<ClientMsg, { t: 'ping' }>): void {
    const pong: ServerPong = {
      v: 1,
      t: 'pong',
      id: msg.id,
      ts: msg.ts,
    };
    this.sendToSocket(socket, pong);
  }

  private handleResync(socket: SocketLike): void {
    const playerId = this.playerIdBySocket.get(socket);
    if (!playerId) return;

    const privateView = viewFor(this.state, playerId);
    const stateSync: StateSync = privateView;
    this.sendToSocket(socket, {
      v: 1,
      t: 'state_sync',
      ...stateSync,
    });
  }

  private handleLeave(socket: SocketLike): void {
    const playerId = this.playerIdBySocket.get(socket);
    if (!playerId) return;

    this.log(`Player requested leave: ${playerId}`);
    this.socketsByPlayerId.delete(playerId);
    this.playerIdBySocket.delete(socket);
    this.dispatch({ type: 'LEAVE', playerId });
    socket.destroy();
  }

  private handleSubmitVote(
    socket: SocketLike,
    msg: Extract<ClientMsg, { t: 'submit_vote' }>
  ): void {
    const playerId = this.playerIdBySocket.get(socket);
    if (!playerId) return;

    this.dispatch({
      type: 'SUBMIT_VOTE',
      playerId,
      targetId: msg.targetId,
      voteIndex: msg.voteIndex,
      cmdId: msg.cmdId,
    });
  }

  private handleHostCommand(socket: SocketLike, msg: ClientMsg): void {
    const playerId = this.playerIdBySocket.get(socket);

    // Enforce host-only permissions
    if (playerId !== this.state.hostId) {
      this.log(`Unauthorized host command attempt by ${playerId}`);
      this.sendToSocket(socket, {
        v: 1,
        t: 'error',
        code: 'UNAUTHORIZED',
        message: 'Only the host can perform this action',
      });
      return;
    }

    switch (msg.t) {
      case 'set_settings':
        this.dispatch({ type: 'SET_SETTINGS', settings: msg.settings });
        break;
      case 'start_game': {
        const presentCount = this.state.playerOrder.filter((id) => this.state.players[id]?.present).length;
        if (presentCount < 3) {
          this.sendToSocket(socket, {
            v: 1,
            t: 'error',
            code: 'NOT_ENOUGH_PLAYERS',
            message: `Waiting for players. At least 3 players are required to start (currently ${presentCount}).`,
          });
          return;
        }
        this.dispatch({ type: 'START_GAME' });
        if (this.state.phase === 'DEALING') {
          this.dispatch({ type: 'DEAL' });
        }
        break;
      }
      case 'deal':
        if (this.state.phase === 'DEALING' || this.state.phase === 'SCORES') {
          this.dispatch({ type: 'DEAL' });
        }
        break;
      case 'open_vote':
        this.dispatch({ type: 'OPEN_VOTE' });
        break;
      case 'next_round':
        this.dispatch({ type: 'NEXT_ROUND' });
        if (this.state.phase === 'DEALING') {
          this.dispatch({ type: 'DEAL' });
        }
        break;
      case 'kick': {
        const kickedSocket = this.socketsByPlayerId.get(msg.playerId);
        if (kickedSocket) {
          this.sendToSocket(kickedSocket, {
            v: 1,
            t: 'error',
            code: 'KICKED',
            message: 'You have been kicked by the host',
          });
          kickedSocket.destroy();
        }
        this.dispatch({ type: 'KICK', playerId: msg.playerId });
        break;
      }
      case 'transfer_host':
        this.dispatch({ type: 'TRANSFER_HOST', playerId: msg.playerId });
        break;
      case 'play_again':
        this.dispatch({ type: 'PLAY_AGAIN' });
        break;
    }
  }

  public dispatch(action: GameAction): void {
    const prevHostId = this.state.hostId;
    const result = reduce(this.state, action, this.rng);
    this.state = result.state;
    if (this.initialPlayerJoined && this.state.hostId !== prevHostId) {
      this.log(`[WARN] state.hostId reassigned after initial player join: ${prevHostId} -> ${this.state.hostId} (action: ${action.type})`);
    }

    // Broadcast private view to each connected player
    this.broadcastState();
  }

  private broadcastState(): void {
    for (const [playerId, socket] of this.socketsByPlayerId.entries()) {
      const privateView = viewFor(this.state, playerId);
      this.sendToSocket(socket, {
        v: 1,
        t: 'state_sync',
        ...privateView,
      });
    }

    // Broadcast vote progress during VOTING
    if (this.state.phase === 'VOTING') {
      const eligibleCount = this.state.playerOrder.filter(
        (id) => this.state.players[id]?.present && !this.state.players[id]?.ghost
      ).length;
      const submittedCount = Object.keys(this.state.currentVotes).length;
      const progressMsg = {
        v: 1,
        t: 'vote_progress',
        submitted: submittedCount,
        total: eligibleCount,
      };
      for (const socket of this.socketsByPlayerId.values()) {
        this.sendToSocket(socket, progressMsg);
      }
    }

    // Broadcast vote result during REVEAL
    if (this.state.phase === 'REVEAL' && this.state.lastVoteResult) {
      const voteResultMsg = {
        v: 1,
        t: 'vote_result',
        ...this.state.lastVoteResult,
      };
      for (const socket of this.socketsByPlayerId.values()) {
        this.sendToSocket(socket, voteResultMsg);
      }
    }

    // Broadcast game over during GAME_OVER
    if (this.state.phase === 'GAME_OVER') {
      const gameOverMsg = {
        v: 1,
        t: 'game_over',
        finalScores: this.state.scores,
        awards: this.state.awards || [],
      };
      for (const socket of this.socketsByPlayerId.values()) {
        this.sendToSocket(socket, gameOverMsg);
      }
    }
  }

  private sendToSocket(socket: SocketLike, payload: any): void {
    try {
      socket.write(NdjsonFramer.serialize(payload));
    } catch (err: any) {
      this.log(`Error writing to socket: ${err.message}`);
    }
  }

  private startAwayCheck(): void {
    this.awayCheckTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [playerId, player] of Object.entries(this.state.players)) {
        if (player.present) {
          const last = this.lastActivity.get(playerId) || 0;
          if (now - last > AWAY_TIMEOUT_MS) {
            this.log(`Player ${playerId} is Away (> 15 s silent)`);
            this.state = reduce(
              this.state,
              { type: 'SET_PRESENT', playerId, present: false },
              this.rng
            ).state;
            changed = true;
          }
        }
      }

      if (changed) {
        this.broadcastState();
      }
    }, 2000);
  }
}
