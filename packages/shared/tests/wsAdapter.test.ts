import { describe, it, expect, afterEach } from 'vitest';
import net from 'node:net';
import crypto from 'node:crypto';
import WebSocket from 'ws';
import {
  HostServer,
  SocketLike,
  ServerLike,
  createSniffingServerFactory,
  getSpikePageHtml,
  computeSecWebSocketAccept,
  encodeWsTextFrame,
  WsFrameParser,
  toUint8Array,
} from '../src';
import { getEmbeddedWebAsset } from '../src/webAssets';

function createNodeNetServer(connectionListener: (socket: SocketLike) => void): ServerLike {
  const server = net.createServer((raw) => {
    const wrapped: SocketLike = {
      write(data: string, cb?: any) {
        return raw.write(data, cb);
      },
      destroy() {
        raw.destroy();
      },
      end(data?: any) {
        return raw.end(data);
      },
      on(event: string, listener: (...args: any[]) => void) {
        raw.on(event, listener);
        return this;
      },
      get remoteAddress() {
        return raw.remoteAddress;
      },
      get remotePort() {
        return raw.remotePort;
      },
    };
    connectionListener(wrapped);
  });

  return {
    listen(options: { port: number; host?: string }, cb?: () => void) {
      server.listen(options.port, options.host, cb);
      return this;
    },
    close(cb?: (err?: Error) => void) {
      server.close(cb);
      return this;
    },
    on(event: string, listener: (...args: any[]) => void) {
      server.on(event, listener);
      return this;
    },
  };
}

const nodeSha1Base64 = (input: string) => {
  return crypto.createHash('sha1').update(input).digest('base64');
};

