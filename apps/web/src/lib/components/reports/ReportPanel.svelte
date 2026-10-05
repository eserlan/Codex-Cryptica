<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import {
    DEFAULT_REPORT_DETAIL,
    DEFAULT_REPORT_INCLUDE,
    buildReport,
    type ReportDetail,
    type ReportInclude,
    type ReportInput,
    type ReportSource,
  } from "entity-report-engine";
  import ReportPreview from "./ReportPreview.svelte";
  import ReportIncludeOptions from "./ReportIncludeOptions.svelte";
  import { reportService } from "$lib/services/report-service";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import type { ReportRescopeResult } from "$lib/stores/ui/report-panel.svelte";

  let {
    input,
    source,
    defaultTitle,
    rescope,
    onclose,
  }: {
    input: ReportInput;
    source: ReportSource;
    defaultTitle: string;
    rescope?: (selection: "entire" | "selected") => ReportRescopeResult;
    onclose: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let current = $state<{
    input: ReportInput | null;
    source: ReportSource;
    error?: string;
  }>({ input, source });
  let include = $state<ReportInclude>({ ...DEFAULT_REPORT_INCLUDE });
  let detail = $state<ReportDetail>(DEFAULT_REPORT_DETAIL);
  // svelte-ignore state_referenced_locally
  let title = $state(defaultTitle);
  let isSaving = $state(false);
  let isClosing = $state(false);

  const showScope = $derived(current.source.origin === "canvas" && !!rescope);
  const selection = $derived(
    current.source.origin === "canvas" ? current.source.selection : "entire",
  );

  const document = $derived(
    current.input
      ? buildReport(current.input, { scope: current.source, include, detail })
      : null,
  );

  // These options only matter when the report actually has something for them
  // to show or hide; otherwise ticking them would look broken.
  const detailOptions: { value: ReportDetail; label: string }[] = [
    { value: "brief", label: "Brief" },
    { value: "standard", label: "Standard" },
  ];

  function setScope(next: "entire" | "selected") {
    if (!rescope || next === selection) return;
    current = rescope(next);
  }

  const emptyMessage = $derived(
    current.error === "no-selection"
      ? "Nothing is selected. Select some cards on the canvas and choose “Selected nodes only” again."
      : "There are no entities to report on.",
  );

  function closePanel() {
    if (isSaving || isClosing) return;
    isClosing = true;
    onclose();
  }

  async function save() {
    if (!document || isSaving) return;
    isSaving = true;
    try {
      const { entityId } = await reportService.save(document, {
        title,
        provenance: { ...current.source, include: { ...include }, detail },
      });
      isClosing = true;
      onclose();
      modalUIStore.openZenMode(entityId);
    } catch (err) {
      console.error("[ReportPanel] Failed to save report", err);
      notificationStore.notify("The report could not be saved.", "error");
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && closePanel()} />

<div
  class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
  transition:fade={{ duration: 150 }}
  role="presentation"
>
  <div
    class="w-full max-w-5xl max-h-[90vh] bg-theme-surface border border-theme-border rounded-xl shadow-2xl flex flex-col overflow-hidden font-body"
    transition:scale={{ duration: 200, start: 0.96 }}
    role="dialog"
    aria-modal="true"
    aria-label="Generate report"
    aria-hidden={isClosing}
    tabindex="-1"
    use:focusTrap
    data-testid="report-panel"
  >
    <div
      class="p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/50"
    >
      <h2
        class="text-lg font-bold text-theme-text font-header uppercase tracking-widest flex items-center gap-2"
      >
        <span aria-hidden="true" class="icon-[lucide--file-text] h-5 w-5 text-theme-primary"
        ></span>
        Generate report
      </h2>
      <button
        type="button"
        onclick={closePanel}
        disabled={isSaving}
        class="p-2 rounded-lg hover:bg-theme-bg text-theme-muted hover:text-theme-text"
        aria-label="Close"
      >
        <span class="icon-[lucide--x] h-5 w-5" aria-hidden="true"></span>
      </button>
    </div>

    <div class="flex flex-1 min-h-0 flex-col md:flex-row">
      <div
        class="md:w-72 shrink-0 p-4 space-y-5 border-b md:border-b-0 md:border-r border-theme-border overflow-y-auto"
      >
        <label class="block text-xs text-theme-muted space-y-1">
          <span class="uppercase tracking-widest font-header">Title</span>
          <input
            type="text"
            bind:value={title}
            aria-label="Report title"
            class="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
          />
        </label>

        {#if showScope}
          <fieldset class="space-y-2" data-testid="report-scope">
            <legend
              class="text-xs uppercase tracking-widest font-header text-theme-muted"
              >Scope</legend
            >
            {#each [{ value: "entire", label: "Entire canvas" }, { value: "selected", label: "Selected nodes only" }] as opt (opt.value)}
              <label class="flex items-center gap-2 text-sm text-theme-text">
                <input
                  type="radio"
                  name="report-scope"
                  checked={selection === opt.value}
                  onchange={() => setScope(opt.value as "entire" | "selected")}
                />
                {opt.label}
              </label>
            {/each}
          </fieldset>
        {/if}

        <ReportIncludeOptions bind:include input={current.input} {source} />

        <fieldset class="space-y-2">
          <legend
            class="text-xs uppercase tracking-widest font-header text-theme-muted"
            >Detail</legend
          >
          {#each detailOptions as opt (opt.value)}
            <label class="flex items-center gap-2 text-sm text-theme-text">
              <input
                type="radio"
                name="report-detail"
                value={opt.value}
                bind:group={detail}
              />
              {opt.label}
            </label>
          {/each}
        </fieldset>
      </div>

      <div class="flex-1 min-w-0 overflow-y-auto p-5">
        {#if document}
          <ReportPreview {document} />
        {:else}
          <p class="text-sm text-theme-muted" data-testid="report-panel-empty">
            {emptyMessage}
          </p>
        {/if}
      </div>
    </div>

    <div
      class="p-4 border-t border-theme-border flex justify-end gap-2 bg-theme-bg/50"
    >
      <button
        type="button"
        onclick={closePanel}
        disabled={isSaving}
        class="px-4 py-2 rounded-lg text-xs uppercase font-header tracking-widest text-theme-muted hover:text-theme-text"
        data-testid="report-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={save}
        disabled={!document || isSaving}
        class="px-4 py-2 rounded-lg bg-theme-primary text-theme-bg font-bold text-xs uppercase font-header tracking-widest hover:brightness-110 disabled:opacity-50"
        data-testid="report-save"
      >
        Save as note
      </button>
    </div>
  </div>
</div>
