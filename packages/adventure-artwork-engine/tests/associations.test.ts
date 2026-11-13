import { describe, expect, it } from "vitest";
import { applyArtworkCommand } from "../src/associations";

const automatic = {
  assetId: "forest",
  catalogueVersion: 1,
  assignedOnTurnId: "turn-1",
};
describe("artwork association commands", () => {
  it("preserves automatic selection through dismissal and restore", () => {
    const dismissed = applyArtworkCommand(
      { version: 1, automatic },
      { kind: "dismiss" },
    );
    expect(dismissed).toEqual({
      ok: true,
      association: { version: 1, automatic, override: { kind: "dismissed" } },
    });
    if (!dismissed.ok) throw new Error("unexpected failure");
    expect(
      applyArtworkCommand(dismissed.association, { kind: "restore" }),
    ).toEqual({ ok: true, association: { version: 1, automatic } });
  });
  it("keeps an exact catalogue digest and rejects invalid snapshot paths without mutation", () => {
    const current = { version: 1 as const, automatic };
    const kept = applyArtworkCommand(current, {
      kind: "keep",
      choice: { kind: "catalogue", assetId: "forest", sha256: "a".repeat(64) },
    });
    expect(kept.ok).toBe(true);
    expect(
      applyArtworkCommand(current, {
        kind: "keep",
        choice: {
          kind: "snapshot",
          path: "../secret",
          mime: "image/png",
          bytes: 1,
          width: 1,
          height: 1,
          sha256: "a".repeat(64),
        },
      }).ok,
    ).toBe(false);
    expect(current).toEqual({ version: 1, automatic });
  });
});

it("refuses to overwrite an association containing fields from a newer writer", () => {
  const future = { version: 1 as const, automatic, futureSetting: "retain" };
  expect(applyArtworkCommand(future, { kind: "dismiss" })).toEqual({
    ok: false,
    reason: "invalid-association",
  });
});

it("accepts valid associations regardless of property insertion order", () => {
  const current = { automatic, version: 1 as const };
  expect(applyArtworkCommand(current, { kind: "dismiss" }).ok).toBe(true);
});
