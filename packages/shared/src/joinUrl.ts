/**
 * Join URL and QR Code parsing for Imposter.
 *
 * Supported formats:
 * 1. Deep link: imposter://join?h=192.168.0.109&p=47777&c=SFXB or imposter://join/192.168.0.109:47777?room=SFXB
 * 2. HTTP LAN link: http://192.168.0.109:47777/?room=SFXB
 * 3. Raw 4-letter room code: SFXB
 */

export interface ParsedJoinTarget {
  host?: string;
  port?: number;
  code?: string;
}

export function parseJoinUrl(raw: string): ParsedJoinTarget | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Raw 4-letter code
  if (/^[A-Za-z]{4}$/.test(trimmed)) {
    return { code: trimmed.toUpperCase() };
  }

  // 2. HTTP LAN URL (e.g. http://192.168.0.109:47777/?room=SFXB)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port, 10) : 47777;
      const code = parsed.searchParams.get('room') || parsed.searchParams.get('c') || '';
      return {
        host: host || undefined,
        port,
        code: code ? code.toUpperCase() : undefined,
      };
    } catch {
      const match = trimmed.match(/https?:\/\/([^:/]+)(?::(\d+))?.*[?&](?:room|c)=([A-Za-z0-9]+)/i);
      if (match) {
        return {
          host: match[1],
          port: match[2] ? parseInt(match[2], 10) : 47777,
          code: match[3]?.toUpperCase(),
        };
      }
    }
  }

  // 3. Deep link (imposter://join?h=... or imposter://join/...)
  if (trimmed.startsWith('imposter://')) {
    try {
      const afterScheme = trimmed.replace('imposter://', '');
      const qIdx = afterScheme.indexOf('?');
      const query = qIdx >= 0 ? afterScheme.substring(qIdx + 1) : afterScheme;
      const search = new URLSearchParams(query);
      let host = search.get('h') || search.get('host');
      let portStr = search.get('p') || search.get('port');
      let code = search.get('c') || search.get('room');

      if (!host && qIdx > 0) {
        const pathPart = afterScheme.substring(0, qIdx).replace(/^[/\\]+/, '').replace(/^join[/\\]*/, '');
        const [h, p] = pathPart.split(':');
        if (h) host = h;
        if (p && !portStr) portStr = p;
      }

      return {
        host: host || undefined,
        port: portStr ? parseInt(portStr, 10) : 47777,
        code: code ? code.toUpperCase() : undefined,
      };
    } catch {}
  }

  return null;
}
