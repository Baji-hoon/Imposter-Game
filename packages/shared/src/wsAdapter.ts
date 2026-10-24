import { SocketLike, CreateServerFactory, ServerLike } from './hostServer';
import { getSpikePageHtml } from './spikePage';

export interface WebAsset {
  contentType: string;
  data: string;
  isBase64?: boolean;
}

/**
 * Pure TypeScript SHA-1 implementation (FIPS PUB 180-1).
 * Zero dependencies, works in Node, React Native, and Web.
 */
export function sha1(input: string | Uint8Array): Uint8Array {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = input;
  }

  const bitLength = bytes.length * 8;
  const totalLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(totalLength - 4, bitLength >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (v << 1) | (v >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;

      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const resView = new DataView(result.buffer, result.byteOffset, result.byteLength);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  return result;
}

/**
 * Base64 encoder for byte arrays. Works in all JS environments.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const triple = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      chars[(triple >> 18) & 0x3f] +
      chars[(triple >> 12) & 0x3f] +
      chars[(triple >> 6) & 0x3f] +
      chars[triple & 0x3f];
  }

  const remainder = len - i;
  if (remainder === 1) {
    const b0 = bytes[i];
    result +=
      chars[(b0 >> 2) & 0x3f] +
      chars[(b0 << 4) & 0x3f] +
      '==';
  } else if (remainder === 2) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    result +=
      chars[(b0 >> 2) & 0x3f] +
      chars[((b0 << 4) | (b1 >> 4)) & 0x3f] +
      chars[(b1 << 2) & 0x3f] +
      '=';
  }

  return result;
}

/**
 * Pure TypeScript Base64 decoder. Converts base64 string to Uint8Array.
 * Works seamlessly in Node.js, React Native, and Web.
 */
export function base64ToBytes(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  if (len === 0) return new Uint8Array(0);

  let byteLength = Math.floor((len * 3) / 4);
  if (clean.endsWith('==')) byteLength -= 2;
  else if (clean.endsWith('=')) byteLength -= 1;

  const bytes = new Uint8Array(byteLength);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const enc1 = lookup[clean.charCodeAt(i)];
    const enc2 = lookup[clean.charCodeAt(i + 1)];
    const enc3 = lookup[clean.charCodeAt(i + 2)];
    const enc4 = lookup[clean.charCodeAt(i + 3)];

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (clean[i + 2] !== '=' && p < byteLength) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (clean[i + 3] !== '=' && p < byteLength) bytes[p++] = ((enc3 & 3) << 6) | (enc4 & 63);
  }
  return bytes;
}

export const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export type Sha1Base64Fn = (input: string) => string | Promise<string>;

/**
 * Pure TypeScript fallback for computing RFC 6455 Sec-WebSocket-Accept.
 */
export const pureTsSha1Base64: Sha1Base64Fn = (input: string): string => {
  return bytesToBase64(sha1(input));
};

export async function computeSecWebSocketAccept(
  clientKey: string,
  sha1Base64Fn?: Sha1Base64Fn
): Promise<string> {
  const combined = clientKey.trim() + WS_GUID;
  if (sha1Base64Fn) {
    return await sha1Base64Fn(combined);
  }
  return pureTsSha1Base64(combined);
}

/**
 * Safely converts string, Buffer, or Uint8Array to a Uint8Array.
 * Handles both React Native (where Buffer might not exist) and Node.js.
 */
export function toUint8Array(data: string | Uint8Array | any): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  const maybeBuffer = (globalThis as any).Buffer;
  if (maybeBuffer && typeof maybeBuffer.isBuffer === 'function' && maybeBuffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data && typeof data === 'object' && data.buffer instanceof ArrayBuffer) {
    return new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || data.length);
  }
  return new TextEncoder().encode(String(data || ''));
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a text payload into an unmasked RFC 6455 server WebSocket frame.
 */
