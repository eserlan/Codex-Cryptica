import type { ArtworkCommand } from "@codex/adventure-artwork-engine";
import type {
  ArtworkControlContext,
  ArtworkMutationResult,
  ArtworkRepositoryPort,
  ArtworkSnapshotPort,
  ArtworkSubject,
} from "./ports";

/** Coordinates durable choices; the repository remains authoritative. */
export class ArtworkCommands {
  constructor(
    private readonly repository: Pick<ArtworkRepositoryPort, "mutate">,
    private readonly snapshots: ArtworkSnapshotPort,
  ) {}

  async apply(
    subject: ArtworkSubject,
    context: ArtworkControlContext,
    command: ArtworkCommand,
  ): Promise<ArtworkMutationResult> {
    try {
      return await this.repository.mutate(subject, command, context);
    } catch {
      return { ok: false, reason: "save-failed" };
    }
  }

  async keepVaultImage(
    subject: ArtworkSubject,
    context: ArtworkControlContext,
    source: Blob,
    signal: AbortSignal,
  ): Promise<ArtworkMutationResult> {
    if (signal.aborted) return { ok: false, reason: "cancelled" };
    let snapshot: Awaited<ReturnType<ArtworkSnapshotPort["preserve"]>>;
    try {
      snapshot = await this.snapshots.preserve(source, signal);
    } catch {
      return {
        ok: false,
        reason: signal.aborted ? "cancelled" : "preservation-failed",
      };
    }
    const result: ArtworkMutationResult = signal.aborted
      ? { ok: false, reason: "cancelled" }
      : await this.apply(subject, context, { kind: "keep", choice: snapshot });
    if (!result.ok) {
      // The reference scanner decides whether deletion is safe, including after
      // an ambiguous save failure or a concurrent reference from another owner.
      await this.snapshots.removeIfUnreferenced(snapshot.path).catch(() => {});
    }
    return result;
  }
}
