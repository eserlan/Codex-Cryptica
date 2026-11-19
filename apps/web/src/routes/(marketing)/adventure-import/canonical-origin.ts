/**
 * The production origin that every absolute link in the copyable prompt points
 * at. The staging build is promoted to production as the same artifact, so the
 * prompt text cannot vary by environment.
 */
export const CANONICAL_ORIGIN = "https://codexcryptica.com";