export function encodeWsTextFrame(text: string): Uint8Array {
  const payloadBytes = new TextEncoder().encode(text);
  const len = payloadBytes.length;

  let headerLen = 2;
  if (len > 125 && len <= 65535) {
    headerLen = 4;
  } else if (len > 65535) {
    headerLen = 10;
  }

  const frame = new Uint8Array(headerLen + len);
  // Byte 0: FIN = 1, Opcode = 0x1 (text)
  frame[0] = 0x81;

  if (len <= 125) {
    frame[1] = len;
  } else if (len <= 65535) {
    frame[1] = 126;
    frame[2] = (len >> 8) & 0xff;
    frame[3] = len & 0xff;
  } else {
    frame[1] = 127;
    frame[2] = 0;
    frame[3] = 0;
    frame[4] = 0;
    frame[5] = 0;
    frame[6] = (len >>> 24) & 0xff;
    frame[7] = (len >>> 16) & 0xff;
    frame[8] = (len >>> 8) & 0xff;
    frame[9] = len & 0xff;
  }

  frame.set(payloadBytes, headerLen);
  return frame;
}

/**
 * Encodes a server WebSocket Pong frame (opcode 0xA, unmasked).
 */
export function encodeWsPongFrame(payload: Uint8Array = new Uint8Array(0)): Uint8Array {
  const frame = new Uint8Array(2 + payload.length);
  frame[0] = 0x8a; // FIN=1, Opcode=0xA
  frame[1] = payload.length;
  frame.set(payload, 2);
  return frame;
}

/**
 * Encodes a server WebSocket Close frame (opcode 0x8, unmasked).
 */
export function encodeWsCloseFrame(code = 1000): Uint8Array {
  const frame = new Uint8Array(4);
  frame[0] = 0x88; // FIN=1, Opcode=0x8
  frame[1] = 2;
  frame[2] = (code >> 8) & 0xff;
  frame[3] = code & 0xff;
  return frame;
}

export interface WsFrameParserEvents {
  onMessage: (text: string) => void;
  onPing: (payload: Uint8Array) => void;
  onPong?: (payload: Uint8Array) => void;
  onClose: (code: number) => void;
  onErrorClose: (code: number, reason: string) => void;
}

/**
 * Stateful WebSocket Frame Parser for RFC 6455 client-to-server frames.
 * - Handles masked text frames, 7-bit and 16-bit lengths
 * - Ping (opcode 0x9) -> emit ping
 * - Pong (opcode 0xA) -> ignore
 * - Close (opcode 0x8) -> echo close and close
 * - Rejects fragmented frames (FIN=0 or opcode 0x0) with close code 1003
 * - Rejects payloads over 8 KB with close code 1009
 */
export class WsFrameParser {
  private buffer: Uint8Array = new Uint8Array(0);

  public push(chunk: Uint8Array, events: WsFrameParserEvents): void {
    if (this.buffer.length === 0) {
      this.buffer = chunk;
    } else {
      const combined = new Uint8Array(this.buffer.length + chunk.length);
      combined.set(this.buffer, 0);
      combined.set(chunk, this.buffer.length);
      this.buffer = combined;
    }

    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];

      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const isMasked = (b1 & 0x80) !== 0;
      let payloadLen = b1 & 0x7f;

      // Reject fragmented frames: FIN = 0 or continuation opcode 0x0 with 1003
      if (!fin || opcode === 0x0) {
        events.onErrorClose(1003, 'Fragmented frames are not supported');
        this.buffer = new Uint8Array(0);
        return;
      }

      let headerLen = 2;
      if (payloadLen === 126) {
        if (this.buffer.length < 4) return; // Wait for full length
        payloadLen = (this.buffer[2] << 8) | this.buffer[3];
        headerLen = 4;
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return;
        const hi =
          (this.buffer[2] << 24) |
          (this.buffer[3] << 16) |
          (this.buffer[4] << 8) |
          this.buffer[5];
        const lo =
          this.buffer[6] * 0x1000000 +
          ((this.buffer[7] << 16) | (this.buffer[8] << 8) | this.buffer[9]);

        if (hi !== 0 || lo > 8192) {
          events.onErrorClose(1009, 'Payload exceeds 8 KB limit');
          this.buffer = new Uint8Array(0);
          return;
        }
        payloadLen = lo;
        headerLen = 10;
      }

