import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import { appEventBus } from "@codex/events";
import { JOURNAL_EVENTS } from "session-journal-engine";
import { GuestExporter } from "@codex/vault-engine";
import {
  buildStorySummaryRequest,
  createPlayerTranscript,
  type AdventureJsonV1,
} from "@codex/adventure-engine";
import AdventurePackageUnavailable from "#lib/components/oracle/adventure/AdventurePackageUnavailable.svelte";
import {
  PACKAGE_OTHER_VERSION_COPY,
  PACKAGE_UNAVAILABLE_COPY,
  describeAdventureStartFailure,
} from "#lib/services/adventure/adventure-start-failure.js";
import {
  adventureReviewMarkdown,
  copyDiagnosticSnapshot,
} from "#lib/services/adventure/adventure-review-capture.js";
import { AdventureManager } from "../adventure-manager.svelte";
import {
  dependencies,
  minimalPackage,
  packageRef,
  packageRefFor,
  referencePackageCache,
  rollProposal,
  startInput,
} from "./adventure-fixtures";
import { canaryReferencePackage } from "./gm-canary-fixture";
import { assertNoGmLeak, collectGmOnlyStrings } from "./gm-leak-harness";
import { createPlay, turn } from "./gm-play-support";

const fixtures: Array<[string, AdventureJsonV1]> = [
  ["minimal", minimalPackage],
  ["canary-reference", canaryReferencePackage],
];

