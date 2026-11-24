import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { AdventureJsonV1Schema } from "@codex/adventure-engine";
import {
  collectForbiddenLeaks,
  collectUnexpectedReveals,
  buildStepRequest,
  escapeMarkdownOutput,
  formatHardFailuresBlock,
  getEffortValidationHint,
  parseDirectorTreatment,
  reportMarkdown,
} from "./adventure-effort-eval";
import { session } from "../packages/adventure-engine/tests/reducer-fixtures";

describe("adventure-effort-eval Director treatment", () => {
  it("accepts explicit on and off modes and rejects unknown values", () => {
    expect(parseDirectorTreatment("on")).toBe(true);
    expect(parseDirectorTreatment("off")).toBe(false);
    expect(() => parseDirectorTreatment("disabled")).toThrow(
      "Director treatment must be on or off.",
    );
  });
});

describe("adventure-effort-eval source-focused context", () => {
  const adventure = AdventureJsonV1Schema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/adventures/reference-one-shot/adventure.v1.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

  it("retrieves authored source scenes and actors named by each golden step", () => {
    const request = buildStepRequest(
      {
        id: "inspect-yard-ledger",
        sourceRefs: ["ros-scene-2-yard"],
        expectedBeats: [],
      },
      2,
      session(),
      adventure,
    );

    expect(
      request.adventurePackage.playerSafe.map((excerpt) => excerpt.id),
    ).toContain("ros-scene-2-yard");
    expect(
      request.adventurePackage.gmOnly.map((excerpt) => excerpt.id),
    ).toContain("secret-ledger-lock");
  });

  it("includes both source and destination scenes for an action that crosses them", () => {
    const request = buildStepRequest(
      {
        id: "pull-the-lever",
        sourceRefs: ["ros-scene-3-wheel-room", "ros-scene-4-cellar"],
        expectedBeats: [],
      },
      5,
      session(),
      adventure,
    );

    const includedIds = [
      ...request.adventurePackage.playerSafe,
      ...request.adventurePackage.gmOnly,
    ].map((excerpt) => excerpt.id);
    expect(includedIds).toContain("ros-scene-3-wheel-room");
    expect(includedIds).toContain("ros-scene-4-cellar");
  });

  it("resolves source anchors to the matching NPC record", () => {
    const before = {
      ...session(),
      packageProgress: { sceneId: "ros-scene-4-cellar" },
    };
    const request = buildStepRequest(
      {
        id: "confront-tobiah",
        sourceRefs: ["ros-npc-tobiah"],
        expectedBeats: [],
      },
      7,
      before,
      adventure,
    );

    expect(
      [
        ...request.adventurePackage.playerSafe,
        ...request.adventurePackage.gmOnly,
      ].map((excerpt) => excerpt.id),
    ).toContain("actor-tobiah-reed");
    expect(
      request.adventurePackage.gmOnly.map((excerpt) => excerpt.id),
    ).toContain("secret-tobiah-motive");
  });
});

describe("adventure-effort-eval validation diagnostics", () => {
  it("captures a bounded validation hint for low effort only", () => {
    const error = Object.assign(new Error("invalid-adventure-response"), {
      validationHint: "narration: expected non-empty string",
    });
    expect(getEffortValidationHint(error, "low")).toBe(
      "narration: expected non-empty string",
    );
    expect(getEffortValidationHint(error, "medium")).toBeUndefined();
    expect(
      getEffortValidationHint(
        Object.assign(new Error("invalid-adventure-response"), {
          validationHint: "x".repeat(500),
        }),
        "low",
      ),
    ).toHaveLength(300);
  });

  it("does not expose a hint for unrelated failures or unannotated errors", () => {
    expect(
      getEffortValidationHint(new Error("provider-failed"), "low"),
    ).toBeUndefined();
    expect(
      getEffortValidationHint(
        Object.assign(new Error("provider-failed"), { validationHint: "bad" }),
        "low",
      ),
    ).toBeUndefined();
    expect(getEffortValidationHint("not an error", "low")).toBeUndefined();
  });
});

