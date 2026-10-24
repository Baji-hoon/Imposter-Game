import {
  Transport,
  ConnectTarget,
  ConnectionStatus,
  ClientMsg,
  ServerMsg,
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
 * WsTransport (exported as TcpTransport for web platform resolution)
 * Implements the Transport interface using standard browser WebSockets:
 * - Uses window.location.host (ws:// on http, wss:// on https). Never hardcodes IP or port.
 * - App-level 5-second ping/pong heartbeat with 12s liveness timeout
 * - Monotonic seq gap tracking triggering automatic resync
 * - Reconnection with exponential backoff + jitter (0.5s to 5s)
 * - Seamless resume using stored playerId and resume token
 */
export class TcpTransport implements Transport {
  private target: ConnectTarget | null = null;
  private wsUrl: string | null = null;
  private ws: WebSocket | null = null;
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
  private hasConnectedOnce = false;

  constructor(options: TcpTransportOptions) {
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
      this.options.onLog(`[WsTransport.web] ${msg}`);
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
      // Requirement 2: build the WebSocket URL from location.host and use ws:// because the page is plain http.
      // Never hardcode an IP or port.
      if (typeof window !== 'undefined' && window.location) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsUrl = `${protocol}//${window.location.host}/`;
      } else {
        this.wsUrl = `ws://${target.host}:${target.port}/`;
      }
    }

    this.isExplicitlyClosed = false;
    this.backoffDelay = INITIAL_BACKOFF_MS;
    return this.initiateConnection(true);
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
            this.log(`Initial connection to ${this.wsUrl} timed out (12s)`);
            if (this.ws) {
              try {
                this.ws.close();
              } catch {}
              this.ws = null;
            }
            this.handleDisconnect();
            finishError(new Error(`Connection to ${this.wsUrl} timed out after 12s`));
          }, 12000)
        : null;

      try {
        if (!this.wsUrl) {
          finishError(new Error('WebSocket URL is not set'));
          return;
        }
        const ws = new WebSocket(this.wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          this.log('WebSocket connected. Sending hello...');
          this.backoffDelay = INITIAL_BACKOFF_MS;
          this.lastInboundTime = Date.now();
          this.hasConnectedOnce = true;

          // Send real hello message immediately
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

          // We stay in 'connecting'/'reconnecting' until 'welcome' arrives from server
          finishSuccess();
        };

        ws.onmessage = (event: MessageEvent) => {
          const rawData = typeof event.data === 'string' ? event.data : event.data?.toString?.();
          if (rawData) {
            this.handleRawMessage(rawData);
          }
        };

        ws.onclose = () => {
          this.log('WebSocket closed.');
          this.handleDisconnect();
          finishError(new Error('WebSocket closed'));
        };

        ws.onerror = (err: any) => {
          this.log(`WebSocket error: ${err?.message || 'Unknown error'}`);
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

      // Save credentials for reconnect and establish 'open' session
      if (msg.t === 'welcome') {
        this.options.playerId = msg.playerId;
        this.options.resumeToken = msg.resume;
        this.log(`Welcome received. PlayerId: ${msg.playerId}`);

        // Persist to localStorage per room
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(`imposter_player_${msg.room}`, msg.playerId);
            localStorage.setItem(`imposter_resume_${msg.room}`, msg.resume);
          } catch {}
        }

        // Host server has accepted this connection into the room!
        this.setStatus('open');
        this.startHeartbeat();
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

      // On fatal room errors, close transport so UI does not show false connectivity
      if (msg.t === 'error') {
        if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'ROOM_CLOSED' || msg.code === 'KICKED') {
          this.stopHeartbeat();
          this.setStatus('closed');
        }
      }

      // Dispatch to listeners
      for (const cb of this.messageCallbacks) {
        try {
          cb(msg);
        } catch (err) {
          this.log(`Error in message callback: ${err}`);
        }
      }
    } catch (err) {
      this.log(`Failed to parse server message: ${err}`);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.pingTimer = setInterval(() => {
      if (this.status === 'open') {
        this.send({
          v: 1,
          t: 'ping',
          id: `p-${++this.pingCount}`,
          ts: Date.now(),
        });
      }
    }, PING_INTERVAL_MS);

    this.livenessTimer = setInterval(() => {
      if (this.status === 'open' && this.lastInboundTime > 0) {
        const silentDuration = Date.now() - this.lastInboundTime;
        if (silentDuration > LINK_LOST_TIMEOUT_MS) {
          this.log(`Liveness timeout (${silentDuration}ms silent). Reconnecting...`);
          if (this.ws) {
            try {
              this.ws.close();
            } catch {}
          }
          this.handleDisconnect();
        }
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

  private handleDisconnect() {
    this.stopHeartbeat();
    this.ws = null;

    if (this.isExplicitlyClosed) {
      this.setStatus('closed');
      return;
    }

    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;

    // Exponential backoff with jitter
    const jitter = Math.random() * 200;
    const delay = Math.min(this.backoffDelay + jitter, MAX_BACKOFF_MS);
    this.backoffDelay = Math.min(this.backoffDelay * 1.5, MAX_BACKOFF_MS);

    this.log(`Scheduling reconnect in ${Math.round(delay)}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed) {
        this.initiateConnection(false);
      }
    }, delay);
  }

  public send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (err: any) {
        this.log(`Error sending message: ${err.message}`);
      }
    } else {
      this.log(`Cannot send message (${msg.t}): socket not open`);
    }
  }

  public close(): void {
    this.log('Closing transport explicitly');
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close(1000, 'Normal closure');
      } catch {}
      this.ws = null;
    }

    this.setStatus('closed');
  }

  public onMessage(callback: (msg: ServerMsg) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onStatus(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(callback);
    callback(this.status);
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
    };
  }
}
