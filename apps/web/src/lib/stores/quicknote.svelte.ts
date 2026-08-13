import {
  quickNoteService,
  type QuickNoteService,
  type QuickNoteRecord,
} from "../services/QuickNoteService";
import { vaultRegistry as defaultVaultRegistry } from "./vault-registry.svelte";
import { textGenerationService } from "@codex/ai-engine";
import { contextRetrievalService } from "@codex/ai-engine";
import { vaultEventBus } from "./vault/events.svelte";
import { vault } from "./vault.svelte";
import { oracle } from "./oracle.svelte";
import { systemClock } from "$lib/utils/runtime-deps";

/**
 * Reactive Svelte 5 Store to manage the state of the QuickNote Fast Scratchpad.
 * Uses constructor-based Dependency Injection for robust testing.
 */
export class QuickNoteStore {
  // Reactive states
  isOpen = $state(false);
  activeNotes = $state<QuickNoteRecord[]>([]);
  currentNote = $state<QuickNoteRecord | null>(null);
  filterText = $state("");
  isElevating = $state(false);
  elevationError = $state<string | null>(null);

  // Dependencies
  private service: QuickNoteService;
  private vaultRegistry: typeof defaultVaultRegistry;
  private unsubscribeEventBus: (() => void) | null = null;

  constructor(
    service: QuickNoteService = quickNoteService,
    vaultRegistry: typeof defaultVaultRegistry = defaultVaultRegistry,
  ) {
    this.service = service;
    this.vaultRegistry = vaultRegistry;

    // Load notes when the active vault ID changes reactively
    $effect.root(() => {
      $effect(() => {
        const activeId = this.vaultRegistry.activeVaultId;
        if (activeId) {
          void this.loadNotes(activeId);
        } else {
          this.activeNotes = [];
        }
      });
    });

    // Subscribe to vaultEventBus to detect when draft entities are approved/made active
    this.unsubscribeEventBus = vaultEventBus.subscribe(async (event) => {
      if (event.type === "ENTITY_UPDATED") {
        const { entity, patch } = event;
        if (
          patch.status === "active" &&
          entity.status === "active" &&
          entity.discoverySource?.startsWith("quicknote:")
        ) {
          const noteIdStr = entity.discoverySource.split(":")[1];
          const noteId = parseInt(noteIdStr, 10);
          if (!isNaN(noteId)) {
            await this.elevateNote(noteId);
          }
        }
      }
    }, "quicknote-store-approval");
  }

  /**
   * Cleans up subscriptions to prevent memory leaks in tests/sessions.
   */
  destroy(): void {
    if (this.unsubscribeEventBus) {
      this.unsubscribeEventBus();
    }
  }

  /**
   * Refreshes the local reactive active notes list from IndexedDB.
   */
  async loadNotes(
    vaultId: string | null = this.vaultRegistry.activeVaultId,
  ): Promise<void> {
    if (!vaultId) {
      this.activeNotes = [];
      return;
    }
    try {
      this.activeNotes = await this.service.getAllActiveNotes(vaultId);
    } catch (e) {
      console.error("[QuickNoteStore] Failed to load quick notes:", e);
    }
  }

  /**
   * Sets a specific note as the active note for the editor.
   */
  selectNote(note: QuickNoteRecord | null): void {
    this.currentNote = note;
    this.filterText = ""; // Clear filters on selection for clean editing context
  }

  /**
   * Opens the scratchpad, optionally focusing on a specific note.
   */
  open(note: QuickNoteRecord | null = null): void {
    this.isOpen = true;
    if (note) {
      this.selectNote(note);
    } else if (!this.currentNote && this.activeNotes.length > 0) {
      // Auto-select the most recent note if editing a fresh session
      this.selectNote(this.activeNotes[0]);
    } else if (!this.currentNote) {
      this.startNewNote();
    }
  }

