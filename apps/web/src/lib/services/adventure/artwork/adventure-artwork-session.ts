import type { AdventureSession } from "@codex/adventure-engine";
import type { AdventureControlLease } from "../adventure-control-lease";
import type { AdventureSaveResult } from "../adventure-session-repository";
import type { AdventureState } from "../../../stores/oracle/adventure-state.svelte";
import { ArtworkRepository } from "./artwork-repository";
import type { ArtworkCommand } from "@codex/adventure-artwork-engine";
import type { ArtworkControlContext, ArtworkSubject } from "./ports";

/** Connects local artwork controls to the active adventure's existing save boundary. */
export class AdventureArtworkSession {
  private readonly repository: ArtworkRepository<AdventureSession>;
  constructor(
    private readonly state: AdventureState,
    deps: {
      verify(lease: AdventureControlLease): Promise<boolean>;
      save(
        expectedRevision: number,
        session: AdventureSession,
      ): Promise<AdventureSaveResult>;
    },
  ) {
    const current = (session: AdventureSession) =>
      !state.readOnly &&
      (state.phase === "ready" || state.phase === "offline") &&
      state.session?.id === session.id &&
      state.session.vaultId === session.vaultId &&
      state.session.revision === session.revision;
    this.repository = new ArtworkRepository({
      load: async () => state.session,
      isKnownSubject: (session, subject) =>
        subject.kind === "place" &&
        !!session.places?.some(
          (place) => place.id === subject.id && !place.sourceRecordId,
        ),
      verify: async (session) => {
        const lease = state.lease;
        if (
          !current(session) ||
          !lease ||
          !(await deps.verify(lease)) ||
          state.lease !== lease ||
          !current(session)
        )
          throw new Error("control-lost");
      },
      save: async (revision, next) => {
        const saved = await deps.save(revision, next);
        if (
          saved.ok &&
          state.session?.id === next.id &&
          state.session.vaultId === next.vaultId &&
          state.session.revision === revision
        )
          state.session = saved.session;
        return saved;
      },
    });
  }
  mutate(
    subject: ArtworkSubject,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ) {
    return this.repository.mutate(subject, command, context);
  }
}
