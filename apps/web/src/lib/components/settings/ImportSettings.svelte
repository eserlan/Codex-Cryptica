<script lang="ts">
  import { slide, fade } from "svelte/transition";
  import CCImportReview from "$lib/features/importer/CCImportReview.svelte";
  import CCImportReport from "$lib/features/importer/CCImportReport.svelte";
  import ImportProgress from "../import/ImportProgress.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import ImportSourcePicker from "./ImportSourcePicker.svelte";
  import { ImportSettingsController } from "./import-settings-controller.svelte";

  let { isStandalone = false } = $props<{ isStandalone?: boolean }>();

  const controller = new ImportSettingsController();

  $effect(() => {
    controller.syncModalImportState();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (controller.step === "processing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      controller.resetModalImportState();
    };
  });
</script>

<div class="space-y-4 {isStandalone ? 'flex-1 flex flex-col min-h-0' : ''}">
  {#if !isStandalone}
    <h3
      class="text-sm font-bold text-theme-primary uppercase font-header tracking-widest"
    >
      Archive Importer
    </h3>

    <p class="text-sm text-theme-text/70 leading-relaxed">
      Import existing documents, lore bibles, or JSON data. The Oracle will
      automatically break down large files into distinct entities and extract
      embedded art.
    </p>
  {/if}

  <div
    class="flex-1 flex flex-col relative overflow-hidden {isStandalone
      ? ''
      : 'bg-theme-surface border border-theme-border p-4 rounded-lg justify-center'}"
  >
    {#if controller.step === "upload"}
      <ImportSourcePicker
        {isStandalone}
        oracleEnabled={controller.oracleEnabled}
        showResumeToast={controller.showResumeToast}
        onRestart={controller.handleRestart}
        onFileSelect={controller.handleFiles}
        rejectedFiles={controller.rejectedFiles}
        masterPacks={controller.masterPacks}
        getSubpacks={controller.getSubpacks}
        getPackImportStatus={controller.getPackImportStatus}
        expandedPacks={controller.expandedPacks}
        onTogglePackExpanded={controller.togglePackExpanded}
        onPackSelect={controller.handlePackSelect}
      />
    {:else if controller.step === "processing"}
      <div class="flex flex-col items-center gap-6 py-8">
        <div class="relative">
          <div
            class="w-12 h-12 border-2 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin"
          ></div>

          <div class="absolute inset-0 flex items-center justify-center">
            <span
              class="icon-[lucide--zap] text-theme-primary animate-pulse w-4 h-4"
            ></span>
          </div>
        </div>

        <div
          class="text-center space-y-1"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p
            class="text-xs font-mono text-theme-primary uppercase tracking-tight"
          >
            {controller.statusMessage}
          </p>

          <p
            class="text-[10px] text-theme-muted uppercase tracking-[0.2em] font-header"
          >
            {controller.processingSubtitle}
          </p>
        </div>

        {#if controller.totalChunks > 0}
          <div transition:fade class="w-full max-w-md px-4">
            <ImportProgress totalChunks={controller.totalChunks} />
          </div>
        {/if}

        {#if controller.importProgress}
          <div transition:fade class="w-full max-w-md px-4">
            <div
              class="h-2 w-full bg-theme-bg border border-theme-border/20 rounded-full overflow-hidden"
            >
              <div
                class="h-full bg-theme-primary transition-all duration-300"
                style:width="{(
                  (controller.importProgress.current /
                    (controller.importProgress.total || 1)) *
                  100
                ).toFixed(0)}%"
              ></div>
            </div>
            <div
              class="flex justify-between text-[9px] uppercase tracking-wider text-theme-muted mt-1 font-mono"
            >
              <span>Progress</span>
              <span
                >{(
                  (controller.importProgress.current /
                    (controller.importProgress.total || 1)) *
                  100
                ).toFixed(0)}%</span
              >
            </div>
          </div>
        {/if}

        <button
          onclick={() => connectionModeStore.abortActiveOperations()}
          class="text-[10px] font-bold text-theme-muted hover:text-red-400 transition-colors uppercase font-header tracking-widest"
        >
          Cancel Import
        </button>
      </div>
    {:else if controller.step === "review"}
      {#if controller.rejectedFiles.length > 0}
        <div
          class="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded flex flex-col gap-2"
          transition:slide
        >
          <div class="flex items-center gap-2">
            <span class="icon-[lucide--alert-triangle] w-4 h-4 text-red-400"
            ></span>
            <span
              class="text-sm font-bold text-red-400 uppercase tracking-wider"
              >Skipped {controller.rejectedFiles.length} Invalid File(s)</span
            >
          </div>
          <ul
            class="text-xs text-red-400/80 leading-tight space-y-1 pl-6 list-disc"
          >
            {#each controller.rejectedFiles as file (`${file.name}:${file.reason}`)}
              <li><strong>{file.name}</strong>: {file.reason}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if controller.ccSession}
        <section
          class="mb-4 rounded border border-theme-primary/30 bg-theme-primary/10 p-3"
          aria-label="Import ready"
        >
          <div class="flex items-start gap-2">
            <span
              class="icon-[lucide--database-zap] mt-0.5 h-4 w-4 shrink-0 text-theme-primary"
            ></span>
            <div class="min-w-0">
              <p
                class="font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary"
              >
                {#if controller.ccSession.sourceSystem === "scabard"}
                  Scabard import ready
                {:else if controller.ccSession.sourceSystem === "chronica"}
                  Chronica import ready
                {:else}
                  Oracle import ready
                {/if}
              </p>
              <p class="mt-1 text-xs leading-snug text-theme-muted">
                Review the detected records, matches, and links before writing
                anything to your vault.
              </p>
            </div>
          </div>
        </section>
        <CCImportReview
          session={controller.ccSession}
          onItemDecisionChange={controller.handleCCItemDecisionChange}
          onMatchDecisionChange={controller.handleCCMatchDecisionChange}
          onItemTypeChange={controller.handleCCItemTypeChange}
          onCommit={controller.handleCCCommit}
          onCancel={controller.handleCCReportDone}
          {isStandalone}
        />
      {/if}
    {:else if controller.step === "report" && controller.ccReport}
      <CCImportReport
        report={controller.ccReport}
        onDone={controller.handleCCReportDone}
      />
    {/if}
  </div>
</div>
