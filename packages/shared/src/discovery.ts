import { ServerProbeOkSchema, ServerProbeOk } from './protocol';
import { NdjsonFramer } from './ndjson';

export interface DiscoveredRoom {
  host: string;
  port: number;
  room: string;
  hostName: string;
  hostAvatar: string;
  players: number;
  max: number;
  phase: string;
  joinable: boolean;
}

export interface DiscoveryDebugSummary {
  ownIp: string | null;
  networkType: string;
  candidates: number;
  responded: number;
  errors: {
    timeout: number;
    refused: number;
    other: number;
  };
  durationMs: number;
  timestamp: number;
  buildType?: string;
  firstProbedIps?: string[];
  firstErrors?: Array<{ host: string; error: string; code?: string }>;
}

export interface SocketConnectionOptions {
  host: string;
  port: number;
  connectTimeout?: number;
}

export interface SocketConnection {
  write(data: string): boolean | void;
  destroy(err?: any): void;
  on(event: 'data', listener: (data: any) => void): any;
  on(event: 'error', listener: (err: any) => void): any;
  on(event: 'close', listener: () => void): any;
  on(event: 'connect', listener: () => void): any;
}

export type SocketConnector = (options: SocketConnectionOptions) => SocketConnection;

/**
 * Validates IPv4 address string format (x.x.x.x with octets 0-255).
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
  }
  return true;
}

/**
 * Generates candidate IPs strictly ordered per spec:
 * 1. Last successful host (if known and valid)
 * 2. x.x.x.1 of the own subnet (hotspot hosts are usually the gateway)
 * 3. The rest of the own /24 (x.x.x.2 through x.x.x.254) skipping the own IP.
 *
 * Limitation note: Only the own /24 is scanned. Manual IP entry remains available as an Advanced option.
 */
export function generateCandidateIps(
  ownIp: string | null | undefined,
  lastSuccessfulHost?: string | null
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (ip: string) => {
    const trimmed = ip.trim();
    if (isValidIpv4(trimmed) && !seen.has(trimmed) && trimmed !== ownIp?.trim()) {
      seen.add(trimmed);
      candidates.push(trimmed);
    }
  };

  // 1. Last successful host
  if (lastSuccessfulHost) {
    add(lastSuccessfulHost);
  }

  // 2. Gateway x.x.x.1, then 3. Rest of own /24
  if (ownIp && isValidIpv4(ownIp)) {
    const parts = ownIp.trim().split('.');
    const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;

    // 2. x.x.x.1 of own subnet
    add(`${prefix}.1`);

    // 3. Rest of own /24 (2 to 254), skipping own IP
    for (let i = 2; i <= 254; i++) {
      add(`${prefix}.${i}`);
    }
  }

  return candidates;
}

export interface ProbeResult {
  room: DiscoveredRoom | null;
  errorType?: 'timeout' | 'refused' | 'other';
  rawError?: string;
  errorCode?: string;
}

/**
 * Probes a single host for Imposter HostServer:
 * - Connect timeout: 400 ms
 * - Total probe deadline: 700 ms
 * - Sends `{"v":1,"t":"probe"}\n`
 * - Validates response strictly with ServerProbeOkSchema and app === 'imposter'
 * - Guarantees socket is destroyed in all outcomes
 */
