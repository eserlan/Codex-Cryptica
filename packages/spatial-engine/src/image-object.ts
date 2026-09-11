export interface SpatialImageTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export type SpatialImagePlacement = Pick<
  SpatialImageTransform,
  "x" | "y" | "width" | "height"
>;

export function normalizeSpatialImageTransform(
  value: Partial<SpatialImageTransform>,
  fallback: SpatialImageTransform = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    zIndex: 0,
  },
): SpatialImageTransform {
  return {
    x: Number.isFinite(value.x) ? value.x! : fallback.x,
    y: Number.isFinite(value.y) ? value.y! : fallback.y,
    width:
      Number.isFinite(value.width) && value.width! >= 0
        ? value.width!
        : fallback.width,
    height:
      Number.isFinite(value.height) && value.height! >= 0
        ? value.height!
        : fallback.height,
    rotation: Number.isFinite(value.rotation)
      ? value.rotation!
      : fallback.rotation,
    zIndex: Number.isFinite(value.zIndex) ? value.zIndex! : fallback.zIndex,
  };
}

/** Axis-aligned collision used by hard-edge placement. Rotation deliberately remains visual-only. */
export function spatialImagesOverlap(
  first: SpatialImagePlacement,
  second: SpatialImagePlacement,
) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

export function canPlaceSpatialImage(
  candidate: SpatialImagePlacement,
  occupied: Iterable<SpatialImagePlacement>,
) {
  for (const item of occupied) {
    if (spatialImagesOverlap(candidate, item)) {
      return false;
    }
  }
  return true;
}

function rangesNear(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  threshold: number,
) {
  return aStart - threshold <= bEnd && bStart - threshold <= aEnd;
}

/**
 * Snaps a candidate placement to align edge-to-edge with nearby occupied
 * rects, independently per axis. X snapping is only considered against a
 * rect whose vertical range is near the candidate's (i.e. plausibly the same
 * "row"), and Y snapping only against a rect whose horizontal range is near
 * (plausibly the same "column") — this keeps tiles from magnetically
 * snapping to a distant, unrelated tile's edge.
 */
export function snapToNeighborTiles(
  candidate: SpatialImagePlacement,
  occupied: Iterable<SpatialImagePlacement>,
  threshold: number,
): { x: number; y: number } {
  const cLeft = candidate.x;
  const cRight = candidate.x + candidate.width;
  const cTop = candidate.y;
  const cBottom = candidate.y + candidate.height;

  let bestX: { value: number; dist: number } | null = null;
  let bestY: { value: number; dist: number } | null = null;

  for (const tile of occupied) {
    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    if (rangesNear(cTop, cBottom, tTop, tBottom, threshold)) {
      for (const x of [
        tLeft - candidate.width, // candidate's right edge touches tile's left edge
        tRight, // candidate's left edge touches tile's right edge
        tLeft, // left-aligned
        tRight - candidate.width, // right-aligned
      ]) {
        const dist = Math.abs(x - candidate.x);
        if (dist <= threshold && (!bestX || dist < bestX.dist)) {
          bestX = { value: x, dist };
        }
      }
    }

    if (rangesNear(cLeft, cRight, tLeft, tRight, threshold)) {
      for (const y of [
        tTop - candidate.height, // candidate's bottom edge touches tile's top edge
        tBottom, // candidate's top edge touches tile's bottom edge
        tTop, // top-aligned
        tBottom - candidate.height, // bottom-aligned
      ]) {
        const dist = Math.abs(y - candidate.y);
        if (dist <= threshold && (!bestY || dist < bestY.dist)) {
          bestY = { value: y, dist };
        }
      }
    }
  }

  return {
    x: bestX ? bestX.value : candidate.x,
    y: bestY ? bestY.value : candidate.y,
  };
}

export function nextSpatialImageZIndex(
  items: Iterable<Pick<SpatialImageTransform, "zIndex">>,
) {
  let max = -1;
  for (const item of items)
    if (Number.isFinite(item.zIndex)) max = Math.max(max, item.zIndex);
  return max + 1;
}
