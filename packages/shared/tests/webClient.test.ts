import { describe, it, expect } from 'vitest';
import {
  parseRoomCodeFromUrl,
  buildWsUrlFromLocation,
  getStorageKeysForRoom,
} from '../src/webClientUtils';
import { getEmbeddedWebAsset, EMBEDDED_WEB_ASSETS } from '../src/webAssets';
import { bytesToBase64, base64ToBytes } from '../src/wsAdapter';

describe('Web Client URL & Room Code Parsing', () => {
  it('parses valid 4-letter room code from ?room= query param', () => {
    expect(parseRoomCodeFromUrl('?room=ABCD')).toBe('ABCD');
    expect(parseRoomCodeFromUrl('http://192.168.1.50:47777/?room=WXYZ')).toBe('WXYZ');
  });

  it('parses short ?c= query param', () => {
    expect(parseRoomCodeFromUrl('?c=JKLM')).toBe('JKLM');
    expect(parseRoomCodeFromUrl('http://10.0.2.16:47777/?c=PQRS')).toBe('PQRS');
  });

  it('normalizes lowercase codes to uppercase', () => {
    expect(parseRoomCodeFromUrl('?room=abcd')).toBe('ABCD');
    expect(parseRoomCodeFromUrl('?c=xyzw')).toBe('XYZW');
  });

  it('handles multiple query parameters and fragments', () => {
    expect(parseRoomCodeFromUrl('http://192.168.43.1:47777/?mode=dark&room=EVAL&ref=qr#card')).toBe('EVAL');
    expect(parseRoomCodeFromUrl('?foo=bar&c=TEST')).toBe('TEST');
  });

  it('rejects invalid or malformed room codes', () => {
    expect(parseRoomCodeFromUrl('')).toBeNull();
    expect(parseRoomCodeFromUrl('?room=')).toBeNull();
    expect(parseRoomCodeFromUrl('?room=ABC')).toBeNull(); // 3 letters
    expect(parseRoomCodeFromUrl('?room=ABCDE')).toBeNull(); // 5 letters
    expect(parseRoomCodeFromUrl('?room=1234')).toBeNull(); // numbers
    expect(parseRoomCodeFromUrl('?room=AB!D')).toBeNull(); // symbols
    expect(parseRoomCodeFromUrl('http://192.168.1.5:47777/')).toBeNull();
  });
});

describe('WebSocket URL Construction', () => {
  it('builds ws:// URL from http location.host', () => {
    const wsUrl = buildWsUrlFromLocation({
      protocol: 'http:',
      host: '192.168.1.50:47777',
    });
    expect(wsUrl).toBe('ws://192.168.1.50:47777/');
  });

  it('builds wss:// URL from https location.host', () => {
    const wsUrl = buildWsUrlFromLocation({
      protocol: 'https:',
      host: 'imposter.local:8443',
    });
    expect(wsUrl).toBe('wss://imposter.local:8443/');
  });

  it('falls back to default host when host is undefined', () => {
    const wsUrl = buildWsUrlFromLocation({});
    expect(wsUrl).toBe('ws://127.0.0.1:47777/');
  });
});

describe('Room Storage Keys', () => {
  it('generates consistent storage keys per room', () => {
    const keys = getStorageKeysForRoom('abcd');
    expect(keys.playerKey).toBe('imposter_player_ABCD');
    expect(keys.resumeKey).toBe('imposter_resume_ABCD');
  });
});

describe('Embedded Web Assets Serving', () => {
  it('contains index.html with iPhone Safari meta tags and styles', () => {
    const asset = getEmbeddedWebAsset('/');
    expect(asset).toBeDefined();
    expect(asset?.contentType).toBe('text/html; charset=utf-8');
    expect(asset?.data).toContain('apple-mobile-web-app-capable');
    expect(asset?.data).toContain('100dvh');
    expect(asset?.data).toContain('user-select: none');
  });

  it('serves index.html for /index.html and root /', () => {
    const rootAsset = getEmbeddedWebAsset('/');
    const indexAsset = getEmbeddedWebAsset('/index.html');
    expect(rootAsset).toBeDefined();
    expect(indexAsset).toBeDefined();
    expect(rootAsset?.data).toBe(indexAsset?.data);
  });

  it('serves javascript bundles with application/javascript MIME type', () => {
    const jsPath = Object.keys(EMBEDDED_WEB_ASSETS).find((k) => k.endsWith('.js'));
    expect(jsPath).toBeDefined();
    if (jsPath) {
      const jsAsset = getEmbeddedWebAsset(jsPath);
      expect(jsAsset?.contentType).toBe('application/javascript; charset=utf-8');
      expect(jsAsset?.data.length).toBeGreaterThan(1000);
    }
  });

  it('returns undefined for non-existent paths (triggers 404)', () => {
    expect(getEmbeddedWebAsset('/non-existent-file.xyz')).toBeUndefined();
  });
});

describe('Base64 Encoding and Decoding Roundtrip', () => {
  it('roundtrips binary bytes accurately', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 254, 255, 42, 99, 137]);
    const b64 = bytesToBase64(original);
    const decoded = base64ToBytes(b64);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('handles empty and padded base64 strings', () => {
    expect(Array.from(base64ToBytes(''))).toEqual([]);
    const test1 = new Uint8Array([65]); // "QQ=="
    expect(bytesToBase64(test1)).toBe('QQ==');
    expect(Array.from(base64ToBytes('QQ=='))).toEqual([65]);

    const test2 = new Uint8Array([65, 66]); // "QUI="
    expect(bytesToBase64(test2)).toBe('QUI=');
    expect(Array.from(base64ToBytes('QUI='))).toEqual([65, 66]);
  });
});

describe('Room Mismatch & Host Restart Transition', () => {
  it('correctly extracts expected room code from server ROOM_NOT_FOUND error', () => {
    const errorMsg = 'Room code mismatch (expected WXYZ)';
    const match = errorMsg.match(/expected\s+([A-Z]{4})/i);
    expect(match).not.toBeNull();
    expect(match![1].toUpperCase()).toBe('WXYZ');
  });

  it('ignores malformed error messages safely', () => {
    const errorMsg = 'Room not found';
    const match = errorMsg.match(/expected\s+([A-Z]{4})/i);
    expect(match).toBeNull();
  });
});