  /**
   * Finds a note by its ID (loaded or from DB) and opens the scratchpad focusing on it.
   */
  async openNoteById(noteId: number): Promise<void> {
    let note = this.activeNotes.find((n) => n.id === noteId);
    if (!note) {
      try {
        note = await this.service.getNoteById(noteId);
      } catch (e) {
        console.error(`[QuickNoteStore] Failed to fetch note ${noteId}:`, e);
      }
    }
    if (note) {
      this.open(note);
    } else {
      this.open();
    }
  }

  /**
   * Closes the scratchpad overlay.
   */
  close(): void {
    this.isOpen = false;
  }

  /**
   * Toggles the scratchpad visibility.
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Initializes a brand-new blank draft note.
   */
  startNewNote(): void {
    const activeId = this.vaultRegistry.activeVaultId;
    if (!activeId) return;

    this.currentNote = {
      vaultId: activeId,
      content: "",
      status: "active",
      createdAt: systemClock.now(),
    };
  }

  /**
   * Saves the current active draft note, persisting it to DB and refreshing the list.
   */
  async saveCurrentNote(): Promise<void> {
    if (!this.currentNote) return;

    try {
      const id = await this.service.saveNote(this.currentNote);
      // Ensure local state has the newly generated ID
      this.currentNote.id = id;

      const activeId = this.vaultRegistry.activeVaultId;
      await this.loadNotes(activeId);
    } catch (e) {
      console.error("[QuickNoteStore] Failed to save current note:", e);
    }
  }

  /**
   * Discards the currently selected note, removing it from storage.
   */
  async discardNote(id?: number): Promise<void> {
    const targetId = id ?? this.currentNote?.id;
    if (!targetId) {
      // Just a local new draft, reset the editor
      this.startNewNote();
      return;
    }

    try {
      await this.service.deleteNote(targetId);
      const activeId = this.vaultRegistry.activeVaultId;
      await this.loadNotes(activeId);

      // If we deleted the currently edited note, switch to the next active or clear
      if (this.currentNote?.id === targetId) {
        if (this.activeNotes.length > 0) {
          this.selectNote(this.activeNotes[0]);
        } else {
          this.startNewNote();
        }
      }
    } catch (e) {
      console.error("[QuickNoteStore] Failed to discard note:", e);
    }
  }

  /**
   * Archives a note by ID or the current edited note.
   */
  async archiveNote(id?: number): Promise<void> {
    const targetId = id ?? this.currentNote?.id;
    if (!targetId) return;

    try {
      await this.service.archiveNote(targetId);
      const activeId = this.vaultRegistry.activeVaultId;
      await this.loadNotes(activeId);

      if (this.currentNote?.id === targetId) {
        if (this.activeNotes.length > 0) {
          this.selectNote(this.activeNotes[0]);
        } else {
          this.startNewNote();
        }
      }
    } catch (e) {
      console.error("[QuickNoteStore] Failed to archive note:", e);
    }
  }

  /**
   * Marks a note as elevated after successful conversion to a proper wiki entity.
   */
  async elevateNote(id: number): Promise<void> {
    try {
      await this.service.elevateNote(id);
      const activeId = this.vaultRegistry.activeVaultId;
      await this.loadNotes(activeId);

      if (this.currentNote?.id === id) {
        if (this.activeNotes.length > 0) {
          this.selectNote(this.activeNotes[0]);
        } else {
          this.startNewNote();
        }
      }
    } catch (e) {
      console.error("[QuickNoteStore] Failed to elevate note:", e);
    }
  }

