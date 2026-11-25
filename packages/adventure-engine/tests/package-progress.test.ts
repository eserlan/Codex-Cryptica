import { describe, expect, it } from "vitest";
import { applyCompletedTurn, parseAdventureSession } from "../src";
import type { AdventureSession } from "../src";
import { meta, proposal, session } from "./reducer-fixtures";

const sceneIds = ["ros-scene-1-landing", "ros-scene-2-yard"];
const pin = {
  packageId: "reference-one-shot",
  version: "1.0.0",
  formatVersion: "adventure-json/v1",
  hash: "a".repeat(64),
};

function packageSession(): AdventureSession {
  return parseAdventureSession({
    ...session(),
    sourcePackage: pin,
    packageProgress: { sceneId: "ros-scene-1-landing" },
  });
}

function movedTo(sceneId: string) {
  const p = proposal();
  p.visiblePatch = { ...p.visiblePatch, packageSceneId: sceneId };
  return p;
}

function commit(
  s: AdventureSession,
  p = proposal(),
  packageSceneIds: readonly string[] = sceneIds,
) {
  const result = applyCompletedTurn(s, p, { ...meta, packageSceneIds });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("package scene progress", () => {
  it("moves to a scene that exists in the pinned package", () => {
    const next = commit(packageSession(), movedTo("ros-scene-2-yard"));
    expect(next.packageProgress).toEqual({ sceneId: "ros-scene-2-yard" });
    expect(next.turns[0]!.visiblePatch).not.toHaveProperty("packageSceneId");
    expect(() => parseAdventureSession(next)).not.toThrow();
  });

  it("commits but keeps the scene when the ID is not in the package", () => {
    const next = commit(packageSession(), movedTo("no-such-scene"));
    expect(next.packageProgress).toEqual({ sceneId: "ros-scene-1-landing" });
    expect(next.turns[0]!.dropped?.[0]).toMatch(/^packageSceneId/);
  });

  it("ignores a move when no package scene IDs are supplied", () => {
    const next = commit(packageSession(), movedTo("ros-scene-2-yard"), []);
    expect(next.packageProgress).toEqual({ sceneId: "ros-scene-1-landing" });
  });

  it("never creates progress on a session without a package", () => {
    const next = commit(session(), movedTo("ros-scene-2-yard"));
    expect(next.packageProgress).toBeUndefined();
    expect(next.turns[0]!.dropped?.[0]).toMatch(/^packageSceneId/);
  });

  it("leaves progress alone when the turn reports no scene", () => {
    const before = packageSession();
    const next = commit(before);
    expect(next.packageProgress).toEqual(before.packageProgress);
  });

  it("preserves revealed package secrets while writing scene progress", () => {
    const before = packageSession();
    const p = movedTo("ros-scene-2-yard");
    p.revealSecretIds = ["secret-ledger-lock"];
    const result = applyCompletedTurn(before, p, {
      ...meta,
      packageSceneIds: sceneIds,
      packageRecordKinds: {
        "ros-scene-1-landing": "scene",
        "ros-scene-2-yard": "scene",
        "secret-ledger-lock": "secret",
      },
      packageSecretTexts: {
        "secret-ledger-lock": "The ledger records a sluice-pin lock.",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.value.packageProgress?.revealedSecretIds).toEqual([
      "secret-ledger-lock",
    ]);
    expect(() => parseAdventureSession(result.value)).not.toThrow();
  });

  it("rejects exact GM-only package text and hidden IDs in player output", () => {
    const secret = "The duke poisoned the well";
    const leakedText = proposal();
    leakedText.narration = `You learn that ${secret}.`;
    const textResult = applyCompletedTurn(packageSession(), leakedText, {
      ...meta,
      packageGmOnlyText: [secret],
    });
    expect(textResult).toMatchObject({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          diagnostic: {
            guard: "package-text",
            field: "root.narration",
            sourceRef: "pinned-package-text",
          },
        },
      ],
    });
    expect(JSON.stringify(textResult)).not.toContain(secret);

    const leakedId = proposal();
    leakedId.narration = "A figure appears.";
    leakedId.suggestedActions = [
      "Ask about hidden-actor",
      "Look around the room",
      "Check the nearby doorway",
    ];
    const idResult = applyCompletedTurn(packageSession(), leakedId, {
      ...meta,
      packageRecordIds: ["hidden-actor"],
    });
    expect(idResult).toMatchObject({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          diagnostic: {
            guard: "package-id",
            field: "root.suggestedActions[0]",
            sourceRef: "pinned-package-id",
          },
        },
      ],
    });
    expect(JSON.stringify(idResult)).not.toContain("hidden-actor");
  });

  it("classifies session secret leakage with opaque diagnostic metadata", () => {
    const secretText = "The mayor forged the harbor charter";
    const withSecret = {
      ...packageSession(),
      hiddenState: {
        ...packageSession().hiddenState,
        secrets: [
          {
            id: "secret-harbor-forged",
            text: secretText,
            status: "hidden" as const,
          },
        ],
      },
    };
    const leaked = proposal();
    leaked.narration = `Word spreads that ${secretText}.`;
    const result = applyCompletedTurn(withSecret, leaked, meta);
    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          diagnostic: {
            guard: "scenario-secret",
            field: "root.narration",
            sourceRef: "session-secret",
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(secretText);
    expect(JSON.stringify(result)).not.toContain("secret-harbor-forged");
  });

  it("allows revealed package secret attribution, revealed secret text, and sceneTransition.sceneId while still blocking unrevealed IDs and raw IDs in prose", () => {
    const secretText =
      "The damp ledger records a lock fitted to the sluice pin.";
    const sessionWithSecrets = {
      ...packageSession(),
      hiddenState: {
        ...packageSession().hiddenState,
        secrets: [
          {
            id: "secret-ledger-lock",
            text: secretText,
            status: "hidden" as const,
          },
          {
            id: "secret-unrevealed",
            text: "Tobiah filed the pin.",
            status: "hidden" as const,
          },
        ],
      },
    };
    const baseMeta = {
      ...meta,
      packageSceneIds: ["scene-entry", "scene-secret-cellar"],
      packageRecordIds: [
        "secret-ledger-lock",
        "secret-unrevealed",
        "scene-secret-cellar",
      ],
      packageGmOnlyText: [secretText, "Tobiah filed the pin."],
      packageSecretTexts: {
        "secret-ledger-lock": secretText,
        "secret-unrevealed": "Tobiah filed the pin.",
      },
    };

    // Success path: revealed secret ID in sourceRecordId, revealed secret text in visiblePatch, and gm-only sceneId in sceneTransition.
    const validReveal = proposal();
    validReveal.revealSecretIds = ["secret-ledger-lock"];
    validReveal.sceneTransition = {
      sceneId: "scene-secret-cellar",
      title: "The Cellar",
    };
    validReveal.visiblePatch.situation = {
      text: `You read the entry: ${secretText}`,
      source: "revealed-secret",
      sourceRecordId: "secret-ledger-lock",
    };
    validReveal.visiblePatch.knownFacts.add = [
      {
        text: secretText,
        source: "revealed-secret",
        sourceRecordId: "secret-ledger-lock",
      },
    ];
    expect(
      applyCompletedTurn(sessionWithSecrets, validReveal, baseMeta).ok,
    ).toBe(true);

    // Negative path 1: unrevealed secret ID in sourceRecordId is still rejected.
    const unrevealedAttribution = proposal();
    unrevealedAttribution.visiblePatch.knownFacts.add = [
      {
        text: "A rumour about the pin.",
        source: "revealed-secret",
        sourceRecordId: "secret-unrevealed",
      },
    ];
    expect(
      applyCompletedTurn(sessionWithSecrets, unrevealedAttribution, baseMeta),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          diagnostic: {
            guard: "package-id",
            field: "root.visiblePatch.knownFacts.add[0].sourceRecordId",
          },
        },
      ],
    });

    // Negative path 2: raw revealed secret ID leaked into narration prose is still rejected.
    const rawIdInProse = proposal();
    rawIdInProse.revealSecretIds = ["secret-ledger-lock"];
    rawIdInProse.narration = "You uncover secret-ledger-lock on the page.";
    expect(
      applyCompletedTurn(sessionWithSecrets, rawIdInProse, baseMeta),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          diagnostic: {
            guard: "package-id",
            field: "root.narration",
          },
        },
      ],
    });

    // Negative path 3: non-scene hidden ID stuffed into sceneTransition.sceneId is still rejected.
    const nonSceneTransition = proposal();
    nonSceneTransition.sceneTransition = {
      sceneId: "secret-unrevealed",
      title: "Bogus",
    };
    expect(
      applyCompletedTurn(sessionWithSecrets, nonSceneTransition, baseMeta),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          diagnostic: {
            guard: "package-id",
            field: "root.sceneTransition.sceneId",
          },
        },
      ],
    });
  });

  it("rejects short exact package secrets without matching longer numbers", () => {
    const leaked = proposal();
    leaked.narration = "The code is 42.";
    expect(
      applyCompletedTurn(packageSession(), leaked, {
        ...meta,
        packageGmOnlyText: ["42"],
      }),
    ).toMatchObject({ ok: false, errors: [{ code: "hidden-leakage" }] });

    const unrelated = proposal();
    unrelated.narration = "The code is 1420.";
    expect(
      applyCompletedTurn(packageSession(), unrelated, {
        ...meta,
        packageGmOnlyText: ["42"],
      }).ok,
    ).toBe(true);
  });

  it("checks package IDs in one pass for large ID sets", () => {
    const ids = Array.from({ length: 10_000 }, (_, index) => `record-${index}`);
    const leaked = proposal();
    leaked.narration = "Someone whispers record-9999.";
    expect(
      applyCompletedTurn(packageSession(), leaked, {
        ...meta,
        packageRecordIds: ids,
      }),
    ).toMatchObject({ ok: false, errors: [{ code: "hidden-leakage" }] });
  });

  it("rejects a short non-word hidden ID when it appears in free-form narration", () => {
    const leaked = proposal();
    leaked.narration = "You spot s2 behind the curtain.";
    expect(
      applyCompletedTurn(packageSession(), leaked, {
        ...meta,
        packageRecordIds: ["s2"],
      }),
    ).toMatchObject({ ok: false, errors: [{ code: "hidden-leakage" }] });
  });

  it("allows ordinary prose containing a plain-word package ID such as gate", () => {
    const ordinary = proposal();
    ordinary.narration = "The watchman opens the iron gate to the courtyard.";
    expect(
      applyCompletedTurn(packageSession(), ordinary, {
        ...meta,
        packageRecordIds: ["gate", "the"],
      }).ok,
    ).toBe(true);
  });

  it("preserves overlong and whitespace-padded package scene IDs verbatim", () => {
    const longId = `scene-${"x".repeat(200)}`;
    const paddedId = "  scene-padded  ";
    for (const sceneId of [longId, paddedId]) {
      const parsed = parseAdventureSession({
        ...session(),
        sourcePackage: pin,
        packageProgress: { sceneId },
      });
      expect(parsed.packageProgress).toEqual({ sceneId });

      const moved = applyCompletedTurn(packageSession(), movedTo(sceneId), {
        ...meta,
        packageSceneIds: [...sceneIds, sceneId],
      });
      expect(moved.ok).toBe(true);
      if (moved.ok) {
        expect(moved.value.packageProgress).toEqual({ sceneId });
      }
    }
  });

  it("tracks revealed package secrets in packageProgress even for overlong IDs and long texts without seeding hiddenState", () => {
    const longSecretId = `secret-${"s".repeat(180)}`;
    const longSecretText =
      "The watch captain forged the harbour manifest to hide three smuggling barges. ".repeat(
        10,
      );
    const revealed = proposal();
    revealed.narration = `You uncover the truth: ${longSecretText}`;
    revealed.revealSecretIds = [longSecretId];

    const result = applyCompletedTurn(packageSession(), revealed, {
      ...meta,
      packageGmOnlyText: [longSecretText],
      packageSecretTexts: { [longSecretId]: longSecretText },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hiddenState.secrets).toEqual([]);
      expect(result.value.packageProgress?.revealedSecretIds).toEqual([
        longSecretId,
      ]);
      const reparsed = parseAdventureSession(result.value);
      expect(reparsed.packageProgress?.revealedSecretIds).toEqual([
        longSecretId,
      ]);
    }
  });
});
