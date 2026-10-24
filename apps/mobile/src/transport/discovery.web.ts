/**
 * Web stub for discovery.
 * Raw TCP/LAN scanning is not available in browser JavaScript.
 */
import { DiscoveredRoom, DiscoveryDebugSummary } from '@imposter/shared';

export type { DiscoveredRoom, DiscoveryDebugSummary };

let lastSuccessfulHostIp: string | null = null;

export function getLastSuccessfulHost(): string | null {
  return lastSuccessfulHostIp;
}

export function setLastSuccessfulHost(host: string | null): void {
  lastSuccessfulHostIp = host;
}

export const getLastKnownHostIp = getLastSuccessfulHost;
export const setLastKnownHostIp = setLastSuccessfulHost;

export function getLatestDebugSummary(): DiscoveryDebugSummary {
  return {
    ownIp: null,
    networkType: 'WEB_BROWSER',
    candidates: 0,
    responded: 0,
    errors: { timeout: 0, refused: 0, other: 0 },
    durationMs: 0,
    timestamp: Date.now(),
    buildType: 'WEB',
    firstProbedIps: [],
    firstErrors: [],
  };
}

export async function getNetworkInfo(): Promise<{ ip: string | null; networkType: string }> {
  return { ip: null, networkType: 'WEB_BROWSER' };
}

export async function getLocalSubnet(): Promise<{ ip: string; subnet: string } | null> {
  return null;
}

export async function discover(): Promise<DiscoveredRoom[]> {
  return [];
}

export async function findByCode(): Promise<DiscoveredRoom | null> {
  return null;
}

export async function probeHost(): Promise<DiscoveredRoom | null> {
  return null;
}
