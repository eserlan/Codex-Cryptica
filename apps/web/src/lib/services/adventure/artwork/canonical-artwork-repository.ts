import {
  applyArtworkCommand,
  type ArtworkCommand,
} from "@codex/adventure-artwork-engine";
import { ArtworkAssociationSchema, artworkDataUnchanged } from "schema";
import type { ArtworkControlContext, ArtworkMutationResult } from "./ports";
interface Dependencies {
  lock<T>(key: string, action: () => Promise<T>): Promise<T>;
  verify(context: ArtworkControlContext): Promise<void>;
  read(
    vaultId: string,
    entityId: string,
  ): Promise<{ id: string; adventureArtwork?: unknown } | null>;
  update(
    entityId: string,
    patch: { adventureArtwork: unknown },
  ): Promise<boolean>;
}
/** Canonical preferences use entity-local partial updates inside shared exclusion. */
export class CanonicalArtworkRepository {
  constructor(private readonly deps: Dependencies) {}
  async mutate(
    entityId: string,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ): Promise<ArtworkMutationResult> {
    try {
      return await this.deps.lock(
        `adventure-artwork:${context.vaultId}:${entityId}`,
        async () => {
          await this.deps.verify(context);
          const entity = await this.deps.read(context.vaultId, entityId);
          if (!entity || entity.id !== entityId)
            return { ok: false, reason: "unknown-entity" };
          const raw = entity.adventureArtwork ?? { version: 1 };
          const parsed = ArtworkAssociationSchema.safeParse(raw);
          if (!parsed.success || !artworkDataUnchanged(parsed.data, raw))
            return { ok: false, reason: "unsupported-artwork" };
          const result = applyArtworkCommand(parsed.data, command);
          if (!result.ok) return result;
          await this.deps.verify(context);
          const saved = await this.deps.update(entityId, {
            adventureArtwork: result.association,
          });
          return saved
            ? { ok: true, association: result.association }
            : { ok: false, reason: "save-failed" };
        },
      );
    } catch {
      return { ok: false, reason: "control-lock-or-storage-failed" };
    }
  }
}
