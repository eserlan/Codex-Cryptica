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
type ArtworkState = Extract<
  ReturnType<typeof readAdventureArtworkState>,
  { kind: "known" }
>["value"];

function sessionMatchesContext(
  session: Session | null,
  context: ArtworkControlContext,
): session is Session {
  return Boolean(
    session &&
    session.id === context.sessionId &&
    session.vaultId === context.vaultId &&
    session.revision === context.expectedRevision,
  );
}

function readArtworkState(
  session: Session,
):
  | { ok: true; state: ArtworkState }
  | { ok: false; reason: "unsupported-artwork" } {
  const parsed = readAdventureArtworkState(session.artwork);
  if (parsed.kind === "opaque") {
    return { ok: false, reason: "unsupported-artwork" };
  }
  const state =
    parsed.kind === "known"
      ? parsed.value
      : { version: 1 as const, associations: [] };
  return { ok: true, state };
}

type SessionArtworkSubject = Exclude<ArtworkSubject, { kind: "entity" }>;
type FailedMutation = Extract<ArtworkMutationResult, { ok: false }>;

function upsertAssociation(
  associations: ArtworkState["associations"],
  index: number,
  subject: SessionArtworkSubject,
  association: Extract<
    ReturnType<typeof applyArtworkCommand>,
    { ok: true }
  >["association"],
): ArtworkState["associations"] {
  const next = associations.slice();
  const entry = { subject, association };
  if (index < 0) next.push(entry);
  else next[index] = entry;
  return next;
}

function applySubjectCommand(
  state: ArtworkState,
  subject: SessionArtworkSubject,
  command: ArtworkCommand,
):
  | {
      ok: true;
      association: Extract<
        ReturnType<typeof applyArtworkCommand>,
        { ok: true }
      >["association"];
      artwork: ArtworkState;
    }
  | FailedMutation {
  const index = state.associations.findIndex(
    (entry) =>
      entry.subject.kind === subject.kind && entry.subject.id === subject.id,
  );
  if (index < 0 && state.associations.length >= 200) {
    return { ok: false, reason: "artwork-capacity" };
  }
  const current =
    index < 0 ? { version: 1 as const } : state.associations[index].association;
  const result = applyArtworkCommand(current, command);
  if (!result.ok) return result;
  return {
    ok: true,
    association: result.association,
    artwork: {
      ...state,
      associations: upsertAssociation(
        state.associations,
        index,
        subject,
        result.association,
      ),
    },
  };
}

/** Session-local mutations only; canonical entity writes require their own lock-backed adapter. */
export class ArtworkRepository<T extends Session> {
  constructor(private readonly deps: SessionArtworkDependencies<T>) {}
  private async loadValidSession(
    subject: SessionArtworkSubject,
    context: ArtworkControlContext,
  ): Promise<{ ok: true; session: T } | FailedMutation> {
    const session = await this.deps.load(context);
    if (!session || !sessionMatchesContext(session, context)) {
      return { ok: false, reason: "stale-adventure" };
    }
    if (!this.deps.isKnownSubject(session, subject)) {
      return { ok: false, reason: "unknown-subject" };
    }
    return { ok: true, session };
  }
  private async commitSessionArtwork(
    session: T,
    artwork: ArtworkState,
    association: Extract<
      ReturnType<typeof applyArtworkCommand>,
      { ok: true }
    >["association"],
  ): Promise<ArtworkMutationResult> {
    await this.deps.verify(session);
    const saved = await this.deps.save(session.revision, {
      ...session,
      revision: session.revision + 1,
      artwork,
    });
    return saved.ok
      ? { ok: true, association }
      : { ok: false, reason: "save-failed" };
  }
  private async executeMutation(
    subject: SessionArtworkSubject,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ): Promise<ArtworkMutationResult> {
    const loaded = await this.loadValidSession(subject, context);
    if (!loaded.ok) return loaded;
    const parsed = readArtworkState(loaded.session);
    if (!parsed.ok) return parsed;
    const updated = applySubjectCommand(parsed.state, subject, command);
    if (!updated.ok) return updated;
    return await this.commitSessionArtwork(
      loaded.session,
      updated.artwork,
      updated.association,
    );
  }
  async mutate(
    subject: ArtworkSubject,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ): Promise<ArtworkMutationResult> {
    if (subject.kind === "entity") {
      return { ok: false, reason: "canonical-adapter-required" };
    }
    try {
      return await this.executeMutation(subject, command, context);
    } catch {
      return { ok: false, reason: "control-or-storage-failed" };
    }
  }
}
