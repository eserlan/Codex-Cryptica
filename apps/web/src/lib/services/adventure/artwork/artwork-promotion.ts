export type PromotionArtworkChoice =
  | { mode: "dismissed" }
  | {
      mode: "catalogue";
      assetId: string;
      variantUrl: string;
      sha256: string;
    }
  | {
      mode: "snapshot";
      path: string;
      mime: "image/png" | "image/jpeg" | "image/webp";
      bytes: number;
      width: number;
      height: number;
      sha256: string;
    };

export interface PromotePersonArtworkInput {
  personId: string;
  targetEntityId: string;
  localChoice?: PromotionArtworkChoice;
  canonicalArtwork?: PromotionArtworkChoice;
  conflictResolution?: "keep-local" | "keep-canonical";
}

export interface PromotePersonArtworkPorts {
  saveCanonical(
    entityId: string,
    choice: PromotionArtworkChoice,
  ): Promise<{ ok: boolean }>;
  saveLocal(personId: string, entityId: string): Promise<{ ok: boolean }>;
}

export type PromotePersonArtworkResult =
  | { status: "promoted" }
  | { status: "conflict" }
  | { status: "retryable-failure" };

/** Promote local person artwork onto a canonical entity by exact ID, never by title. */
export async function promotePersonArtwork(
  input: PromotePersonArtworkInput,
  ports: PromotePersonArtworkPorts,
): Promise<PromotePersonArtworkResult> {
  if (!input.personId.trim() || !input.targetEntityId.trim()) {
    return { status: "retryable-failure" };
  }

  if (
    input.localChoice &&
    input.canonicalArtwork &&
    !input.conflictResolution
  ) {
    return { status: "conflict" };
  }

  const chosen =
    input.conflictResolution === "keep-canonical"
      ? input.canonicalArtwork
      : (input.localChoice ?? input.canonicalArtwork);

  if (chosen && chosen !== input.canonicalArtwork) {
    const canonicalResult = await ports.saveCanonical(
      input.targetEntityId,
      chosen,
    );
    if (!canonicalResult.ok) {
      return { status: "retryable-failure" };
    }
  }

  const localResult = await ports.saveLocal(
    input.personId,
    input.targetEntityId,
  );
  return localResult.ok
    ? { status: "promoted" }
    : { status: "retryable-failure" };
}
