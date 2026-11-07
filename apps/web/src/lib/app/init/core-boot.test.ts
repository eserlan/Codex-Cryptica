import { describe, it, expect, vi, beforeEach } from "vitest";
import { bootSystem } from "./core-boot";
import { resolveAITemplate } from "@codex/ai-engine";
import { entityTemplateStore } from "#lib/stores/entity-templates/entity-template-store.svelte.js";
import { GENERIC_TEMPLATES } from "schema";

vi.mock("../../stores/debug.svelte", () => ({ debugStore: { log: vi.fn() } }));
vi.mock("../../config", () => ({ IS_STAGING: true }));
beforeEach(() => vi.clearAllMocks());

describe("bootSystem", () => {
  it("should initialize core stores and set isStaging", () => {
    const mockStores = {
      categories: { init: vi.fn() },
      timeline: { init: vi.fn() },
      graph: { init: vi.fn() },
      calendar: { init: vi.fn() },
      vault: { init: vi.fn().mockResolvedValue(undefined) },
      sessionModeStore: { isStaging: false },
    };

    const result = bootSystem(mockStores as any);

    expect(result).toBe(true);
    expect(mockStores.categories.init).toHaveBeenCalled();
    expect(mockStores.timeline.init).not.toHaveBeenCalled();
    expect(mockStores.graph.init).not.toHaveBeenCalled();
    expect(mockStores.calendar.init).not.toHaveBeenCalled();
    expect(mockStores.vault.init).toHaveBeenCalled();
    expect(mockStores.sessionModeStore.isStaging).toBe(true);
  });

  it("gives the AI engine the vault-aware template resolver", () => {
    const mockStores = {
      categories: { init: vi.fn() },
      vault: { init: vi.fn().mockResolvedValue(undefined) },
      sessionModeStore: { isStaging: false },
    };
    bootSystem(mockStores as any);

    // Before any vault templates load, the built-in template is used.
    expect(resolveAITemplate("character")).toBe(GENERIC_TEMPLATES.character);

    const spy = vi
      .spyOn(entityTemplateStore, "resolveSync")
      .mockReturnValue("## From the vault\n");
    expect(resolveAITemplate("character", "fantasy")).toBe(
      "## From the vault\n",
    );
    expect(spy).toHaveBeenCalledWith("character", "fantasy");
    spy.mockRestore();
  });

  it("should handle vault initialization failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockStores = {
      categories: { init: vi.fn() },
      timeline: { init: vi.fn() },
      graph: { init: vi.fn() },
      calendar: { init: vi.fn() },
      vault: { init: vi.fn().mockRejectedValue(new Error("Vault fail")) },
      sessionModeStore: { isStaging: false },
    };

    bootSystem(mockStores as any);

    // Wait for the microtask to finish (the .catch block)
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(
      "Vault initialization failed",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
