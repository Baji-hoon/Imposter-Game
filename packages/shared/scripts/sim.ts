import net from 'node:net';
import WebSocket from 'ws';
import { HostServer, CreateServerFactory, SocketLike, ServerLike } from '../src/hostServer';
import { NdjsonFramer } from '../src/ndjson';
import { ClientMsg, ServerMsg } from '../src/protocol';
import { createSniffingServerFactory } from '../src/wsAdapter';
import { getEmbeddedWebAsset } from '../src/webAssets';

// Parse command line arguments
function parseArgs(): { players: number; rounds: number } {
  const args = process.argv.slice(2);
  let players = 6;
  let rounds = 3;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--players' && args[i + 1]) {
      players = Math.max(3, Math.min(10, parseInt(args[i + 1], 10) || 6));
      i++;
    } else if (args[i] === '--rounds' && args[i + 1]) {
      rounds = Math.max(1, parseInt(args[i + 1], 10) || 3);
      i++;
    }
  }

  return { players, rounds };
}

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐶', '🐱', '🐵', '🐨', '🐸', '🐙'];

export interface SimClient {
  id: string;
  name: string;
  avatar: string;
  resumeToken: string;
  latestState: any;
  word: string | null;
  isWs?: boolean;
  onMessageCallbacks: ((msg: ServerMsg) => void)[];
  connect: (port: number, room: string, existingId?: string, resume?: string) => Promise<void>;
  send: (msg: ClientMsg) => void;
  disconnect: () => void;
}

/**
 * FakeClient: Connects via native TCP socket sending NDJSON frames.
 */
class FakeTcpClient implements SimClient {
  public id: string = '';
  public name: string;
  public avatar: string;
  public resumeToken: string = '';
  public socket: net.Socket | null = null;
  public framer = new NdjsonFramer();
  public latestState: any = null;
  public word: string | null = null;
  public isWs = false;
  public onMessageCallbacks: ((msg: ServerMsg) => void)[] = [];

  constructor(name: string, avatar: string) {
    this.name = name;
    this.avatar = avatar;
  }

  async connect(port: number, room: string, existingId?: string, resume?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
        const helloMsg: ClientMsg = {
          v: 1,
          t: 'hello',
          room,
          playerId: existingId,
          resume,
          name: this.name,
          avatar: this.avatar,
        };
        this.send(helloMsg);
      });

      this.socket.on('data', (data) => {
        const lines = this.framer.push(data.toString('utf8'));
        for (const line of lines) {
          try {
            const msg: ServerMsg = JSON.parse(line);
            if (msg.t === 'welcome') {
              this.id = msg.playerId;
              this.resumeToken = msg.resume;
              resolve();
            } else if (msg.t === 'state_sync') {
              this.latestState = msg;
              this.word = msg.me.word;
            }
            for (const cb of this.onMessageCallbacks) {
              cb(msg);
            }
          } catch {}
        }
      });

      this.socket.on('error', (err) => {
        reject(err);
      });
    });
  }

  send(msg: ClientMsg): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(NdjsonFramer.serialize(msg));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}

/**
 * FakeWsClient: Connects via standard WebSocket simulating an iPhone Safari browser player.
 */
class FakeWsClient implements SimClient {
  public id: string = '';
  public name: string;
  public avatar: string;
  public resumeToken: string = '';
  public ws: WebSocket | null = null;
  public latestState: any = null;
  public word: string | null = null;
  public isWs = true;
  public onMessageCallbacks: ((msg: ServerMsg) => void)[] = [];

  constructor(name: string, avatar: string) {
    this.name = name;
    this.avatar = avatar;
  }

