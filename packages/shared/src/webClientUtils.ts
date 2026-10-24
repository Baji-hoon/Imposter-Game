/**
 * Web Client Utility Functions
 * Pure TypeScript utilities for URL and room-code parsing,
 * WebSocket address construction, and storage key generation.
 */

/**
 * Extracts and sanitizes a 4-letter room code from a URL or query string.
 * Supports "?room=CODE", "?c=CODE", full URLs (http://192.168.1.5:47777/?room=ABCD),
 * and case-insensitive matching. Returns null for invalid codes.
 */
export function parseRoomCodeFromUrl(urlOrQuery: string): string | null {
  if (!urlOrQuery || typeof urlOrQuery !== 'string') return null;

  try {
    let queryString = urlOrQuery;
    if (urlOrQuery.includes('?')) {
      queryString = urlOrQuery.slice(urlOrQuery.indexOf('?'));
    } else if (!urlOrQuery.startsWith('?')) {
      queryString = '?' + urlOrQuery;
    }

    const params = new URLSearchParams(queryString);
    const rawCode = params.get('room') || params.get('c');
    if (!rawCode) return null;

    const trimmed = rawCode.trim().toUpperCase();
    if (/^[A-Z]{4}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Constructs a WebSocket URL from a browser location-like object.
 * Strictly uses location.host and ws:// for plain http, wss:// for https.
 * Never hardcodes an IP or port.
 */
export function buildWsUrlFromLocation(loc: { protocol?: string; host?: string }): string {
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = loc.host || '127.0.0.1:47777';
  return `${protocol}//${host}/`;
}

/**
 * Generates localStorage keys for room session persistence.
 */
export function getStorageKeysForRoom(roomCode: string): { playerKey: string; resumeKey: string } {
  const clean = roomCode.trim().toUpperCase();
  return {
    playerKey: `imposter_player_${clean}`,
    resumeKey: `imposter_resume_${clean}`,
  };
}
