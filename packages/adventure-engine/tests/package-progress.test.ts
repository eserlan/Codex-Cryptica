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
      errors: [{ code: "hidden-leakage" }],
    });

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
      errors: [{ code: "hidden-leakage" }],
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
});
