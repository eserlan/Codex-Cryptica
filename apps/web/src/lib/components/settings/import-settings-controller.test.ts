/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPack } from "@codex/content-packs";
import {
  ImportSettingsController,
  isScabardExport,
  mapThemeToGenre,
  type ImportSettingsControllerDeps,
} from "./import-settings-controller.svelte";

function baseDeps(
  overrides: Partial<ImportSettingsControllerDeps> = {},
): ImportSettingsControllerDeps {
  return {
    oracle: {
      isEnabled: true,
      effectiveApiKey: null,
    } as any,
    vault: {
      entities: {},
      createEntity: async () => "",
      updateEntity: async () => true,
      batchCreateEntities: async () => {},
      addConnection: async () => true,
      suspendSaving: () => {},
      resumeSaving: () => {},
      flushPendingSaves: async () => {},
      saveImageToVault: async () => ({ image: "", thumbnail: "" }),
    } as any,
    importQueue: {
      activeItemChunks: {},
      updateChunkStatus: () => {},
    } as any,
    aiClientManager: {
      getModel: () => {
        throw new Error("AI must not be called in this test");
      },
    } as any,
    modalUIStore: { isImporting: false } as any,
    connectionModeStore: { abortSignal: new AbortController().signal } as any,
    notificationStore: { notify: () => {} } as any,
    themeStore: { worldThemeId: "workspace", activeTheme: null } as any,
    ...overrides,
  };
}

