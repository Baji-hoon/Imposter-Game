import { describe, it, expect } from 'vitest';
import { NdjsonFramer } from '../src/ndjson';

describe('NdjsonFramer', () => {
  it('handles complete single-line messages', () => {
    const framer = new NdjsonFramer();
    const payload = { v: 1, t: 'ping', id: 'p-1', ts: 100 };
    const encoded = NdjsonFramer.serialize(payload);

    const lines = framer.push(encoded);
    expect(lines).toHaveLength(1);
    expect(NdjsonFramer.parse(lines[0])).toEqual(payload);
  });

  it('handles partial chunks across multiple stream chunks', () => {
    const framer = new NdjsonFramer();
    const payload = { v: 1, t: 'hello', room: 'ABCD', name: 'Player' };
    const serialized = NdjsonFramer.serialize(payload);

    const chunk1 = serialized.slice(0, 10);
    const chunk2 = serialized.slice(10);

    const lines1 = framer.push(chunk1);
    expect(lines1).toEqual([]);
    expect(framer.getRemainder()).toBe(chunk1);

    const lines2 = framer.push(chunk2);
    expect(lines2).toHaveLength(1);
    expect(NdjsonFramer.parse(lines2[0])).toEqual(payload);
    expect(framer.getRemainder()).toBe('');
  });

  it('handles multiple messages in a single chunk', () => {
    const framer = new NdjsonFramer();
    const msg1 = { v: 1, t: 'ping', id: '1', ts: 100 };
    const msg2 = { v: 1, t: 'ping', id: '2', ts: 200 };
    const msg3 = { v: 1, t: 'ping', id: '3', ts: 300 };

    const batch = NdjsonFramer.serialize(msg1) + NdjsonFramer.serialize(msg2) + NdjsonFramer.serialize(msg3);

    const lines = framer.push(batch);
    expect(lines).toHaveLength(3);
    expect(NdjsonFramer.parse(lines[0])).toEqual(msg1);
    expect(NdjsonFramer.parse(lines[1])).toEqual(msg2);
    expect(NdjsonFramer.parse(lines[2])).toEqual(msg3);
  });

  it('handles Windows CRLF (\\r\\n) and empty lines gracefully', () => {
    const framer = new NdjsonFramer();
    const chunk = '\r\n\r\n{"v":1,"t":"ping"}\r\n\r\n{"v":1,"t":"resync"}\r\n\r\n';

    const lines = framer.push(chunk);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('{"v":1,"t":"ping"}');
    expect(lines[1]).toBe('{"v":1,"t":"resync"}');
  });

  it('supports reset', () => {
    const framer = new NdjsonFramer();
    framer.push('{"partial":');
    expect(framer.getRemainder()).toBe('{"partial":');
    framer.reset();
    expect(framer.getRemainder()).toBe('');
  });
});
