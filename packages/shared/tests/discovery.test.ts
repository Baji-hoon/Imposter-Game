import { describe, it, expect, afterEach } from 'vitest';
import net from 'net';
import { HostServer } from '../src/hostServer';
import {
  generateCandidateIps,
  probeCandidate,
  runScanner,
  SocketConnector,
  SocketConnection,
} from '../src/discovery';

const nodeSocketConnector: SocketConnector = (options): SocketConnection => {
  const socket = net.createConnection({
    host: options.host,
    port: options.port,
  });

  if (options.connectTimeout) {
    socket.setTimeout(options.connectTimeout, () => {
      socket.destroy(new Error('ETIMEDOUT'));
    });
    socket.on('connect', () => {
      socket.setTimeout(0);
    });
  }

  return socket;
};

const createNodeServerFactory = (connListener: (socket: any) => void) => {
  const s = net.createServer(connListener);
  return {
    listen(opts: { port: number; host?: string }, cb?: () => void) {
      s.listen(opts.port, opts.host, cb);
      return this;
    },
    close(cb?: (err?: Error) => void) {
      if ((s as any).closeAllConnections) {
        (s as any).closeAllConnections();
      }
      s.close(cb);
      return this;
    },
    on(event: string, listener: any) {
      s.on(event, listener);
      return this;
    },
  };
};

