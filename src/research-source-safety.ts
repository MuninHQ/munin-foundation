import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

function privateIpv4(value: string) {
  const p = value.split('.').map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  return p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] === 0;
}

function privateIpv6(value: string) {
  const normalized = value.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') ||
    normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
}

export function isPrivateAddress(value: string) {
  return isIP(value) === 4 ? privateIpv4(value) : isIP(value) === 6 ? privateIpv6(value) : false;
}

export type HostResolver = (hostname: string) => Promise<string[]>;
export const systemHostResolver: HostResolver = async hostname => (await lookup(hostname, {all:true})).map(item => item.address);

export async function assertSafePublicUrl(value: string, resolver: HostResolver = systemHostResolver) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) research targets are allowed.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Local research targets are blocked.');
  if (isPrivateAddress(host)) throw new Error('Private-network research targets are blocked.');
  if (!isIP(host)) {
    const addresses = await resolver(host);
    if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error('Research target resolves to a private or unavailable address.');
  }
  return url;
}
