/**
 * Pure TypeScript, zero-dependency IPv4 and IPv6 CIDR Subnet Matcher (#2864).
 *
 * Designed to execute in any environment (Cloudflare Workers / Pages runtime,
 * Bun, Node.js, browser) without external libraries.
 */

/**
 * Normalise an IP address string:
 * - strips surrounding whitespace
 * - extracts IPv4 from IPv4-mapped IPv6 addresses (e.g., `::ffff:192.0.2.1` -> `192.0.2.1`)
 */
export function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip || typeof ip !== "string") return null;
  const trimmed = ip.trim().toLowerCase();
  if (trimmed.startsWith("::ffff:") && trimmed.includes(".")) {
    return trimmed.slice(7);
  }
  return trimmed;
}

/**
 * Parse an IPv4 string into a 32-bit unsigned BigInt.
 * Returns null if the address is not a valid IPv4 address.
 */
export function parseIpv4(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let val = 0n;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const num = Number(part);
    if (num < 0 || num > 255) return null;
    val = (val << 8n) | BigInt(num);
  }
  return val;
}

/**
 * Parse an IPv6 string into a 128-bit unsigned BigInt.
 * Returns null if the address is not a valid IPv6 address.
 */
export function parseIpv6(ip: string): bigint | null {
  // Disallow IPv4 addresses or mixed notation here (handled by normalizeIp)
  if (ip.includes(".")) return null;

  // Split on "::"
  const doubleColonIndex = ip.indexOf("::");
  if (
    doubleColonIndex !== -1 &&
    ip.indexOf("::", doubleColonIndex + 2) !== -1
  ) {
    // Only one "::" allowed
    return null;
  }

  let leftParts: string[];
  let rightParts: string[];

  if (doubleColonIndex !== -1) {
    const leftStr = ip.slice(0, doubleColonIndex);
    const rightStr = ip.slice(doubleColonIndex + 2);
    leftParts = leftStr ? leftStr.split(":") : [];
    rightParts = rightStr ? rightStr.split(":") : [];
  } else {
    leftParts = ip.split(":");
    rightParts = [];
  }

  const totalParts = leftParts.length + rightParts.length;
  if (doubleColonIndex === -1 && totalParts !== 8) return null;
  if (doubleColonIndex !== -1 && totalParts > 7) return null;

  const missingZeros = 8 - totalParts;
  const fullParts = [
    ...leftParts,
    ...Array(missingZeros).fill("0"),
    ...rightParts,
  ];

  if (fullParts.length !== 8) return null;

  let val = 0n;
  for (const part of fullParts) {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    val = (val << 16n) | BigInt(parseInt(part, 16));
  }
  return val;
}

/**
 * Check if an IP address is contained within an IPv4 CIDR range.
 */
export function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [subnetStr, prefixLenStr] = cidr.split("/");
  if (!subnetStr || prefixLenStr === undefined) return false;

  const prefixLen = Number(prefixLenStr);
  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) return false;

  const ipVal = parseIpv4(ip);
  const subnetVal = parseIpv4(subnetStr);
  if (ipVal === null || subnetVal === null) return false;

  if (prefixLen === 0) return true;

  const mask = ((1n << 32n) - 1n) ^ ((1n << (32n - BigInt(prefixLen))) - 1n);
  return (ipVal & mask) === (subnetVal & mask);
}

/**
 * Check if an IP address is contained within an IPv6 CIDR range.
 */
export function isIpv6InCidr(ip: string, cidr: string): boolean {
  const [subnetStr, prefixLenStr] = cidr.split("/");
  if (!subnetStr || prefixLenStr === undefined) return false;

  const prefixLen = Number(prefixLenStr);
  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) return false;

  const ipVal = parseIpv6(ip);
  const subnetVal = parseIpv6(subnetStr);
  if (ipVal === null || subnetVal === null) return false;

  if (prefixLen === 0) return true;

  const mask = ((1n << 128n) - 1n) ^ ((1n << (128n - BigInt(prefixLen))) - 1n);
  return (ipVal & mask) === (subnetVal & mask);
}

/**
 * Check if an IP address (IPv4 or IPv6) matches a given CIDR notation.
 */
export function isIpInCidr(
  ip: string | null | undefined,
  cidr: string,
): boolean {
  const cleanIp = normalizeIp(ip);
  if (!cleanIp || !cidr) return false;

  if (cleanIp.includes(":") || cidr.includes(":")) {
    return isIpv6InCidr(cleanIp, cidr);
  }
  return isIpv4InCidr(cleanIp, cidr);
}

/**
 * Check if an IP address matches any of the given CIDR ranges.
 */
export function isIpInCidrs(
  ip: string | null | undefined,
  cidrs: readonly string[],
): boolean {
  const cleanIp = normalizeIp(ip);
  if (!cleanIp || !Array.isArray(cidrs) || cidrs.length === 0) return false;

  const isV6 = cleanIp.includes(":");

  for (const cidr of cidrs) {
    const cidrIsV6 = cidr.includes(":");
    if (isV6 !== cidrIsV6) continue;

    if (isV6 ? isIpv6InCidr(cleanIp, cidr) : isIpv4InCidr(cleanIp, cidr)) {
      return true;
    }
  }

  return false;
}
