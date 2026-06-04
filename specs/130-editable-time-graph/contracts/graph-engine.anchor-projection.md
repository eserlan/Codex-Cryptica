# Contract: `graph-engine` — position↔year + anchor projection

Package: `packages/graph-engine`. Additions to `src/layouts/timeline.ts`.

## Exports

```ts
// Inverse of the forward sequential/gap-compressed layout.
export function getYearForPosition(
  position: number, // pixel on the primary axis
  ctx: {
    yearPositions: Record<number, number>; // from getSequentialYearPositions
    scale: number;
    minYear?: number;
  },
): number | null; // null ⇒ outside resolvable range (FR-012)

// Layout that places each projected anchor as its own point/span.
export function getAnchorTimelineLayout(
  anchors: ProjectedAnchor[],
  options: TimelineLayoutOptions,
): Record<string /* "entityId::anchorId" */, { x: number; y: number }>;
```

## Guarantees (test these)

1. **Round-trip stability**: for any year `Y` present in `yearPositions`, `getYearForPosition(yearPositions[Y], ctx) === Y` (R1, SC-008).
2. **Interpolation**: a position between two year stops resolves to the nearer year (boundary rounding deterministic).
3. **Out-of-range**: a position before the first / after the last stop beyond a tolerance returns `null` (FR-012).
4. **Per-anchor keys**: `getAnchorTimelineLayout` returns one entry per projected anchor, keyed `"<entityId>::<anchorId>"`, so the controller can recover `(entityId, anchorId)` on drag (R2, FR-009a).
5. **Determinism**: identical input → identical output; concurrent anchors at the same year are jitter-offset on the secondary axis (FR-029/FR-030), reusing existing jitter logic.
6. **No regression**: existing `getTimelineLayout`/`getSequentialYearPositions`/`hasTimelineDate` signatures and behaviour are unchanged (additive only).
