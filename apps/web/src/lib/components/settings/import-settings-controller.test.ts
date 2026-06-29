/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ImportSettingsController,
  isScabardExport,
  mapThemeToGenre,
  type ImportSettingsControllerDeps,
} from "./import-settings-controller.svelte";

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
});
