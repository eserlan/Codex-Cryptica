/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const scabardSession = {
  sourceLabel: "Scabard Campaign 7",
  warnings: [],
  relationships: [],
  assets: [],
  items: [
    {
      sourceRef: "scabard:item:hero-1",
      draft: {
        title: "Hero",
        type: "character",
        content: "A test hero",
        lore: "",
        tags: ["party"],
        metadata: {},
        sourceId: "hero-1",
      },
      match: null,
      decision: "include",
      matchDecision: "create",
      resolvedType: "character",
      typeFallback: false,
    },
  ],
  stats: {
    totalItems: 1,
    includedItems: 1,
    matchedItems: 0,
    warningCount: 0,
    relationshipCount: 0,
    assetCount: 0,
  },
};

const chronicaSession = {
  sourceLabel: "Chronica Campaign Grecia",
  warnings: [],
  relationships: [],
  assets: [],
  items: [
    {
      sourceRef: "chronica:character:grecia-1:characters:char-1",
      draft: {
        title: "Ariadne",
        type: "character",
        content: "Scout of the party.",
        lore: "Secret heir.",
        tags: [],
        metadata: {},
        sourceId: "grecia-1:characters:char-1",
      },
      match: null,
      decision: "include",
      matchDecision: "create",
      resolvedType: "character",
      typeFallback: false,
    },
  ],
  stats: {
    totalItems: 1,
    includedItems: 1,
    matchedItems: 0,
    warningCount: 0,
    relationshipCount: 0,
    assetCount: 0,
  },
};

vi.mock("$lib/components/help/FeatureHint.svelte", () => ({
  default: function FeatureHintMock() {
    return {};
  },
}));

vi.mock("$lib/components/settings/ImportProgress.svelte", () => ({
  default: function ImportProgressMock() {
    return {};
  },
}));

vi.mock("$lib/components/oracle/InlineKeySetup.svelte", () => ({
  default: function InlineKeySetupMock() {
    return {};
  },
}));

vi.mock("$lib/features/importer/ReviewList.svelte", () => ({
  default: function ReviewListMock() {
    return {};
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    isEnabled: false,
    effectiveApiKey: "",
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {},
  },
}));

vi.mock("$lib/stores/import-queue.svelte", () => ({
  importQueue: {
    activeItemChunks: {},
    updateChunkStatus: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    isImporting: false,
    activeSettingsTab: "general",
  },
}));

vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: {
    abortSignal: new AbortController().signal,
    abortActiveOperations: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

vi.mock("$lib/services/ai/client-manager", () => ({
  aiClientManager: {
    getModel: vi.fn(),
  },
}));

vi.mock("$lib/features/importer/web-vault-writer", () => ({
  createWebVaultWriter: vi.fn(() => ({})),
}));

vi.mock("@codex/importer", () => ({
  TextParser: class {
    accepts() {
      return false;
    }
  },
  DocxParser: class {
    accepts() {
      return false;
    }
  },
  PdfParser: class {
    accepts() {
      return false;
    }
  },
  JsonParser: class {
    accepts(file: File) {
      return file.name.endsWith(".json");
    }
    async parse(file: File) {
      return {
        text: await file.text(),
        assets: [],
      };
    }
  },
  OracleAnalyzer: class {},
  calculateFileHash: vi.fn(async () => "hash-1"),
  getRegistry: vi.fn(async () => ({ completedIndices: [] })),
  markChunkComplete: vi.fn(),
  clearRegistryEntry: vi.fn(),
  splitTextIntoChunks: vi.fn(() => []),
  mergeEntities: vi.fn((entities) => entities.flat()),
  getFileExtension: vi.fn((name: string) => `.${name.split(".").pop()}`),
  validateImportFile: vi.fn(() => ({ success: true })),
  detectChronicaExport: vi.fn((value: any) =>
    value?.campaign?.characters || value?.campaign?.places
      ? {
          campaignId: "grecia-1",
          campaignName: "Grecia",
          domains: value.campaign.characters ? ["characters"] : ["places"],
        }
      : null,
  ),
  parseChronicaExports: vi.fn(() => ({
    version: "1.0",
    sourceSystem: "chronica",
    sourceLabel: "Chronica Campaign Grecia",
    entityDrafts: [],
    relationshipDrafts: [],
    assetDrafts: [],
    warnings: [],
  })),
  parseScabardExport: vi.fn(() => ({ sourceLabel: "Scabard Campaign 7" })),
  ImportEngine: class {
    async prepare(pkg: any) {
      return pkg?.sourceSystem === "chronica"
        ? chronicaSession
        : scabardSession;
    }
    async commit() {
      return {
        sourceLabel: "Scabard Campaign 7",
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 0,
        relationshipCount: 0,
        unresolvedReferences: [],
        failures: [],
        assetCount: 0,
        warningCount: 0,
        typeFallbackCount: 0,
      };
    }
  },
  setItemDecision: vi.fn((session) => session),
  setMatchDecision: vi.fn((session) => session),
}));

import ImportSettings from "./ImportSettings.svelte";

describe("ImportSettings", () => {
  it("routes Scabard JSON to CC review without Oracle enabled", async () => {
    const { container } = render(ImportSettings, { isStandalone: false });

    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    await fireEvent.change(input!, {
      target: {
        files: [
          new File(['{"pages":[],"conns":[]}'], "campaign.json", {
            type: "application/json",
          }),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Scabard Campaign 7")).toBeTruthy();
    });

    expect(screen.getByText("Hero")).toBeTruthy();
    expect(
      screen.queryByText(
        "This file needs Oracle. Scabard JSON works without AI.",
      ),
    ).toBeNull();
  });

  it("routes grouped Chronica JSON files to CC review without Oracle enabled", async () => {
    const { container } = render(ImportSettings, { isStandalone: false });

    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    await fireEvent.change(input!, {
      target: {
        files: [
          new File(
            [
              JSON.stringify({
                export_created_at: "2026-06-27T20:00:00Z",
                campaign: {
                  id: "grecia-1",
                  name: "Grecia",
                  characters: [{ id: "char-1", name: "Ariadne" }],
                },
              }),
            ],
            "characters.json",
            { type: "application/json" },
          ),
          new File(
            [
              JSON.stringify({
                export_created_at: "2026-06-27T20:00:01Z",
                campaign: {
                  id: "grecia-1",
                  name: "Grecia",
                  places: [{ id: "place-1", name: "Knossos" }],
                },
              }),
            ],
            "places.json",
            { type: "application/json" },
          ),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Chronica Campaign Grecia")).toBeTruthy();
    });

    expect(screen.getByText("Ariadne")).toBeTruthy();
  });
});