  async connect(port: number, room: string, existingId?: string, resume?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://127.0.0.1:${port}/`;
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        const helloMsg: ClientMsg = {
          v: 1,
          t: 'hello',
          room,
          playerId: existingId,
          resume,
          name: this.name,
          avatar: this.avatar,
        };
        this.send(helloMsg);
      });

      this.ws.on('message', (data) => {
        try {
          const msg: ServerMsg = JSON.parse(data.toString('utf8'));
          if (msg.t === 'welcome') {
            this.id = msg.playerId;
            this.resumeToken = msg.resume;
            resolve();
          } else if (msg.t === 'state_sync') {
            this.latestState = msg;
            this.word = msg.me.word;
          }
          for (const cb of this.onMessageCallbacks) {
            cb(msg);
          }
        } catch {}
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runSimulation() {
  const { players: playerCount, rounds: targetRounds } = parseArgs();
  const roomCode = 'SIMU';
  const port = 47888;

  console.log(`\n========================================`);
  console.log(`  Imposter LAN Multiplayer Simulator`);
  console.log(`  Players: ${playerCount} (5 Native TCP + 1 Safari WebSocket) | Rounds: ${targetRounds}`);
  console.log(`========================================\n`);

  // Adapt Node net to CreateServerFactory
  const baseCreateServerFactory: CreateServerFactory = (connectionListener) => {
    const nodeServer = net.createServer((nodeSocket) => {
      const socketAdapter: SocketLike = {
        write: (d) => nodeSocket.write(d),
        destroy: () => nodeSocket.destroy(),
        end: (d?: any) => nodeSocket.end(d),
        on: (ev: any, listener: any) => {
          nodeSocket.on(ev, listener);
          return socketAdapter;
        },
        remoteAddress: nodeSocket.remoteAddress,
        remotePort: nodeSocket.remotePort,
      };
      connectionListener(socketAdapter);
    });

    const serverAdapter: ServerLike = {
      listen: (opts, cb) => {
        nodeServer.listen(opts.port, opts.host, cb);
        return serverAdapter;
      },
      close: (cb) => {
        nodeServer.close(cb);
        return serverAdapter;
      },
      on: (ev: any, listener: any) => {
        nodeServer.on(ev, listener);
        return serverAdapter;
      },
    };

    return serverAdapter;
  };

  // Wrap base server with protocol sniffer for WebSocket + NDJSON dual support
  const createServer = createSniffingServerFactory(baseCreateServerFactory, {
    getAsset: getEmbeddedWebAsset,
    onLog: (m) => {
      // console.log(`  [Sniffer] ${m}`);
    },
  });

  const hostServer = new HostServer({
    roomCode,
    hostId: 'p-1',
    port,
    settings: {
      rounds: targetRounds as any,
      imposterCount: playerCount >= 8 ? 2 : 1,
    },
    createServer,
    onLog: (m) => {
      // console.log(`  ${m}`);
    },
  });

  await hostServer.start();
  console.log(`[Host] Server running on 127.0.0.1:${port} (Room: ${roomCode})`);

  // Connect clients: 1 host (native), (playerCount - 2) native clients, and 1 Safari WebSocket client
  const clients: SimClient[] = [];
  for (let i = 0; i < playerCount; i++) {
    const isHost = i === 0;
    const isWsClient = i === playerCount - 1;
    let client: SimClient;

    if (isWsClient) {
      client = new FakeWsClient(`iPhone Safari Player`, '📱');
      await client.connect(port, roomCode);
    } else if (isHost) {
      client = new FakeTcpClient(`Host (Player 1)`, AVATARS[0]);
      await client.connect(port, roomCode, 'p-1');
    } else {
      client = new FakeTcpClient(`Player ${i + 1}`, AVATARS[i % AVATARS.length]);
      await client.connect(port, roomCode);
    }

    clients.push(client);
    console.log(
      `  ✓ ${client.name} ${client.avatar} joined (${client.isWs ? 'WebSocket' : 'Native TCP'}) with id ${client.id}`
    );
  }

  const hostClient = clients[0];
  const wsClient = clients.find((c) => c.isWs)!;
  await sleep(100);

  console.log(`\n[Lobby] All ${playerCount} players connected. Host starting game...`);
  hostClient.send({ v: 1, t: 'start_game' });
  await sleep(200);

  // Play rounds
  for (let r = 1; r <= targetRounds; r++) {
    console.log(`\n--- ROUND ${r} OF ${targetRounds} ---`);

    // Host deals
    hostClient.send({ v: 1, t: 'deal' });
    await sleep(200);

    console.log(`[Dealing] Cards dealt secretly to all players.`);
    const hostState = hostServer.getState();
    const secret = hostState.currentSecret!;
    console.log(
      `  Secret Words -> Civilians: "${secret.civilianWord}" | Imposter(s): "${secret.imposterWord || '(BLANK)'}"`
    );
    console.log(`  Imposter IDs: ${secret.imposterIds.join(', ')}`);

    // Check private views for both TCP and WS clients
    for (const c of clients) {
      const isImp = secret.imposterIds.includes(c.id);
      if (isImp) {
        if (c.word !== secret.imposterWord) {
          throw new Error(`Privacy violation: Imposter received wrong word ${c.word}`);
        }
      } else {
        if (c.word !== secret.civilianWord) {
          throw new Error(`Privacy violation: Civilian received wrong word ${c.word}`);
        }
      }
    }
    console.log(`  ✓ Verified private cards for all players (including iPhone Safari client: "${wsClient.word}")`);

    // --- Mid-game disconnect & resume demonstration (in Round 2 with iPhone Safari WS client) ---
    if (r === 2) {
      console.log(`\n  ⚡ [Simulating Safari Backgrounding] ${wsClient.name} closes tab/screen...`);
      wsClient.disconnect();
      await sleep(150);

      // Verify host marked player not present
      const stateDuringDc = hostServer.getState();
      console.log(`  Host marked ${wsClient.name} present: ${stateDuringDc.players[wsClient.id]?.present}`);

      console.log(`  ⚡ [Simulating Safari Foregrounding] ${wsClient.name} returns to Safari & reconnects with resume token...`);
      await wsClient.connect(port, roomCode, wsClient.id, wsClient.resumeToken);
      console.log(`  ✓ ${wsClient.name} successfully resumed! Card restored: "${wsClient.word}"`);
      await sleep(150);
    }

    console.log(`\n[Talking] Circle discusses spoken clues out loud...`);
    await sleep(300);

    // Host opens vote
    console.log(`[Voting] Host opened vote.`);
    hostClient.send({ v: 1, t: 'open_vote' });
    await sleep(200);

    // Submit votes
    const currentState = hostServer.getState();
    const eligibleTargets = currentState.playerOrder.filter((id) => !currentState.players[id]?.ghost);

    for (const c of clients) {
      if (currentState.players[c.id]?.ghost) continue;

      // Pick a random target that is not self
      const validTargets = eligibleTargets.filter((t) => t !== c.id);
      const targetId = validTargets[Math.floor(Math.random() * validTargets.length)];

      c.send({
        v: 1,
        t: 'submit_vote',
        cmdId: `vote-r${r}-${c.id}`,
        voteIndex: currentState.currentVoteIndex,
        targetId,
      });
    }

    await sleep(200);

    // Check if second vote needed (for two imposters)
    const afterVoteState = hostServer.getState();
    if (afterVoteState.phase === 'VOTING') {
      console.log(`  [Vote 2 of 2] Multi-imposter round requires second vote...`);
      const eligibleTargets2 = afterVoteState.playerOrder.filter((id) => !afterVoteState.players[id]?.ghost);

      for (const c of clients) {
        if (afterVoteState.players[c.id]?.ghost) continue;
        const validTargets2 = eligibleTargets2.filter((t) => t !== c.id);
        const targetId = validTargets2[Math.floor(Math.random() * validTargets2.length)];

        c.send({
          v: 1,
          t: 'submit_vote',
          cmdId: `vote-r${r}-v2-${c.id}`,
          voteIndex: 1,
          targetId,
        });
      }
      await sleep(200);
    }

    // Reveal
    const revealState = hostServer.getState();
    console.log(`\n[Reveal] Vote results:`);
    console.log(`  Removed Player: ${revealState.lastVoteResult?.removedId || 'NONE (Tie)'}`);
    console.log(`  Tallies: ${JSON.stringify(revealState.lastVoteResult?.tallies)}`);

    // Advance to Scores
    hostClient.send({ v: 1, t: 'next_round' });
    await sleep(200);

    const scoresState = hostServer.getState();
    console.log(`[Scores] Leaderboard:`);
    for (const c of clients) {
      console.log(`  ${c.avatar} ${c.name}: ${scoresState.scores[c.id] || 0} pts`);
    }

    // Advance to next round or Game Over
    hostClient.send({ v: 1, t: 'next_round' });
    await sleep(200);
  }

  const finalState = hostServer.getState();
  console.log(`\n========================================`);
  console.log(`  GAME OVER - Final Awards`);
  console.log(`========================================`);
  for (const award of finalState.awards) {
    const player = finalState.players[award.playerId];
    console.log(`  🏆 ${award.title}: ${player?.name} (${award.desc})`);
  }

  // Cleanup
  for (const c of clients) {
    c.disconnect();
  }
  await hostServer.stop();
  console.log(`\n✓ Simulation completed successfully!\n`);
}

runSimulation().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
