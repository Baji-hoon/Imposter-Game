/**
 * LAN Discovery for Imposter
 *
 * Scans local subnet for active Imposter HostServer instances using the lightweight probe protocol:
 * - Probe: {"v":1,"t":"probe"} -> Response: {"v":1,"t":"probe_ok",...}
 * - Concurrency 40, connect timeout 400 ms, total probe deadline 700 ms
 * - Candidate order:
 *     1. Last successful host (stored locally in memory / session)
 *     2. x.x.x.1 of own subnet (gateway / mobile hotspot host)
 *     3. Rest of own /24 skipping own IP
 * - Zero hardcoded IPs
 * - AbortController cancellation ensures all sockets are destroyed when navigating away or joining
 *
 * LIMITATION: Only the device's own /24 subnet is scanned. If the host is on another
 * subnet or VLAN, manual IP entry remains available as an Advanced option.
 */

import * as Network from 'expo-network';
import TcpSocket from 'react-native-tcp-socket';
import {
  DiscoveredRoom,
  DiscoveryDebugSummary,
  SocketConnector,
  generateCandidateIps,
  isValidIpv4,
  runScanner,
  runFindByCode,
  probeCandidate,
} from '@imposter/shared';

export type { DiscoveredRoom, DiscoveryDebugSummary };

// No-op compatibility helpers for previous wifi-binder references
export async function bindWifi(): Promise<{ bound: boolean }> {
  return { bound: false };
}
export async function unbindWifi(): Promise<void> {}

let lastSuccessfulHostIp: string | null = null;
let latestDebugSummary: DiscoveryDebugSummary = {
  ownIp: null,
  networkType: 'UNKNOWN',
  candidates: 0,
  responded: 0,
  errors: { timeout: 0, refused: 0, other: 0 },
  durationMs: 0,
  timestamp: 0,
};

export function getLastSuccessfulHost(): string | null {
  return lastSuccessfulHostIp;
}

export function setLastSuccessfulHost(host: string | null): void {
  if (host && isValidIpv4(host.trim())) {
    lastSuccessfulHostIp = host.trim();
  } else if (!host) {
    lastSuccessfulHostIp = null;
  }
}

// Backwards-compatible aliases
export const getLastKnownHostIp = getLastSuccessfulHost;
export const setLastKnownHostIp = setLastSuccessfulHost;

export function getLatestDebugSummary(): DiscoveryDebugSummary {
  return latestDebugSummary;
}

export interface NetworkInfo {
  ip: string | null;
  networkType: string;
  gateway: string | null;
  prefixLength: number | null;
  wifiBound: boolean;
  hasInternet: boolean;
}

/**
 * Retrieves own IP and network interface information from expo-network.
 */
export async function getNetworkInfo(): Promise<{ ip: string | null; networkType: string }> {
  let ip: string | null = null;
  let networkType = 'UNKNOWN';

  try {
    const rawIp = await Network.getIpAddressAsync();
    if (rawIp && isValidIpv4(rawIp) && rawIp !== '127.0.0.1') {
      ip = rawIp.trim();
    }
  } catch (err: any) {
    console.log(`[LAN Discovery] getIpAddressAsync error: ${err?.message}`);
  }

  try {
    const netState = await Network.getNetworkStateAsync();
    networkType = String(netState.type || (netState.isConnected ? 'CONNECTED' : 'DISCONNECTED'));
  } catch (err: any) {
    console.log(`[LAN Discovery] getNetworkStateAsync error: ${err?.message}`);
  }

  return { ip, networkType };
}

export async function getFullNetworkInfo(): Promise<NetworkInfo> {
  const { ip, networkType } = await getNetworkInfo();
  return {
    ip,
    networkType,
    gateway: null,
    prefixLength: null,
    wifiBound: false,
    hasInternet: true,
  };
}

/**
 * Backwards compatibility helper for screens reading subnet prefix.
 */
export async function getLocalSubnet(): Promise<{ ip: string; subnet: string } | null> {
  const { ip } = await getNetworkInfo();
  if (ip) {
    const parts = ip.split('.');
    return { ip, subnet: `${parts[0]}.${parts[1]}.${parts[2]}.` };
  }
  return null;
}

/**
 * Socket connector implementation using react-native-tcp-socket.
 */
const tcpSocketConnector: SocketConnector = (options) => {
  return TcpSocket.createConnection(
    {
      host: options.host,
      port: options.port,
      connectTimeout: options.connectTimeout ?? 400,
    },
    () => {}
  );
};

