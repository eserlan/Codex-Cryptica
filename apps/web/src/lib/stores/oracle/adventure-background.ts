import { AdventureGroundingService } from "#lib/services/adventure/adventure-grounding-service.js";
import type {
  AdventureSession,
  GroundingContext,
} from "@codex/adventure-engine";
import {
  needsWorldEntryBackground,
  seedWorldEntryBackground,
} from "#lib/services/adventure/world-entry-background.js";
import type { RumourSelectionInput } from "generator-engine";
import { abortReason, isAbort } from "./adventure-generation.svelte";

/** Prepares optional world-entry rumours without committing partial state. */
export class AdventureBackground {
  constructor(
    private readonly idGenerator: () => string,
    private readonly grounding = new AdventureGroundingService(),
  ) {}
  private worldEntryRumourGenerator:
    | ((
        session: AdventureSession,
        signal: AbortSignal | undefined,
        context: GroundingContext,
      ) => Promise<RumourSelectionInput>)
    | undefined;

  setGenerator(
    generator: (
      session: AdventureSession,
      signal: AbortSignal | undefined,
      context: GroundingContext,
    ) => Promise<RumourSelectionInput>,
  ): void {
    this.worldEntryRumourGenerator = generator;
  }

  async prepare(
    session: AdventureSession,
    signal?: AbortSignal,
  ): Promise<AdventureSession> {
    if (!needsWorldEntryBackground(session)) return session;
    const batch = await this.generateWorldEntryRumourBatch(session, signal);
    if (signal?.aborted) throw abortReason(signal);
    try {
      return seedWorldEntryBackground(session, this.idGenerator, batch);
    } catch {
      return seedWorldEntryBackground(session, this.idGenerator);
    }
  }

  private async generateWorldEntryRumourBatch(
    session: AdventureSession,
    signal?: AbortSignal,
  ): Promise<RumourSelectionInput | undefined> {
    if (!this.worldEntryRumourGenerator) return undefined;
    if (signal?.aborted) throw abortReason(signal);
    // Retrieval errors must propagate; only optional generation may fall back.
    const context = await this.grounding.prepare(
      { session, purpose: "background" },
      signal,
    );
    try {
      const batch = await this.worldEntryRumourGenerator(
        session,
        signal,
        context,
      );
      if (signal?.aborted) throw abortReason(signal);
      return batch;
    } catch (cause) {
      if (isAbort(cause, signal)) throw cause;
      // A failed background generation must not interrupt an active adventure.
      return undefined;
    }
  }
}
