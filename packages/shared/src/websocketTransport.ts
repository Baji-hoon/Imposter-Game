import {
  Transport,
  ConnectTarget,
  ConnectionStatus,
} from './types';
import {
  ClientMsg,
  ServerMsg,
  ServerMsgSchema,
} from './protocol';

const PING_INTERVAL_MS = 5000;
const LINK_LOST_TIMEOUT_MS = 12000;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5000;

export interface WebSocketTransportOptions {
  room: string;
  name: string;
  avatar: string;
  playerId?: string;
  resumeToken?: string;
  onRttUpdate?: (rtt: number) => void;
  onLog?: (msg: string) => void;
  /** Optional WebSocket factory/constructor for testing or custom runtimes */
  WebSocketClass?: any;
}

/**
 * WebSocketTransport
 * Implements the Transport interface using standard browser WebSockets:
 * - Compatible with Mobile Safari, Chrome, and any modern web browser
 * - App-level 5-second ping/pong heartbeat with 12s liveness timeout
 * - Monotonic seq gap tracking triggering automatic resync
 * - Reconnection with exponential backoff + jitter (0.5s to 5s)
 * - Seamless resume using stored playerId and resume token
 */
export class WebSocketTransport implements Transport {
  private target: ConnectTarget | null = null;
  private wsUrl: string | null = null;
  private ws: any = null;
  private status: ConnectionStatus = 'closed';
  private options: WebSocketTransportOptions;

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
  private hasConnectedOnce = false;
  private reconnectAttempts = 0;