export function probeCandidate(
  host: string,
  port = 47777,
  connector: SocketConnector,
  options: {
    connectTimeout?: number;
    deadlineTimeout?: number;
    signal?: AbortSignal;
  } = {}
): Promise<ProbeResult> {
  const connectTimeoutMs = options.connectTimeout ?? 400;
  const deadlineTimeoutMs = options.deadlineTimeout ?? 700;
  const signal = options.signal;

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ room: null, errorType: 'other' });
      return;
    }

    let settled = false;
    let socket: SocketConnection | null = null;
    let deadlineTimer: any = null;
    let connectTimer: any = null;
    let errorType: 'timeout' | 'refused' | 'other' = 'other';

    const cleanupAndResolve = (
      room: DiscoveredRoom | null,
      customRawError?: string,
      customErrorCode?: string
    ) => {
      if (!settled) {
        settled = true;
        if (deadlineTimer) clearTimeout(deadlineTimer);
        if (connectTimer) clearTimeout(connectTimer);
        if (signal) signal.removeEventListener('abort', onAbort);

        if (socket) {
          try {
            socket.destroy();
          } catch {}
          socket = null;
        }

        resolve({
          room,
          errorType: room ? undefined : errorType,
          rawError: customRawError,
          errorCode: customErrorCode,
        });
      }
    };

    const onAbort = () => {
      errorType = 'other';
      cleanupAndResolve(null, 'Scan aborted by signal', 'ABORTED');
    };

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    // Total probe deadline (700 ms)
    deadlineTimer = setTimeout(() => {
      errorType = 'timeout';
      cleanupAndResolve(null, 'Probe deadline 700ms exceeded', 'ETIMEDOUT');
    }, deadlineTimeoutMs);

    // Connect timeout (400 ms)
    connectTimer = setTimeout(() => {
      errorType = 'timeout';
      cleanupAndResolve(null, 'Connect timeout 400ms exceeded', 'ETIMEDOUT');
    }, connectTimeoutMs);

    try {
      socket = connector({
        host,
        port,
        connectTimeout: connectTimeoutMs,
      });

      const framer = new NdjsonFramer();

      socket.on('connect', () => {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }

        // Send probe line
        try {
          const probeMsg = JSON.stringify({ v: 1, t: 'probe' }) + '\n';
          socket?.write(probeMsg);
        } catch (err: any) {
          errorType = 'other';
          cleanupAndResolve(null, err?.message || 'Failed to write probe', err?.code);
        }
      });

      socket.on('data', (rawChunk: any) => {
        const chunk = typeof rawChunk === 'string' ? rawChunk : rawChunk.toString('utf8');
        const lines = framer.push(chunk);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const validation = ServerProbeOkSchema.safeParse(parsed);
            if (validation.success && validation.data.app === 'imposter') {
              const data = validation.data;
              cleanupAndResolve({
                host,
                port,
                room: data.room,
                hostName: data.hostName,
                hostAvatar: data.hostAvatar,
                players: data.players,
                max: data.max,
                phase: data.phase,
                joinable: data.joinable,
              });
              return;
            }
          } catch {}
        }
      });

      socket.on('error', (err: any) => {
        const msg = String(err?.message || err?.code || '');
        const code = String(err?.code || (msg.includes('ECONNREFUSED') ? 'ECONNREFUSED' : msg.includes('ETIMEDOUT') ? 'ETIMEDOUT' : 'ERROR'));
        if (msg.includes('ECONNREFUSED') || msg.includes('Connection refused')) {
          errorType = 'refused';
        } else if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
          errorType = 'timeout';
        } else {
          errorType = 'other';
        }
        cleanupAndResolve(null, msg, code);
      });

      socket.on('close', () => {
        cleanupAndResolve(null);
      });
    } catch (err: any) {
      errorType = 'other';
      cleanupAndResolve(null, err?.message || 'Socket creation failed', err?.code);
    }
  });
}

export interface DiscoverOptions {
  onFound?: (room: DiscoveredRoom) => void;
  onProgress?: (scanned: number, total: number) => void;
  signal?: AbortSignal;
  port?: number;
  concurrency?: number;
}

/**
 * Runs a concurrent LAN scan over candidate IPs:
 * - Concurrency 40
 * - Connect timeout 400 ms
 * - Probe deadline 700 ms
 * - Reports progress and found rooms
 * - Collects debug summary metrics
 */