describe('LAN Probe Protocol & Discovery Engine', () => {
  let activeServers: { close: (cb?: any) => void; closeAllConnections?: () => void }[] = [];

  afterEach(async () => {
    for (const server of activeServers) {
      try {
        if (server.closeAllConnections) {
          server.closeAllConnections();
        }
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, 1000);
          server.close(() => {
            clearTimeout(t);
            resolve();
          });
        });
      } catch {}
    }
    activeServers = [];
  });

  it('candidate generator respects candidate order without hardcoded IPs', () => {
    const candidates = generateCandidateIps('192.168.1.50', '192.168.1.100');

    // 1. Last successful host first
    expect(candidates[0]).toBe('192.168.1.100');

    // 2. x.x.x.1 gateway second
    expect(candidates[1]).toBe('192.168.1.1');

    // 3. Rest of /24 skipping own IP
    expect(candidates).toContain('192.168.1.2');
    expect(candidates).toContain('192.168.1.254');
    expect(candidates).not.toContain('192.168.1.50'); // Skips own IP

    // No hardcoded 10.0.2.2 or 172.20.10.1
    expect(candidates).not.toContain('10.0.2.2');
    expect(candidates).not.toContain('172.20.10.1');
  });

  it('probe returns probe_ok and creates no player or connection entry', async () => {
    let port = 0;
    const rawServer = net.createServer();
    await new Promise<void>((resolve) => {
      rawServer.listen(0, '127.0.0.1', () => {
        port = (rawServer.address() as net.AddressInfo).port;
        rawServer.close(() => resolve());
      });
    });

    const hostServer = new HostServer({
      roomCode: 'SFXB',
      hostId: 'host-1',
      port,
      createServer: createNodeServerFactory,
    });
    await hostServer.start();
    activeServers.push({
      close: (cb) => hostServer.stop().then(cb),
    });

    const clientSocket = net.createConnection({ host: '127.0.0.1', port });
    const receivedChunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      clientSocket.on('connect', () => {
        clientSocket.write(JSON.stringify({ v: 1, t: 'probe' }) + '\n');
      });

      clientSocket.on('data', (data) => {
        receivedChunks.push(data.toString('utf8'));
      });

      clientSocket.on('close', () => {
        resolve();
      });

      clientSocket.on('error', reject);
    });

    const rawResponse = receivedChunks.join('').trim();
    const probeResponse = JSON.parse(rawResponse);

    expect(probeResponse.v).toBe(1);
    expect(probeResponse.t).toBe('probe_ok');
    expect(probeResponse.app).toBe('imposter');
    expect(probeResponse.room).toBe('SFXB');
    expect(probeResponse.joinable).toBe(true);
    expect(probeResponse.phase).toBe('LOBBY');

    // Probe must NEVER create a player or connection entry
    expect(hostServer.getConnectedPlayerCount()).toBe(0);
    expect(hostServer.getState().playerOrder).toEqual([]);
  });

  it('probe flood is rate-limited to max 60/s', async () => {
    let port = 0;
    const rawServer = net.createServer();
    await new Promise<void>((resolve) => {
      rawServer.listen(0, '127.0.0.1', () => {
        port = (rawServer.address() as net.AddressInfo).port;
        rawServer.close(() => resolve());
      });
    });

    const hostServer = new HostServer({
      roomCode: 'RATE',
      hostId: 'host-1',
      port,
      createServer: createNodeServerFactory,
    });
    await hostServer.start();
    activeServers.push({
      close: (cb) => hostServer.stop().then(cb),
    });

    const sendProbe = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const socket = net.createConnection({ host: '127.0.0.1', port });
        let hasProbeOk = false;

        socket.on('connect', () => {
          socket.write(JSON.stringify({ v: 1, t: 'probe' }) + '\n');
        });

        socket.on('data', (d) => {
          if (d.toString().includes('probe_ok')) {
            hasProbeOk = true;
          }
        });

        socket.on('close', () => {
          resolve(hasProbeOk);
        });

        socket.on('error', () => {
          resolve(false);
        });
      });
    };

    // Send 75 probes in rapid succession
    const probePromises = Array.from({ length: 75 }, () => sendProbe());
    const results = await Promise.all(probePromises);

    const successCount = results.filter((ok) => ok === true).length;
    const rejectedCount = results.filter((ok) => ok === false).length;

    // First 60 succeed; remainder rate-limited
    expect(successCount).toBeLessThanOrEqual(60);
    expect(rejectedCount).toBeGreaterThanOrEqual(15);
  });

  it('scanner finds a fake host and handles joinable=false once game starts', async () => {
    let port = 0;
    const rawServer = net.createServer();
    await new Promise<void>((resolve) => {
      rawServer.listen(0, '127.0.0.1', () => {
        port = (rawServer.address() as net.AddressInfo).port;
        rawServer.close(() => resolve());
      });
    });

    const hostServer = new HostServer({
      roomCode: 'COOL',
      hostId: 'host-1',
      port,
      createServer: createNodeServerFactory,
    });
    await hostServer.start();
    activeServers.push({
      close: (cb) => hostServer.stop().then(cb),
    });

    // In lobby: joinable should be true
    const probeResult1 = await probeCandidate('127.0.0.1', port, nodeSocketConnector);
    expect(probeResult1.room).not.toBeNull();
    expect(probeResult1.room?.room).toBe('COOL');
    expect(probeResult1.room?.joinable).toBe(true);

    // Add 3 players and start the game so phase becomes DEALING
    hostServer.dispatch({
      type: 'JOIN',
      player: { id: 'p1', name: 'P1', avatar: 'fox' },
    });
    hostServer.dispatch({
      type: 'JOIN',
      player: { id: 'p2', name: 'P2', avatar: 'bear' },
    });
    hostServer.dispatch({
      type: 'JOIN',
      player: { id: 'p3', name: 'P3', avatar: 'cat' },
    });
    hostServer.dispatch({ type: 'START_GAME' });

    expect(hostServer.getState().phase).toBe('DEALING');

    // Mid-game: probe returns joinable=false
    const probeResult2 = await probeCandidate('127.0.0.1', port, nodeSocketConnector);
    expect(probeResult2.room).not.toBeNull();
    expect(probeResult2.room?.room).toBe('COOL');
    expect(probeResult2.room?.joinable).toBe(false);
  });

  it('scanner ignores a non-Imposter service on the same port', async () => {
    // Spin up a mock HTTP / non-imposter TCP server
    const fakeServer = net.createServer((socket) => {
      socket.on('error', () => {});
      socket.on('data', () => {
        socket.write('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nHello World');
        socket.destroy();
      });
    });

    let port = 0;
    await new Promise<void>((resolve) => {
      fakeServer.listen(0, '127.0.0.1', () => {
        port = (fakeServer.address() as net.AddressInfo).port;
        resolve();
      });
    });
    activeServers.push(fakeServer);

    const result = await probeCandidate('127.0.0.1', port, nodeSocketConnector);

    // Ignored: not counted as success
    expect(result.room).toBeNull();
  });

  it('scanner leaves no open sockets after abort', async () => {
    let openClientSockets = 0;
    const trackingConnector: SocketConnector = (opts) => {
      const s = nodeSocketConnector(opts);
      openClientSockets++;
      s.on('close', () => {
        openClientSockets--;
      });
      return s;
    };

    // Server that accepts connections but does nothing (stalled)
    const serverSockets = new Set<net.Socket>();
    const stalledServer = net.createServer((socket) => {
      serverSockets.add(socket);
      socket.on('close', () => serverSockets.delete(socket));
      socket.on('error', () => {});
    });

    let port = 0;
    await new Promise<void>((resolve) => {
      stalledServer.listen(0, '127.0.0.1', () => {
        port = (stalledServer.address() as net.AddressInfo).port;
        resolve();
      });
    });
    activeServers.push({
      close: (cb) => {
        for (const s of serverSockets) {
          try {
            s.destroy();
          } catch {}
        }
        stalledServer.close(cb);
      },
    });

    const abortController = new AbortController();

    // Start scanning against stalled server
    const scanPromise = runScanner(
      ['127.0.0.1'],
      trackingConnector,
      {
        port,
        signal: abortController.signal,
      }
    );

    // Wait a brief moment for connection to open, then abort
    await new Promise((r) => setTimeout(r, 40));
    abortController.abort();

    const { rooms } = await scanPromise;
    expect(rooms).toEqual([]);

    // Wait 50 ms for socket close events to settle
    await new Promise((r) => setTimeout(r, 60));

    // Confirm that all client sockets opened by scanner were closed/destroyed
    expect(openClientSockets).toBe(0);
  });
});
