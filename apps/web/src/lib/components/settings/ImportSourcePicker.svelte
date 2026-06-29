<script lang="ts">
  import InlineKeySetup from "../oracle/InlineKeySetup.svelte";
  import ImportDropzone from "$lib/features/importer/ImportDropzone.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import type { CreaturePack } from "@codex/content-packs";

  interface PackImportStatus {
    importedCount: number;
    total: number;
    isFullyImported: boolean;
    isPartiallyImported: boolean;
  }

  interface Props {
    isStandalone?: boolean;
    oracleEnabled: boolean;
    showResumeToast: boolean;
    onRestart: () => void;
    onFileSelect: (files: File[]) => void | Promise<void>;
    rejectedFiles?: { name: string; reason: string }[];
    masterPacks: CreaturePack[];
    getSubpacks: (masterId: string) => CreaturePack[];
    getPackImportStatus: (pack: CreaturePack) => PackImportStatus;
    expandedPacks: Record<string, boolean>;
    onTogglePackExpanded: (packId: string) => void;
    onPackSelect: (pack: CreaturePack) => void;
  }

  let {
    isStandalone = false,
    oracleEnabled,
    showResumeToast,
    onRestart,
    onFileSelect,
    rejectedFiles = [],
    masterPacks,
    getSubpacks,
    getPackImportStatus,
    expandedPacks,
    onTogglePackExpanded,
    onPackSelect,
  }: Props = $props();
</script>