      // Reject payloads over 8 KB with close code 1009
      if (payloadLen > 8192) {
        events.onErrorClose(1009, 'Payload exceeds 8 KB limit');
        this.buffer = new Uint8Array(0);
        return;
      }

      const maskLen = isMasked ? 4 : 0;
      const totalFrameLen = headerLen + maskLen + payloadLen;

      if (this.buffer.length < totalFrameLen) {
        return; // Need more frame bytes
      }

      let payload: Uint8Array;
      if (isMasked) {
        const mask = this.buffer.subarray(headerLen, headerLen + 4);
        const rawPayload = this.buffer.subarray(headerLen + 4, totalFrameLen);
        payload = new Uint8Array(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          payload[i] = rawPayload[i] ^ mask[i % 4];
        }
      } else {
        payload = this.buffer.slice(headerLen, totalFrameLen);
      }

      // Advance buffer past this frame
      this.buffer = this.buffer.slice(totalFrameLen);

      // Handle Opcode
      if (opcode === 0x1) {
        // Text frame
        const text = decodeUtf8(payload);
        events.onMessage(text);
      } else if (opcode === 0x9) {
        // Ping
        events.onPing(payload);
      } else if (opcode === 0xa) {
        // Pong: ignore per spec
        if (events.onPong) events.onPong(payload);
      } else if (opcode === 0x8) {
        // Close
        let code = 1000;
        if (payload.length >= 2) {
          code = (payload[0] << 8) | payload[1];
        }
        events.onClose(code);
      }
    }
  }
}

/**
 * Wraps a native socket that was sniffed and identified as native NDJSON.
 * Replays any initially buffered bytes to the 'data' listener on the next microtask.
 */
export class SniffedNativeSocket implements SocketLike {
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};
  private buffered: Uint8Array | null;

  constructor(private raw: SocketLike, initialBytes: Uint8Array) {
    this.buffered = initialBytes.length > 0 ? initialBytes : null;

    this.raw.on('close', () => this.emit('close'));
    this.raw.on('error', (err: Error) => this.emit('error', err));
    this.raw.on('data', (data: any) => {
      const str = typeof data === 'string' ? data : decodeUtf8(toUint8Array(data));
      this.emit('data', str);
    });
  }

  get remoteAddress(): string | undefined {
    return this.raw.remoteAddress;
  }

  get remotePort(): number | undefined {
    return this.raw.remotePort;
  }

  on(event: 'data' | 'close' | 'error', listener: (...args: any[]) => void): this {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);

    if (event === 'data' && this.buffered) {
      const pending = this.buffered;
      this.buffered = null;
      queueMicrotask(() => {
        listener(decodeUtf8(pending));
      });
    }
    return this;
  }

  private emit(event: string, ...args: any[]): void {
    const list = this.listeners[event];
    if (list) {
      for (const fn of [...list]) {
        try {
          fn(...args);
        } catch {}
      }
    }
  }

  write(data: string): boolean | void {
    return this.raw.write(data);
  }

  destroy(): void {
    this.raw.destroy();
  }
}

/**
 * Creates a SocketLike adapter for an upgraded WebSocket connection.
 * Speaks NDJSON with HostServer:
 * - Each inbound text frame is delivered to HostServer as `text + "\n"`
 * - Each outbound line HostServer writes is encoded as an unmasked text frame
 */
