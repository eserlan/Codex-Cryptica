import type { RandomSource } from "random-source-engine";
import type { SourceWorkspaceSession } from "./source-workspace-session.svelte";

type ContextMenuState = { x: number; y: number; source: RandomSource };

/** Transient prompts for acting on sources in either the list or the editor. */
export class SourceWorkspacePrompts {
  constructor(
    private readonly session: SourceWorkspaceSession,
    private readonly getNoun: () => string,
    private readonly onDelete: (
      source: RandomSource,
    ) => void = session.confirmDelete,
    private readonly viewport: () =>
      { width: number; height: number } | undefined = () =>
      typeof window === "undefined"
        ? undefined
        : { width: window.innerWidth, height: window.innerHeight },
  ) {}
  contextMenu = $state<ContextMenuState | null>(null);
  deleteModalTarget = $state<RandomSource | null>(null);
  deleteModalImpact = $derived.by(() =>
    this.deleteModalTarget
      ? this.session.sources.impactOf(this.deleteModalTarget).referencedBy
      : [],
  );

  renameModalTarget = $state<RandomSource | null>(null);
  renameModalDraft = $state("");
  renameModalError = $state("");
  renameModalImpact = $derived.by(() => {
    if (!this.renameModalTarget) return [];
    return this.session.sources.impactOf(this.renameModalTarget).referencedBy;
  });

  showContextMenu = (source: RandomSource, x: number, y: number) => {
    const viewport = this.viewport();
    const maxX = viewport ? Math.max(0, viewport.width - 176) : x;
    const maxY = viewport ? Math.max(0, viewport.height - 272) : y;
    this.contextMenu = {
      x: Math.min(x, maxX),
      y: Math.min(y, maxY),
      source,
    };
  };

  closeContextMenu = () => {
    this.contextMenu = null;
  };

  openDeleteModal = (source: RandomSource) => {
    this.deleteModalTarget = source;
    this.closeContextMenu();
  };

  closeDeleteModal = () => {
    this.deleteModalTarget = null;
  };

  executeDelete = () => {
    if (!this.deleteModalTarget) return;
    const target = this.deleteModalTarget;
    this.onDelete(target);
    this.closeDeleteModal();
  };

  openRenameModal = (source: RandomSource) => {
    this.renameModalTarget = source;
    this.renameModalDraft = source.name;
    this.renameModalError = "";
    this.closeContextMenu();
  };

  closeRenameModal = () => {
    this.renameModalTarget = null;
    this.renameModalDraft = "";
    this.renameModalError = "";
  };

  handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (this.deleteModalTarget) {
      this.closeDeleteModal();
    } else if (this.renameModalTarget) {
      this.closeRenameModal();
    }
  };

  executeRename = () => {
    const trimmed = this.renameModalDraft.trim();
    if (!this.renameModalTarget || !trimmed) return;
    if (trimmed === this.renameModalTarget.name) {
      this.closeRenameModal();
      return;
    }
    const existing = this.session.sources.findByName(trimmed);
    if (existing && existing.id !== this.renameModalTarget.id) {
      this.renameModalError = `A ${this.getNoun()} named "${trimmed}" already exists.`;
      return;
    }

    if (
      this.session.draft &&
      this.session.draft.id === this.renameModalTarget.id
    ) {
      this.session.commitRename(trimmed);
    } else {
      this.session.renameSource(this.renameModalTarget, trimmed);
    }
    this.closeRenameModal();
  };
}
