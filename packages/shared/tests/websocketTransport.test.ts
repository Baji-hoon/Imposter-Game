import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketTransport } from '../src/websocketTransport';
import { ClientMsg, ServerMsg } from '../src/protocol';

class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public url: string;
  public readyState: number = 0; // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
  public OPEN = 1;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((err: any) => void) | null = null;

  public sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }

  // Helper for test to push server message
  simulateMessage(msg: ServerMsg) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(msg) });
    }
  }
}

describe('WebSocketTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects and sends hello with room and profile info', async () => {
    const transport = new WebSocketTransport({
      room: 'ABCD',
      name: 'Alice',
      avatar: '🦊',
      WebSocketClass: MockWebSocket,
    });

    const connectPromise = transport.connect({ host: '192.168.1.100', port: 47778 });
    await vi.advanceTimersByTimeAsync(15);
    await connectPromise;

    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://192.168.1.100:47778/ws');

    // Should have sent hello message
    expect(ws.sent.length).toBeGreaterThanOrEqual(1);
    const hello = JSON.parse(ws.sent[0]);
    expect(hello).toMatchObject({
      v: 1,
      t: 'hello',
      room: 'ABCD',
      name: 'Alice',
      avatar: '🦊',
    });

    transport.close();
  });

  it('updates resume info when welcome message is received', async () => {
    const transport = new WebSocketTransport({
      room: 'ABCD',
      name: 'Bob',
      avatar: '🐺',
      WebSocketClass: MockWebSocket,
    });

    const connectPromise = transport.connect({ host: '192.168.1.100', port: 47778 });
    await vi.advanceTimersByTimeAsync(15);
    await connectPromise;

    const ws = MockWebSocket.instances[0];
    ws.simulateMessage({
      v: 1,
      t: 'welcome',
      room: 'ABCD',
      playerId: 'p_bob123',
      resume: 'res_secret456',
      hostId: 'h-1',
    });

    const resumeInfo = transport.getResumeInfo();
    expect(resumeInfo.playerId).toBe('p_bob123');
    expect(resumeInfo.resumeToken).toBe('res_secret456');

    transport.close();
  });

  it('detects sequence gap in state_sync and sends resync', async () => {
    const transport = new WebSocketTransport({
      room: 'ABCD',
      name: 'Charlie',
      avatar: '🦉',
      WebSocketClass: MockWebSocket,
    });

    const connectPromise = transport.connect({ host: '192.168.1.100', port: 47778 });
    await vi.advanceTimersByTimeAsync(15);
    await connectPromise;

    const ws = MockWebSocket.instances[0];

    const testSettings = {
      rounds: 5 as const,
      imposterCount: 1 as const,
      blankImposter: 'off' as const,
      oneWordRound: 'off' as const,
      packs: ['pack1'],
      difficulty: 'easy' as const,
    };

    // Initial state_sync seq 1
    ws.simulateMessage({
      v: 1,
      t: 'state_sync',
      seq: 1,
      room: 'ABCD',
      hostId: 'h-1',
      phase: 'LOBBY',
      round: 0,
      totalRounds: 5,
      players: [],
      me: { id: 'c1', word: null, hasWord: false, voted: [] },
      scores: {},
      settings: testSettings,
      modifiers: { oneWord: false },
    });

    // Jump to seq 5 (gap detected!)
    ws.simulateMessage({
      v: 1,
      t: 'state_sync',
      seq: 5,
      room: 'ABCD',
      hostId: 'h-1',
      phase: 'LOBBY',
      round: 0,
      totalRounds: 5,
      players: [],
      me: { id: 'c1', word: null, hasWord: false, voted: [] },
      scores: {},
      settings: testSettings,
      modifiers: { oneWord: false },
    });

    const resyncSent = ws.sent.map((s) => JSON.parse(s)).find((m) => m.t === 'resync');
    expect(resyncSent).toBeDefined();
    expect(resyncSent).toMatchObject({
      v: 1,
      t: 'resync',
    });

    transport.close();
  });

  it('tracks status transitions', async () => {
    const statuses: string[] = [];
    const transport = new WebSocketTransport({
      room: 'ABCD',
      name: 'Dave',
      avatar: '🐼',
      WebSocketClass: MockWebSocket,
    });

    transport.onStatus((status) => {
      statuses.push(status);
    });

    const connectPromise = transport.connect({ host: '192.168.1.100', port: 47778 });
    await vi.advanceTimersByTimeAsync(15);
    await connectPromise;

    transport.close();

    expect(statuses).toContain('connecting');
    expect(statuses).toContain('open');
    expect(statuses).toContain('closed');
  });
});
