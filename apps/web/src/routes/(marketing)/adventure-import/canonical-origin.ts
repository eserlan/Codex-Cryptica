/**
 * The production origin that every absolute link in the copyable prompt points
 * at. The staging build is promoted to production as the same artifact, so the
 * prompt text cannot vary by environment.
 */
export const CANONICAL_ORIGIN = "https://codexcryptica.com";

const CANONICAL_HOSTNAME = new URL(CANONICAL_ORIGIN).hostname;

export function isCanonicalProductionHost(hostname: string): boolean {
  return hostname === CANONICAL_HOSTNAME;
}
