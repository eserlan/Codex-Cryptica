import { describe, expect, it, vi } from "vitest";
import {
  appendContestedToLore,
  syncContestedCommitments,
  CONTESTED_LORE_HEADER,
} from "./contested-lore";

const entry = (over: Record<string, unknown> = {}) => ({
  id: "c-1",
  kind: "motive" as const,
  commitmentClass: "supporting-explanation" as const,
  subject: "Ferryman debt",
  summary: "Smuggles to repay a guild debt",
  actorRef: { tier: "source-record" as const, value: "rec-1" },
  status: "contested" as const,
  sourceTurnId: "turn-1",
  sourceRevision: 3,
  ...over,
});

describe("appendContestedToLore", () => {
  it("creates the contested section in empty lore", () => {
    const lore = appendContestedToLore(undefined, entry() as never);
    expect(lore).toContain(CONTESTED_LORE_HEADER);
    expect(lore).toContain("Ferryman debt");
  });

  it("is idempotent and preserves user lore", () => {
    const first = appendContestedToLore("User canon.", entry() as never);
    const second = appendContestedToLore(first, entry() as never);
    expect(second).toBe(first);
    expect(second.startsWith("User canon.")).toBe(true);
    expect(second.match(/Ferryman debt/g)).toHaveLength(1);
  });
});

describe("syncContestedCommitments", () => {
  it("writes contested source-record entries and skips others", async () => {
    const updateEntityLore = vi.fn(async (_id: string, _lore: string) => true);
    const session = {
      causalCommitments: [
        entry(),
        entry({ id: "c-2", status: "committed" }),
        entry({ id: "c-3", actorRef: { tier: "name", value: "Nobody" } }),
        entry({
          id: "c-4",
          actorRef: { tier: "source-record", value: "gone" },
        }),
      ],
    } as never;
    const result = await syncContestedCommitments(session, {
      isCurrent: () => true,
      getEntity: (id) => (id === "rec-1" ? { id, lore: "" } : undefined),
      updateEntityLore,
    });
    expect(result).toEqual({ updated: 1, skipped: 2, interrupted: false });
    expect(updateEntityLore).toHaveBeenCalledTimes(1);
    expect(String(updateEntityLore.mock.calls[0]?.[1])).toContain(
      CONTESTED_LORE_HEADER,
    );
  });

  it("survives a failing Vault write without throwing", async () => {
    const session = { causalCommitments: [entry()] } as never;
    const result = await syncContestedCommitments(session, {
      isCurrent: () => true,
      getEntity: (id) => ({ id, lore: "" }),
      updateEntityLore: async () => {
        throw new Error("vault closed");
      },
    });
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
