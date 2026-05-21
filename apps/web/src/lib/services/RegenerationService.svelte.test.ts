import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../stores/oracle.svelte", () => ({
  oracle: {
    regenerate: vi.fn(),
    reconcileSmartApply: vi.fn().mockImplementation((_id, incoming) =>
      Promise.resolve({
        content: incoming.chronicle,
        lore: incoming.lore,
      }),
    ),
  },
}));

vi.mock("../stores/vault.svelte", () => ({
  vault: {
    entities: {} as any,
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/services/node-merge.service.svelte", () => ({
  nodeMergeService: {
    executeMerge: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@codex/oracle-engine", () => ({
  OracleCommandParser: {
    parseRegenerationResponse: vi.fn(),
  },
}));

import { oracle } from "../stores/oracle.svelte";
import { vault } from "../stores/vault.svelte";
import { OracleCommandParser } from "@codex/oracle-engine";
import { nodeMergeService } from "$lib/services/node-merge.service.svelte";
import { regenerationService } from "./RegenerationService.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

describe("RegenerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    regenerationService.pendingDraft = null;
    regenerationService.error = null;
    regenerationService.isGenerating = false;
    (vault.entities as any) = {};
    notificationStore.notify = vi.fn();
  });

  it("returns true and stores a draft when regeneration succeeds", async () => {
    vi.mocked(oracle.regenerate).mockImplementation(
      async (_entityId, onPartial) => {
        onPartial?.(
          "**Chronicle:** Hero returns.\n\n**Lore:** The hero returns.",
        );
      },
    );
    vi.mocked(OracleCommandParser.parseRegenerationResponse).mockReturnValue({
      chronicle: "Hero returns.",
      lore: "The hero returns.",
    });

    const result = await regenerationService.regenerate("e1");

    expect(result).toBe(true);
    expect(regenerationService.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "e1",
        chronicle: "Hero returns.",
        lore: "The hero returns.",
      }),
    );
    expect(regenerationService.error).toBeNull();
    expect(regenerationService.isGenerating).toBe(false);
    expect(oracle.regenerate).toHaveBeenCalledWith("e1", expect.any(Function));
  });

  it("returns false and stores an error when regeneration fails", async () => {
    vi.mocked(oracle.regenerate).mockRejectedValue(new Error("boom"));

    const result = await regenerationService.regenerate("e1");

    expect(result).toBe(false);
    expect(regenerationService.pendingDraft).toBeNull();
    expect(regenerationService.error).toBe("boom");
    expect(regenerationService.isGenerating).toBe(false);
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

    regenerationService.proposeMergeDraft(
      proposal as any,
      ["target", "source"],
      "message-1",
    );

    expect(vault.updateEntity).not.toHaveBeenCalled();
    expect(nodeMergeService.executeMerge).not.toHaveBeenCalled();
    expect(regenerationService.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "target",
        messageId: "message-1",
        source: "merge",
        chronicle: "merged chronicle",
        lore: "merged lore",
      }),
    );

    await regenerationService.acceptDraft();

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
    expect(regenerationService.pendingDraft).toBeNull();
    expect(notificationStore.notify).toHaveBeenCalledWith(
      "Merge saved successfully.",
      "success",
    );
  });
});