export function createWebSocketAdapterSocket(
  rawSocket: SocketLike,
  onLog?: (msg: string) => void
): { socket: SocketLike; feedInitialBytes: (bytes: Uint8Array) => void } {
  const frameParser = new WsFrameParser();
  type Listener = (...args: any[]) => void;
  const listeners = new Map<string, Listener[]>();
  let isClosed = false;

  const emit = (event: string, ...args: any[]) => {
    const list = listeners.get(event);
    if (list) {
      for (const fn of [...list]) {
        try {
          fn(...args);
        } catch (err: any) {
          onLog?.(`[wsAdapter] Error in listener '${event}': ${err.message}`);
        }
      }
    }
  };

  const parserEvents: WsFrameParserEvents = {
    onMessage: (text: string) => {
      // Inbound frame delivered to HostServer as that text plus "\n" if missing
      const line = text.endsWith('\n') ? text : text + '\n';
      emit('data', line);
    },
    onPing: (payload: Uint8Array) => {
      // Ping: reply pong with exact same payload
      const pongFrame = encodeWsPongFrame(payload);
      try {
        rawSocket.write(pongFrame as any);
      } catch {}
    },
    onPong: () => {
      // Pong: ignore
    },
    onClose: (code: number) => {
      // Echo close and close socket
      if (!isClosed) {
        isClosed = true;
        try {
          const echoClose = encodeWsCloseFrame(code);
          rawSocket.write(echoClose as any);
        } catch {}
        rawSocket.destroy();
        emit('close');
      }
    },
    onErrorClose: (code: number, reason: string) => {
      onLog?.(`[wsAdapter] Rejecting frame with close code ${code}: ${reason}`);
      if (!isClosed) {
        isClosed = true;
        try {
          const closeFrame = encodeWsCloseFrame(code);
          rawSocket.write(closeFrame as any);
        } catch {}
        rawSocket.destroy();
        emit('close');
      }
    },
  };

  const wrappedSocket: SocketLike = {
    get remoteAddress(): string | undefined {
      return rawSocket.remoteAddress;
    },
    get remotePort(): number | undefined {
      return rawSocket.remotePort;
    },
    on(event: 'data' | 'close' | 'error', listener: Listener): any {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(listener);
      return wrappedSocket;
    },
    write(data: string): boolean {
      if (isClosed) return false;
      try {
        // Strip trailing \n if present for clean WS frame, then encode
        const text = data.endsWith('\n') ? data.slice(0, -1) : data;
        const frame = encodeWsTextFrame(text);
        return Boolean(rawSocket.write(frame as any));
      } catch (err: any) {
        onLog?.(`[wsAdapter] Error writing frame: ${err.message}`);
        return false;
      }
    },
    destroy(): void {
      if (!isClosed) {
        isClosed = true;
        try {
          const closeFrame = encodeWsCloseFrame(1000);
          rawSocket.write(closeFrame as any);
        } catch {}
      }
      rawSocket.destroy();
      emit('close');
    },
  };

  const rawDataHandler = (data: any) => {
    const bytes = toUint8Array(data);
    frameParser.push(bytes, parserEvents);
  };

  rawSocket.on('data', rawDataHandler);
  rawSocket.on('close', () => {
    if (!isClosed) {
      isClosed = true;
      emit('close');
    }
  });
  rawSocket.on('error', (err: Error) => {
    emit('error', err);
  });

  return {
    socket: wrappedSocket,
    feedInitialBytes: (bytes: Uint8Array) => {
      if (bytes.length > 0) {
        frameParser.push(bytes, parserEvents);
      }
    },
  };
}

export interface SnifferOptions {
  sha1Base64?: Sha1Base64Fn;
  getSpikeHtml?: () => string;
  getAsset?: (path: string) => WebAsset | undefined;
  onLog?: (msg: string) => void;
}

/**
 * Gracefully sends an HTTP response over a TCP socket and half-closes it with FIN (.end()),
 * allowing the operating system TCP stack to flush all buffered bytes without premature termination.
 */
export function sendHttpAndClose(rawSocket: SocketLike, data: string | Uint8Array): void {
  const socketAny = rawSocket as any;

  let closed = false;
  const safeDestroy = () => {
    if (!closed) {
      closed = true;
      try {
        rawSocket.destroy();
      } catch {}
    }
  };

  try {
    // In Node.js (unit tests, simulator), net.Socket.end(data) sends a graceful FIN packet
    const isReactNativeSocket = Boolean(socketAny._msgEvtEmitter || socketAny._id !== undefined);

    if (!isReactNativeSocket && typeof socketAny.end === 'function') {
      try {
        socketAny.end(data);
        return;
      } catch {}
    }

    // In React Native (react-native-tcp-socket), socket.end() immediately invokes NativeModules destroy(),
    // which calls Java socket.close() while packets are still queued in the OS Linux buffer,
    // transmitting a TCP RST to mobile Safari and causing "Server not responding".
    // Instead, write the HTTP response and give the mobile network interface 5s to transmit before cleanup.
    socketAny.write(data, () => {
      setTimeout(safeDestroy, 5000);
    });
  } catch {
    safeDestroy();
  }
}