export async function runScanner(
  candidates: string[],
  connector: SocketConnector,
  options: DiscoverOptions = {},
  networkInfo: { ownIp: string | null; networkType: string } = { ownIp: null, networkType: 'unknown' }
): Promise<{ rooms: DiscoveredRoom[]; summary: DiscoveryDebugSummary }> {
  const concurrency = options.concurrency ?? 40;
  const port = options.port ?? 47777;
  const signal = options.signal;
  const startTime = Date.now();

  const foundRooms: DiscoveredRoom[] = [];
  const errors = { timeout: 0, refused: 0, other: 0 };
  const firstProbedIps: string[] = candidates.slice(0, 5);
  const firstErrors: Array<{ host: string; error: string; code?: string }> = [];
  let respondedCount = 0;
  let scannedCount = 0;

  const buildType =
    typeof (globalThis as any).__DEV__ !== 'undefined'
      ? (globalThis as any).__DEV__
        ? 'DEBUG'
        : 'RELEASE'
      : typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
      ? 'RELEASE'
      : 'DEBUG';

  if (candidates.length === 0) {
    const summary: DiscoveryDebugSummary = {
      ownIp: networkInfo.ownIp,
      networkType: networkInfo.networkType,
      candidates: 0,
      responded: 0,
      errors,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
      buildType,
      firstProbedIps: [],
      firstErrors: [],
    };
    return { rooms: [], summary };
  }

  let nextIndex = 0;
  const workerCount = Math.min(concurrency, candidates.length);

  const worker = async () => {
    while (nextIndex < candidates.length) {
      if (signal?.aborted) break;

      const idx = nextIndex++;
      const host = candidates[idx];

      const res = await probeCandidate(host, port, connector, { signal });
      scannedCount++;
      options.onProgress?.(scannedCount, candidates.length);

      if (res.room) {
        respondedCount++;
        foundRooms.push(res.room);
        options.onFound?.(res.room);
      } else if (res.errorType) {
        errors[res.errorType]++;
        if (firstErrors.length < 5) {
          firstErrors.push({
            host,
            error: res.rawError || res.errorType,
            code: res.errorCode || res.errorType.toUpperCase(),
          });
        }
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const summary: DiscoveryDebugSummary = {
    ownIp: networkInfo.ownIp,
    networkType: networkInfo.networkType,
    candidates: candidates.length,
    responded: respondedCount,
    errors,
    durationMs: Date.now() - startTime,
    timestamp: Date.now(),
    buildType,
    firstProbedIps,
    firstErrors,
  };

  return { rooms: foundRooms, summary };
}

/**
 * Finds a specific room code on the LAN:
 * - Up to 2 passes
 * - Stops immediately when a matching room (case-insensitive) is discovered
 * - Gives up after 8 s total timeout or signal abort
 */
export async function runFindByCode(
  code: string,
  candidates: string[],
  connector: SocketConnector,
  options: {
    port?: number;
    signal?: AbortSignal;
    onProgress?: (scanned: number, total: number) => void;
    maxPasses?: number;
    timeoutMs?: number;
  } = {},
  networkInfo: { ownIp: string | null; networkType: string } = { ownIp: null, networkType: 'unknown' }
): Promise<{ room: DiscoveredRoom | null; summary: DiscoveryDebugSummary }> {
  const targetCode = code.trim().toUpperCase();
  const maxPasses = options.maxPasses ?? 2;
  const timeoutMs = options.timeoutMs ?? 8000;
  const startTime = Date.now();

  const internalAbort = new AbortController();
  const combinedSignal = options.signal;

  const onCombinedAbort = () => internalAbort.abort();
  if (combinedSignal) {
    if (combinedSignal.aborted) internalAbort.abort();
    else combinedSignal.addEventListener('abort', onCombinedAbort);
  }

  const hardTimer = setTimeout(() => {
    internalAbort.abort();
  }, timeoutMs);

  let match: DiscoveredRoom | null = null;
  let totalCandidatesScanned = 0;
  let totalResponded = 0;
  const totalErrors = { timeout: 0, refused: 0, other: 0 };
  let collectedErrors: Array<{ host: string; error: string; code?: string }> = [];

  try {
    for (let pass = 1; pass <= maxPasses; pass++) {
      if (internalAbort.signal.aborted || match) break;

      const { rooms, summary } = await runScanner(
        candidates,
        connector,
        {
          port: options.port,
          signal: internalAbort.signal,
          onProgress: options.onProgress,
          onFound: (room) => {
            if (room.room.trim().toUpperCase() === targetCode) {
              match = room;
              internalAbort.abort(); // Stop remaining probes immediately
            }
          },
        },
        networkInfo
      );

      totalCandidatesScanned += summary.candidates;
      totalResponded += summary.responded;
      totalErrors.timeout += summary.errors.timeout;
      totalErrors.refused += summary.errors.refused;
      totalErrors.other += summary.errors.other;
      if (summary.firstErrors && collectedErrors.length < 5) {
        collectedErrors = [...collectedErrors, ...summary.firstErrors].slice(0, 5);
      }

      if (match) break;
    }
  } finally {
    clearTimeout(hardTimer);
    if (combinedSignal) {
      combinedSignal.removeEventListener('abort', onCombinedAbort);
    }
  }

  const buildType =
    typeof (globalThis as any).__DEV__ !== 'undefined'
      ? (globalThis as any).__DEV__
        ? 'DEBUG'
        : 'RELEASE'
      : typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
      ? 'RELEASE'
      : 'DEBUG';

  const summary: DiscoveryDebugSummary = {
    ownIp: networkInfo.ownIp,
    networkType: networkInfo.networkType,
    candidates: totalCandidatesScanned,
    responded: totalResponded,
    errors: totalErrors,
    durationMs: Date.now() - startTime,
    timestamp: Date.now(),
    buildType,
    firstProbedIps: candidates.slice(0, 5),
    firstErrors: collectedErrors,
  };

  return { room: match, summary };
}
