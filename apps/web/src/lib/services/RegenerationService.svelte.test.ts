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
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../stores/ui.svelte", () => ({
  uiStore: {
    notify: vi.fn(),
  },
}));

vi.mock("@codex/oracle-engine", () => ({
  OracleCommandParser: {
    parseRegenerationResponse: vi.fn(),
  },
}));

import { oracle } from "../stores/oracle.svelte";
import { vault } from "../stores/vault.svelte";
import { uiStore } from "../stores/ui.svelte";
import { OracleCommandParser } from "@codex/oracle-engine";
import { regenerationService } from "./RegenerationService.svelte";

describe("RegenerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    regenerationService.pendingDraft = null;
    regenerationService.error = null;
    regenerationService.isGenerating = false;
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
    expect(uiStore.notify).not.toHaveBeenCalled();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });
});