  /**
   * Triggers the AI-powered elevation of a raw note into a structured wiki entity.
   */
  async triggerAIElevation(id: number): Promise<void> {
    const note = await this.service.getNoteById(id);
    if (!note || !note.content.trim()) return;

    this.isElevating = true;
    this.elevationError = null;

    try {
      const apiKey = oracle.effectiveApiKey || "";
      const modelName = oracle.modelName || "gemini-3.5-flash-lite";

      // 1. Retrieve semantic context based on note content to feed into LLM
      let context = "";
      try {
        const contextRes = await contextRetrievalService.retrieveContext(
          note.content,
          new Set<string>(),
          vault as any,
        );
        context = contextRes.content;
      } catch (err) {
        console.warn(
          "[QuickNoteStore] Context retrieval failed, continuing with empty context:",
          err,
        );
      }

      // 2. Call textGenerationService to generate structured format
      let generatedText = "";
      await textGenerationService.generateStructuredEntity(
        apiKey,
        note.content,
        context,
        modelName,
        (partial) => {
          generatedText = partial;
        },
      );

      if (!generatedText.trim()) {
        throw new Error("AI returned empty structured entity");
      }

      // 3. Parse generated structured entity
      const parsed = this.parseStructuredEntity(generatedText);

      // 4. Create a draft entity in the active vault
      const entityId = await vault.createEntity(
        parsed.type as any,
        parsed.title,
        {
          status: "draft",
          content: parsed.content,
          lore: parsed.lore,
          discoverySource: `quicknote:${id}`,
        },
      );

      // 5. Select/open the draft entity in detail sidebar and close scratchpad
      vault.selectedEntityId = entityId;
      this.close();
    } catch (err: any) {
      console.error("[QuickNoteStore] Failed to trigger AI elevation:", err);
      this.elevationError = err.message || "Failed to elevate note";
      // Fallback: create draft entity with raw content as edge case requirement
      try {
        const entityId = await vault.createEntity("note", "Draft Entity", {
          status: "draft",
          content: note.content,
          discoverySource: `quicknote:${id}`,
        });
        vault.selectedEntityId = entityId;
        this.close();
      } catch (fallbackErr) {
        console.error(
          "[QuickNoteStore] Fallback elevation also failed:",
          fallbackErr,
        );
      }
    } finally {
      this.isElevating = false;
    }
  }

  /**
   * Helper to parse the structured entity generation response.
   */
  private parseStructuredEntity(text: string) {
    const nameMatch = text.match(/\*\*Name:\*\*\s*(.+)/i);
    const typeMatch = text.match(/\*\*Type:\*\*\s*(.+)/i);
    const chronicleMatch = text.match(
      /\*\*Chronicle:\*\*\s*([\s\S]*?)(?=\*\*Lore:\*\*|$)/i,
    );
    const loreMatch = text.match(/\*\*Lore:\*\*\s*([\s\S]*)/i);

    const title = nameMatch ? nameMatch[1].trim() : "New Entity";
    let type = typeMatch ? typeMatch[1].trim().toLowerCase() : "note";

    // Normalize types
    if (
      type.includes("npc") ||
      type.includes("character") ||
      type.includes("person")
    ) {
      type = "character";
    } else if (
      type.includes("location") ||
      type.includes("place") ||
      type.includes("city") ||
      type.includes("dungeon")
    ) {
      type = "location";
    } else if (
      type.includes("faction") ||
      type.includes("group") ||
      type.includes("guild") ||
      type.includes("organization")
    ) {
      type = "faction";
    } else if (
      type.includes("item") ||
      type.includes("object") ||
      type.includes("weapon") ||
      type.includes("artifact")
    ) {
      type = "item";
    } else if (
      type.includes("event") ||
      type.includes("history") ||
      type.includes("timeline")
    ) {
      type = "event";
    } else {
      type = "note";
    }

    const content = chronicleMatch ? chronicleMatch[1].trim() : "";
    const lore = loreMatch ? loreMatch[1].trim() : "";

    return { title, type, content, lore };
  }

  // Reactive Derived getters
  filteredNotes = $derived.by(() => {
    const query = this.filterText.trim().toLowerCase();
    if (!query) return this.activeNotes;

    return this.activeNotes.filter((note) =>
      note.content.toLowerCase().includes(query),
    );
  });

  count = $derived(this.activeNotes.length);
}

/** Default global singleton instance of the QuickNoteStore. */
export const quickNoteStore = new QuickNoteStore();
export type { QuickNoteRecord };
