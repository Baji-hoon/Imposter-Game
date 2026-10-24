import { describe, it, expect } from 'vitest';
import { parseJoinUrl } from '../src/joinUrl';

describe('parseJoinUrl', () => {
  it('parses raw 4-letter room codes', () => {
    expect(parseJoinUrl('SFXB')).toEqual({ code: 'SFXB' });
    expect(parseJoinUrl('sfxb')).toEqual({ code: 'SFXB' });
    expect(parseJoinUrl(' ABCD ')).toEqual({ code: 'ABCD' });
  });

  it('parses http://<ip>:47777/?room=CODE links', () => {
    const result = parseJoinUrl('http://192.168.0.109:47777/?room=SFXB');
    expect(result).toEqual({
      host: '192.168.0.109',
      port: 47777,
      code: 'SFXB',
    });
  });

  it('parses http://<ip>:47777/?c=CODE links', () => {
    const result = parseJoinUrl('http://192.168.43.1:47777/?c=WXYZ');
    expect(result).toEqual({
      host: '192.168.43.1',
      port: 47777,
      code: 'WXYZ',
    });
  });

  it('parses imposter://join deep links with query parameters', () => {
    const result = parseJoinUrl('imposter://join?h=192.168.0.109&p=47777&c=SFXB');
    expect(result).toEqual({
      host: '192.168.0.109',
      port: 47777,
      code: 'SFXB',
    });
  });

  it('parses imposter://join deep links with alternative query parameters', () => {
    const result = parseJoinUrl('imposter://join?host=192.168.43.1&port=47777&room=ABCD');
    expect(result).toEqual({
      host: '192.168.43.1',
      port: 47777,
      code: 'ABCD',
    });
  });

  it('parses imposter://join/<ip>:<port>?room=CODE deep links', () => {
    const result = parseJoinUrl('imposter://join/192.168.0.109:47777?room=SFXB');
    expect(result).toEqual({
      host: '192.168.0.109',
      port: 47777,
      code: 'SFXB',
    });
  });

  it('returns null for empty or invalid strings', () => {
    expect(parseJoinUrl('')).toBeNull();
    expect(parseJoinUrl('   ')).toBeNull();
    expect(parseJoinUrl('not-a-valid-link')).toBeNull();
  });
});
