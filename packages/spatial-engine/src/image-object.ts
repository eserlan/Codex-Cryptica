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
  return !Array.from(occupied).some((item) =>
    spatialImagesOverlap(candidate, item),
  );
}

export function nextSpatialImageZIndex(
  items: Iterable<Pick<SpatialImageTransform, "zIndex">>,
) {
  let max = -1;
  for (const item of items)
    if (Number.isFinite(item.zIndex)) max = Math.max(max, item.zIndex);
  return max + 1;
}
