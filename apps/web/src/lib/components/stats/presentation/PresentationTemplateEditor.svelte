<script lang="ts">
  import {
    PRESENTATION_TEMPLATE_FORMAT_VERSION,
    type StatSheetTemplate,
    type StatSheetField,
    type PresentationTemplate,
  } from "schema";
  import {
    type VisualCard,
    getUnusedFields,
    parseCardsFromSource,
  } from "./visual-card-parser";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    parseTemplate,
    validateAst,
    exportPresentationTemplate,
    sanitizeSource,
    walkPresentationNodes,
    DISPLAY_MODES_BY_FIELD_TYPE,
  } from "@codex/stat-sheet-engine";
  import type {
    MissingFieldNode,
    UnknownDirectiveNode,
    FieldReferenceNode,
  } from "@codex/stat-sheet-engine";
  import PresentationRenderer from "./PresentationRenderer.svelte";
  import type { PresentationRenderContext } from "./types";

  const DISPLAY_MODE_OPTIONS = [
    { mode: undefined, label: "Default" },
    { mode: "plain", label: "Plain Inline" },
    { mode: "prominent", label: "Prominent Badge" },
    { mode: "current-max", label: "Current / Max Counter" },
    { mode: "counter", label: "Interactive Stepper" },
    { mode: "progress", label: "Progress Bar" },
    { mode: "tag-list", label: "Tag List" },
    { mode: "notes", label: "Notes Area" },
    { mode: "table", label: "Item Table" },
    { mode: "name-target", label: "Name & Target" },
  ] as const;

  let {
    schema,
    template = null,
    duplicate = false,
    onClose = () => {},
    onSaved = () => {},
  }: {
    schema: StatSheetTemplate;
    /** Template being edited, or duplicated (when `duplicate` is true).
     * `null` means "create from scratch". */
    template?: PresentationTemplate | null;
    duplicate?: boolean;
    onClose?: () => void;
    onSaved?: (saved: PresentationTemplate) => void;
  } = $props();

  const isNewRecord = $derived(!template || duplicate);

  // Seeded once from props at mount to initialize editable form state;
  // not meant to stay reactive to later prop changes (this component is
  // remounted per template via PresentationTemplateManager's #if block).
  // svelte-ignore state_referenced_locally
  let name = $state(
    template
      ? duplicate
        ? presentationTemplates.uniqueNameForSchema(
            `${template.name} Copy`,
            schema.id,
          )
        : template.name
      : presentationTemplates.uniqueNameForSchema("New Layout", schema.id),
  );
  // svelte-ignore state_referenced_locally
  let description = $state(template?.description ?? "");
  // svelte-ignore state_referenced_locally
  let source = $state(template?.source ?? "");
  let editorMode = $state<"visual" | "code">("visual");

  // Visual layout builder state derived from AST or built interactively

  let visualCards = $state<VisualCard[]>(
    parseCardsFromSource(source, schema?.fields),
  );

  function syncSourceFromVisualCards(cards: VisualCard[]) {
    let out = "";
    const fields = schema?.fields ?? [];
    for (const card of cards) {
      if (card.title) {
        out += `### ${card.title}\n`;
      }
      if (card.mode === "table") {
        const headers =
          card.tableHeaders && card.tableHeaders.length > 0
            ? card.tableHeaders
            : ["Field", "Value"];
        const markdownHeaders = headers.map((header) =>
          header.replace(/\r?\n/g, " ").replace(/\|/g, "\\|"),
        );
        out += `| ${markdownHeaders.join(" | ")} |\n`;
        out += `| ${headers.map(() => "---").join(" | ")} |\n`;
        for (const row of card.rows) {
          if (row.length === 0) continue;
          const cells = row.map((cell) => {
            if (cell.kind === "value") {
              return cell.value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
            }
            const fid = cell.fieldId;
            const f = fields.find((x) => x.id === fid);
            const override = fieldDisplayOverrides[fid];
            const mode =
              override?.displayMode ??
              (f?.type === "counter" ? "current-max" : undefined);
            const hideLabel = override?.hideLabel;
            if (
              hideLabel ||
              (override?.displayMode &&
                override.displayMode !== "plain" &&
                override.displayMode !==
                  (f?.type === "counter" ? "current-max" : undefined))
            ) {
              let attrs = [];
              if (mode) attrs.push(`display="${mode}"`);
              if (hideLabel) attrs.push("hide-label");
              return `{{stat.${fid}${attrs.length > 0 ? " " + attrs.join(" ") : ""}}}`;
            }
            if (mode && mode !== "plain") return `[${fid}:${mode}]`;
            return `[${fid}]`;
          });
          while (cells.length < headers.length) {
            cells.push("-");
          }
          out += `| ${cells.join(" | ")} |\n`;
        }
        out += `\n`;
      } else {
        out += `:::card\n`;
        for (const row of card.rows) {
          if (row.length === 0) continue;
          out += `:::stat-group columns=${card.columns}\n`;
          for (const cell of row) {
            if (cell.kind !== "field") continue;
            const fid = cell.fieldId;
            const f = fields.find((x) => x.id === fid);
            if (f) {
              const override = fieldDisplayOverrides[fid];
              const mode =
                override?.displayMode ??
                (f.type === "counter" ? "current-max" : undefined);
              const hideLabel = override?.hideLabel;
              if (
                hideLabel ||
                (override?.displayMode &&
                  override.displayMode !== "plain" &&
                  override.displayMode !==
                    (f.type === "counter" ? "current-max" : undefined))
              ) {
                let attrs = [];
                if (mode) attrs.push(`display="${mode}"`);
                if (hideLabel) attrs.push("hide-label");
                out += `{{stat.${fid}${attrs.length > 0 ? " " + attrs.join(" ") : ""}}}\n`;
              } else if (mode && mode !== "plain") {
                out += `[${fid}:${mode}]\n`;
              } else {
                out += `[${fid}]\n`;
              }
            } else {
              out += `[${fid}]\n`;
            }
          }
          out += `:::\n`;
        }
        out += `:::\n\n`;
      }
    }
    source = out.trim();
  }

  function addVisualCard(mode: "grid" | "table" = "grid") {
    visualCards.push({
      id: Math.random().toString(36).slice(2, 9),
      title:
        mode === "table"
          ? `Table ${visualCards.length + 1}`
          : `Section ${visualCards.length + 1}`,
      columns: 2,
      mode,
      tableHeaders:
        mode === "table" ? ["Stat / Item", "Value / Dice"] : undefined,
      rows: [[]],
    });
    syncSourceFromVisualCards(visualCards);
  }

  function updateCardColumns(cardId: string, value: number) {
    const columns = Math.max(1, Math.min(6, Math.round(value) || 1));
    visualCards = visualCards.map((card) => {
      if (card.id !== cardId) return card;
      if (card.mode !== "table") return { ...card, columns };

      const existingHeaders = card.tableHeaders ?? [];
      return {
        ...card,
        columns,
        tableHeaders: Array.from(
          { length: columns },
          (_, index) => existingHeaders[index] ?? `Column ${index + 1}`,
        ),
        rows: card.rows.map((row) => row.slice(0, columns)),
      };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function updateTableHeader(
    cardId: string,
    headerIndex: number,
    value: string,
  ) {
    visualCards = visualCards.map((card) => {
      if (card.id !== cardId || card.mode !== "table") return card;
      const headers = [...(card.tableHeaders ?? [])];
      headers[headerIndex] = value;
      return { ...card, tableHeaders: headers };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function removeVisualCard(cardId: string) {
    visualCards = visualCards.filter((c) => c.id !== cardId);
    syncSourceFromVisualCards(visualCards);
  }

  function addRowToCard(cardId: string) {
    visualCards = visualCards.map((c) =>
      c.id === cardId ? { ...c, rows: [...c.rows, []] } : c,
    );
    syncSourceFromVisualCards(visualCards);
  }

  function removeRowFromCard(cardId: string, rowIndex: number) {
    visualCards = visualCards.map((c) => {
      if (c.id !== cardId) return c;
      const nextRows = c.rows.filter((_, idx) => idx !== rowIndex);
      return { ...c, rows: nextRows.length > 0 ? nextRows : [[]] };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function addFieldToCardRow(
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    visualCards = visualCards.map((c) => {
      if (c.id !== cardId) return c;
      const nextRows = c.rows.map((r, idx) =>
        idx === rowIndex && (c.mode !== "table" || r.length < c.columns)
          ? [...r, { kind: "field" as const, fieldId }]
          : r,
      );
      return { ...c, rows: nextRows };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function addValueToTableRow(cardId: string, rowIndex: number) {
    visualCards = visualCards.map((card) => {
      if (card.id !== cardId) return card;
      return {
        ...card,
        rows: card.rows.map((row, index) =>
          index === rowIndex && row.length < card.columns
            ? [...row, { kind: "value", value: "" }]
            : row,
        ),
      };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function updateValueInTableRow(
    cardId: string,
    rowIndex: number,
    cellIndex: number,
    value: string,
  ) {
    visualCards = visualCards.map((card) => {
      if (card.id !== cardId) return card;
      return {
        ...card,
        rows: card.rows.map((row, index) =>
          index === rowIndex
            ? row.map((cell, rowCellIndex) =>
                rowCellIndex === cellIndex && cell.kind === "value"
                  ? { ...cell, value }
                  : cell,
              )
            : row,
        ),
      };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function removeValueFromTableRow(
    cardId: string,
    rowIndex: number,
    cellIndex: number,
  ) {
    visualCards = visualCards.map((card) => {
      if (card.id !== cardId) return card;
      return {
        ...card,
        rows: card.rows.map((row, index) =>
          index === rowIndex
            ? row.filter((_, rowCellIndex) => rowCellIndex !== cellIndex)
            : row,
        ),
      };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function removeFieldFromCardRow(
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    visualCards = visualCards.map((c) => {
      if (c.id !== cardId) return c;
      const nextRows = c.rows.map((r, idx) =>
        idx === rowIndex
          ? r.filter(
              (cell) => cell.kind !== "field" || cell.fieldId !== fieldId,
            )
          : r,
      );
      return { ...c, rows: nextRows };
    });
    syncSourceFromVisualCards(visualCards);
  }

  function moveCard(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= visualCards.length) return;
    const copy = [...visualCards];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    visualCards = copy;
    syncSourceFromVisualCards(visualCards);
  }

  let draggedCardIndex = $state<number | null>(null);

  function handleCardDragStart(index: number) {
    draggedCardIndex = index;
  }
  function handleCardDragOver(e: DragEvent, index: number) {
    if (draggedCardIndex === null || draggedCardIndex === index) return;
    e.preventDefault();
    const copy = [...visualCards];
    const item = copy.splice(draggedCardIndex, 1)[0];
    copy.splice(index, 0, item);
    draggedCardIndex = index;
    visualCards = copy;
    syncSourceFromVisualCards(visualCards);
  }
  function handleCardDragEnd() {
    draggedCardIndex = null;
  }

  let draggedField = $state<
    | { type: "move"; cardId: string; rowIndex: number; fieldId: string }
    | { type: "sidebar"; fieldId: string }
    | null
  >(null);

  function handleFieldDragStart(
    e: DragEvent,
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    e.stopPropagation();
    draggedField = { type: "move", cardId, rowIndex, fieldId };
  }

  function handleSidebarFieldDragStart(e: DragEvent, fieldId: string) {
    e.stopPropagation();
    draggedField = { type: "sidebar", fieldId };
  }

  function handleFieldDropRow(
    e: DragEvent,
    targetCardId: string,
    targetRowIndex: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedField) return;

    if (draggedField.type === "sidebar") {
      const fieldId = draggedField.fieldId;
      draggedField = null;
      addFieldToCardRow(targetCardId, targetRowIndex, fieldId);
      return;
    }

    const { cardId: srcCardId, rowIndex: srcRowIndex, fieldId } = draggedField;
    draggedField = null;

    visualCards = visualCards.map((c) => {
      let nextRows = c.rows;
      if (c.id === srcCardId) {
        nextRows = nextRows.map((r, idx) =>
          idx === srcRowIndex
            ? r.filter(
                (cell) => cell.kind !== "field" || cell.fieldId !== fieldId,
              )
            : r,
        );
      }
      if (c.id === targetCardId) {
        nextRows = nextRows.map((r, idx) =>
          idx === targetRowIndex && (c.mode !== "table" || r.length < c.columns)
            ? [...r, { kind: "field", fieldId }]
            : r,
        );
      }
      return { ...c, rows: nextRows };
    });
    syncSourceFromVisualCards(visualCards);
  }
  let isSaving = $state(false);
  let saveError = $state("");
  let showAutocomplete = $state(false);
  let showSyntaxHelp = $state(false);
  let autocompleteFilter = $state("");
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  // Reconstructs per-field overrides (hide-label, non-default display mode)
  // from the raw saved source so reopening the visual editor doesn't start
  // from a blank slate — syncSourceFromVisualCards() regenerates the whole
  // template from this map, so a stale/empty seed silently drops previously
  // saved overrides on the next visual edit.
  function deriveFieldDisplayOverrides(
    src: string,
  ): Record<string, { displayMode?: string; hideLabel?: boolean }> {
    const result = parseTemplate(src, PRESENTATION_TEMPLATE_FORMAT_VERSION);
    if (!result.ok) return {};
    const overrides: Record<
      string,
      { displayMode?: string; hideLabel?: boolean }
    > = {};
    walkPresentationNodes(result.ast, (node) => {
      if (node.type !== "field-reference") return;
      const fieldId = node.fieldId as string;
      const displayMode = node.displayMode as string | undefined;
      const hideLabel = node.hideLabel as boolean | undefined;
      if (displayMode || hideLabel) {
        overrides[fieldId] = {
          ...(displayMode ? { displayMode } : {}),
          ...(hideLabel ? { hideLabel: true } : {}),
        };
      }
    });
    return overrides;
  }

  let fieldDisplayOverrides = $state<
    Record<string, { displayMode?: string; hideLabel?: boolean }>
  >(deriveFieldDisplayOverrides(source));
  let chipContextMenu = $state<{
    x: number;
    y: number;
    cardId: string;
    rowIndex: number;
    fieldId: string;
  } | null>(null);

  function openChipContextMenu(
    e: MouseEvent,
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    e.preventDefault();
    e.stopPropagation();
    chipContextMenu = {
      x: e.clientX,
      y: e.clientY,
      cardId,
      rowIndex,
      fieldId,
    };
  }

  function openChipContextMenuFromKeyboard(
    e: KeyboardEvent,
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
    e.preventDefault();
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    chipContextMenu = {
      x: bounds.left,
      y: bounds.bottom,
      cardId,
      rowIndex,
      fieldId,
    };
  }

  function closeChipContextMenu() {
    chipContextMenu = null;
  }

  function setFieldDisplayMode(fieldId: string, displayMode?: string) {
    fieldDisplayOverrides[fieldId] = {
      ...fieldDisplayOverrides[fieldId],
      displayMode,
    };
    syncSourceFromVisualCards(visualCards);
    closeChipContextMenu();
  }

  function toggleFieldHideLabel(fieldId: string) {
    const current = fieldDisplayOverrides[fieldId]?.hideLabel ?? false;
    fieldDisplayOverrides[fieldId] = {
      ...fieldDisplayOverrides[fieldId],
      hideLabel: !current,
    };
    syncSourceFromVisualCards(visualCards);
    closeChipContextMenu();
  }

  // Sample values for live preview (contract: preview mode reads through
  // the same field-value accessor as real rendering, just backed by
  // representative data instead of an entity — spec.md Assumptions).
  function sampleValueFor(field: StatSheetField): StatSheetField["value"] {
    switch (field.type) {
      case "counter":
        return field.max !== undefined ? Math.round(field.max * 0.6) : 5;
      case "number":
        return 10;
      case "text":
        return "Sample text";
      case "longtext":
        return "Sample notes go here.";
      case "dice":
        return 45;
      default:
        return undefined;
    }
  }
  const sampleFields = $derived<StatSheetField[]>(
    schema.fields.map((f) => ({ ...f, value: sampleValueFor(f) })),
  );

  const parsed = $derived(
    parseTemplate(source, PRESENTATION_TEMPLATE_FORMAT_VERSION),
  );
  const previewAst = $derived(
    parsed.ok ? validateAst(parsed.ast, schema) : null,
  );

  function collectDiagnostics(nodes: unknown[]): {
    missing: MissingFieldNode[];
    unknown: UnknownDirectiveNode[];
    mismatched: FieldReferenceNode[];
  } {
    const missing: MissingFieldNode[] = [];
    const unknown: UnknownDirectiveNode[] = [];
    const mismatched: FieldReferenceNode[] = [];
    walkPresentationNodes(nodes, (node) => {
      if (node.type === "missing-field")
        missing.push(node as unknown as MissingFieldNode);
      if (node.type === "unknown-directive")
        unknown.push(node as unknown as UnknownDirectiveNode);
      if (node.type === "field-reference" && node.requestedDisplayMode)
        mismatched.push(node as unknown as FieldReferenceNode);
    });
    return { missing, unknown, mismatched };
  }

  const diagnostics = $derived(
    previewAst
      ? collectDiagnostics(previewAst)
      : { missing: [], unknown: [], mismatched: [] },
  );

  const previewContext: PresentationRenderContext = {
    get fields() {
      return sampleFields;
    },
    readOnly: true,
    mode: "preview",
    onUpdateFieldValue: () => {},
    onUpdateField: () => {},
    onAdjustCounter: () => {},
  };

  const filteredFields = $derived(
    schema.fields.filter(
      (f) =>
        f.id.toLowerCase().includes(autocompleteFilter.toLowerCase()) ||
        f.label.toLowerCase().includes(autocompleteFilter.toLowerCase()),
    ),
  );

  function insertSnippet(snippet: string, cursorOffset?: number) {
    const el = textareaEl;
    if (!el) {
      source = source + snippet;
    } else {
      const start = el.selectionStart ?? source.length;
      const end = el.selectionEnd ?? source.length;
      source = source.slice(0, start) + snippet + source.slice(end);
      const nextPos = start + (cursorOffset ?? snippet.length);
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      });
    }
  }

  function insertFieldReference(field: StatSheetField) {
    insertSnippet(`{{stat.${field.id}}}`);
    showAutocomplete = false;
    autocompleteFilter = "";
  }

  function generateStarterLayout() {
    let text = `## ${schema.name}\n\n`;
    let inCard = false;

    for (const f of schema.fields) {
      if (f.type === "heading") {
        if (inCard) {
          text += `:::\n\n`;
        }
        text += `:::card\n### ${f.label}\n`;
        inCard = true;
      } else {
        if (!inCard) {
          text += `:::card\n`;
          inCard = true;
        }
        if (f.type === "counter") {
          text += `{{stat.${f.id} display="current-max"}}\n`;
        } else if (f.type === "dice") {
          text += `{{stat.${f.id} display="plain"}}\n`;
        } else if (f.type === "number") {
          text += `{{stat.${f.id} display="prominent"}}\n`;
        } else {
          text += `{{stat.${f.id}}}\n`;
        }
      }
    }
    if (inCard) {
      text += `:::\n`;
    }
    source = text;
  }

  async function save() {
    if (!name.trim()) return;
    isSaving = true;
    saveError = "";
    try {
      // FR-004: strip disallowed content (raw HTML/script/executable
      // expressions) from the durable source on save, not just at
      // render/import time, so nothing unsafe can be persisted or exported.
      const { source: sanitized, removed } = sanitizeSource(source);
      const saved = await presentationTemplates.saveTemplate({
        id: isNewRecord ? undefined : template?.id,
        schemaTemplateId: schema.id,
        name: name.trim(),
        description: description.trim() || null,
        source: sanitized,
        formatVersion: PRESENTATION_TEMPLATE_FORMAT_VERSION,
      });
      if (!saved) {
        saveError = "Failed to save template.";
        return;
      }
      const notice =
        removed.length > 0
          ? ` (${removed.length} disallowed item${removed.length === 1 ? "" : "s"} removed)`
          : "";
      notificationStore.notify(
        `Saved template "${saved.name}"${notice}`,
        "success",
      );
      onSaved(saved);
      onClose();
    } catch (e) {
      saveError = e instanceof Error ? e.message : "Failed to save template.";
    } finally {
      isSaving = false;
    }
  }

  function exportCurrent() {
    if (!template || duplicate) return;
    const pkg = exportPresentationTemplate(template);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.presentation.json`;
    a.click();
    // Defer revocation past the current tick: revoking immediately after
    // click() can race the browser's download/navigation handoff in some
    // browsers and produce a broken/empty download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
</script>

<div
  class="fixed inset-0 z-[200] flex flex-col bg-theme-bg font-body overflow-hidden"
  role="presentation"
>
  <div
    class="flex h-full w-full flex-col overflow-hidden bg-theme-surface shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="presentation-editor-title"
    data-testid="presentation-template-editor"
  >
    <div
      class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-4"
    >
      <div class="flex items-center gap-3">
        <h2
          id="presentation-editor-title"
          class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
        >
          {isNewRecord
            ? "New Presentation Template"
            : "Edit Presentation Template"}
        </h2>
        <button
          type="button"
          class="flex items-center gap-1 rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors"
          onclick={() => (showSyntaxHelp = true)}
          data-testid="presentation-editor-help-btn"
        >
          <span
            class="icon-[lucide--help-circle] h-3.5 w-3.5 text-theme-primary"
            aria-hidden="true"
          ></span>
          Syntax Help
        </button>
      </div>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        onclick={onClose}
        aria-label="Close"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
      <div class="grid shrink-0 gap-3 sm:grid-cols-2">
        <div>
          <label
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            for="presentation-template-name"
          >
            Name
          </label>
          <input
            id="presentation-template-name"
            class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            bind:value={name}
            data-testid="presentation-template-name-input"
          />
        </div>
        <div>
          <label
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            for="presentation-template-description"
          >
            Description
          </label>
          <input
            id="presentation-template-description"
            class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            bind:value={description}
          />
        </div>
      </div>

      <div class="mt-4 flex-1 min-h-0 grid gap-4 lg:grid-cols-2">
        <div class="flex flex-1 min-h-0 flex-col gap-1.5">
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class={editorMode === "visual"
                  ? "rounded bg-theme-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-bg"
                  : "rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
                onclick={() => {
                  if (editorMode !== "visual") {
                    visualCards = parseCardsFromSource(source, schema?.fields);
                    editorMode = "visual";
                  }
                }}
                data-testid="presentation-editor-tab-visual"
              >
                Visual Builder
              </button>
              <button
                type="button"
                class={editorMode === "code"
                  ? "rounded bg-theme-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-bg"
                  : "rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
                onclick={() => (editorMode = "code")}
                data-testid="presentation-editor-tab-code"
              >
                Markdown Code
              </button>
            </div>
            {#if editorMode === "code"}
              <div class="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  class="rounded border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={generateStarterLayout}
                  title="Generate starter layout from schema fields"
                  data-testid="presentation-editor-auto-layout"
                >
                  ⚡ Auto Layout
                </button>
                <button
                  type="button"
                  class="rounded border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() => insertSnippet(":::card\n\n:::", 9)}
                  title="Insert Card Container"
                >
                  + Card
                </button>
                <button
                  type="button"
                  class="rounded border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() =>
                    insertSnippet(":::stat-group columns=2\n\n:::", 24)}
                  title="Insert 2 Column Grid"
                >
                  + 2-Col
                </button>
                <button
                  type="button"
                  class="rounded border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() =>
                    insertSnippet(":::stat-group columns=3\n\n:::", 24)}
                  title="Insert 3 Column Grid"
                >
                  + 3-Col
                </button>
                <button
                  type="button"
                  class="rounded border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() => insertSnippet(":::row\n\n:::", 8)}
                  title="Insert Row Container"
                >
                  + Row
                </button>
                <button
                  type="button"
                  class="rounded border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() =>
                    insertSnippet(
                      "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |",
                      0,
                    )}
                  title="Insert Markdown Table"
                >
                  + Table
                </button>
                <div class="relative">
                  <button
                    type="button"
                    class="rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                    onclick={() => (showAutocomplete = !showAutocomplete)}
                    data-testid="presentation-editor-insert-field"
                  >
                    Insert Field
                  </button>
                  {#if showAutocomplete}
                    <div
                      class="absolute right-0 z-10 mt-1 w-56 rounded border border-theme-border bg-theme-surface p-2 shadow-xl"
                      data-testid="presentation-editor-autocomplete"
                    >
                      <input
                        class="mb-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text"
                        placeholder="Filter fields..."
                        bind:value={autocompleteFilter}
                        data-testid="presentation-editor-autocomplete-filter"
                      />
                      <ul class="max-h-40 overflow-y-auto">
                        {#each filteredFields as field (field.id)}
                          <li>
                            <button
                              type="button"
                              class="w-full rounded px-2 py-1 text-left text-xs text-theme-text hover:bg-theme-primary/10"
                              onclick={() => insertFieldReference(field)}
                              data-testid="presentation-editor-autocomplete-option"
                            >
                              {field.label}
                              <span class="text-theme-muted">({field.id})</span>
                            </button>
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          {#if editorMode === "visual"}
            <div
              class="flex flex-1 gap-3 overflow-hidden"
              data-testid="presentation-editor-visual-builder"
            >
              <!-- Left Sidebar: Available Schema Fields Palette -->
              <div
                class="flex w-64 md:w-72 shrink-0 flex-col gap-2 overflow-y-auto rounded border border-theme-border bg-theme-surface/80 p-2.5 shadow-inner"
              >
                <div
                  class="flex items-center justify-between border-b border-theme-border pb-1.5"
                >
                  <span
                    class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                  >
                    Available Fields
                  </span>
                  <span
                    class="rounded bg-theme-bg px-1.5 py-0.5 text-[9px] font-bold text-theme-primary"
                  >
                    {schema?.fields?.filter((f) => f.type !== "heading")
                      .length ?? 0}
                  </span>
                </div>
                <p class="text-[9px] text-theme-muted leading-tight">
                  Drag fields into any card row. You can reuse a field multiple
                  times!
                </p>
                <div class="flex flex-col gap-1.5 mt-1">
                  {#each schema?.fields?.filter((f) => f.type !== "heading") ?? [] as f (f.id)}
                    <div
                      draggable="true"
                      ondragstart={(e) => handleSidebarFieldDragStart(e, f.id)}
                      class="flex items-center justify-between gap-1 rounded border border-theme-border/70 bg-theme-bg px-2 py-1.5 text-xs text-theme-text font-medium cursor-grab active:cursor-grabbing hover:border-theme-primary/80 hover:bg-theme-primary/5 transition-all shadow-xs"
                    >
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span
                          class="icon-[lucide--grip-vertical] h-3 w-3 text-theme-muted shrink-0"
                          aria-hidden="true"
                        ></span>
                        <span class="truncate">{f.label}</span>
                      </div>
                      <span
                        class="text-[9px] font-mono text-theme-muted shrink-0"
                        >[{f.id}]</span
                      >
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Main Canvas: Section Cards & Rows -->
              <div
                class="flex flex-1 flex-col gap-3 overflow-y-auto rounded border border-theme-border bg-theme-bg/30 p-2"
              >
                {#each visualCards as card, idx (card.id)}
                  <div
                    draggable="true"
                    ondragstart={() => handleCardDragStart(idx)}
                    ondragover={(e) => handleCardDragOver(e, idx)}
                    ondragend={handleCardDragEnd}
                    class="flex flex-col gap-2 rounded border border-theme-border bg-theme-surface p-2.5 shadow-sm transition-shadow cursor-grab active:cursor-grabbing hover:border-theme-primary/50"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span
                          class="icon-[lucide--grip-vertical] h-3.5 w-3.5 text-theme-muted"
                          aria-hidden="true"
                        ></span>
                        <span
                          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider {card.mode ===
                          'table'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-theme-primary/15 text-theme-primary border border-theme-primary/30'}"
                        >
                          <span
                            class="{card.mode === 'table'
                              ? 'icon-[lucide--table]'
                              : 'icon-[lucide--layout-grid]'} h-3 w-3"
                            aria-hidden="true"
                          ></span>
                          {card.mode === "table" ? "Table" : "Card"}
                        </span>
                        <input
                          type="text"
                          class="rounded border border-theme-border bg-theme-bg px-2 py-0.5 text-xs font-bold text-theme-text"
                          value={card.title}
                          placeholder={card.mode === "table"
                            ? "Table Title"
                            : "Card Title"}
                          oninput={(e) => {
                            card.title = (e.target as HTMLInputElement).value;
                            syncSourceFromVisualCards(visualCards);
                          }}
                        />
                      </div>
                      <div class="flex items-center gap-1">
                        <label
                          class="flex items-center gap-1 text-[10px] text-theme-muted"
                        >
                          Cols:
                          <input
                            type="number"
                            min="1"
                            max="6"
                            step="1"
                            inputmode="numeric"
                            aria-label={`Columns for ${card.title || (card.mode === "table" ? "table" : "card")}`}
                            class="w-12 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                            value={card.columns}
                            oninput={(event) => {
                              updateCardColumns(
                                card.id,
                                Number(
                                  (event.target as HTMLInputElement).value,
                                ),
                              );
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          class="rounded px-1 text-xs text-theme-muted hover:text-theme-text"
                          disabled={idx === 0}
                          onclick={() => moveCard(idx, -1)}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          class="rounded px-1 text-xs text-theme-muted hover:text-theme-text"
                          disabled={idx === visualCards.length - 1}
                          onclick={() => moveCard(idx, 1)}
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          class="rounded px-1 text-xs text-red-400 hover:text-red-300"
                          onclick={() => removeVisualCard(card.id)}
                          title="Remove Card"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {#if card.mode === "table"}
                      <div
                        class="flex flex-wrap items-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/5 p-1.5"
                      >
                        <span
                          class="text-[9px] font-bold uppercase tracking-wider text-theme-muted"
                        >
                          Headers
                        </span>
                        {#each card.tableHeaders ?? [] as header, headerIndex (`${card.id}-header-${headerIndex}`)}
                          <input
                            type="text"
                            class="min-w-20 flex-1 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
                            value={header}
                            aria-label={`Header ${headerIndex + 1} for ${card.title || "table"}`}
                            placeholder={`Column ${headerIndex + 1}`}
                            oninput={(event) =>
                              updateTableHeader(
                                card.id,
                                headerIndex,
                                (event.target as HTMLInputElement).value,
                              )}
                          />
                        {/each}
                      </div>
                    {/if}

                    <div class="flex flex-col gap-2">
                      {#each card.rows as rowFields, rIdx (rIdx)}
                        {@const hasTableCapacity =
                          card.mode !== "table" ||
                          rowFields.length < card.columns}
                        <div class="flex items-center gap-1.5">
                          <span
                            class="text-[9px] font-bold uppercase tracking-wider text-theme-muted"
                            >Row {rIdx + 1}</span
                          >
                          <div
                            class="flex flex-1 flex-wrap items-center gap-1.5 min-h-[36px] rounded border border-dashed border-theme-border/60 bg-theme-bg/40 p-1.5 transition-colors"
                            ondragover={(e) => e.preventDefault()}
                            ondrop={(e) => handleFieldDropRow(e, card.id, rIdx)}
                          >
                            {#each rowFields as cell, cIdx (`${cell.kind}-${cIdx}`)}
                              {#if cell.kind === "field"}
                                {@const fid = cell.fieldId}
                                {@const f = schema?.fields?.find(
                                  (x) => x.id === fid,
                                )}
                                {@const override = fieldDisplayOverrides[fid]}
                                <div
                                  class="inline-flex items-center gap-1 rounded {f
                                    ? 'bg-theme-primary/10 border border-theme-primary/20 text-theme-text hover:border-theme-primary'
                                    : 'bg-amber-500/10 border border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:border-amber-500'} px-2 py-0.5 text-xs font-medium transition-colors select-none"
                                >
                                  <button
                                    type="button"
                                    draggable="true"
                                    ondragstart={(e) =>
                                      handleFieldDragStart(
                                        e,
                                        card.id,
                                        rIdx,
                                        fid,
                                      )}
                                    oncontextmenu={(e) =>
                                      openChipContextMenu(
                                        e,
                                        card.id,
                                        rIdx,
                                        fid,
                                      )}
                                    onkeydown={(e) =>
                                      openChipContextMenuFromKeyboard(
                                        e,
                                        card.id,
                                        rIdx,
                                        fid,
                                      )}
                                    class="inline-flex items-center gap-1 cursor-grab active:cursor-grabbing"
                                    aria-label={`${f?.label ?? fid} field options`}
                                    title={f
                                      ? "Right-click for display options"
                                      : "Field no longer exists in schema"}
                                  >
                                    <span
                                      class="icon-[lucide--grip-vertical] h-3 w-3 text-theme-muted"
                                      aria-hidden="true"
                                    ></span>
                                    {#if !f}
                                      <span
                                        class="icon-[lucide--alert-triangle] h-3 w-3 text-amber-500 shrink-0"
                                        aria-hidden="true"
                                      ></span>
                                      <span class="italic">{fid} (missing)</span
                                      >
                                    {:else}
                                      {f.label}
                                    {/if}
                                    {#if override?.displayMode && override.displayMode !== "plain"}
                                      <span
                                        class="rounded bg-theme-primary/20 px-1 py-0.2 text-[9px] font-mono text-theme-primary font-bold"
                                      >
                                        {override.displayMode}
                                      </span>
                                    {/if}
                                    {#if override?.hideLabel}
                                      <span
                                        class="rounded bg-theme-muted/20 px-1 py-0.2 text-[9px] font-mono text-theme-muted"
                                        title="Label hidden"
                                      >
                                        no-lbl
                                      </span>
                                    {/if}
                                  </button>
                                  <button
                                    type="button"
                                    class="ml-0.5 text-[10px] text-theme-muted hover:text-red-400"
                                    onclick={() =>
                                      removeFieldFromCardRow(
                                        card.id,
                                        rIdx,
                                        fid,
                                      )}
                                    title="Remove field"
                                  >
                                    ✕
                                  </button>
                                </div>
                              {:else}
                                <div
                                  class="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5"
                                >
                                  <input
                                    type="text"
                                    class="w-24 bg-transparent text-xs text-theme-text outline-none placeholder:text-theme-muted"
                                    value={cell.value}
                                    aria-label={`Value for table row ${rIdx + 1}`}
                                    placeholder="Table value"
                                    oninput={(event) =>
                                      updateValueInTableRow(
                                        card.id,
                                        rIdx,
                                        cIdx,
                                        (event.target as HTMLInputElement)
                                          .value,
                                      )}
                                  />
                                  <button
                                    type="button"
                                    class="text-[10px] text-theme-muted hover:text-red-400"
                                    onclick={() =>
                                      removeValueFromTableRow(
                                        card.id,
                                        rIdx,
                                        cIdx,
                                      )}
                                    aria-label={`Remove value from table row ${rIdx + 1}`}
                                  >
                                    ✕
                                  </button>
                                </div>
                              {/if}
                            {/each}
                            {#if hasTableCapacity && getUnusedFields(visualCards, schema?.fields).length > 0}
                              <select
                                class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-muted hover:text-theme-text"
                                value=""
                                onchange={(e) => {
                                  const val = (e.target as HTMLSelectElement)
                                    .value;
                                  if (val)
                                    addFieldToCardRow(card.id, rIdx, val);
                                  (e.target as HTMLSelectElement).value = "";
                                }}
                              >
                                <option value="" disabled selected
                                  >+ Add Field...</option
                                >
                                {#each getUnusedFields(visualCards, schema?.fields) as uf (uf.id)}
                                  <option value={uf.id}>{uf.label}</option>
                                {/each}
                              </select>
                            {/if}
                            {#if card.mode === "table" && hasTableCapacity}
                              <button
                                type="button"
                                class="rounded border border-dashed border-amber-500/40 px-1.5 py-0.5 text-xs text-amber-700 hover:border-amber-500 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                                onclick={() =>
                                  addValueToTableRow(card.id, rIdx)}
                                data-testid="presentation-editor-add-table-value"
                              >
                                + Add Value
                              </button>
                            {/if}
                          </div>
                          {#if card.rows.length > 1}
                            <button
                              type="button"
                              class="rounded px-1.5 py-1 text-[10px] text-theme-muted hover:text-red-400"
                              onclick={() => removeRowFromCard(card.id, rIdx)}
                              title="Delete Row"
                            >
                              ✕
                            </button>
                          {/if}
                        </div>
                      {/each}
                      <button
                        type="button"
                        class="self-start rounded border border-theme-border/60 px-2 py-0.5 text-[10px] font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                        onclick={() => addRowToCard(card.id)}
                      >
                        + Add Row to {card.mode === "table" ? "Table" : "Card"}
                      </button>
                    </div>
                  </div>
                {/each}

                <div class="flex gap-2">
                  <button
                    type="button"
                    class="flex-1 rounded border border-dashed border-theme-border p-2 text-center text-xs font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                    onclick={() => addVisualCard("grid")}
                    data-testid="presentation-editor-add-card"
                  >
                    + Add Grid Section
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded border border-dashed border-theme-border p-2 text-center text-xs font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                    onclick={() => addVisualCard("table")}
                    data-testid="presentation-editor-add-table"
                  >
                    + Add Table Section
                  </button>
                </div>
              </div>
            </div>
          {/if}
          <textarea
            bind:this={textareaEl}
            bind:value={source}
            oninput={() => {
              source = source;
            }}
            rows="14"
            class={editorMode === "code"
              ? "w-full flex-1 resize-none rounded border border-theme-border bg-theme-bg p-2 font-mono text-xs text-theme-text"
              : "hidden"}
            placeholder={`# Heading\n\n:::stat-group columns=2\n{{stat.hp display="current-max"}}\n:::`}
            data-testid="presentation-editor-source"
          ></textarea>

          {#if diagnostics.missing.length > 0 || diagnostics.unknown.length > 0 || diagnostics.mismatched.length > 0}
            <ul
              class="flex flex-col gap-1"
              data-testid="presentation-editor-diagnostics"
            >
              {#each diagnostics.missing as m, i (i)}
                <li
                  class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  This refers to a field ("{m.fieldId}") that doesn't exist on
                  the schema.
                </li>
              {/each}
              {#each diagnostics.unknown as u, i (i)}
                <li
                  class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  Unsupported layout section: "{u.name}"
                </li>
              {/each}
              {#each diagnostics.mismatched as f, i (i)}
                <li
                  class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  "{f.requestedDisplayMode}" isn't a supported display for "{f.fieldId}"
                  — showing "{f.displayMode}" instead.
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="flex flex-1 flex-col gap-1.5 min-h-0">
          <span
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            >Preview</span
          >
          <div
            class="flex-1 overflow-y-auto rounded border border-theme-border bg-theme-bg/50 p-3"
            data-testid="presentation-editor-preview"
          >
            {#if previewAst}
              <PresentationRenderer
                nodes={previewAst}
                context={previewContext}
              />
            {/if}
          </div>
        </div>
      </div>

      {#if saveError}
        <p class="mt-3 text-xs text-red-400" role="alert">{saveError}</p>
      {/if}
    </div>

    <div
      class="flex items-center justify-between gap-2 border-t border-theme-border p-4"
    >
      {#if !isNewRecord}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={exportCurrent}
          data-testid="presentation-editor-export"
        >
          Export
        </button>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-bg disabled:opacity-40"
          onclick={save}
          disabled={!name.trim() || isSaving}
          data-testid="presentation-editor-save"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  </div>
</div>

{#if showSyntaxHelp}
  <div
    class="fixed inset-0 z-[210] flex items-center justify-center bg-theme-bg/85 p-4 backdrop-blur-xs"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && (showSyntaxHelp = false)}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="syntax-help-title"
      data-testid="presentation-syntax-help-modal"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-3.5"
      >
        <div class="flex items-center gap-2">
          <span
            class="icon-[lucide--book-open] h-4 w-4 text-theme-primary"
            aria-hidden="true"
          ></span>
          <h3
            id="syntax-help-title"
            class="font-header text-xs font-bold uppercase tracking-widest text-theme-text"
          >
            Presentation Template Syntax Guide
          </h3>
        </div>
        <button
          type="button"
          class="text-theme-muted hover:text-theme-text"
          onclick={() => (showSyntaxHelp = false)}
          aria-label="Close syntax guide"
        >
          <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-theme-text">
        <div
          class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
        >
          <h4
            class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
          >
            1. Field References
          </h4>
          <p class="text-theme-muted text-[11px]">
            Reference stat fields using simple brackets <code
              class="rounded bg-theme-bg px-1 font-mono text-theme-primary"
              >[field_id]</code
            >
            or mustache syntax
            <code class="rounded bg-theme-bg px-1 font-mono text-theme-primary"
              >&#123;&#123;stat.field_id&#125;&#125;</code
            >.
          </p>
          <p class="text-theme-muted text-[11px]">
            In the Visual Builder, right-click a field chip to choose a
            compatible display mode or hide its label.
          </p>
          <div
            class="font-mono text-[11px] space-y-1 bg-theme-bg p-2 rounded border border-theme-border"
          >
            <div>
              <span class="text-theme-primary">[hp]</span>
              <span class="text-theme-muted">→ Standard field display</span>
            </div>
            <div>
              <span class="text-theme-primary">[ac:prominent]</span>
              <span class="text-theme-muted"
                >→ Prominent / large score badge</span
              >
            </div>
            <div>
              <span class="text-theme-primary">[hp:current-max]</span>
              <span class="text-theme-muted">→ Counter with max value</span>
            </div>
            <div>
              <span class="text-theme-primary"
                >&#123;&#123;stat.speed hide-label&#125;&#125;</span
              >
              <span class="text-theme-muted"
                >→ Hide field label (boolean syntax)</span
              >
            </div>
            <div>
              <span class="text-theme-primary"
                >&#123;&#123;stat.speed label=""&#125;&#125;</span
              >
              <span class="text-theme-muted"
                >→ Hide field label (empty label string)</span
              >
            </div>
            <div>
              <span class="text-theme-primary"
                >&#123;&#123;stat.str label="Strength"&#125;&#125;</span
              >
              <span class="text-theme-muted">→ Custom label override</span>
            </div>
          </div>
        </div>

        <div
          class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
        >
          <h4
            class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
          >
            2. Available Display Modes
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full text-[11px] border-collapse text-left">
              <thead>
                <tr class="border-b border-theme-border/60 text-theme-primary">
                  <th class="py-1 px-1">Mode</th>
                  <th class="py-1 px-1">Supported Types</th>
                  <th class="py-1 px-1">Effect</th>
                </tr>
              </thead>
              <tbody
                class="divide-y divide-theme-border/40 text-theme-text font-mono text-[10px]"
              >
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold">plain</td>
                  <td class="py-1 px-1 text-theme-muted">All types</td>
                  <td class="py-1 px-1 font-sans"
                    >Standard inline label & input</td
                  >
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold"
                    >prominent</td
                  >
                  <td class="py-1 px-1 text-theme-muted"
                    >number, dice, counter</td
                  >
                  <td class="py-1 px-1 font-sans">Big, bold stat score</td>
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold"
                    >current-max</td
                  >
                  <td class="py-1 px-1 text-theme-muted">counter</td>
                  <td class="py-1 px-1 font-sans"
                    >Counter badge (e.g. 12 / 20)</td
                  >
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold">counter</td
                  >
                  <td class="py-1 px-1 text-theme-muted">counter</td>
                  <td class="py-1 px-1 font-sans"
                    >Interactive stepper (— / +)</td
                  >
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold"
                    >progress</td
                  >
                  <td class="py-1 px-1 text-theme-muted">counter</td>
                  <td class="py-1 px-1 font-sans">Resource progress bar</td>
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold"
                    >checkbox</td
                  >
                  <td class="py-1 px-1 text-theme-muted">text</td>
                  <td class="py-1 px-1 font-sans">Checkable toggle box</td>
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold"
                    >tag-list</td
                  >
                  <td class="py-1 px-1 text-theme-muted">text</td>
                  <td class="py-1 px-1 font-sans">Comma-separated pill tags</td>
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold">notes</td>
                  <td class="py-1 px-1 text-theme-muted">longtext</td>
                  <td class="py-1 px-1 font-sans">Multi-line text area</td>
                </tr>
                <tr>
                  <td class="py-1 px-1 text-theme-primary font-bold">table</td>
                  <td class="py-1 px-1 text-theme-muted">item-table</td>
                  <td class="py-1 px-1 font-sans"
                    >Interactive equipment table</td
                  >
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
        >
          <h4
            class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
          >
            3. Card Containers (<code class="font-mono text-theme-primary"
              >:::card</code
            >)
          </h4>
          <p class="text-theme-muted text-[11px]">
            Wrap layout content inside card borders with fenced directives.
          </p>
          <pre
            class="font-mono text-[11px] bg-theme-bg p-2 rounded border border-theme-border text-theme-text overflow-x-auto">
:::card
### Section Title
[field_1]
:::
          </pre>
        </div>

        <div
          class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
        >
          <h4
            class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
          >
            4. Multi-Column Grids (<code class="font-mono text-theme-primary"
              >:::stat-group columns=N</code
            >)
          </h4>
          <p class="text-theme-muted text-[11px]">
            Arrange stat fields into 1 to 6 responsive grid columns.
          </p>
          <pre
            class="font-mono text-[11px] bg-theme-bg p-2 rounded border border-theme-border text-theme-text overflow-x-auto">
:::card
:::stat-group columns=3
[str:prominent]
[dex:prominent]
[con:prominent]
:::
:::
          </pre>
        </div>

        <div
          class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
        >
          <h4
            class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
          >
            5. Markdown Tables
          </h4>
          <p class="text-theme-muted text-[11px]">
            Use standard GFM Markdown tables to embed rollable attacks or stats
            in table rows.
          </p>
          <pre
            class="font-mono text-[11px] bg-theme-bg p-2 rounded border border-theme-border text-theme-text overflow-x-auto">
| Attack | Bonus | Damage |
| --- | --- | --- |
| Shortsword | [atk_bonus] | [damage] |
          </pre>
        </div>
      </div>

      <div class="border-t border-theme-border p-3 flex justify-end">
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-theme-bg hover:opacity-90"
          onclick={() => (showSyntaxHelp = false)}
        >
          Got it
        </button>
      </div>
    </div>
  </div>
{/if}

{#if chipContextMenu}
  {@const targetField = schema?.fields?.find(
    (field) => field.id === chipContextMenu?.fieldId,
  )}
  {@const currentOverride = fieldDisplayOverrides[chipContextMenu.fieldId]}
  <button
    type="button"
    class="fixed inset-0 z-[220]"
    onclick={closeChipContextMenu}
    oncontextmenu={(e) => {
      e.preventDefault();
      closeChipContextMenu();
    }}
    aria-label="Close field display options"
  ></button>
  <div
    class="fixed z-[230] min-w-[180px] rounded-lg border border-theme-border bg-theme-surface p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
    style:left="{chipContextMenu.x}px"
    style:top="{chipContextMenu.y}px"
    role="menu"
    tabindex="0"
    aria-label="Field Display Options"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === "Escape" && closeChipContextMenu()}
  >
    <div
      class="border-b border-theme-border/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-muted"
    >
      Display Options — {targetField?.label ?? chipContextMenu.fieldId}
    </div>

    <div class="py-1">
      <div
        class="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-theme-primary"
      >
        Display Mode
      </div>
      {#each DISPLAY_MODE_OPTIONS.filter((option) => option.mode === undefined || !targetField || DISPLAY_MODES_BY_FIELD_TYPE[targetField.type].allowed.includes(option.mode)) as opt (opt.mode ?? "default")}
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center justify-between rounded px-2.5 py-1 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition-colors text-left"
          onclick={() =>
            setFieldDisplayMode(chipContextMenu!.fieldId, opt.mode)}
        >
          <span>{opt.label}</span>
          {#if currentOverride?.displayMode === opt.mode || (!currentOverride?.displayMode && opt.mode === undefined)}
            <span
              class="icon-[lucide--check] h-3.5 w-3.5 text-theme-primary"
              aria-hidden="true"
            ></span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="border-t border-theme-border/40 pt-1">
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center justify-between rounded px-2.5 py-1 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition-colors text-left"
        onclick={() => toggleFieldHideLabel(chipContextMenu!.fieldId)}
      >
        <span>Hide Label</span>
        {#if currentOverride?.hideLabel}
          <span
            class="icon-[lucide--check] h-3.5 w-3.5 text-theme-primary"
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    </div>
  </div>
{/if}
