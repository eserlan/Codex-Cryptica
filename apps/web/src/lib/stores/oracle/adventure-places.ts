import {
  linkPlaceRecords,
  type AdventureSession,
} from "@codex/adventure-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";

/**
 * Ties the adventure's places to the Vault's location records before a turn is
 * generated, so the record of the place the player is in is sent as canon. The
 * result is attached to the in-memory session the turn is generated from and saved
 * by that turn's own save. Best effort: a missing Vault or a failed lookup leaves
 * the session as it was and never fails the turn.
 */
export class AdventurePlaceLinker {
  constructor(
    private readonly deps: Pick<
      Required<AdventureManagerDependencies>,
      "context"
    >,
  ) {}

  async link(session: AdventureSession): Promise<AdventureSession> {
    if (!session.places?.length) return session;
    try {
      const records = await this.deps.context.listPlaceRecords(session.vaultId);
      if (!records) return session;
      const places = linkPlaceRecords(session.places, records);
      return places ? { ...session, places } : session;
    } catch {
      return session;
    }
  }
}
