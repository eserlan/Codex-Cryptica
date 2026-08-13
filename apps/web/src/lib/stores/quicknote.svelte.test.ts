vi.mock("@codex/ai-engine", () => ({
  textGenerationService: {
    generateStructuredEntity: vi.fn(),
  },
  contextRetrievalService: {
    retrieveContext: vi.fn().mockResolvedValue({ content: "mocked context" }),
  },
}));

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Svelte 5 effects and derived stubs for test environment before importing the store
(globalThis as any).$effect = (v: any) => v;
(globalThis as any).$effect.root = (v: any) => v();
if (!(globalThis as any).$derived) {
  (globalThis as any).$derived = (v: any) => v;
}
(globalThis as any).$derived.by = (fn: any) => fn();

vi.mock("./oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "mocked-api-key",
    modelName: "gemini-3.5-flash-lite",
  },
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
    createEntity: vi.fn().mockResolvedValue("new-entity-id"),
  },
}));

// Mock dependencies of quicknote.svelte.ts
import { QuickNoteStore } from "./quicknote.svelte";
import type { QuickNoteRecord } from "../services/QuickNoteService";
import { textGenerationService } from "@codex/ai-engine";
import { vault } from "./vault.svelte";

describe("QuickNoteStore (Svelte 5 Runes)", () => {
  let mockService: any;
  let mockVaultRegistry: any;
  let store: QuickNoteStore;

  const sampleNotes: QuickNoteRecord[] = [
    {
      id: 1,
      vaultId: "vault-1",
      content: "Note 1",
      status: "active",
      createdAt: 100,
    },
    {
      id: 2,
      vaultId: "vault-1",
      content: "Special Pirate Note",
      status: "active",
      createdAt: 200,
    },
  ];

  beforeEach(() => {
    mockService = {
      getAllActiveNotes: vi.fn().mockResolvedValue([...sampleNotes]),
      saveNote: vi.fn().mockResolvedValue(100),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      archiveNote: vi.fn().mockResolvedValue(undefined),
      elevateNote: vi.fn().mockResolvedValue(undefined),
    };
    mockVaultRegistry = { activeVaultId: "vault-1" };
    store = new QuickNoteStore(mockService, mockVaultRegistry);
  });

  it("should initialize with default states", () => {
    expect(store.isOpen).toBe(false);
    expect(store.currentNote).toBeNull();
    expect(store.filterText).toBe("");
  });

  it("should load active notes from service", async () => {
    await store.loadNotes("vault-1");
    expect(mockService.getAllActiveNotes).toHaveBeenCalledWith("vault-1");
    expect(store.activeNotes).toHaveLength(2);
    expect(store.count).toBe(2);
  });

  it("should open scratchpad and auto-select latest note if history exists", async () => {
    await store.loadNotes("vault-1");
    store.open();

    expect(store.isOpen).toBe(true);
    expect(store.currentNote).toEqual(sampleNotes[0]);
  });

  it("should open scratchpad and start a new note if no history exists", async () => {
    mockService.getAllActiveNotes.mockResolvedValue([]);
    await store.loadNotes("vault-1");
    store.open();

    expect(store.isOpen).toBe(true);
    expect(store.currentNote).toBeDefined();
    expect(store.currentNote?.content).toBe("");
    expect(store.currentNote?.vaultId).toBe("vault-1");
  });

  it("should toggle open and close state", () => {
    store.toggle();
    expect(store.isOpen).toBe(true);
    store.toggle();
    expect(store.isOpen).toBe(false);
  });

  it("should filter notes based on search text", async () => {
    await store.loadNotes("vault-1");
    expect(store.filteredNotes).toHaveLength(2);

    store.filterText = "pirate";
    expect(store.filteredNotes).toHaveLength(1);
    expect(store.filteredNotes[0].id).toBe(2);

    store.filterText = "non-existent";
    expect(store.filteredNotes).toHaveLength(0);
  });

  it("should save current note and reload list", async () => {
    store.open(); // starts new note
    store.currentNote!.content = "Brand new idea";

    await store.saveCurrentNote();

    expect(mockService.saveNote).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Brand new idea",
        vaultId: "vault-1",
      }),
    );
    expect(mockService.getAllActiveNotes).toHaveBeenCalled();
  });

  it("should discard active note", async () => {
    await store.loadNotes("vault-1");
    store.open(); // Selects note 1

    await store.discardNote(1);

    expect(mockService.deleteNote).toHaveBeenCalledWith(1);
    expect(mockService.getAllActiveNotes).toHaveBeenCalled();
  });

  it("should archive active note", async () => {
    await store.loadNotes("vault-1");
    store.open(); // Selects note 1

    await store.archiveNote(1);

    expect(mockService.archiveNote).toHaveBeenCalledWith(1);
    expect(mockService.getAllActiveNotes).toHaveBeenCalled();
  });

  it("should elevate active note", async () => {
    await store.loadNotes("vault-1");
    store.open(); // Selects note 1

    await store.elevateNote(1);

    expect(mockService.elevateNote).toHaveBeenCalledWith(1);
    expect(mockService.getAllActiveNotes).toHaveBeenCalled();
  });
  it("should trigger AI elevation successfully (positive path)", async () => {
    // Mock getNoteById
    mockService.getNoteById = vi.fn().mockResolvedValue({
      id: 1,
      vaultId: "vault-1",
      content: "Fleeting NPC concept: Captain Blackbeard",
      status: "active",
      createdAt: 100,
    });

    // Mock textGenerationService response
    vi.mocked(
      textGenerationService.generateStructuredEntity,
    ).mockImplementation(
      async (apiKey, query, context, modelName, onUpdate) => {
        onUpdate(
          "**Name:** Captain Blackbeard\n**Type:** NPC\n**Chronicle:** A fearsome pirate captain.\n**Lore:** He sails the seven seas.",
        );
      },
    );

    await store.triggerAIElevation(1);

    expect(mockService.getNoteById).toHaveBeenCalledWith(1);
    expect(textGenerationService.generateStructuredEntity).toHaveBeenCalled();
    expect(vault.createEntity).toHaveBeenCalledWith(
      "character",
      "Captain Blackbeard",
      {
        status: "draft",
        content: "A fearsome pirate captain.",
        lore: "He sails the seven seas.",
        discoverySource: "quicknote:1",
      },
    );
    expect(vault.selectedEntityId).toBe("new-entity-id");
    expect(store.isOpen).toBe(false);
  });

  it("should fallback to raw content elevation on AI failure (negative path)", async () => {
    // Mock getNoteById
    mockService.getNoteById = vi.fn().mockResolvedValue({
      id: 2,
      vaultId: "vault-1",
      content: "Failed AI Note Content",
      status: "active",
      createdAt: 200,
    });

    // Mock textGenerationService to throw an error
    vi.mocked(textGenerationService.generateStructuredEntity).mockRejectedValue(
      new Error("Gemini quota exceeded"),
    );

    // Clear previous mock calls
    vi.mocked(vault.createEntity).mockClear();

    await store.triggerAIElevation(2);

    expect(textGenerationService.generateStructuredEntity).toHaveBeenCalled();
    expect(vault.createEntity).toHaveBeenCalledWith("note", "Draft Entity", {
      status: "draft",
      content: "Failed AI Note Content",
      discoverySource: "quicknote:2",
    });
    expect(vault.selectedEntityId).toBe("new-entity-id");
    expect(store.isOpen).toBe(false);
  });

  it("should open note by ID if already active in state", async () => {
    const mockNote = {
      id: 42,
      vaultId: "vault-1",
      content: "Active note",
      status: "active",
      createdAt: 100,
    } as QuickNoteRecord;
    store.activeNotes = [mockNote];

    await store.openNoteById(42);

    expect(store.currentNote).toStrictEqual(mockNote);
    expect(store.isOpen).toBe(true);
  });

  it("should fetch and open note by ID if not in active state", async () => {
    const mockNote = {
      id: 99,
      vaultId: "vault-1",
      content: "Remote note",
      status: "active",
      createdAt: 100,
    } as QuickNoteRecord;
    mockService.getNoteById = vi.fn().mockResolvedValue(mockNote);
    store.activeNotes = [];

    await store.openNoteById(99);

    expect(mockService.getNoteById).toHaveBeenCalledWith(99);
    expect(store.currentNote).toStrictEqual(mockNote);
    expect(store.isOpen).toBe(true);
  });

  it("should unsubscribe and clean up on destroy", () => {
    const unsubscribeMock = vi.fn();
    (store as any).unsubscribeEventBus = unsubscribeMock;

    store.destroy();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