describe("import-settings-controller helpers", () => {
  it("maps workspace and unknown themes to fantasy", () => {
    expect(mapThemeToGenre("workspace")).toBe("fantasy");
    expect(mapThemeToGenre("")).toBe("fantasy");
  });

  it("maps known alternate theme ids to their importer genres", () => {
    expect(mapThemeToGenre("fallout")).toBe("apocalyptic");
    expect(mapThemeToGenre("modern")).toBe("cyberpunk");
    expect(mapThemeToGenre("western")).toBe("steampunk");
    expect(mapThemeToGenre("space-opera-resistance")).toBe("scifi");
  });

  it("detects scabard exports from pages and conns arrays", () => {
    expect(isScabardExport({ pages: [], conns: [] })).toBe(true);
    expect(isScabardExport({ pages: [], conns: {}, foo: "bar" })).toBe(false);
    expect(isScabardExport(null)).toBe(false);
  });

  it("prepares real scabard JSON as a deterministic review session", async () => {
    const rawData = readFileSync(
      resolve(
        process.cwd(),
        "../../packages/importer/tests/cc/fixtures/london-calling-campaign.json",
      ),
      "utf-8",
    );

    const deps: ImportSettingsControllerDeps = {
      oracle: {
        isEnabled: false,
        effectiveApiKey: null,
      } as any,
      vault: {
        entities: {},
        createEntity: async () => "",
        updateEntity: async () => true,
        batchCreateEntities: async () => {},
        addConnection: async () => true,
        suspendSaving: () => {},
        resumeSaving: () => {},
        flushPendingSaves: async () => {},
        saveImageToVault: async () => ({ image: "", thumbnail: "" }),
      } as any,
      importQueue: {
        activeItemChunks: {},
        updateChunkStatus: () => {},
      } as any,
      aiClientManager: {
        getModel: () => {
          throw new Error("Scabard import must not request an AI model");
        },
      } as any,
      modalUIStore: { isImporting: false } as any,
      connectionModeStore: { abortSignal: new AbortController().signal } as any,
      notificationStore: { notify: () => {} } as any,
      themeStore: { worldThemeId: "workspace", activeTheme: null } as any,
    };

    const controller = new ImportSettingsController(deps);
    const file = new File([rawData], "london-calling-campaign.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(controller.importMode).toBe("cc");
    expect(controller.ccSession?.sourceSystem).toBe("scabard");
    expect(controller.ccSession?.items.length).toBeGreaterThan(0);
    expect(controller.ccSession?.relationships.length).toBeGreaterThan(0);
  });

  it("surfaces a clear rejected-file reason when Oracle analysis fails, instead of silently importing nothing", async () => {
    const deps: ImportSettingsControllerDeps = {
      oracle: {
        // Matches production: isEnabled is always true, so unavailability can
        // only be detected by the analysis call actually failing.
        isEnabled: true,
        effectiveApiKey: null,
      } as any,
      vault: {
        entities: {},
        createEntity: async () => "",
        updateEntity: async () => true,
        batchCreateEntities: async () => {},
        addConnection: async () => true,
        suspendSaving: () => {},
        resumeSaving: () => {},
        flushPendingSaves: async () => {},
        saveImageToVault: async () => ({ image: "", thumbnail: "" }),
      } as any,
      importQueue: {
        activeItemChunks: {},
        updateChunkStatus: () => {},
      } as any,
      aiClientManager: {
        getModel: () => {
          throw new Error("Failed to fetch");
        },
      } as any,
      modalUIStore: { isImporting: false } as any,
      connectionModeStore: { abortSignal: new AbortController().signal } as any,
      notificationStore: { notify: () => {} } as any,
      themeStore: { worldThemeId: "workspace", activeTheme: null } as any,
    };

    const controller = new ImportSettingsController(deps);
    const file = new File(
      ["Primary Deity: Sol-Varon, The Radiant Tyrant."],
      "notes.txt",
      { type: "text/plain" },
    );

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(controller.rejectedFiles).toHaveLength(1);
    expect(controller.rejectedFiles[0].name).toBe("notes.txt");
    expect(controller.rejectedFiles[0].reason).toMatch(/no model produced/i);
  });

  it("routes successful Oracle analysis through the same rich review/report pipeline as Scabard/Chronica", async () => {
    const mockResponse = JSON.stringify([
      {
        title: "Hero",
        type: "Character",
        chronicle: "A brave warrior.",
        detectedLinks: [{ target: "Sword", label: "wields" }],
      },
      {
        title: "Sword",
        type: "Item",
        chronicle: "A gleaming blade.",
      },
    ]);

    const deps = baseDeps({
      aiClientManager: {
        getModel: () => ({
          generateContent: async () => ({
            response: { text: () => mockResponse },
          }),
        }),
      } as any,
    });

    const controller = new ImportSettingsController(deps);
    const file = new File(["Hero wields the Sword."], "notes.txt", {
      type: "text/plain",
    });

    await controller.handleFiles([file]);

    expect(controller.rejectedFiles).toEqual([]);
    expect(controller.step).toBe("review");
    expect(controller.ccSession?.sourceSystem).toBe("oracle");

    const hero = controller.ccSession?.items.find(
      (item) => item.draft.title === "Hero",
    );
    expect(hero?.resolvedType).toBe("character");

    const sword = controller.ccSession?.items.find(
      (item) => item.draft.title === "Sword",
    );
    expect(sword?.resolvedType).toBe("item");

    // Preview relationships always start "unresolved" — actual resolution
    // happens during commit(), not prepare(). Just confirm the link survived
    // conversion with the right endpoints.
    expect(controller.ccSession?.relationships).toHaveLength(1);
    expect(controller.ccSession?.relationships[0].draft.fromRef).toBe(
      hero?.draft.sourceId,
    );
    expect(controller.ccSession?.relationships[0].draft.toRef).toBe(
      sword?.draft.sourceId,
    );
  });

  it("routes creature pack selection through the same rich review pipeline, with no AI calls", async () => {
    const pack = getPack("fantasy-bestiary")!;
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);

    await controller.handlePackSelect(pack);

    expect(controller.step).toBe("review");
    expect(controller.importMode).toBe("oracle");
    expect(controller.ccSession?.sourceSystem).toBe("oracle");
    expect(controller.ccSession?.items.length).toBe(pack.entries.length);
    for (const item of controller.ccSession?.items ?? []) {
      expect(item.resolvedType).toBe("creature");
    }
  });
});