/**
 * Protocol Sniffer on Port 47777:
 * Buffers the first bytes of every new connection.
 * - If they start with "GET ": it is HTTP.
 *   - If Upgrade: websocket -> perform RFC 6455 handshake, wrap in WebSocketAdapter, deliver to connectionListener.
 *   - Else -> serve spike HTML page (HTTP 200) or 404 for /favicon.ico and unknown paths.
 * - Anything else (e.g. "{" first byte) -> native NDJSON client, untouched.
 * - Handles the first chunk arriving in pieces.
 */
export function handleSniffedConnection(
  rawSocket: SocketLike,
  connectionListener: (socket: SocketLike) => void,
  options?: SnifferOptions
): void {
  let buffered = new Uint8Array(0);
  let resolved = false;

  const log = (msg: string) => options?.onLog?.(`[ProtocolSniffer] ${msg}`);

  const onData = async (chunk: any) => {
    if (resolved) return;

    const chunkBytes = toUint8Array(chunk);
    const newBuf = new Uint8Array(buffered.length + chunkBytes.length);
    newBuf.set(buffered, 0);
    newBuf.set(chunkBytes, buffered.length);
    buffered = newBuf;

    // Protocol Sniffing:
    // Native NDJSON messages always begin with '{' (0x7B)
    const firstNonWs = buffered.find((b) => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d);
    if (firstNonWs === 0x7b) {
      // Diverged from HTTP: It is native NDJSON client!
      resolved = true;
      rawSocket.on('data', () => {}); // detach this sniffer listener
      log(`Identified native NDJSON client (${buffered.length} initial bytes).`);
      const nativeSocket = new SniffedNativeSocket(rawSocket, buffered);
      connectionListener(nativeSocket);
      return;
    }

    // Now treat as HTTP request. Wait for complete HTTP headers (\r\n\r\n or \n\n)
    let headerEndIndex = -1;
    let headerDelimiterLen = 4;

    for (let i = 0; i < buffered.length - 3; i++) {
      if (
        buffered[i] === 0x0d &&
        buffered[i + 1] === 0x0a &&
        buffered[i + 2] === 0x0d &&
        buffered[i + 3] === 0x0a
      ) {
        headerEndIndex = i;
        headerDelimiterLen = 4;
        break;
      }
    }

    if (headerEndIndex === -1) {
      for (let i = 0; i < buffered.length - 1; i++) {
        if (buffered[i] === 0x0a && buffered[i + 1] === 0x0a) {
          headerEndIndex = i;
          headerDelimiterLen = 2;
          break;
        }
      }
    }

    if (headerEndIndex === -1) {
      if (buffered.length > 8192) {
        // Headers too large
        rawSocket.write('HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\n\r\n');
        rawSocket.destroy();
        resolved = true;
      }
      return; // Wait for end of HTTP headers
    }

    // Complete HTTP headers received!
    resolved = true;
    const headerBytes = buffered.subarray(0, headerEndIndex);
    const remainingAfterHeaders = buffered.subarray(headerEndIndex + headerDelimiterLen);
    const headersText = decodeUtf8(headerBytes);

    const isWsUpgrade =
      /Upgrade:\s*websocket/i.test(headersText) &&
      /Connection:[^\r\n]*Upgrade/i.test(headersText);

    if (isWsUpgrade) {
      // Case 1: WebSocket upgrade request
      const keyMatch = headersText.match(/Sec-WebSocket-Key:\s*([^\r\n]+)/i);
      if (!keyMatch) {
        log('Missing Sec-WebSocket-Key in upgrade request');
        rawSocket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
        rawSocket.destroy();
        return;
      }

      const clientKey = keyMatch[1].trim();
      try {
        const accept = await computeSecWebSocketAccept(clientKey, options?.sha1Base64);
        const response =
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`;

        rawSocket.write(response);
        log('WebSocket handshake accepted.');

        const adapter = createWebSocketAdapterSocket(rawSocket, options?.onLog);
        connectionListener(adapter.socket);

        if (remainingAfterHeaders.length > 0) {
          adapter.feedInitialBytes(remainingAfterHeaders);
        }
      } catch (err: any) {
        log(`Handshake computation failed: ${err.message}`);
        rawSocket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n');
        rawSocket.destroy();
      }
    } else {
      // Case 2: Plain HTTP GET or HEAD
      const requestLine = headersText.split(/\r?\n/)[0] || '';
      const parts = requestLine.split(' ');
      const method = (parts[0] || 'GET').toUpperCase();
      const rawUrl = parts[1] || '/';
      const pathOnly = rawUrl.split('?')[0].split('#')[0];
      const isHead = method === 'HEAD';

      log(`HTTP ${method} "${rawUrl}" (path="${pathOnly}")`);

      // Check if requested path matches an embedded web asset
      const asset = options?.getAsset ? options.getAsset(pathOnly) : undefined;

      if (asset) {
        log(`Serving embedded asset "${pathOnly}" (${asset.contentType})`);
        if (asset.isBase64) {
          const bodyBytes = base64ToBytes(asset.data);
          const header =
            'HTTP/1.1 200 OK\r\n' +
            `Content-Type: ${asset.contentType}\r\n` +
            `Content-Length: ${bodyBytes.length}\r\n` +
            'Cache-Control: public, max-age=31536000\r\n' +
            'Connection: close\r\n\r\n';
          if (isHead) {
            sendHttpAndClose(rawSocket, header);
          } else {
            const headerBytes = new TextEncoder().encode(header);
            const totalResponse = new Uint8Array(headerBytes.length + bodyBytes.length);
            totalResponse.set(headerBytes, 0);
            totalResponse.set(bodyBytes, headerBytes.length);
            sendHttpAndClose(rawSocket, totalResponse);
          }
        } else {
          const bodyBytes = new TextEncoder().encode(asset.data);
          const header =
            'HTTP/1.1 200 OK\r\n' +
            `Content-Type: ${asset.contentType}\r\n` +
            `Content-Length: ${bodyBytes.length}\r\n` +
            'Cache-Control: no-cache\r\n' +
            'Connection: close\r\n\r\n';
          if (isHead) {
            sendHttpAndClose(rawSocket, header);
          } else {
            sendHttpAndClose(rawSocket, header + asset.data);
          }
        }
      } else if (pathOnly === '/' || pathOnly === '' || pathOnly === '/index.html') {
        // Fallback to spike page if no embedded asset
        const html = options?.getSpikeHtml ? options.getSpikeHtml() : getSpikePageHtml();
        const htmlBytes = new TextEncoder().encode(html);
        const header =
          'HTTP/1.1 200 OK\r\n' +
          'Content-Type: text/html; charset=utf-8\r\n' +
          `Content-Length: ${htmlBytes.length}\r\n` +
          'Connection: close\r\n\r\n';
        if (isHead) {
          sendHttpAndClose(rawSocket, header);
        } else {
          sendHttpAndClose(rawSocket, header + html);
        }
      } else {
        // 404 for unknown path
        log(`Unknown HTTP path "${pathOnly}" -> 404`);
        const body = 'Not Found';
        const bodyBytes = new TextEncoder().encode(body);
        const header =
          'HTTP/1.1 404 Not Found\r\n' +
          'Content-Type: text/plain; charset=utf-8\r\n' +
          `Content-Length: ${bodyBytes.length}\r\n` +
          'Connection: close\r\n\r\n';
        if (isHead) {
          sendHttpAndClose(rawSocket, header);
        } else {
          sendHttpAndClose(rawSocket, header + body);
        }
      }
    }
  };

  rawSocket.on('data', onData);
}

/**
 * Wraps a CreateServerFactory with protocol sniffing on port 47777.
 * Allows HostServer to receive both native NDJSON and WebSocket clients on the exact same port!
 */
export function createSniffingServerFactory(
  baseCreateServer: CreateServerFactory,
  options?: SnifferOptions
): CreateServerFactory {
  return (connectionListener: (socket: SocketLike) => void): ServerLike => {
    return baseCreateServer((rawSocket: SocketLike) => {
      handleSniffedConnection(rawSocket, connectionListener, options);
    });
  };
}
