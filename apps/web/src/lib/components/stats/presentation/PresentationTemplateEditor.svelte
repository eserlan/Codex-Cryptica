<script lang="ts">
  import {
    PRESENTATION_TEMPLATE_FORMAT_VERSION,
    type StatSheetTemplate,
    type StatSheetField,
    type PresentationTemplate,
  } from "schema";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    parseTemplate,
    validateAst,
    exportPresentationTemplate,
    sanitizeSource,
  } from "@codex/stat-sheet-engine";
  import type {
    MissingFieldNode,
    UnknownDirectiveNode,
    FieldReferenceNode,
  } from "@codex/stat-sheet-engine";
  import PresentationRenderer from "./PresentationRenderer.svelte";
  import type { PresentationRenderContext } from "./types";

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
  interface VisualCard {
    id: string;
    title: string;
    columns: number;
    mode?: "grid" | "table";
    tableHeaders?: string[];
    rows: string[][];
  }

  function getUnusedFields(cards: VisualCard[]): StatSheetField[] {
    const used = new Set(cards.flatMap((c) => c.rows.flat()));
    return (schema?.fields ?? []).filter(
      (f) => f.type !== "heading" && !used.has(f.id),
    );
  }

  function parseCardsFromSource(src: string): VisualCard[] {
    const cards: VisualCard[] = [];
    const res = parseTemplate(src, PRESENTATION_TEMPLATE_FORMAT_VERSION);
    if (!res.ok) return cards;

    let currentTitle = "";
    for (const node of res.ast) {
      if (node.type === "heading") {
        const textNode = node.children.find((c) => c.type === "text");
        if (textNode && "text" in textNode) {
          currentTitle = textNode.text;
        }
      } else if (node.type === "table") {
        const rows: string[][] = [];
        const headers = node.header.map((cellNodes) => {
          const t = cellNodes.find((c) => c.type === "text");
          return t && "text" in t ? t.text : "Col";
        });
        for (const rowCells of node.rows) {
          const rFields: string[] = [];
          for (const cellNodes of rowCells) {
            for (const c of cellNodes) {
              if (c.type === "field-reference") {
                rFields.push(c.fieldId);
              }
            }
          }
          if (rFields.length > 0) rows.push(rFields);
        }
        cards.push({
          id: Math.random().toString(36).slice(2, 9),
          title: currentTitle || `Table ${cards.length + 1}`,
          columns: headers.length || 2,
          mode: "table",
          tableHeaders: headers.length > 0 ? headers : ["Field", "Value"],
          rows: rows.length > 0 ? rows : [[]],
        });
        currentTitle = "";
      } else if (node.type === "card") {
        const rows: string[][] = [];
        for (const child of node.children ?? []) {
          if (child.type === "group") {
            const fieldIds: string[] = [];
            for (const gChild of child.children ?? []) {
              if (gChild.type === "paragraph") {
                for (const c of gChild.children ?? []) {
                  if (c.type === "field-reference") {
                    fieldIds.push(c.fieldId);
                  }
                }
              }
            }
            if (fieldIds.length > 0) rows.push(fieldIds);
          } else if (child.type === "paragraph") {
            const fieldIds: string[] = [];
            for (const c of child.children ?? []) {
              if (c.type === "field-reference") {
                fieldIds.push(c.fieldId);
              }
            }
            if (fieldIds.length > 0) rows.push(fieldIds);
          }
        }
        cards.push({
          id: Math.random().toString(36).slice(2, 9),
          title: currentTitle || `Card ${cards.length + 1}`,
          columns: 2,
          mode: "grid",
          rows: rows.length > 0 ? rows : [[]],
        });
        currentTitle = "";
      } else if (node.type === "group") {
        const cols = node.columns ?? 2;
        for (const child of node.children ?? []) {
          if (child.type === "card") {
            const rows: string[][] = [];
            for (const cNode of child.children ?? []) {
              if (cNode.type === "group") {
                const fIds: string[] = [];
                for (const gChild of cNode.children ?? []) {
                  if (gChild.type === "paragraph") {
                    for (const c of gChild.children ?? []) {
                      if (c.type === "field-reference") fIds.push(c.fieldId);
                    }
                  }
                }
                if (fIds.length > 0) rows.push(fIds);
              } else if (cNode.type === "paragraph") {
                const fIds: string[] = [];
                for (const c of cNode.children ?? []) {
                  if (c.type === "field-reference") fIds.push(c.fieldId);
                }
                if (fIds.length > 0) rows.push(fIds);
              }
            }
            cards.push({
              id: Math.random().toString(36).slice(2, 9),
              title: currentTitle || `Card ${cards.length + 1}`,
              columns: cols,
              mode: "grid",
              rows: rows.length > 0 ? rows : [[]],
            });
            currentTitle = "";
          }
        }
      }
    }
    const fields = schema?.fields ?? [];
    if (cards.length === 0 && fields.length > 0) {
      let currentCard: VisualCard = {
        id: "c1",
        title: "Overview",
        columns: 2,
        mode: "grid",
        rows: [[]],
      };
      for (const f of fields) {
        if (f.type === "heading") {
          if (currentCard.rows.some((r) => r.length > 0)) {
            cards.push(currentCard);
          }
          currentCard = {
            id: Math.random().toString(36).slice(2, 9),
            title: f.label,
            columns: 2,
            mode: "grid",
            rows: [[]],
          };
        } else {
          currentCard.rows[0].push(f.id);
        }
      }
      if (currentCard.rows.some((r) => r.length > 0)) {
        cards.push(currentCard);
      }
    }
    return cards;
  }

  let visualCards = $state<VisualCard[]>(parseCardsFromSource(source));

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
        out += `| ${headers.join(" | ")} |\n`;
        out += `| ${headers.map(() => "---").join(" | ")} |\n`;
        for (const row of card.rows) {
          if (row.length === 0) continue;
          const cells = row.map((fid) => {
            const f = fields.find((x) => x.id === fid);
            if (!f) return `[${fid}]`;
            if (f.type === "counter") return `[${fid}:current-max]`;
            if (f.type === "number") return `[${fid}:prominent]`;
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
          for (const fid of row) {
            const f = fields.find((x) => x.id === fid);
            if (f) {
              if (f.type === "counter") {
                out += `[${fid}:current-max]\n`;
              } else if (f.type === "number") {
                out += `[${fid}:prominent]\n`;
              } else {
                out += `[${fid}]\n`;
              }
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
        idx === rowIndex ? [...r, fieldId] : r,
      );
      return { ...c, rows: nextRows };
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
        idx === rowIndex ? r.filter((id) => id !== fieldId) : r,
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
          idx === srcRowIndex ? r.filter((id) => id !== fieldId) : r,
        );
      }
      if (c.id === targetCardId) {
        nextRows = nextRows.map((r, idx) =>
          idx === targetRowIndex ? [...r, fieldId] : r,
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
        return undefined;
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
    function walk(list: unknown[]) {
      for (const n of list) {
        const node = n as Record<string, unknown>;
        if (node.type === "missing-field")
          missing.push(node as unknown as MissingFieldNode);
        if (node.type === "unknown-directive")
          unknown.push(node as unknown as UnknownDirectiveNode);
        if (node.type === "field-reference" && node.requestedDisplayMode)
          mismatched.push(node as unknown as FieldReferenceNode);
        for (const key of ["children", "items", "header", "rows"]) {
          const val = node[key];
          if (Array.isArray(val)) {
            walk((val as unknown[]).flat(2));
          }
        }
      }
    }
    walk(nodes);
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
  class="fixed inset-0 z-[110] flex items-center justify-center bg-theme-bg/80 p-3 sm:p-6"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="flex h-[92vh] max-h-[95vh] w-full max-w-6xl 2xl:max-w-7xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
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

    <div class="flex-1 overflow-y-auto p-4">
      <div class="grid gap-3 sm:grid-cols-2">
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

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class={editorMode === "visual"
                  ? "rounded bg-theme-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-bg"
                  : "rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
                onclick={() => {
                  if (editorMode !== "visual") {
                    visualCards = parseCardsFromSource(source);
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
                class="flex w-52 shrink-0 flex-col gap-2 overflow-y-auto rounded border border-theme-border bg-theme-surface/80 p-2.5 shadow-inner"
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
                          class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
                          >Card</span
                        >
                        <input
                          type="text"
                          class="rounded border border-theme-border bg-theme-bg px-2 py-0.5 text-xs font-bold text-theme-text"
                          value={card.title}
                          placeholder="Card Title"
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
                          <select
                            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                            value={card.columns}
                            onchange={(e) => {
                              card.columns = Number(
                                (e.target as HTMLSelectElement).value,
                              );
                              syncSourceFromVisualCards(visualCards);
                            }}
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                            <option value={6}>6</option>
                          </select>
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

                    <div class="flex flex-col gap-2">
                      {#each card.rows as rowFields, rIdx (rIdx)}
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
                            {#each rowFields as fid (fid)}
                              {@const f = schema?.fields?.find(
                                (x) => x.id === fid,
                              )}
                              <span
                                draggable="true"
                                ondragstart={(e) =>
                                  handleFieldDragStart(e, card.id, rIdx, fid)}
                                class="inline-flex items-center gap-1 rounded bg-theme-primary/10 border border-theme-primary/20 px-2 py-0.5 text-xs text-theme-text font-medium cursor-grab active:cursor-grabbing hover:border-theme-primary"
                              >
                                <span
                                  class="icon-[lucide--grip-vertical] h-3 w-3 text-theme-muted"
                                  aria-hidden="true"
                                ></span>
                                {f?.label ?? fid}
                                <button
                                  type="button"
                                  class="ml-0.5 text-[10px] text-theme-muted hover:text-red-400"
                                  onclick={() =>
                                    removeFieldFromCardRow(card.id, rIdx, fid)}
                                  title="Remove field"
                                >
                                  ✕
                                </button>
                              </span>
                            {/each}
                            {#if getUnusedFields(visualCards).length > 0}
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
                                {#each getUnusedFields(visualCards) as uf (uf.id)}
                                  <option value={uf.id}>{uf.label}</option>
                                {/each}
                              </select>
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
                        + Add Row to Card
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

        <div class="flex flex-col gap-1.5">
          <span
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            >Preview</span
          >
          <div
            class="flex-1 rounded border border-theme-border bg-theme-bg/50 p-3"
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
    class="fixed inset-0 z-[120] flex items-center justify-center bg-theme-bg/85 p-4 backdrop-blur-xs"
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
                >→ Prominent / large score display</span
              >
            </div>
            <div>
              <span class="text-theme-primary">[str_score:prominent]</span>
              <span class="text-theme-muted">→ Big stat number</span>
            </div>
            <div>
              <span class="text-theme-primary">[hp:current-max]</span>
              <span class="text-theme-muted">→ Counter with max value</span>
            </div>
          </div>
        </div>

        <div
          class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
        >
          <h4
            class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
          >
            2. Card Containers (<code class="font-mono text-theme-primary"
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
            3. Multi-Column Grids (<code class="font-mono text-theme-primary"
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
            4. Markdown Tables
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