describe("adventure-effort-eval markdown escaping", () => {
  it("escapes markdown images, HTML tags, and backslashes before image markers", () => {
    expect(
      escapeMarkdownOutput(
        '![ping](https://evil.example/a.png) \\![bypass](https://evil.example/b.png) <img src="https://evil.example/c.png">',
      ),
    ).toBe(
      '\\![ping](https://evil.example/a.png) \\\\\\![bypass](https://evil.example/b.png) &lt;img src="https://evil.example/c.png"&gt;',
    );
  });

  it("returns no hard-failure block when hardFailures is empty", () => {
    expect(formatHardFailuresBlock([])).toEqual([]);
  });

  it("keeps image payloads in revealSecretIds as literal escaped text in results.md", () => {
    const hardFailures: string[] = [];
    const mdImagePayload = "![leak](https://evil.example/reveal.png)";
    const htmlImagePayload = '<img src="https://evil.example/reveal.svg">';
    const step = {
      id: "step-1-dock",
      sourceRefs: [],
      expectedBeats: [],
      revealOnSuccess: ["sec-allowed"],
    };

    const unexpected = collectUnexpectedReveals(
      step,
      [],
      {
        kind: "complete",
        narration: "You inspect the ledger.",
        revealSecretIds: ["sec-allowed", mdImagePayload, htmlImagePayload],
      },
      hardFailures,
    );

    expect(unexpected).toEqual([mdImagePayload, htmlImagePayload]);
    expect(hardFailures).toHaveLength(1);

    const markdown = reportMarkdown(
      {
        id: "test-fixture",
        title: "Test Adventure: Luna effort comparison",
        playerCharacter: { name: "Vale", description: "Scout" },
        rollOutcome: { kind: "total", value: 14, label: "Success" },
        runs: [step],
        scoringGuidance: { hardFailures: [] },
      },
      [
        {
          effort: "low",
          repeat: 1,
          passed: false,
          rubric: { passed: true },
          hardFailures,
          calls: [{ requestedEffort: "low", elapsedMs: 120 }],
          turns: [
            {
              id: "step-1-dock",
              playerAction: "Check the ledger.",
              narration: "You inspect the ledger.",
              proposal: {
                kind: "complete",
                narration: "You inspect the ledger.",
              },
              expectedBeats: [],
              forbiddenFactLeaks: [],
              unexpectedRevealIds: unexpected,
              committed: true,
              repairCount: 0,
              calls: [{ requestedEffort: "low", elapsedMs: 120 }],
            },
          ],
        },
      ],
      "http://127.0.0.1:8787",
      "https://codexcryptica.com",
      { rollOutcome: { kind: "total", value: 14, label: "Success" } },
      "2026-11-21T00:00:00.000Z",
    );

    expect(markdown).toContain("### Hard failures");
    expect(markdown).toContain("\\![leak](https://evil.example/reveal.png)");
    expect(markdown).toContain(
      '&lt;img src="https://evil.example/reveal.svg"&gt;',
    );
    expect(markdown).not.toMatch(/(^|[^\\])!\[leak\]/);
    expect(markdown).not.toContain("<img");
  });
});

describe("adventure-effort-eval global secrecy constraints", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../fixtures/adventures/reference-one-shot/effort-golden-set.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Parameters<typeof collectForbiddenLeaks>[1];
  const adventure = JSON.parse(
    readFileSync(
      new URL(
        "../fixtures/adventures/reference-one-shot/adventure.v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Parameters<typeof collectForbiddenLeaks>[2];

  it("catches the golden opening secret phrase without step-specific forbiddenFacts", () => {
    const failures: string[] = [];
    const { forbiddenFactLeaks } = collectForbiddenLeaks(
      { id: "opening", sourceRefs: [], expectedBeats: [], revealOnSuccess: [] },
      fixture,
      adventure,
      ["Someone filed through from the inside to sabotage the mill."],
      failures,
      [],
    );
    expect(forbiddenFactLeaks).toContain(
      'secret-filed-pin: "filed through from the inside"',
    );
    expect(failures).toEqual([
      expect.stringContaining("opening: forbidden secret phrase leaked"),
    ]);
  });

  it("allows a reveal on its earned step while still checking other global secrets", () => {
    const step = {
      id: "inspect-yard-ledger",
      sourceRefs: [],
      expectedBeats: [],
      revealOnSuccess: ["secret-ledger-lock"],
    };
    const failures: string[] = [];
    const allowed = collectForbiddenLeaks(
      step,
      fixture,
      adventure,
      ["The sluice pin was sabotaged."],
      failures,
      [],
    );
    expect(allowed.forbiddenFactLeaks).toEqual([]);
    expect(failures).toEqual([]);

    const blocked = collectForbiddenLeaks(
      step,
      fixture,
      adventure,
      ["Someone filed through from the inside."],
      failures,
      [],
    );
    expect(blocked.forbiddenFactLeaks).toContain(
      'secret-filed-pin: "filed through from the inside"',
    );
    expect(failures).toHaveLength(1);
  });

  it("does not penalise information disclosed on an earlier turn", () => {
    const failures: string[] = [];
    const result = collectForbiddenLeaks(
      { id: "later", sourceRefs: [], expectedBeats: [] },
      fixture,
      adventure,
      ["Someone filed through from the inside."],
      failures,
      ["secret-filed-pin"],
    );
    expect(result.forbiddenFactLeaks).toEqual([]);
    expect(failures).toEqual([]);
  });

  it("keeps a golden reveal available to later turns and accepts its repeated reveal ID", () => {
    const previouslyRevealedIds = ["secret-ledger-lock"];
    const failures: string[] = [];
    const result = collectForbiddenLeaks(
      { id: "negotiate-with-wick", sourceRefs: [], expectedBeats: [] },
      fixture,
      adventure,
      ["The ledger still shows a lock fitted to the sluice pin."],
      failures,
      previouslyRevealedIds,
    );
    expect(result.forbiddenFactLeaks).toEqual([]);

    const unexpected = collectUnexpectedReveals(
      { id: "negotiate-with-wick", sourceRefs: [], expectedBeats: [] },
      [],
      {
        kind: "complete",
        narration: "The ledger still shows the lock on the sluice pin.",
        revealSecretIds: previouslyRevealedIds,
      },
      failures,
      previouslyRevealedIds,
    );

    expect(unexpected).toEqual([]);
    expect(failures).toEqual([]);
  });
});
