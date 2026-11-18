import { vi } from "vitest";
import { appEventBus } from "@codex/events";
import { JOURNAL_EVENTS } from "session-journal-engine";
import {
  buildStorySummaryRequest,
  createPlayerTranscript,
  parseAdventureSession,
  type AdventureJsonV1,
  type AdventureSession,
} from "@codex/adventure-engine";
import { AdventureManager } from "../adventure-manager.svelte";
import { AdventureSurfacePromotion } from "#lib/components/oracle/adventure/adventure-surface-promotion.js";
import {
  completeProposal,
  dependencies,
  packageCacheFor,
  packageRefFor,
  rollProposal,
  startInput,
} from "./adventure-fixtures";
import { assertNoGmLeak, collectGmOnlyStrings } from "./gm-leak-harness";

/** A complete proposal with its own narration and, optionally, scene move, secret or discovery. */
export function turn(
  narration: string,
  extra: {
    sceneId?: string;
    secret?: string;
    fact?: { name: string; summary: string };
  } = {},
) {
  return {
    ...completeProposal,
    narration,
    visiblePatch: {
      ...completeProposal.visiblePatch,
      ...(extra.sceneId ? { packageSceneId: extra.sceneId } : {}),
    },
    hiddenPatch: {
      ...completeProposal.hiddenPatch,
      secrets: {
        add: extra.secret
          ? [{ text: extra.secret, status: "hidden" as const }]
          : [],
        update: [],
        removeIds: [],
      },
    },
    provisionalFacts: extra.fact
      ? [
          {
            kind: "person" as const,
            visibility: "player-visible" as const,
            ...extra.fact,
          },
        ]
      : [],
  };
}

/** A manager over stubbed generation, summary, dice and storage, with every player output observable. */
export function createPlay(pkg: AdventureJsonV1) {
  const base = dependencies();
  const guarded = collectGmOnlyStrings(pkg);
  const requests: unknown[] = [];
  const journal: unknown[] = [];
  const notices: string[] = [];
  const drafts: Array<{ type: string; title: string; data: unknown }> = [];
  const titles: Array<{ id: string; title: string }> = [];
  const previews: string[] = [];
  const queue: any[] = [];
  let stored: AdventureSession | null = null;
  let turns = 0;
  let rejectAfterPreview = false;
  let manager: AdventureManager;

  const deps: any = {
    ...base,
    packages: packageCacheFor(pkg),
    repository: {
      ...base.repository,
      async save(_revision: number | null, session: AdventureSession) {
        stored = session;
        return { ok: true, session };
      },
      async savePinned(session: AdventureSession) {
        stored = session;
        return { ok: true, session };
      },
      async load() {
        return { condition: "normal", session: stored };
      },
    },
    generation: {
      generate: vi.fn(
        async (request: {
          phase?: string;
          onNarration?: (text: string) => void;
        }) => {
          request.onNarration?.("A lantern flickers at the road's end.");
          previews.push(manager.streamedNarration);
          if (rejectAfterPreview) {
            rejectAfterPreview = false;
            throw new Error("rejected after narration preview");
          }
          if (request.phase === "roll-resolution")
            return turn("The span holds long enough.");
          return queue.shift() ?? turn(`The road bends onward (${++turns}).`);
        },
      ),
    },
    summary: {
      summarize: vi.fn(async (request: { throughSequence: number }) => {
        requests.push(request);
        return { text: "Notes.", throughSequence: request.throughSequence };
      }),
    },
    dice: {
      evaluate: () => ({
        total: 12,
        parts: [{ type: "dice", value: 12, sides: 20, rolls: [12] }],
      }),
    },
  };
  manager = new AdventureManager(deps);
  const unsubscribe = appEventBus.subscribe(JOURNAL_EVENTS.CAPTURE, (event) => {
    journal.push(event.payload);
  });

  const promotion = () =>
    new AdventureSurfacePromotion({
      getSession: () => manager.session,
      getVaultId: () => startInput.vaultId,
      getEntities: () => titles,
      isReady: () => true,
      isAutoPromote: () => true,
      createEntity: async (type, title, data) => {
        drafts.push({ type, title, data });
        titles.push({ id: `entity-${titles.length}`, title });
        return `entity-${titles.length - 1}`;
      },
      linkPlaceRecord: async () => {},
      notify: (message) => notices.push(message),
    });

  return {
    deps,
    guarded,
    queue,
    requests,
    journal,
    notices,
    drafts,
    previews,
    rejectNextAfterPreview() {
      rejectAfterPreview = true;
    },
    get manager() {
      return manager;
    },
    get session(): AdventureSession {
      return manager.session!;
    },
    start: () =>
      manager.start({ ...startInput, sourcePackage: packageRefFor(pkg) }),
    /** Closes the manager and opens the saved session, as parsed back from its JSON, in a new one. */
    async reload() {
      const saved = parseAdventureSession(
        JSON.parse(JSON.stringify(manager.session)),
      );
      await manager.close();
      stored = saved;
      deps.packages = packageCacheFor(pkg);
      manager = new AdventureManager(deps);
      await manager.open(saved.vaultId, saved.id);
    },
    async promote() {
      const surface = promotion();
      await surface.addAll(manager.session!.provisionalFacts);
      await surface.autoPromote(titles.map((entry) => entry.title));
    },
    /** The player-facing outputs of the running session, each through the leak harness. */
    async checkPlayerOutputs(label: string) {
      const session = manager.session!;
      const check = (output: unknown, name: string) =>
        assertNoGmLeak(guarded, output, `${label}: ${name}`);
      check(manager.transcript, "transcript");
      if (!manager.recap) throw new Error("Expected player recap after start");
      check(manager.recap, "player recap");
      check(previews, "streamed narration previews");
      check(createPlayerTranscript(session), "archive transcript");
      check(session.visibleState, "visible state");
      check(session.provisionalFacts, "provisional facts");
      const roll = session.pendingRoll;
      check(
        roll && [roll.setupNarration, roll.uncertainty, roll.stakes],
        "pending roll",
      );
      check(manager.errorMessage, "error message");
      check(manager.lastRollResult, "last roll result");
      check(requests, "summary requests");
      check(session.storySoFar, "story so far");
      check(buildStorySummaryRequest(session), "story summary request");
      await this.promote();
      check(journal, "journal captures");
      check(notices, "notifications");
      check(drafts, "entity drafts");
    },
    stop() {
      unsubscribe();
    },
    rollProposal,
  };
}
