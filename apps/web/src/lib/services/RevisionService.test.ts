import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    reviseSmartApply: vi.fn().mockResolvedValue({}),
    reviseEntity: vi.fn().mockResolvedValue({
      content: "parsed chronicle",
      lore: "parsed lore",
    }),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {
      e1: { id: "e1", title: "Target Entity", content: "", lore: "" },
    },
  },
}));

import { RevisionService } from "./RevisionService.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";

describe("RevisionService", () => {
  let service: RevisionService;

  beforeEach(() => {
    service = new RevisionService();
    vi.clearAllMocks();
    (vault as any).isGuest = false;
  });

  it("should pass instructions to entity revision", async () => {
    const inst = "Focus on faction links";

    const success = await service.revise({
      entityId: "e1",
      instructions: inst,
    });

    expect(success).toBe(true);
    expect(oracle.reviseEntity).toHaveBeenCalledWith({
      source: "revise",
      entityId: "e1",
      instructions: inst,
      priority: "instructions-first",
    });
    expect(oracle.reviseSmartApply).not.toHaveBeenCalled();
  });

  it("should still support the legacy positional service call", async () => {
    const inst = "Focus on faction links";

    const success = await service.revise("e1", inst);

    expect(success).toBe(true);
    expect(oracle.reviseEntity).toHaveBeenCalledWith({
      source: "revise",
      entityId: "e1",
      instructions: inst,
      priority: "instructions-first",
    });
    expect(oracle.reviseSmartApply).not.toHaveBeenCalled();
  });

  it("should block guest revision", async () => {
    (vault as any).isGuest = true;

    const success = await service.revise("e1", "do it");

    expect(success).toBe(false);
    expect(service.error).toBe("Guest users cannot revise content.");
    expect(oracle.reviseEntity).not.toHaveBeenCalled();
  });
});