export interface DiscoverParams {
  onFound?: (room: DiscoveredRoom) => void;
  onProgress?: (scanned: number, total: number) => void;
  signal?: AbortSignal;
  port?: number;
}

/**
 * Discovers active Imposter rooms on the LAN:
 * - Candidate order: last successful host -> x.x.x.1 (gateway/hotspot) -> rest of own /24
 * - Concurrency 40, connect timeout 400 ms, deadline 700 ms
 * - Guaranteed socket cleanup on abort or complete
 */
export async function discover(params: DiscoverParams = {}): Promise<DiscoveredRoom[]> {
  const networkInfo = await getNetworkInfo();
  const candidates = generateCandidateIps(networkInfo.ip, lastSuccessfulHostIp);

  console.log(
    `[LAN Discovery] Starting scan. Own IP: ${networkInfo.ip ?? 'none'}, ` +
      `NetType: ${networkInfo.networkType}, Candidates: ${candidates.length}`
  );

  const { rooms, summary } = await runScanner(
    candidates,
    tcpSocketConnector,
    {
      onFound: (room) => {
        setLastSuccessfulHost(room.host);
        params.onFound?.(room);
      },
      onProgress: params.onProgress,
      signal: params.signal,
      port: params.port ?? 47777,
      concurrency: 40,
    },
    { ownIp: networkInfo.ip, networkType: networkInfo.networkType }
  );

  latestDebugSummary = summary;
  console.log(
    `[LAN Discovery] Scan finished in ${summary.durationMs}ms. Found: ${rooms.length}, ` +
      `Responded: ${summary.responded}, Errors: T=${summary.errors.timeout}/R=${summary.errors.refused}/O=${summary.errors.other}`
  );

  return rooms;
}

/**
 * Finds a specific 4-letter room code on the LAN:
 * - Stops immediately when a matching room (case-insensitive) is discovered
 * - Makes up to 2 passes
 * - Gives up after 8 s
 */
export async function findByCode(
  code: string,
  signal?: AbortSignal,
  options?: {
    port?: number;
    onProgress?: (scanned: number, total: number) => void;
    timeoutMs?: number;
    maxPasses?: number;
  }
): Promise<DiscoveredRoom | null> {
  const networkInfo = await getNetworkInfo();
  const candidates = generateCandidateIps(networkInfo.ip, lastSuccessfulHostIp);

  console.log(
    `[LAN Discovery] findByCode("${code}") started. Candidates: ${candidates.length}, ` +
      `NetType: ${networkInfo.networkType}`
  );

  const { room, summary } = await runFindByCode(
    code,
    candidates,
    tcpSocketConnector,
    {
      port: options?.port ?? 47777,
      signal,
      onProgress: options?.onProgress,
      maxPasses: options?.maxPasses ?? 2,
      timeoutMs: options?.timeoutMs ?? 8000,
    },
    { ownIp: networkInfo.ip, networkType: networkInfo.networkType }
  );

  latestDebugSummary = summary;

  if (room) {
    setLastSuccessfulHost(room.host);
    console.log(`[LAN Discovery] Found room ${room.room} at ${room.host}:${room.port}`);
  } else {
    console.log(
      `[LAN Discovery] findByCode("${code}") ended with no match (${summary.durationMs}ms)`
    );
  }

  return room;
}

/**
 * Probes a specific host directly.
 */
export async function probeHost(
  host: string,
  port = 47777,
  timeoutMs = 700,
  signal?: AbortSignal
): Promise<DiscoveredRoom | null> {
  const res = await probeCandidate(host, port, tcpSocketConnector, {
    connectTimeout: Math.min(400, timeoutMs),
    deadlineTimeout: timeoutMs,
    signal,
  });

  if (res.room) {
    setLastSuccessfulHost(res.room.host);
  }
  return res.room;
}

/**
 * Backward compatibility wrapper for scanForNearbyRoom.
 */
export async function scanForNearbyRoom(
  port = 47777,
  hintIp?: string,
  onProgress?: (scanned: number, total: number) => void
): Promise<DiscoveredRoom | null> {
  if (hintIp && isValidIpv4(hintIp)) {
    const direct = await probeHost(hintIp, port, 700);
    if (direct) return direct;
  }

  const rooms = await discover({
    port,
    onProgress,
  });

  return rooms.length > 0 ? rooms[0] : null;
}