  constructor(options: WebSocketTransportOptions) {
    this.options = options;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const cb of this.statusCallbacks) {
        try {
          cb(newStatus);
        } catch (err) {
          this.log(`Error in status callback: ${err}`);
        }
      }
    }
  }

  private log(msg: string) {
    if (this.options.onLog) {
      this.options.onLog(`[WebSocketTransport] ${msg}`);
    }
  }

  public getResumeInfo(): { playerId?: string; resumeToken?: string } {
    return {
      playerId: this.options.playerId,
      resumeToken: this.options.resumeToken,
    };
  }

  public async connect(target: ConnectTarget | string): Promise<void> {
    if (typeof target === 'string') {
      this.wsUrl = target;
      this.target = null;
    } else {
      this.target = target;
      this.wsUrl = `ws://${target.host}:${target.port}/ws`;
    }

    this.isExplicitlyClosed = false;
    this.backoffDelay = INITIAL_BACKOFF_MS;
    return this.initiateConnection(true);
  }

  private getWebSocketConstructor(): any {
    if (this.options.WebSocketClass) {
      return this.options.WebSocketClass;
    }
    if (typeof WebSocket !== 'undefined') {
      return WebSocket;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).WebSocket) {
      return (globalThis as any).WebSocket;
    }
    throw new Error('WebSocket is not available in the current environment.');
  }

  private initiateConnection(isInitial = false): Promise<void> {
    if (this.isExplicitlyClosed || !this.wsUrl) return Promise.resolve();

    this.setStatus(this.status === 'open' ? 'reconnecting' : 'connecting');
    this.log(`Connecting to ${this.wsUrl}...`);

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
            this.log(`Initial connection to ${this.wsUrl} timed out (5s)`);
            if (this.ws) {
              try {
                this.ws.close();
              } catch {}
              this.ws = null;
            }
            this.handleDisconnect();
            finishError(new Error(`Connection to ${this.wsUrl} timed out after 5s`));
          }, 5000)
        : null;

      try {
        const WSClass = this.getWebSocketConstructor();
        const ws = new WSClass(this.wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.log('WebSocket connected. Sending hello...');
          this.backoffDelay = INITIAL_BACKOFF_MS;
          this.lastInboundTime = Date.now();
          this.hasConnectedOnce = true;
          this.reconnectAttempts = 0;

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

          this.setStatus('open');
          this.startHeartbeat();
          finishSuccess();
        };

        ws.onmessage = (event: any) => {
          const rawData = typeof event.data === 'string' ? event.data : event.data?.toString?.();
          if (rawData) {
            this.handleRawMessage(rawData);
          }
        };

        ws.onclose = () => {
          this.log('WebSocket closed.');
          this.handleDisconnect();
          finishError(new Error('WebSocket closed before handshake'));
        };

        ws.onerror = (err: any) => {
          this.log(`WebSocket error: ${err?.message || err}`);
          this.handleDisconnect();
          finishError(err || new Error('Connection failed'));
        };
      } catch (err: any) {
        this.log(`Failed to initiate WebSocket connection: ${err.message}`);
        this.handleDisconnect();
        finishError(err);
      }
    });
  }

  private handleRawMessage(text: string) {
    this.lastInboundTime = Date.now();

    try {
      const msg: ServerMsg = JSON.parse(text);

      // Save credentials for reconnect
      if (msg.t === 'welcome') {
        this.options.playerId = msg.playerId;
        this.options.resumeToken = msg.resume;
        this.log(`Welcome received. PlayerId: ${msg.playerId}`);
      }

      // Check sequence gaps in state broadcasts
      if (msg.t === 'state_sync') {
        if (this.lastExpectedSeq > 0 && msg.seq > this.lastExpectedSeq + 1) {
          this.log(`Seq gap detected: expected ${this.lastExpectedSeq + 1}, got ${msg.seq}. Requesting resync...`);
          this.send({
            v: 1,
            t: 'resync',
          });
        }
        this.lastExpectedSeq = msg.seq;
      }

      // Handle heartbeat pong
      if (msg.t === 'pong') {
        const rtt = Date.now() - msg.ts;
        if (this.options.onRttUpdate) {
          this.options.onRttUpdate(rtt);
        }
      }

      // Dispatch to listeners
      for (const cb of this.messageCallbacks) {
        try {
          cb(msg);
        } catch (cbErr) {
          this.log(`Error in message callback: ${cbErr}`);
        }
      }
    } catch {
      this.log(`Failed to parse incoming message: ${text.slice(0, 100)}`);
    }
  }

  private handleDisconnect() {
    this.stopHeartbeat();
    this.ws = null;

    if (this.isExplicitlyClosed) {
      this.setStatus('closed');
      return;
    }

    // Schedule auto-reconnect if not explicitly closed
    if (!this.reconnectTimer) {
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    this.reconnectAttempts++;
    // Maximum 12 reconnection attempts before giving up
    if (this.hasConnectedOnce && this.reconnectAttempts > 12) {
      this.log('Max reconnect attempts (12) exceeded. Marking closed.');
      this.setStatus('closed');
      return;
    }

    const jitter = Math.random() * 200;
    const delay = Math.min(this.backoffDelay + jitter, MAX_BACKOFF_MS);
    this.log(`Scheduling reconnect attempt #${this.reconnectAttempts} in ${Math.round(delay)}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffDelay = Math.min(this.backoffDelay * 1.5, MAX_BACKOFF_MS);
      this.initiateConnection(false).catch((err) => {
        this.log(`Reconnect failed: ${err.message}`);
      });
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.pingTimer = setInterval(() => {
      this.pingCount++;
      const pingMsg: ClientMsg = {
        v: 1,
        t: 'ping',
        id: `ws-ping-${this.pingCount}`,
        ts: Date.now(),
      };
      this.send(pingMsg);
    }, PING_INTERVAL_MS);

    this.livenessTimer = setInterval(() => {
      const silentMs = Date.now() - this.lastInboundTime;
      if (silentMs > LINK_LOST_TIMEOUT_MS) {
        this.log(`Liveness timeout: No server message for ${silentMs}ms. Dropping connection...`);
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
          this.ws = null;
        }
        this.handleDisconnect();
      }
    }, 3000);
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

  public send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === (this.ws.OPEN ?? 1)) {
      try {
        const payload = JSON.stringify(msg);
        this.ws.send(payload);
      } catch (err: any) {
        this.log(`Error sending message: ${err.message}`);
      }
    } else {
      this.log(`Cannot send message of type '${msg.t}': WebSocket is not open.`);
    }
  }

  public onMessage(cb: (msg: ServerMsg) => void): void {
    this.messageCallbacks.push(cb);
  }

  public onStatus(cb: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(cb);
    cb(this.status);
  }

  public close(): void {
    this.log('Explicitly closing WebSocketTransport.');
    this.isExplicitlyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.setStatus('closed');
    this.messageCallbacks = [];
    this.statusCallbacks = [];
  }
}
