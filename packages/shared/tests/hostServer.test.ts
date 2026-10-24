import { describe, it, expect } from 'vitest';
import { HostServer, SocketLike, ServerLike } from '../src/hostServer';
import { NdjsonFramer } from '../src/ndjson';

class MockSocket implements SocketLike {
  public writtenData: string[] = [];
  public destroyed = false;
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};

  write(data: string): boolean {
    this.writtenData.push(data);
    return true;
  }

  destroy(): void {
    this.destroyed = true;
    this.emit('close');
  }

  on(event: 'data' | 'close' | 'error', listener: (...args: any[]) => void): this {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    const list = this.listeners[event] || [];
    for (const cb of list) cb(...args);
  }

  getLastMessage<T = any>(): T | null {
    if (this.writtenData.length === 0) return null;
    const lastRaw = this.writtenData[this.writtenData.length - 1];
    return JSON.parse(lastRaw.trim()) as T;
  }

  getAllMessages<T = any>(): T[] {
    const msgs: T[] = [];
    for (const raw of this.writtenData) {
      for (const line of raw.split('\n')) {
        if (line.trim()) msgs.push(JSON.parse(line.trim()));
      }
    }
    return msgs;
  }
}

class MockServer implements ServerLike {
  public listening = false;
  public connectionListener?: (socket: SocketLike) => void;
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};

  constructor(connListener?: (socket: SocketLike) => void) {
    this.connectionListener = connListener;
  }

  listen(options: { port: number; host?: string }, callback?: () => void): this {
    this.listening = true;
    if (callback) callback();
    return this;
  }

  close(callback?: (err?: Error) => void): this {
    this.listening = false;
    if (callback) callback();
    return this;
  }

  on(event: 'connection' | 'error', listener: (...args: any[]) => void): this {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return this;
  }

  simulateConnection(socket: SocketLike): void {
    if (this.connectionListener) {
      this.connectionListener(socket);
    }
  }
}

