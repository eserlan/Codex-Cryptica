import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/oracle.svelte", () => ({
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

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {} as any,
    updateEntity: vi.fn().mockResolvedValue(undefined),
    deleteEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/services/node-merge.service.svelte", () => ({
  nodeMergeService: {
    executeMerge: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/services/generators/generator-session-manager", () => ({
  generatorSessionManager: {
    commitAcceptedEntity: vi.fn(),
    reset: vi.fn(),
  },
}));

import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { nodeMergeService } from "$lib/services/node-merge.service.svelte";
import { revisionService, RevisionService } from "./RevisionService.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { generatorSessionManager } from "$lib/services/generators/generator-session-manager";

describe("RevisionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revisionService.pendingDraft = null;
    revisionService.error = null;
    revisionService.isRevising = false;
    (vault.entities as any) = {};
    (vault as any).isGuest = false;
    (vault as any).deleteEntity = vi.fn().mockResolvedValue(undefined);
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

  it("commits a generated draft to the generator session only after accept", async () => {
    (vault.entities as any).generated = {
      id: "generated",
      title: "Captain Orra",
      type: "character",
      labels: ["watch"],
    };
    revisionService.pendingDraft = {
      entityId: "generated",
      source: "revise",
      chronicle: "Accepted chronicle",
      lore: "Accepted lore",
      timestamp: Date.now(),
      deleteOnDiscard: true,
      generatorSessionCommit: true,
    };

    await revisionService.acceptDraft();

    expect(vault.updateEntity).toHaveBeenCalledWith("generated", {
      content: "Accepted chronicle",
      lore: "Accepted lore",
    });
    expect(generatorSessionManager.commitAcceptedEntity).toHaveBeenCalledWith({
      id: "generated",
      title: "Captain Orra",
      type: "character",
      content: "Accepted chronicle",
      lore: "Accepted lore",
      labels: ["watch"],
    });
    expect(generatorSessionManager.reset).not.toHaveBeenCalled();
    expect(vault.deleteEntity).not.toHaveBeenCalled();
  });

  it("resets the generator session and deletes the skeleton when a generated draft is discarded", async () => {
    revisionService.pendingDraft = {
      entityId: "generated",
      source: "revise",
      chronicle: "Draft chronicle",
      lore: "Draft lore",
      timestamp: Date.now(),
      deleteOnDiscard: true,
      generatorSessionCommit: true,
    };

    await revisionService.discardDraft();

    expect(generatorSessionManager.commitAcceptedEntity).not.toHaveBeenCalled();
    expect(generatorSessionManager.reset).toHaveBeenCalledTimes(1);
    expect(vault.deleteEntity).toHaveBeenCalledWith("generated");
  });

  it("respects injected dependencies for time", async () => {
    const mockClock = { now: () => 1234567890 };
    const localizedService = new RevisionService(mockClock);

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

    localizedService.proposeMergeDraft(
      proposal as any,
      ["target", "source"],
      "message-1",
    );

    expect(localizedService.pendingDraft).toEqual(
      expect.objectContaining({
        timestamp: 1234567890,
      }),
    );

    vi.mocked(oracle.reviseEntity).mockResolvedValue({
      content: "Revised content.",
      lore: "Revised lore.",
    });

    const result = await localizedService.revise("target");
    expect(result).toBe(true);
    expect(localizedService.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "target",
        timestamp: 1234567890,
      }),
    );
  });
});
