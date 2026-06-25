/**
 * Detects a degenerate "diagonal slash" layout — every node collapsed onto a
 * near-straight line (classically y ≈ x). fcose's spectral, non-randomized
 * initialization can converge on two nearly-identical eigenvectors for some
 * graphs and persist positions with no real 2D spread; once saved, plain
 * fit/incremental passes just re-display the slash and it never heals.
 *
 * We measure the covariance of the supplied positions and flag them when the
 * minor axis is negligible relative to the major axis. Small graphs (which can
 * legitimately be collinear) and coincident-point clouds are intentionally
 * ignored.
 *
 * Standalone (no internal imports) so both the transformer — which strips
 * degenerate saved coordinates at build time — and the LayoutManager — which
 * re-solves a degenerate runtime layout — can share it without an import cycle.
 */
export function isLayoutCollinear(
  positions: { x: number; y: number }[],
  minNodes = 12,
  // A healthy fcose layout is roughly round (minor/major axis ratio ≥ 0.5).
  // A degenerate slash sits near 0, and an incremental solve over a slash only
  // nudges it to ~0.1 — so a threshold well inside the empty 0.1–0.5 gap heals
  // partially-collapsed layouts too, instead of missing them by a hair.
  ratioThreshold = 0.12,
): boolean {
  const n = positions.length;
  if (n < minNodes) return false;

  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += positions[i].x;
    my += positions[i].y;
  }
  mx /= n;
  my /= n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = positions[i].x - mx;
    const dy = positions[i].y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const trace = sxx + syy;
  // All nodes coincident — not a slash; the all-at-origin path covers this.
  if (trace < 1e-6) return false;

  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
  const lambdaMax = (trace + disc) / 2;
  const lambdaMin = (trace - disc) / 2;
  if (lambdaMax <= 0) return false;

  return lambdaMin / lambdaMax < ratioThreshold;
}
