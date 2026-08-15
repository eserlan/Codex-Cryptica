<script lang="ts">
  import {
    getThemeLoadingMessages,
    type CandidateTableEntry,
  } from "generator-engine";
  import {
    tableGenerationService as defaultGeneratorService,
    type TableGenerationService,
  } from "$lib/services/table-generation-service";
  import TableStagingPreview from "./TableStagingPreview.svelte";

  let {
    open = false,
    mode = "new",
    existingTableName,
    selectionMode = "weighted",
    existingRowCount: _existingRowCount = 0,
    onAccept,
    onClose,
    generatorService = defaultGeneratorService,
    themeId = "fantasy",
  }: {
    open?: boolean;
    mode?: "new" | "append";
    existingTableName?: string;
    selectionMode?: "weighted" | "ranged";
    existingRowCount?: number;
    onAccept: (
      entries: CandidateTableEntry[],
      tableTitle?: string,
      tableDescription?: string,
    ) => void;
    onClose: () => void;
    generatorService?: TableGenerationService;
    themeId?: string;
  } = $props();

  const DICE_PRESETS = [6, 8, 10, 12, 20];

  let step = $state<"setup" | "generating" | "review">("setup");
  let topic = $state("");
  let count = $state(10);
  let campaignContext = $state("");
  let generatedTitle = $state("");
  let generatedDescription = $state<string | undefined>();
  let candidates = $state<CandidateTableEntry[]>([]);
  let errorMessage = $state<string | null>(null);
  let loadingMessageIndex = $state(0);

  const loadingMessages = $derived(getThemeLoadingMessages(themeId));

  $effect(() => {
    if (!open) {
      step = "setup";
      topic = "";
      count = 10;
      campaignContext = "";
      candidates = [];
      errorMessage = null;
    }
  });

  $effect(() => {
    if (step === "generating") {
      const interval = setInterval(() => {
        loadingMessageIndex =
          (loadingMessageIndex + 1) % loadingMessages.length;
      }, 2000);
      return () => clearInterval(interval);
    }
  });

  async function handleGenerate() {
    if (!topic.trim()) return;

    step = "generating";
    errorMessage = null;

    try {
      const result = await generatorService.generateTableEntries({
        topic: topic.trim(),
        count,
        campaignContext: campaignContext.trim() || undefined,
        theme: themeId,
      });

      generatedTitle = result.title;
      generatedDescription = result.description;
      candidates = result.candidates;
      step = "review";
    } catch (err: any) {
      errorMessage = err?.message || "Failed to generate table entries.";
      step = "setup";
    }
  }

  function handleAcceptPreview(selectedRows: CandidateTableEntry[]) {
    onAccept(
      selectedRows,
      mode === "new" ? generatedTitle : undefined,
      mode === "new" ? generatedDescription : undefined,
    );
    onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="generate-table-title"
  >
    <div
      class="w-full max-w-lg rounded-xl border border-theme-border bg-theme-surface p-6 shadow-2xl transition-all"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border pb-3"
      >
        <div class="flex items-center gap-2">
          <span class="icon-[lucide--sparkles] h-5 w-5 text-theme-primary"
          ></span>
          <h2
            id="generate-table-title"
            class="text-base font-semibold text-theme-text"
          >
            {mode === "new"
              ? "Generate World-Aware Table"
              : `Generate Entries for "${existingTableName}"`}
          </h2>
        </div>
        <button
          type="button"
          onclick={onClose}
          aria-label="Close"
          class="rounded p-1 text-theme-muted hover:bg-theme-bg hover:text-theme-text"
        >
          <span class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      </div>

      <div class="py-4">
        {#if step === "setup"}
          <form
            onsubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
            class="space-y-4"
          >
            {#if errorMessage}
              <div
                class="rounded-lg bg-theme-error/15 p-3 text-xs text-theme-error border border-theme-error/30"
              >
                {errorMessage}
              </div>
            {/if}

            <div>
              <label
                for="table-topic"
                class="block text-xs font-medium text-theme-text mb-1"
              >
                Table Topic / Theme *
              </label>
              <input
                id="table-topic"
                type="text"
                bind:value={topic}
                placeholder="e.g., Smuggler's Cove Encounters, Tavern Rumors, Magic Trinkets"
                required
                class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-xs text-theme-text focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-theme-text mb-1.5">
                Number of Entries: <span
                  class="font-semibold text-theme-primary">{count}</span
                >
              </label>
              <div class="flex flex-wrap items-center gap-1.5 mb-2">
                {#each DICE_PRESETS as preset}
                  <button
                    type="button"
                    onclick={() => (count = preset)}
                    class="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors {count ===
                    preset
                      ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
                      : 'border-theme-border bg-theme-bg text-theme-muted hover:text-theme-text'}"
                  >
                    d{preset}
                  </button>
                {/each}
              </div>
              <input
                type="range"
                min="2"
                max="50"
                bind:value={count}
                class="w-full accent-theme-primary"
              />
            </div>

            <div>
              <label
                for="campaign-context"
                class="block text-xs font-medium text-theme-text mb-1"
              >
                Campaign Context & Guidance (Optional)
              </label>
              <textarea
                id="campaign-context"
                rows="3"
                bind:value={campaignContext}
                placeholder="Mention specific NPCs, factions, or instructions (e.g. Focus on Captain Vane's crew and the drowned temple)"
                class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-xs text-theme-text focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary resize-y"
              ></textarea>
              <p class="text-[10px] text-theme-muted mt-1">
                Names and instructions you provide here take highest priority.
                Relevant vault lore and existing tables will be grounded
                automatically.
              </p>
            </div>

            <div
              class="flex justify-end gap-2 pt-2 border-t border-theme-border"
            >
              <button
                type="button"
                onclick={onClose}
                class="rounded-lg border border-theme-border px-3.5 py-1.5 text-xs font-medium text-theme-text hover:bg-theme-bg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!topic.trim()}
                data-testid="generate-table-submit"
                class="inline-flex items-center gap-1.5 rounded-lg bg-theme-primary px-4 py-1.5 text-xs font-medium text-theme-primary-contrast hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span class="icon-[lucide--sparkles] h-3.5 w-3.5"></span>
                Generate Entries
              </button>
            </div>
          </form>
        {:else if step === "generating"}
          <div
            class="flex flex-col items-center justify-center py-10 space-y-4 text-center"
          >
            <span
              class="icon-[lucide--loader-2] h-8 w-8 animate-spin text-theme-primary"
            ></span>
            <div>
              <p class="text-sm font-medium text-theme-text">
                Consulting your vault and forging entries...
              </p>
              <p class="text-xs text-theme-muted mt-1 italic">
                "{loadingMessages[loadingMessageIndex] ??
                  "Weaving random outcomes..."}"
              </p>
            </div>
          </div>
        {:else if step === "review"}
          <TableStagingPreview
            {candidates}
            {selectionMode}
            onAccept={handleAcceptPreview}
            onCancel={() => (step = "setup")}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}