describe('WebSocket Adapter & Protocol Sniffing on Port 47777', () => {
  let activeServers: HostServer[] = [];

  afterEach(async () => {
    for (const s of activeServers) {
      try {
        await s.stop();
      } catch {}
    }
    activeServers = [];
  });

  it('computes Sec-WebSocket-Accept matching RFC 6455 test vector', async () => {
    const clientKey = 'dGhlIHNhbXBsZSBub25jZQ==';
    // Using injected Node crypto
    const acceptInjected = await computeSecWebSocketAccept(clientKey, nodeSha1Base64);
    expect(acceptInjected).toBe('s3pPLMBiTxaQ9kYGzzhZRbK+xOo=');

    // Using pure TypeScript fallback
    const acceptPureTs = await computeSecWebSocketAccept(clientKey);
    expect(acceptPureTs).toBe('s3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
  });

  it('serves spike HTML page on plain HTTP GET and returns 404 for unknown paths', async () => {
    const port = 47801;
    const server = new HostServer({
      roomCode: 'HTTP',
      hostId: 'h-http',
      port,
      createServer: createSniffingServerFactory(createNodeNetServer, {
        sha1Base64: nodeSha1Base64,
        getAsset: getEmbeddedWebAsset,
        getSpikeHtml: () => getSpikePageHtml(),
      }),
    });
    activeServers.push(server);
    await server.start();

    // 1. GET /?room=HTTP -> Serves full web client index.html
    const resPage = await fetch(`http://127.0.0.1:${port}/?room=HTTP`);
    expect(resPage.status).toBe(200);
    expect(resPage.headers.get('content-type')).toContain('text/html');
    const htmlText = await resPage.text();
    expect(htmlText).toContain('<title>Imposter</title>');
    expect(htmlText).toContain('apple-mobile-web-app-capable');

    // 2. GET /favicon.ico -> 200 (embedded asset)
    const resFavicon = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
    expect(resFavicon.status).toBe(200);
    expect(resFavicon.headers.get('content-type')).toContain('image/x-icon');

    // 3. GET script bundle extracted from index.html -> 200 with full content
    const scriptMatch = htmlText.match(/<script src="([^"]+)"/);
    expect(scriptMatch).not.toBeNull();
    const scriptPath = scriptMatch![1];
    const resScript = await fetch(`http://127.0.0.1:${port}${scriptPath}`);
    expect(resScript.status).toBe(200);
    expect(resScript.headers.get('content-type')).toContain('application/javascript');
    const scriptBody = await resScript.text();
    expect(scriptBody.length).toBeGreaterThan(1000000); // Verify complete, untruncated >1MB bundle

    // 4. GET /unknown-path -> 404
    const resUnknown = await fetch(`http://127.0.0.1:${port}/random-api`);
    expect(resUnknown.status).toBe(404);
  });

  it('performs WebSocket handshake, full hello/lobby exchange, and ping/pong', async () => {
    const port = 47802;
    const server = new HostServer({
      roomCode: 'WST1',
      hostId: 'h-ws',
      port,
      createServer: createSniffingServerFactory(createNodeNetServer, {
        sha1Base64: nodeSha1Base64,
        getSpikeHtml: () => getSpikePageHtml(),
      }),
    });
    activeServers.push(server);
    await server.start();

    const ws = new WebSocket(`ws://127.0.0.1:${port}/?room=WST1`);
    const receivedMessages: any[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    ws.on('message', (data: any) => {
      receivedMessages.push(JSON.parse(data.toString()));
    });

    // Send real hello
    ws.send(
      JSON.stringify({
        v: 1,
        t: 'hello',
        room: 'WST1',
        name: 'iPhonePlayer',
        avatar: '📱',
      })
    );

    // Wait for welcome & state_sync
    await new Promise((r) => setTimeout(r, 60));

    const welcome = receivedMessages.find((m) => m.t === 'welcome');
    expect(welcome).toBeDefined();
    expect(welcome.room).toBe('WST1');
    expect(welcome.playerId).toBeDefined();
    expect(welcome.resume).toBeDefined();

    const stateSync = receivedMessages.find((m) => m.t === 'state_sync');
    expect(stateSync).toBeDefined();
    expect(stateSync.players.some((p: any) => p.name === 'iPhonePlayer')).toBe(true);

    // Test heartbeat ping/pong
    const now = Date.now();
    ws.send(
      JSON.stringify({
        v: 1,
        t: 'ping',
        id: 'ping-42',
        ts: now,
      })
    );

    await new Promise((r) => setTimeout(r, 40));

    const pong = receivedMessages.find((m) => m.t === 'pong');
    expect(pong).toBeDefined();
    expect(pong.id).toBe('ping-42');
    expect(pong.ts).toBe(now);

    // Clean close
    ws.close(1000);
    await new Promise((r) => setTimeout(r, 30));
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  it('rejects oversized frame (> 8 KB) with close code 1009', async () => {
    const port = 47803;
    const server = new HostServer({
      roomCode: 'WST2',
      hostId: 'h-oversize',
      port,
      createServer: createSniffingServerFactory(createNodeNetServer, {
        sha1Base64: nodeSha1Base64,
      }),
    });
    activeServers.push(server);
    await server.start();

    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code: number, reason: Buffer) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    // Send payload of 9000 bytes (> 8192 bytes / 8 KB)
    const largePayload = 'A'.repeat(9000);
    ws.send(largePayload);

    const closeResult = await closePromise;
    expect(closeResult.code).toBe(1009);
  });

  it('rejects fragmented frames with close code 1003', async () => {
    const port = 47804;
    const server = new HostServer({
      roomCode: 'WST3',
      hostId: 'h-frag',
      port,
      createServer: createSniffingServerFactory(createNodeNetServer, {
        sha1Base64: nodeSha1Base64,
      }),
    });
    activeServers.push(server);
    await server.start();

    // Connect raw TCP socket to simulate a client sending a fragmented WS frame (FIN = 0)
    const rawClient = net.connect({ port }, () => {
      // 1. Send HTTP WebSocket upgrade
      rawClient.write(
        'GET / HTTP/1.1\r\n' +
          'Host: 127.0.0.1\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n'
      );
    });

    const closeCodePromise = new Promise<number>((resolve) => {
      let isUpgraded = false;
      const parser = new WsFrameParser();

      rawClient.on('data', (chunk) => {
        const text = chunk.toString();
        if (!isUpgraded && text.includes('101 Switching Protocols')) {
          isUpgraded = true;
          // Send a client frame with FIN = 0 (fragmented frame)
          const mask = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
          const payload = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
          const masked = new Uint8Array([payload[0] ^ mask[0], payload[1] ^ mask[1], payload[2] ^ mask[2]]);
          // Byte 0: FIN = 0 (0x01 = fragmented text frame)
          const fragFrame = new Uint8Array([0x01, 0x83, mask[0], mask[1], mask[2], mask[3], masked[0], masked[1], masked[2]]);
          rawClient.write(fragFrame);
          return;
        }

        if (isUpgraded) {
          parser.push(toUint8Array(chunk), {
            onMessage: () => {},
            onPing: () => {},
            onClose: (code) => resolve(code),
            onErrorClose: (code) => resolve(code),
          });
        }
      });
    });

    const receivedCloseCode = await closeCodePromise;
    expect(receivedCloseCode).toBe(1003);
    rawClient.destroy();
  });

  it('supports simultaneous native NDJSON and WebSocket clients on the exact same port (47777)', async () => {
    const port = 47805;
    const server = new HostServer({
      roomCode: 'DUAL',
      hostId: 'h-dual',
      port,
      createServer: createSniffingServerFactory(createNodeNetServer, {
        sha1Base64: nodeSha1Base64,
        getSpikeHtml: () => getSpikePageHtml(),
      }),
    });
    activeServers.push(server);
    await server.start();

    // 1. Native NDJSON client connects directly over raw TCP
    const nativeSocket = net.connect({ port });
    let nativeBuffer = '';
    const nativeMessages: any[] = [];

    const nativeReady = new Promise<void>((resolve) => {
      nativeSocket.on('connect', resolve);
    });
    await nativeReady;

    nativeSocket.on('data', (chunk) => {
      nativeBuffer += chunk.toString('utf8');
      const lines = nativeBuffer.split('\n');
      nativeBuffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          nativeMessages.push(JSON.parse(line.trim()));
        }
      }
    });

    // 2. WebSocket client connects to the EXACT SAME port
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    const wsMessages: any[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    ws.on('message', (data: any) => {
      wsMessages.push(JSON.parse(data.toString()));
    });

    // 3. Send hello from Native NDJSON client
    nativeSocket.write(
      JSON.stringify({
        v: 1,
        t: 'hello',
        room: 'DUAL',
        name: 'NativeDroid',
        avatar: '🤖',
      }) + '\n'
    );

    // 4. Send hello from WebSocket client (Safari spike)
    ws.send(
      JSON.stringify({
        v: 1,
        t: 'hello',
        room: 'DUAL',
        name: 'SafariPhone',
        avatar: '📱',
      })
    );

    // Wait for both to be welcomed and synced
    await new Promise((r) => setTimeout(r, 100));

    // Verify Native client received welcome & state_sync
    const nativeWelcome = nativeMessages.find((m) => m.t === 'welcome');
    expect(nativeWelcome).toBeDefined();
    expect(nativeWelcome.room).toBe('DUAL');

    // Verify WebSocket client received welcome & state_sync
    const wsWelcome = wsMessages.find((m) => m.t === 'welcome');
    expect(wsWelcome).toBeDefined();
    expect(wsWelcome.room).toBe('DUAL');

    // Verify state_sync contains BOTH players in the same game room!
    const latestWsSync = wsMessages.filter((m) => m.t === 'state_sync').pop();
    expect(latestWsSync).toBeDefined();
    const playerNames = latestWsSync.players.map((p: any) => p.name);
    expect(playerNames).toContain('NativeDroid');
    expect(playerNames).toContain('SafariPhone');

    nativeSocket.destroy();
    ws.close(1000);
  });
});
