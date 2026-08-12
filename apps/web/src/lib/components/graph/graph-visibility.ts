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