{#if !oracleEnabled}
  {#if isStandalone}
    <InlineKeySetup />
  {:else}
    <div
      class="p-4 bg-theme-secondary/10 border border-theme-secondary/20 rounded flex items-start gap-3"
    >
      <span
        class="icon-[lucide--info] w-5 h-5 text-theme-secondary shrink-0 mt-0.5"
      ></span>

      <div class="flex flex-col gap-1">
        <span
          class="text-sm font-bold text-theme-secondary uppercase font-header tracking-wider"
          >AI Optional</span
        >

        <p class="text-xs text-theme-text/70 leading-tight">
          Scabard JSON imports work without AI. Text, PDF, DOCX, and generic
          JSON analysis still need a Gemini key in the
          <button
            class="underline hover:text-theme-text"
            onclick={() => (modalUIStore.activeSettingsTab = "intelligence")}
            >AI</button
          >
          tab.
        </p>
      </div>
    </div>
  {/if}
{/if}

{#if showResumeToast}
  <div
    class="p-3 bg-theme-secondary/10 border border-theme-secondary/20 rounded flex items-center justify-between gap-4"
  >
    <div
      class="flex items-center gap-2 text-[11px] font-bold text-theme-secondary uppercase font-header tracking-wider"
    >
      <span class="icon-[lucide--history] w-3.5 h-3.5"></span>
      Resuming previous import
    </div>

    <button
      onclick={onRestart}
      class="text-[9px] font-bold underline hover:text-theme-text"
    >
      START OVER
    </button>
  </div>
{/if}

<div class="flex-1 flex flex-col min-h-0 gap-4">
  {#if rejectedFiles.length > 0}
    <div
      class="rounded border border-red-500/20 bg-red-500/10 p-3"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-center gap-2">
        <span class="icon-[lucide--alert-triangle] h-4 w-4 text-red-400"></span>
        <p class="text-xs font-bold uppercase tracking-wider text-red-400">
          Import could not be prepared
        </p>
      </div>
      <ul
        class="mt-2 list-disc space-y-1 pl-6 text-xs leading-tight text-red-400/80"
      >
        {#each rejectedFiles as file (`${file.name}:${file.reason}`)}
          <li><strong>{file.name}</strong>: {file.reason}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div
    class="grid gap-2 rounded border border-theme-border bg-theme-surface/70 p-3 text-xs text-theme-text sm:grid-cols-2"
    aria-label="Supported import modes"
  >
    <div class="flex items-start gap-2">
      <span
        class="icon-[lucide--database-zap] mt-0.5 h-4 w-4 shrink-0 text-theme-primary"
      ></span>
      <div class="min-w-0">
        <p
          class="font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary"
        >
          Scabard and Chronica
        </p>
        <p class="mt-0.5 leading-snug text-theme-muted">
          JSON exports use a deterministic review and import flow. No AI key is
          needed.
        </p>
      </div>
    </div>

    <div class="flex items-start gap-2">
      <span
        class="icon-[lucide--sparkles] mt-0.5 h-4 w-4 shrink-0 text-theme-secondary"
      ></span>
      <div class="min-w-0">
        <p
          class="font-header text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
        >
          Documents and notes
        </p>
        <p class="mt-0.5 leading-snug text-theme-muted">
          PDF, DOCX, Markdown, text, and generic JSON are analyzed by Oracle.
        </p>
      </div>
    </div>
  </div>

  <ImportDropzone {onFileSelect} {isStandalone} />

  {#if masterPacks.length > 0}
    <div class="px-1" data-testid="creature-packs-section">
      <p
        class="text-[10px] font-bold uppercase tracking-widest text-theme-muted font-header mb-2"
      >
        Creature Packs
      </p>
      <div class="flex flex-col gap-2">
        {#each masterPacks as masterPack (masterPack.id)}
          {@const subpacks = getSubpacks(masterPack.id)}
          {@const status = getPackImportStatus(masterPack)}
          <div
            class="flex flex-col rounded-lg border border-theme-border bg-theme-surface overflow-hidden transition-colors"
            data-testid="creature-pack-card"
          >
            <div
              class="p-3 flex items-start justify-between gap-3 bg-theme-surface hover:bg-theme-primary/5 transition-colors"
            >
              <button
                onclick={() => onPackSelect(masterPack)}
                class="flex items-start gap-3 text-left flex-1 min-w-0 group"
                aria-label="Import {masterPack.name}"
              >
                <span
                  class="icon-[lucide--book-open] w-4 h-4 mt-0.5 text-theme-muted group-hover:text-theme-primary shrink-0 transition-colors"
                ></span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-xs font-bold text-theme-primary truncate">
                      {masterPack.name}
                    </p>
                    {#if status.isFullyImported}
                      <p
                        class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 shrink-0"
                      >
                        <span class="icon-[lucide--check] w-2.5 h-2.5"></span>
                        Imported
                      </p>
                    {:else if status.isPartiallyImported}
                      <p
                        class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0"
                      >
                        {status.importedCount}/{status.total} Imported
                      </p>
                    {/if}
                  </div>
                  <p class="text-[10px] text-theme-muted leading-snug mt-0.5">
                    {masterPack.description}
                  </p>
                  <div
                    class="flex items-center justify-between gap-2 mt-1 flex-wrap"
                  >
                    <p class="text-[10px] text-theme-muted/60 font-mono">
                      {masterPack.entries.length} creatures total
                    </p>
                    {#if masterPack.credits}
                      <p
                        class="text-[9px] text-theme-muted/50 italic truncate max-w-[240px]"
                        title={masterPack.credits}
                      >
                        🎨 {masterPack.credits}
                      </p>
                    {/if}
                  </div>
                </div>
              </button>

              {#if subpacks.length > 0}
                <button
                  onclick={() => onTogglePackExpanded(masterPack.id)}
                  class="px-2 py-1 rounded border border-theme-border bg-theme-base/50 hover:bg-theme-primary/10 hover:border-theme-primary/30 text-theme-muted hover:text-theme-primary flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all mt-0.5"
                  aria-expanded={!!expandedPacks[masterPack.id]}
                >
                  <span>{subpacks.length} Subpacks</span>
                  <span
                    class="icon-[lucide--chevron-down] w-3.5 h-3.5 transition-transform duration-200 {expandedPacks[
                      masterPack.id
                    ]
                      ? 'rotate-180'
                      : ''}"
                  ></span>
                </button>
              {/if}
            </div>

            {#if subpacks.length > 0 && expandedPacks[masterPack.id]}
              <div
                class="border-t border-theme-border/60 bg-theme-base/30 p-2.5 flex flex-col gap-1.5"
              >
                <p
                  class="text-[9px] font-bold uppercase tracking-widest text-theme-muted/80 font-header px-1 pb-0.5"
                >
                  Modular Themed Packs
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {#each subpacks as subpack (subpack.id)}
                    {@const subStatus = getPackImportStatus(subpack)}
                    <button
                      onclick={() => onPackSelect(subpack)}
                      class="flex items-start gap-2.5 text-left p-2.5 rounded-md border border-theme-border/50 bg-theme-surface hover:border-theme-primary/40 hover:bg-theme-primary/5 transition-all group"
                      data-testid="creature-subpack-card"
                      aria-label="Import {subpack.name}"
                    >
                      <span
                        class="icon-[lucide--folder] w-3.5 h-3.5 mt-0.5 text-theme-muted group-hover:text-theme-primary shrink-0 transition-colors"
                      ></span>
                      <div class="min-w-0 flex-1">
                        <div
                          class="flex items-center justify-between gap-1.5 flex-wrap"
                        >
                          <p
                            class="text-[11px] font-bold text-theme-primary truncate"
                          >
                            {subpack.name
                              .replace("Fantasy ", "")
                              .replace(" Pack", "")}
                          </p>
                          {#if subStatus.isFullyImported}
                            <p
                              class="px-1 py-0.5 text-[8px] font-bold uppercase rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-0.5 shrink-0"
                            >
                              <span class="icon-[lucide--check] w-2 h-2"></span>
                              Imported
                            </p>
                          {:else if subStatus.isPartiallyImported}
                            <p
                              class="px-1 py-0.5 text-[8px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0"
                            >
                              {subStatus.importedCount}/{subStatus.total}
                            </p>
                          {:else}
                            <span
                              class="text-[9px] text-theme-muted/60 font-mono shrink-0"
                              >{subpack.entries.length}</span
                            >
                          {/if}
                        </div>
                        <p
                          class="text-[9px] text-theme-muted leading-tight mt-0.5 line-clamp-2"
                        >
                          {subpack.description}
                        </p>
                        {#if subpack.credits}
                          <p
                            class="text-[8px] text-theme-muted/50 italic truncate mt-1"
                            title={subpack.credits}
                          >
                            🎨 {subpack.credits}
                          </p>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
