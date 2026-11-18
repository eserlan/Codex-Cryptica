import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  validateAdventureJson,
} from "@codex/adventure-engine";
import { minimalPackage } from "./adventure-fixtures";
import { canaries, canaryReferencePackage } from "./gm-canary-fixture";
import { assertNoGmLeak, collectGmOnlyStrings } from "./gm-leak-harness";

const guarded = collectGmOnlyStrings(canaryReferencePackage);

describe("canary fixture", () => {
  it("is a valid package", () => {
    expect(() =>
      AdventureJsonV1Schema.parse(canaryReferencePackage),
    ).not.toThrow();
    const result = validateAdventureJson(canaryReferencePackage);
    expect(result.ok).toBe(true);
  });

  it("is not targeted by any scene branch", () => {
    const targets = canaryReferencePackage.scenes.flatMap((scene) =>
      (scene.branches ?? []).map((branch) => branch.targetSceneId),
    );
    expect(targets).not.toContain("canary-scene");
  });
});

describe("collectGmOnlyStrings", () => {
  it("returns nothing for the minimal package", () => {
    expect(collectGmOnlyStrings(minimalPackage)).toEqual([]);
  });

  it.each(canaries)(
    "guards the $type canary on its record and field",
    (canary) => {
      expect(guarded).toContainEqual({
        recordId: canary.recordId,
        field: canary.field,
        text: canary.token,
      });
    },
  );

  it("guards the rumour truth in both forms it can appear in", () => {
    const truths = guarded.filter(
      (entry) => entry.recordId === "canary-rumour" && entry.field === "truth",
    );
    expect(truths.map((entry) => entry.text)).toEqual([
      "Truth: false",
      '"truth":"false"',
    ]);
  });

  it("keeps the reference secrets and drops nothing that is player-visible", () => {
    const reference = guarded.filter(
      (entry) => !entry.recordId.startsWith("canary-"),
    );
    expect(reference.length).toBeGreaterThanOrEqual(5);
  });

  it("drops short strings and de-duplicates", () => {
    const pkg = structuredClone(canaryReferencePackage);
    pkg.secrets = [
      { ...pkg.secrets[0]!, id: "short", text: "too short" },
      { ...pkg.secrets[0]!, id: "dup", text: "A long enough secret." },
      { ...pkg.secrets[0]!, id: "dup", text: "A long enough secret." },
    ];
    const secrets = collectGmOnlyStrings(pkg).filter((e) =>
      ["short", "dup"].includes(e.recordId),
    );
    expect(secrets).toHaveLength(1);
  });
});

describe("assertNoGmLeak", () => {
  const first = canaries[0]!;

  it("throws for a string output and names the record and field", () => {
    expect(() =>
      assertNoGmLeak(guarded, `She whispers ${first.token}.`, "narration"),
    ).toThrow(
      `GM-only leak in "narration": record ${first.recordId}, field ${first.field}`,
    );
  });

  it("throws for a nested object output and names the record and field", () => {
    const secret = canaries.find((c) => c.type === "secret")!;
    expect(() =>
      assertNoGmLeak(
        guarded,
        { turns: [{ narration: { text: secret.token } }] },
        "transcript",
      ),
    ).toThrow(
      `GM-only leak in "transcript": record ${secret.recordId}, field ${secret.field}`,
    );
  });

  it("ignores case and whitespace runs", () => {
    expect(() =>
      assertNoGmLeak(
        [{ recordId: "r", field: "text", text: "The vault holds a key" }],
        "the   VAULT\n holds a key",
        "spacing",
      ),
    ).toThrow(/record r, field text/);
  });

  it("catches the rumour verdict in its flattened JSON form", () => {
    expect(() =>
      assertNoGmLeak(guarded, { rumour: { truth: "false" } }, "json"),
    ).toThrow(/canary-rumour, field truth/);
  });

  it("passes a clean output", () => {
    expect(() =>
      assertNoGmLeak(
        guarded,
        { narration: "A lantern flickers at the road's end." },
        "clean",
      ),
    ).not.toThrow();
  });
});
