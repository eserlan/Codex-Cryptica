import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../stores/oracle.svelte", () => ({
  oracle: {
    reviseSmartApply: vi.fn().mockImplementation((_id, incoming) =>
      Promise.resolve({
        content: incoming.chronicle,
        lore: incoming.lore,
      }),
    ),
    reviseEntity: vi.fn(),
  },
}));

vi.mock("../stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {} as any,
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/services/node-merge.service.svelte", () => ({
  nodeMergeService: {
    executeMerge: vi.fn().mockResolvedValue(undefined),
  },
}));

import { oracle } from "../stores/oracle.svelte";
import { vault } from "../stores/vault.svelte";
import { nodeMergeService } from "$lib/services/node-merge.service.svelte";
import { revisionService } from "./RevisionService.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

describe("RevisionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revisionService.pendingDraft = null;
    revisionService.error = null;
    revisionService.isRevising = false;
    (vault.entities as any) = {};
    (vault as any).isGuest = false;
    notificationStore.notify = vi.fn();
  });

  it("returns true and stores a draft when revision succeeds", async () => {
    vi.mocked(oracle.reviseEntity).mockResolvedValue({
      content: "Hero returns.",
      lore: "The hero returns.",
    });

    const result = await revisionService.revise("e1");

    expect(result).toBe(true);
    expect(revisionService.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "e1",
        chronicle: "Hero returns.",
        lore: "The hero returns.",
      }),
    );
    expect(revisionService.error).toBeNull();
    expect(revisionService.isRevising).toBe(false);
    expect(oracle.reviseEntity).toHaveBeenCalledWith({
      source: "revise",
      entityId: "e1",
      instructions: undefined,
      priority: "instructions-first",
    });
    expect(oracle.reviseSmartApply).not.toHaveBeenCalled();
  });

  it("returns false and stores an error for guest revision", async () => {
    (vault as any).isGuest = true;

    const result = await revisionService.revise("e1");

    expect(result).toBe(false);
    expect(revisionService.pendingDraft).toBeNull();
    expect(revisionService.error).toBe("Guest users cannot revise content.");
    expect(oracle.reviseEntity).not.toHaveBeenCalled();
  });

  it("returns false and stores an error when revision fails", async () => {
    vi.mocked(oracle.reviseEntity).mockRejectedValue(new Error("boom"));

    const result = await revisionService.revise("e1");

    expect(result).toBe(false);
    expect(revisionService.pendingDraft).toBeNull();
    expect(revisionService.error).toBe("boom");
    expect(revisionService.isRevising).toBe(false);
    expect(notificationStore.notify).not.toHaveBeenCalled();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });

  it("stores a merge draft and executes the merge only when accepted", async () => {
    (vault.entities as any).target = {
      id: "target",
      title: "Target",
      lore: "existing lore",
    };
    const proposal = {
      targetId: "target",
      suggestedFrontmatter: {
        title: "Merged Target",
        lore: "merged lore",
      },
      suggestedBody: "merged chronicle",
      outgoingConnections: [],
    };

    revisionService.proposeMergeDraft(
      proposal as any,
      ["target", "source"],
      "message-1",
    );

    expect(vault.updateEntity).not.toHaveBeenCalled();
    expect(nodeMergeService.executeMerge).not.toHaveBeenCalled();
    expect(revisionService.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "target",
        messageId: "message-1",
        source: "merge",
        chronicle: "merged chronicle",
        lore: "merged lore",
      }),
    );

    await revisionService.acceptDraft();

    expect(nodeMergeService.executeMerge).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedBody: "merged chronicle",
        suggestedFrontmatter: expect.objectContaining({
          lore: "merged lore",
        }),
      }),
      ["target", "source"],
    );
    expect(vault.updateEntity).not.toHaveBeenCalled();
    expect(revisionService.pendingDraft).toBeNull();
    expect(notificationStore.notify).toHaveBeenCalledWith(
      "Merge saved successfully.",
      "success",
    );
  });
});
