import { describe, expect, it, vi } from "vitest";

const generateRumourLocal = vi.hoisted(() => vi.fn());
vi.mock("generator-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("generator-engine")>();
  generateRumourLocal.mockImplementation(actual.generateRumourLocal);
  return { ...actual, generateRumourLocal };
});

import { initialSession } from "#lib/stores/oracle/adventure-session.js";
import { startInput } from "#lib/stores/oracle/tests/adventure-fixtures.js";
import { seedWorldEntryBackground } from "./world-entry-background";

function entrySession() {
  let id = 0;
  return initialSession({
    ...startInput,
    now: "2026-11-03T12:00:00Z",
    idGenerator: () => String(++id),
    worldEntry: {
      version: 1 as const,
      location: { kind: "provisional" as const, name: "Northbrook" },
      intent: "explore" as const,
    },
  });
}

describe("offline world-entry rumours", () => {
  it("pass the Vault genre to the local generator when one is set", () => {
    generateRumourLocal.mockClear();
    let id = 0;
    seedWorldEntryBackground(
      entrySession(),
      () => `n-${++id}`,
      undefined,
      undefined,
      "Western / Frontier",
    );
    expect(generateRumourLocal).toHaveBeenCalledWith(
      expect.objectContaining({ genre: "Western / Frontier" }),
      expect.anything(),
    );
  });

  it("add no genre for a neutral Vault", () => {
    generateRumourLocal.mockClear();
    let id = 0;
    seedWorldEntryBackground(entrySession(), () => `n-${++id}`);
    expect(generateRumourLocal.mock.calls[0]![0]).not.toHaveProperty("genre");
  });
});
