import { Platform } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import {
  Transport,
  ConnectTarget,
  ConnectionStatus,
  ClientMsg,
  ServerMsg,
  NdjsonFramer,
} from '@imposter/shared';

const PING_INTERVAL_MS = 5000;
const LINK_LOST_TIMEOUT_MS = 12000;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5000;

export interface TcpTransportOptions {
  room: string;
  name: string;
  avatar: string;
  playerId?: string;
  resumeToken?: string;
  onRttUpdate?: (rtt: number) => void;
  onLog?: (msg: string) => void;
}

/**
 * TcpTransport
 * Implements the Transport interface using react-native-tcp-socket:
 * - Streaming NDJSON framing
 * - App-level 5-second ping/pong heartbeat with 12s liveness timeout
 * - Monotonic seq gap tracking triggering automatic resync
 * - Reconnection with exponential backoff + jitter (0.5 s to 5 s)
 * - Seamless resume using stored playerId and resume token
 */
export class TcpTransport implements Transport {
  private target: ConnectTarget | null = null;
  private socket: any = null;
  private status: ConnectionStatus = 'closed';
  private options: TcpTransportOptions;

  private messageCallbacks: ((msg: ServerMsg) => void)[] = [];
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];

  private pingTimer: any = null;
  private livenessTimer: any = null;
  private reconnectTimer: any = null;
  private backoffDelay = INITIAL_BACKOFF_MS;
  private pingCount = 0;
  private lastInboundTime = 0;
  private lastExpectedSeq = 0;
  private isExplicitlyClosed = false;

  constructor(options: TcpTransportOptions) {
    this.options = options;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const cb of this.statusCallbacks) {
        cb(newStatus);
      }
    }
  }

  private log(msg: string) {
    if (this.options.onLog) {
      this.options.onLog(`[TcpTransport] ${msg}`);
    }
  }

  public async connect(target: ConnectTarget): Promise<void> {
    this.target = target;
    this.isExplicitlyClosed = false;
    this.backoffDelay = INITIAL_BACKOFF_MS;
    return this.initiateConnection(true);
  }

  private initiateConnection(isInitial = false): Promise<void> {
    if (this.isExplicitlyClosed || !this.target) return Promise.resolve();

    this.setStatus(this.status === 'open' ? 'reconnecting' : 'connecting');
    this.log(`Connecting to ${this.target.host}:${this.target.port}...`);

    return new Promise((resolve, reject) => {
      let settled = false;

      const finishSuccess = () => {
        if (!settled) {
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve();
        }
      };

      const finishError = (err: any) => {
        if (!settled) {
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          if (isInitial) {
            reject(err);
          } else {
            resolve();
          }
        }
      };

      const timeoutId = isInitial
        ? setTimeout(() => {
            this.log(`Initial connection to ${this.target?.host}:${this.target?.port} timed out (5s)`);
            if (this.socket) {
              try {
                this.socket.destroy();
              } catch {}
              this.socket = null;
            }
            this.handleDisconnect();
            finishError(new Error(`Connection to ${this.target?.host}:${this.target?.port} timed out after 5s`));
          }, 5000)
        : null;

      try {
        const connOpts: any = {
          port: this.target!.port,
          host: this.target!.host,
          connectTimeout: 5000,
        };

        const socket = TcpSocket.createConnection(
          connOpts,
          () => {
            this.log('TCP socket connected. Sending hello...');
            this.socket = socket;
            this.backoffDelay = INITIAL_BACKOFF_MS;
            this.lastInboundTime = Date.now();

            // Send hello immediately on connect
            const helloMsg: ClientMsg = {
              v: 1,
              t: 'hello',
              room: this.options.room,
              playerId: this.options.playerId,
              resume: this.options.resumeToken,
              name: this.options.name,
              avatar: this.options.avatar,
            };
            this.send(helloMsg);
            this.hasConnectedOnce = true;
            this.reconnectAttempts = 0;
            this.setStatus('open');
            this.startHeartbeat();
            finishSuccess();
          }
        );

        const framer = new NdjsonFramer();

        socket.on('data', (rawChunk: any) => {
          const chunk = typeof rawChunk === 'string' ? rawChunk : rawChunk.toString('utf8');
          const lines = framer.push(chunk);

          for (const line of lines) {
            this.handleRawMessage(line);
          }
        });

        socket.on('close', () => {
          this.log('Socket closed.');
          this.handleDisconnect();
          finishError(new Error('Socket closed before handshake'));
        });

        socket.on('error', (err: any) => {
          const errMsg = String(err?.message || err || '');
          this.log(`Socket error: ${errMsg}`);
          this.handleDisconnect();
          finishError(err || new Error('Connection failed'));
        });
      } catch (err: any) {
        const errMsg = String(err?.message || err || '');
        this.log(`Failed to initiate socket connection: ${errMsg}`);
        this.handleDisconnect();
        finishError(err);
      }
    });
  }

  private handleRawMessage(line: string) {
    this.lastInboundTime = Date.now();

    try {
      const msg: ServerMsg = JSON.parse(line);

      // Save welcome credentials for future reconnects
      if (msg.t === 'welcome') {
        this.options.playerId = msg.playerId;
        this.options.resumeToken = msg.resume;
        this.log(`Welcome received. PlayerId: ${msg.playerId}`);
      }

      // Check sequence gaps in state broadcasts
      if (msg.t === 'state_sync') {
        if (this.lastExpectedSeq > 0 && msg.seq > this.lastExpectedSeq + 1) {
          this.log(`Seq gap detected: expected ${this.lastExpectedSeq + 1}, got ${msg.seq}. Requesting resync...`);
          this.send({ v: 1, t: 'resync' });
        }
        this.lastExpectedSeq = msg.seq;
      }

      // Handle pong RTT measurement
      if (msg.t === 'pong') {
        const rtt = Date.now() - msg.ts;
        if (this.options.onRttUpdate) {
          this.options.onRttUpdate(rtt);
        }
      }

      // Handle terminal error codes
      if (
        msg.t === 'error' &&
        (msg.code === 'ROOM_CLOSED' ||
          msg.code === 'KICKED' ||
          msg.code === 'ROOM_NOT_FOUND' ||
          msg.code === 'GAME_ALREADY_STARTED')
      ) {
        this.log(`Terminal error received (${msg.code}). Stopping reconnection.`);
        this.isExplicitlyClosed = true;
        this.stopHeartbeat();
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        if (this.socket) {
          try {
            this.socket.destroy();
          } catch {}
          this.socket = null;
        }
        this.setStatus('closed');
      }

      // Dispatch to listeners
      for (const cb of this.messageCallbacks) {
        cb(msg);
      }
    } catch (err: any) {
      this.log(`Malformed inbound JSON: ${err.message}`);
    }
  }

  private hasConnectedOnce = false;
  private reconnectAttempts = 0;

  private handleDisconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }

    if (this.isExplicitlyClosed || !this.hasConnectedOnce) {
      this.setStatus('closed');
      return;
    }

    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;

    this.reconnectAttempts++;
    const base = this.backoffDelay;
    const jitter = Math.floor(Math.random() * 250);
    const delay = Math.min(MAX_BACKOFF_MS, base + jitter);

    this.backoffDelay = Math.min(MAX_BACKOFF_MS, Math.floor(base * 1.5));
    this.log(`Reconnecting (attempt ${this.reconnectAttempts}) in ${(delay / 1000).toFixed(2)}s...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initiateConnection();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastInboundTime = Date.now();

    // Send ping every 4 seconds
    this.pingTimer = setInterval(() => {
      this.pingCount++;
      const ping: ClientMsg = {
        v: 1,
        t: 'ping',
        id: `c-ping-${this.pingCount}`,
        ts: Date.now(),
      };
      this.send(ping);
    }, 4000);

    // Liveness check: declare link lost if no message for 16 seconds
    this.livenessTimer = setInterval(() => {
      if (Date.now() - this.lastInboundTime > 16000) {
        this.log('Liveness timeout (> 16 s silence). Forcing reconnection...');
        this.handleDisconnect();
      }
    }, 2000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.livenessTimer) {
      clearInterval(this.livenessTimer);
      this.livenessTimer = null;
    }
  }

  public pauseHeartbeat(): void {
    this.log('Heartbeat paused.');
    this.stopHeartbeat();
  }

  public resumeHeartbeat(): void {
    this.log('Heartbeat resumed.');
    if (this.status === 'open' && this.socket) {
      // Send hello immediately on foreground (as per SPEC.md §4.3)
      const helloMsg: ClientMsg = {
        v: 1,
        t: 'hello',
        room: this.options.room,
        playerId: this.options.playerId,
        resume: this.options.resumeToken,
        name: this.options.name,
        avatar: this.options.avatar,
      };
      this.send(helloMsg);
      this.startHeartbeat();
    } else if (!this.isExplicitlyClosed) {
      this.initiateConnection();
    }
  }

  public send(msg: ClientMsg): void {
    if (!this.socket) return;
    try {
      this.socket.write(NdjsonFramer.serialize(msg));
    } catch (err: any) {
      this.log(`Socket send error: ${err.message}`);
    }
  }

  public onMessage(cb: (msg: ServerMsg) => void): void {
    this.messageCallbacks.push(cb);
  }

  public onStatus(cb: (s: ConnectionStatus) => void): void {
    this.statusCallbacks.push(cb);
    cb(this.status);
  }

  public close(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.setStatus('closed');
  }
}