describe('HostServer', () => {
  it('allows players to join, assigns host, and sends welcome and state_sync', async () => {
    let mockServerInstance: MockServer;
    const createServerFactory = (connListener: (s: SocketLike) => void) => {
      mockServerInstance = new MockServer(connListener);
      return mockServerInstance;
    };

    const server = new HostServer({
      roomCode: 'ABCD',
      hostId: 'p-host',
      createServer: createServerFactory,
    });

    await server.start();

    const hostSocket = new MockSocket();
    mockServerInstance!.simulateConnection(hostSocket);

    // Host joins
    hostSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'ABCD',
        playerId: 'p-host',
        name: 'Alice',
        avatar: '🦊',
      })
    );

    const msgs = hostSocket.getAllMessages();
    const welcome = msgs.find((m) => m.t === 'welcome');
    expect(welcome).toBeDefined();
    expect(welcome.playerId).toBe('p-host');
    expect(welcome.hostId).toBe('p-host');

    const stateSync = msgs.find((m) => m.t === 'state_sync');
    expect(stateSync).toBeDefined();
    expect(stateSync.phase).toBe('LOBBY');
    expect(stateSync.players).toHaveLength(1);

    await server.stop();
  });

  it('enforces hostId permissions: non-host cannot execute start_game or deal', async () => {
    let mockServerInstance: MockServer;
    const server = new HostServer({
      roomCode: 'TEST',
      hostId: 'p-host',
      createServer: (connListener) => {
        mockServerInstance = new MockServer(connListener);
        return mockServerInstance;
      },
    });

    await server.start();

    // 1. Host joins
    const hostSocket = new MockSocket();
    mockServerInstance!.simulateConnection(hostSocket);
    hostSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'TEST',
        playerId: 'p-host',
        name: 'Host',
        avatar: '👑',
      })
    );

    // 2. Client joins
    const clientSocket = new MockSocket();
    mockServerInstance!.simulateConnection(clientSocket);
    clientSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'TEST',
        playerId: 'p-client',
        name: 'Client',
        avatar: '🐶',
      })
    );

    // 3. Client tries to start game
    clientSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'start_game',
      })
    );

    const clientMsgs = clientSocket.getAllMessages();
    const errorMsg = clientMsgs.find((m) => m.t === 'error');
    expect(errorMsg).toBeDefined();
    expect(errorMsg.code).toBe('UNAUTHORIZED');

    await server.stop();
  });

  it('enforces 8 KB max line size', async () => {
    let mockServerInstance: MockServer;
    const server = new HostServer({
      roomCode: 'LINE',
      hostId: 'p1',
      createServer: (connListener) => {
        mockServerInstance = new MockServer(connListener);
        return mockServerInstance;
      },
    });

    await server.start();

    const socket = new MockSocket();
    mockServerInstance!.simulateConnection(socket);

    // Send line longer than 8192 bytes
    const hugeMsg = 'A'.repeat(8200) + '\n';
    socket.emit('data', hugeMsg);

    const msgs = socket.getAllMessages();
    const errorMsg = msgs.find((m) => m.t === 'error');
    expect(errorMsg).toBeDefined();
    expect(errorMsg.code).toBe('MESSAGE_TOO_LARGE');

    await server.stop();
  });

  it('enforces rate limit of 20 msg/sec', async () => {
    let mockServerInstance: MockServer;
    const server = new HostServer({
      roomCode: 'RATE',
      hostId: 'p1',
      createServer: (connListener) => {
        mockServerInstance = new MockServer(connListener);
        return mockServerInstance;
      },
    });

    await server.start();

    const socket = new MockSocket();
    mockServerInstance!.simulateConnection(socket);

    // Send 22 pings rapidly in under 1 second
    for (let i = 1; i <= 22; i++) {
      socket.emit('data', NdjsonFramer.serialize({ v: 1, t: 'ping', id: `${i}`, ts: Date.now() }));
    }

    const msgs = socket.getAllMessages();
    const rateLimitError = msgs.find((m) => m.t === 'error' && m.code === 'RATE_LIMIT_EXCEEDED');
    expect(rateLimitError).toBeDefined();

    await server.stop();
  });

  it('supports reconnection via hello with playerId and resume token', async () => {
    let mockServerInstance: MockServer;
    const server = new HostServer({
      roomCode: 'RESM',
      hostId: 'p-host',
      createServer: (connListener) => {
        mockServerInstance = new MockServer(connListener);
        return mockServerInstance;
      },
    });

    await server.start();

    const socket1 = new MockSocket();
    mockServerInstance!.simulateConnection(socket1);

    socket1.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'RESM',
        playerId: 'p-host',
        name: 'Player',
        avatar: '🦊',
      })
    );

    const msgs1 = socket1.getAllMessages();
    const welcome = msgs1.find((m) => m.t === 'welcome');
    expect(welcome).toBeDefined();
    const resumeToken = welcome.resume;

    // Simulate socket disconnect
    socket1.destroy();

    // Reconnect on socket2
    const socket2 = new MockSocket();
    mockServerInstance!.simulateConnection(socket2);

    socket2.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'RESM',
        playerId: 'p-host',
        resume: resumeToken,
        name: 'Player',
        avatar: '🦊',
      })
    );

    const msgs2 = socket2.getAllMessages();
    const welcome2 = msgs2.find((m) => m.t === 'welcome');
    expect(welcome2).toBeDefined();
    expect(welcome2.playerId).toBe('p-host');

    const stateSync = msgs2.find((m) => m.t === 'state_sync');
    expect(stateSync).toBeDefined();
    expect(stateSync.me.id).toBe('p-host');

    await server.stop();
  });

  it('does NOT assign first connecting player as host if their ID does not match hostId', async () => {
    let mockServerInstance: MockServer;
    const server = new HostServer({
      roomCode: 'SAFE',
      hostId: 'actual-host-123',
      createServer: (connListener) => {
        mockServerInstance = new MockServer(connListener);
        return mockServerInstance;
      },
    });

    await server.start();

    // A rogue or reconnecting client connects first
    const rogueSocket = new MockSocket();
    mockServerInstance!.simulateConnection(rogueSocket);

    rogueSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'SAFE',
        playerId: 'rogue-player',
        name: 'Sneaky',
        avatar: '🦹',
      })
    );

    const msgs = rogueSocket.getAllMessages();
    const welcome = msgs.find((m) => m.t === 'welcome');
    expect(welcome).toBeDefined();
    expect(welcome.playerId).toBe('rogue-player');
    // hostId in welcome must STILL be 'actual-host-123', NOT 'rogue-player'
    expect(welcome.hostId).toBe('actual-host-123');
    expect(server.getState().hostId).toBe('actual-host-123');

    // Rogue attempts host command
    rogueSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'start_game',
      })
    );

    const lastMsg = rogueSocket.getLastMessage();
    expect(lastMsg.t).toBe('error');
    expect(lastMsg.code).toBe('UNAUTHORIZED');

    await server.stop();
  });

  it('enforces min 3 players requirement when host tries to start_game', async () => {
    let mockServerInstance: MockServer;
    const server = new HostServer({
      roomCode: 'MIN3',
      hostId: 'p-host',
      createServer: (connListener) => {
        mockServerInstance = new MockServer(connListener);
        return mockServerInstance;
      },
    });

    await server.start();

    const hostSocket = new MockSocket();
    mockServerInstance!.simulateConnection(hostSocket);
    hostSocket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'MIN3',
        playerId: 'p-host',
        name: 'Host',
        avatar: '👑',
      })
    );

    // Host only (1 player) tries to start game
    hostSocket.emit('data', NdjsonFramer.serialize({ v: 1, t: 'start_game' }));
    let lastMsg = hostSocket.getLastMessage();
    expect(lastMsg.t).toBe('error');
    expect(lastMsg.code).toBe('NOT_ENOUGH_PLAYERS');
    expect(lastMsg.message).toContain('At least 3 players are required to start (currently 1)');

    // Add 2nd player
    const p2Socket = new MockSocket();
    mockServerInstance!.simulateConnection(p2Socket);
    p2Socket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'MIN3',
        playerId: 'p2',
        name: 'P2',
        avatar: '🐱',
      })
    );

    // Host tries to start with 2 players
    hostSocket.emit('data', NdjsonFramer.serialize({ v: 1, t: 'start_game' }));
    lastMsg = hostSocket.getLastMessage();
    expect(lastMsg.t).toBe('error');
    expect(lastMsg.code).toBe('NOT_ENOUGH_PLAYERS');
    expect(lastMsg.message).toContain('At least 3 players are required to start (currently 2)');

    // Add 3rd player
    const p3Socket = new MockSocket();
    mockServerInstance!.simulateConnection(p3Socket);
    p3Socket.emit(
      'data',
      NdjsonFramer.serialize({
        v: 1,
        t: 'hello',
        room: 'MIN3',
        playerId: 'p3',
        name: 'P3',
        avatar: '🦊',
      })
    );

    // Now host starts with 3 players
    hostSocket.emit('data', NdjsonFramer.serialize({ v: 1, t: 'start_game' }));
    const allMsgs = hostSocket.getAllMessages();
    const dealingSync = allMsgs.find((m) => m.t === 'state_sync' && (m.phase === 'DEALING' || m.phase === 'TALKING'));
    expect(dealingSync).toBeDefined();

    await server.stop();
  });
});
