import { describe, expect, it } from "vitest";
import {
  MAX_PACKAGE_PROGRESS_ENTRIES,
  parseAdventureSession,
  parseTurnProposal,
} from "../src/schemas";
import { applyCompletedTurn } from "../src/completed-turn";
import {
  applySecretReveals,
  hasImmutableScenarioRewrite,
} from "../src/scenario-secrets";
import { meta, now, proposal, scenario, session } from "./reducer-fixtures";

describe("scenario secret transitions", () => {
  it("guards truth, investigation text and bound GM events, while allowing identical updates", () => {
    const current = session();
    const item = scenario();
    item.events = [
      {
        id: "event",
        kind: "consequence",
        visibility: "gm",
        text: "The smugglers leave",
        at: now,
      },
    ];
    item.secretBindings.eventIds = { event: "event-secret" };
    current.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    for (const [id, text] of [
      ["truth-1", item.gmOnly.truth],
      ["investigated-1", item.gmOnly.ifInvestigated!],
      ["event-secret", item.events[0]!.text],
    ]) {
      const next = proposal();
      next.hiddenPatch.secrets.update = [
        { id: id!, text: text!, status: "hidden" },
      ];
      expect(hasImmutableScenarioRewrite(current, next)).toBe(false);
      next.hiddenPatch.secrets.update[0]!.text = "Replacement";
      expect(hasImmutableScenarioRewrite(current, next)).toBe(true);
    }
    expect(hasImmutableScenarioRewrite(session(), proposal())).toBe(false);
  });

  it("reveals legacy and structured secrets once, including structured-only bindings", () => {
    const candidate = session();
    candidate.scenarioCollection = {
      version: 1,
      items: [scenario()],
      focusedScenarioId: null,
    };
    const secrets = [
      { id: "legacy", text: "Hidden", status: "hidden" as const },
    ];
    expect(
      applySecretReveals(
        candidate,
        secrets,
        ["legacy", "truth-1", "truth-1"],
        "turn-1",
      ),
    ).toBeNull();
    expect(secrets[0]).toEqual({
      id: "legacy",
      text: "Hidden",
      status: "revealed",
      revealedOnTurnId: "turn-1",
    });
    expect(candidate.scenarioCollection.items[0]?.revealedSecretIds).toEqual([
      "truth-1",
    ]);
    expect(applySecretReveals(candidate, secrets, ["missing"], "turn-2")).toEqual({
      code: "unknown-secret",
      message: "Unknown secret: missing",
    });
  });
  it("rejects a 401st package reveal without persisting an unreadable session", () => {
    const previousIds = Array.from(
      { length: MAX_PACKAGE_PROGRESS_ENTRIES },
      (_, index) => `package-secret-${index}`,
    );
    const previous = parseAdventureSession({
      ...session(),
      sourcePackage: {
        packageId: "package-test",
        version: "1",
        formatVersion: "1",
        hash: "a".repeat(64),
      },
      packageProgress: {
        sceneId: "scene-start",
        revealedSecretIds: previousIds,
      },
    });
    const additionalSecret = "package-secret-400";
    const packageSecretTexts = { [additionalSecret]: "The next secret." };

    // Re-revealing an existing ID must remain idempotent at the limit.
    const duplicate = structuredClone(previous);
    expect(
      applySecretReveals(
        duplicate,
        [],
        [previousIds[0]!],
        "turn-duplicate",
        { [previousIds[0]!]: "Previously revealed." },
      ),
    ).toBeNull();
    expect(duplicate.packageProgress?.revealedSecretIds).toEqual(previousIds);

    const next = proposal();
    next.revealSecretIds = [additionalSecret];
    const rejected = applyCompletedTurn(previous, next, {
      ...meta,
      packageSecretTexts,
    });
    expect(rejected).toMatchObject({
      ok: false,
      errors: [
        {
          code: "state-budget-exceeded",
          message: expect.stringContaining("This turn was not saved"),
        },
      ],
    });
    expect(previous.packageProgress?.revealedSecretIds).toEqual(previousIds);
    expect(previous.turns).toHaveLength(0);
    expect(parseAdventureSession(previous).packageProgress?.revealedSecretIds).toEqual(
      previousIds,
    );
  });

  it("accepts the 400th package reveal and keeps the session parseable", () => {
    const previousIds = Array.from(
      { length: MAX_PACKAGE_PROGRESS_ENTRIES - 1 },
      (_, index) => `package-secret-${index}`,
    );
    const candidate = session();
    candidate.packageProgress = {
      sceneId: "scene-start",
      revealedSecretIds: previousIds,
    };
    const id = "package-secret-399";
    expect(
      applySecretReveals(candidate, [], [id], "turn-last", {
        [id]: "The last secret.",
      }),
    ).toBeNull();
    expect(candidate.packageProgress.revealedSecretIds).toHaveLength(
      MAX_PACKAGE_PROGRESS_ENTRIES,
    );
    expect(parseAdventureSession(candidate).packageProgress?.revealedSecretIds).toHaveLength(
      MAX_PACKAGE_PROGRESS_ENTRIES,
    );
  });

  it("preserves whitespace in package-authored secret IDs through proposal parsing and persistence", () => {
    const secretId = "  package-secret with spaces  ";
    const next = proposal();
    next.revealSecretIds = [secretId];
    const parsed = parseTurnProposal(next);
    expect(parsed.kind).toBe("complete");
    if (parsed.kind !== "complete") throw new Error("Expected a complete turn.");
    expect(parsed.revealSecretIds).toEqual([secretId]);

    const before = session();
    before.packageProgress = { sceneId: "scene-start" };
    const applied = applyCompletedTurn(before, parsed, {
      ...meta,
      packageSecretTexts: { [secretId]: "A hidden package truth." },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value.packageProgress?.revealedSecretIds).toEqual([secretId]);
    expect(applied.value.turns[0]?.revealedSecretIds).toEqual([secretId]);
    const reloaded = parseAdventureSession(applied.value);
    expect(reloaded.packageProgress?.revealedSecretIds).toEqual([secretId]);
  });

});
