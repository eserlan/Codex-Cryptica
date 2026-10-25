export type GraphVisibilityReason =
  "document-hidden" | "surface-covered" | "offscreen" | null;

export interface GraphVisibilityInputs {
  documentVisible: boolean;
  surfaceCovered: boolean;
  containerIntersecting: boolean;
}

export interface GraphVisibilitySnapshot extends GraphVisibilityInputs {
  suspended: boolean;
  reason: GraphVisibilityReason;
}

export function resolveGraphVisibility(
  inputs: GraphVisibilityInputs,
): GraphVisibilitySnapshot {
  const reason: GraphVisibilityReason = !inputs.documentVisible
    ? "document-hidden"
    : inputs.surfaceCovered
      ? "surface-covered"
      : !inputs.containerIntersecting
        ? "offscreen"
        : null;

  return {
    ...inputs,
    suspended: reason !== null,
    reason,
  };
}

/** Compares both source inputs and their derived visibility policy. */
export function sameGraphVisibility(
  a: GraphVisibilitySnapshot,
  b: GraphVisibilitySnapshot,
): boolean {
  return (
    a.suspended === b.suspended &&
    a.reason === b.reason &&
    a.documentVisible === b.documentVisible &&
    a.surfaceCovered === b.surfaceCovered &&
    a.containerIntersecting === b.containerIntersecting
  );
}

/** Shared cancellation generation for layout and element-sync callbacks. */
export class GraphRenderActivity {
  generation = 0;
  elementSyncGeneration = 0;
  needsReconcile = false;

  constructor(private source: { readonly isSuspended: boolean }) {}

  deferWhileSuspended() {
    if (!this.source.isSuspended) return false;
    this.needsReconcile = true;
    return true;
  }

  isCurrent(generation: number) {
    return generation === this.generation && !this.source.isSuspended;
  }
}