describe.each(fixtures)("GM-only secrecy outputs: %s", (name, pkg) => {
  const guarded = collectGmOnlyStrings(pkg);
  let play: ReturnType<typeof createPlay>;

  afterEach(() => play?.stop());

  /** A started session with a discovery, a roll-required turn and 16 more turns. */
  async function playSession() {
    play = createPlay(pkg);
    play.queue.push(
      turn("Smoke drifts over the jetty.", {
        fact: {
          name: "Old Tam the ferryman",
          summary: "He pulls the ferry across the grey water.",
        },
      }),
    );
    await play.start();
    play.queue.push(rollProposal);
    await play.manager.submitAction("Cross the bridge");
    return play;
  }

  it("guards a non-empty set only when the package has GM-only content", () => {
    if (name === "minimal") expect(guarded).toEqual([]);
    else expect(guarded.length).toBeGreaterThan(10);
  });

  it("output 1: player transcript and archive view", async () => {
    await playSession();
    expect(play.manager.transcript!.turns.length).toBeGreaterThan(0);
    assertNoGmLeak(guarded, play.manager.transcript, "transcript");
    assertNoGmLeak(
      guarded,
      createPlayerTranscript(play.session),
      "archive transcript",
    );
  });

  it("output 2: visible state, facts, pending roll, error and roll result", async () => {
    await playSession();
    expect(play.session.pendingRoll).not.toBeNull();
    const roll = play.session.pendingRoll!;
    assertNoGmLeak(guarded, play.session.visibleState, "visible state");
    assertNoGmLeak(guarded, play.session.provisionalFacts, "facts");
    assertNoGmLeak(
      guarded,
      [roll.setupNarration, roll.uncertainty, roll.stakes],
      "pending roll",
    );
    await play.manager.rollCodexDice();
    expect(play.manager.lastRollResult).toBe("1d20 = 12");
    assertNoGmLeak(guarded, play.manager.errorMessage, "error message");
    assertNoGmLeak(guarded, play.manager.lastRollResult, "last roll result");
  });

  it("output 3: summary requests and the attached story notes", async () => {
    await playSession();
    await play.manager.rollCodexDice();
    for (let i = 0; i < 16; i += 1) await play.manager.submitAction("Walk on");
    const request = buildStorySummaryRequest(play.session);
    expect(play.requests.length > 0 || request !== undefined).toBe(true);
    const checked = [...play.requests, request].filter(Boolean);
    expect(checked.length).toBeGreaterThan(0);
    assertNoGmLeak(guarded, checked, "summary requests");
    assertNoGmLeak(guarded, play.session.storySoFar, "story so far");
  });

  it("output 4: JOURNAL:CAPTURE payloads", async () => {
    await playSession();
    await play.manager.rollCodexDice();
    // A probe proves the subscription is in place while the test plays.
    appEventBus.emit({
      type: JOURNAL_EVENTS.CAPTURE,
      domain: "journal",
      payload: { probe: true },
      metadata: { timestamp: 0 },
    } as any);
    expect(play.journal).toContainEqual({ probe: true });
    assertNoGmLeak(guarded, play.journal, "journal captures");
  });

  it("output 5: promotion notifications and entity drafts", async () => {
    await playSession();
    await play.promote();
    expect(play.drafts.length).toBeGreaterThan(0);
    expect(play.notices.length).toBeGreaterThan(0);
    assertNoGmLeak(guarded, play.notices, "notifications");
    assertNoGmLeak(guarded, play.drafts, "entity drafts");
  });

  describe("output 6: package recovery state", () => {
    function recovery(otherVersion: boolean) {
      let available = true;
      const stored = {
        hash: packageRef.hash,
        path: "",
        originFormat: "adventure-json/v1",
        package: pkg,
      };
      const packages = referencePackageCache(
        async () => (available ? stored : null),
        async () =>
          otherVersion
            ? [
                {
                  ...stored,
                  hash: "d".repeat(64),
                  package: { ...pkg, version: "2.0.0" },
                },
              ]
            : [],
      );
      const manager = new AdventureManager({
        ...dependencies(),
        packages,
      } as any);
      return {
        manager,
        async lose() {
          await manager.start({
            ...startInput,
            sourcePackage: packageRefFor(pkg),
          });
          available = false;
          await manager.submitAction("Cross the bridge");
        },
      };
    }

    it("fixed copy", () => {
      assertNoGmLeak(
        guarded,
        [
          PACKAGE_UNAVAILABLE_COPY,
          PACKAGE_OTHER_VERSION_COPY,
          describeAdventureStartFailure("package-unavailable"),
        ],
        "recovery copy",
      );
    });

    it.each([true, false])(
      "rendered panel, other version available: %s",
      async (otherVersion) => {
        const ctx = recovery(otherVersion);
        await ctx.lose();
        expect(ctx.manager.phase).toBe("package-unavailable");
        expect(ctx.manager.packageUnavailable).toEqual({
          otherVersionAvailable: otherVersion,
        });
        const { container } = render(AdventurePackageUnavailable, {
          manager: ctx.manager,
        });
        const text = container.textContent ?? "";
        expect(text).toContain(PACKAGE_UNAVAILABLE_COPY);
        expect(text.includes(PACKAGE_OTHER_VERSION_COPY)).toBe(otherVersion);
        assertNoGmLeak(guarded, text, "package-unavailable panel");
      },
    );

    it("changed package (hash mismatch)", async () => {
      play = createPlay(pkg);
      await play.start();
      const session = play.session;
      await play.manager.close();
      const changed = referencePackageCache(async () => ({
        hash: "c".repeat(64),
        path: "",
        originFormat: "adventure-json/v1",
        package: pkg,
      }));
      const manager = new AdventureManager({ ...play.deps, packages: changed });
      await manager.open(session.vaultId, session.id);
      expect(manager.phase).toBe("package-unavailable");
      const { container } = render(AdventurePackageUnavailable, { manager });
      assertNoGmLeak(guarded, container.textContent, "changed-hash panel");
    });
  });

  it("output 7: guest export carries no package or session content", async () => {
    await playSession();
    await play.promote();
    const entities = [
      ...play.drafts.map((draft, i) => ({
        id: `promoted-${i}`,
        title: draft.title,
        type: draft.type,
        content: (draft.data as { content: string }).content,
        labels: [],
        connections: [],
      })),
      {
        id: "unrelated",
        title: "Greywater Bend",
        type: "location",
        content: "A village.",
        labels: [],
        connections: [],
      },
    ];
    const bundle = GuestExporter.export({
      entities: entities as any,
      defaultVisibility: "visible",
      publishId: "publish-1",
      vaultTitle: "Vault",
      publisherVersion: "1",
    });
    expect(bundle.entities.length).toBe(entities.length);
    assertNoGmLeak(guarded, bundle, "guest export");
    const keys = new Set<string>();
    JSON.stringify(bundle, (key, value) => (keys.add(key), value));
    for (const forbidden of [
      "sourcePackage",
      "hiddenState",
      "adventureArtwork",
    ])
      expect(keys.has(forbidden)).toBe(false);
  });

  it("output 8: GM review copies are labelled GM-only", async () => {
    await playSession();
    expect(adventureReviewMarkdown(play.session)).toContain(
      "GM-only review copy",
    );
    expect(copyDiagnosticSnapshot(play.session, null).text).toContain(
      "GM-only diagnostic snapshot",
    );
  });
});

describe("GM-only secrecy outputs: follow-ups", () => {
  it.todo("start-screen package card (#4943) passes the GM leak harness");
});
