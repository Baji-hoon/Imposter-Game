import {
  Transport,
  ConnectTarget,
  ConnectionStatus,
  ClientMsg,
  ServerMsg,
  NdjsonFramer,
  SocketLike,
} from '@imposter/shared';

const PING_INTERVAL_MS = 5000;

export interface LocalTransportOptions {
  room: string;
  name: string;
  avatar: string;
  playerId?: string;
  resumeToken?: string;
  onRttUpdate?: (rtt: number) => void;
  onLog?: (msg: string) => void;
}

/**
 * LocalTransport
 * High-performance, zero-latency transport for the Host device.
 * Connects directly to the in-process HostServer via paired SocketLike objects.
 * Sends periodic pings so the host is judged by the same liveness rule as everyone else.
 */
export class LocalTransport implements Transport {
  private socket: SocketLike | null = null;
  private status: ConnectionStatus = 'closed';
  private options: LocalTransportOptions;
  private messageCallbacks: ((msg: ServerMsg) => void)[] = [];
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private pingTimer: any = null;
  private pingCount = 0;

  constructor(socket: SocketLike, options: LocalTransportOptions) {
    this.socket = socket;
    this.options = options;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      this.pingCount++;
      const ping: ClientMsg = {
        v: 1,
        t: 'ping',
        id: `local-ping-${this.pingCount}`,
        ts: Date.now(),
      };
      this.send(ping);
    }, PING_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status !== s) {
      this.status = s;
      for (const cb of this.statusCallbacks) {
        cb(s);
      }
    }
  }

  public async connect(_target?: ConnectTarget): Promise<void> {
    if (!this.socket) return;

    this.setStatus('open');
    if (this.options.onRttUpdate) {
      this.options.onRttUpdate(1); // 1ms in-process latency
    }

    const framer = new NdjsonFramer();

    this.socket.on('data', (rawChunk: any) => {
      const chunk = typeof rawChunk === 'string' ? rawChunk : rawChunk.toString('utf8');
      const lines = framer.push(chunk);

      for (const line of lines) {
        try {
          const msg: ServerMsg = JSON.parse(line);
          if (msg.t === 'welcome') {
            this.options.playerId = msg.playerId;
            this.options.resumeToken = msg.resume;
          }
          for (const cb of this.messageCallbacks) {
            cb(msg);
          }
        } catch {
          // ignore malformed
        }
      }
    });

    this.socket.on('close', () => {
      this.stopHeartbeat();
      this.setStatus('closed');
    });

    // Send hello immediately
    const hello: ClientMsg = {
      v: 1,
      t: 'hello',
      room: this.options.room,
      playerId: this.options.playerId,
      resume: this.options.resumeToken,
      name: this.options.name,
      avatar: this.options.avatar,
    };
    this.send(hello);
    this.startHeartbeat();
  }

  public send(msg: ClientMsg): void {
    if (!this.socket) return;
    try {
      this.socket.write(NdjsonFramer.serialize(msg));
    } catch {
      // ignore
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
