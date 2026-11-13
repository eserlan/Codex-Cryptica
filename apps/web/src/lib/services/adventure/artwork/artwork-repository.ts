import {
  applyArtworkCommand,
  type ArtworkCommand,
} from "@codex/adventure-artwork-engine";
import { readAdventureArtworkState } from "schema";
import type {
  ArtworkControlContext,
  ArtworkMutationResult,
  ArtworkSubject,
} from "./ports";

type Session = {
  id: string;
  vaultId: string;
  revision: number;
  artwork?: unknown;
};
interface SessionArtworkDependencies<T extends Session> {
  load(context: ArtworkControlContext): Promise<T | null>;
  verify(session: T): Promise<void>;
  isKnownSubject(session: T, subject: ArtworkSubject): boolean;
  save(
    expectedRevision: number,
    session: T,
  ): Promise<{ ok: true; session: T } | { ok: false; error: Error }>;
}
/** Session-local mutations only; canonical entity writes require their own lock-backed adapter. */
export class ArtworkRepository<T extends Session> {
  constructor(private readonly deps: SessionArtworkDependencies<T>) {}
  // fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
  async mutate(
    subject: ArtworkSubject,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ): Promise<ArtworkMutationResult> {
    if (subject.kind === "entity")
      return { ok: false, reason: "canonical-adapter-required" };
    try {
      const session = await this.deps.load(context);
      if (
        !session ||
        session.id !== context.sessionId ||
        session.vaultId !== context.vaultId ||
        session.revision !== context.expectedRevision
      )
        return { ok: false, reason: "stale-adventure" };
      if (!this.deps.isKnownSubject(session, subject))
        return { ok: false, reason: "unknown-subject" };
      const parsed = readAdventureArtworkState(session.artwork);
      if (parsed.kind === "opaque")
        return { ok: false, reason: "unsupported-artwork" };
      const state =
        parsed.kind === "known"
          ? parsed.value
          : { version: 1 as const, associations: [] };
      const index = state.associations.findIndex(
        (entry) =>
          entry.subject.kind === subject.kind &&
          entry.subject.id === subject.id,
      );
      if (index < 0 && state.associations.length >= 200)
        return { ok: false, reason: "artwork-capacity" };
      const result = applyArtworkCommand(
        index < 0 ? { version: 1 } : state.associations[index].association,
        command,
      );
      if (!result.ok) return result;
      const associations = state.associations.slice();
      const nextEntry = { subject, association: result.association };
      if (index < 0) associations.push(nextEntry);
      else associations[index] = nextEntry;
      await this.deps.verify(session);
      const saved = await this.deps.save(session.revision, {
        ...session,
        revision: session.revision + 1,
        artwork: { ...state, associations },
      });
      return saved.ok
        ? { ok: true, association: result.association }
        : { ok: false, reason: "save-failed" };
    } catch {
      return { ok: false, reason: "control-or-storage-failed" };
    }
  }
}
