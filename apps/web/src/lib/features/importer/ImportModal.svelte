<script lang="ts">
  import ImportDropzone from "./ImportDropzone.svelte";
  import ReviewList from "./ReviewList.svelte";
  import ImportProgress from "./ImportProgress.svelte";
  import { importQueue } from "$lib/stores/import-queue.svelte";
  import {
    TextParser,
    DocxParser,
    JsonParser,
    OracleAnalyzer,
    generateMarkdownFile,
    calculateFileHash,
    getRegistry,
    markChunkComplete,
    clearRegistryEntry,
    splitTextIntoChunks,
  } from "@codex/importer";
  import type {
    ImportSession,
    ImportItem,
    DiscoveredEntity,
  } from "@codex/importer";
  import { fade, slide } from "svelte/transition";

  interface Props {
    apiKey: string;
    onPersist: (data: { filename: string; content: string }) => void;
    onClose: () => void;
  }

  let { apiKey, onPersist, onClose }: Props = $props();

  let step = $state<"upload" | "processing" | "review" | "complete">("upload");
  let session = $state<ImportSession>({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    status: "parsing",
    items: [],
  });

  let discoveredEntities = $state<DiscoveredEntity[]>([]);
  let statusMessage = $state("");
  let totalChunks = $state(0);
  let showResumeToast = $state(false);
  let currentFileHash = $state("");
  let abortController: AbortController | null = null;

  const parsers = [
    new TextParser(),
    new DocxParser(),
    new JsonParser(),
    // new PdfParser()
  ];

  const handleFiles = async (files: File[]) => {
    abortController = new AbortController();
    const signal = abortController.signal;
    step = "processing";
    const analyzer = new OracleAnalyzer(apiKey);

    for (const file of files) {
      if (signal.aborted) break;

      statusMessage = `Hashing ${file.name}...`;
      const hash = await calculateFileHash(file);
      currentFileHash = hash;

      const item: ImportItem = {
        id: crypto.randomUUID(),
        file,
        status: "parsing",
      };
      session.items.push(item);

      // Find Parser
      const parser = parsers.find((p) => p.accepts(file));
      if (!parser) {
        item.status = "error";
        item.error = "Unsupported file type";
        continue;
      }

      try {
        statusMessage = `Parsing ${file.name}...`;
        const result = await parser.parse(file);
        item.parsedText = result.text;
        item.extractedAssets = result.assets;

        const chunks = splitTextIntoChunks(result.text);
        totalChunks = chunks.length;

        // Check Registry
        const registry = await getRegistry(hash, file.name, totalChunks);
        if (registry.completedIndices.length > 0) {
          if (registry.completedIndices.length === totalChunks) {
            statusMessage = "Already processed. Click Restart to re-analyze.";
          } else {
            showResumeToast = true;
            setTimeout(() => (showResumeToast = false), 5000);
          }
        }

        // Initialize progress UI state
        importQueue.activeItemChunks = {};
        registry.completedIndices.forEach((idx) => {
          importQueue.updateChunkStatus(idx, "skipped");
        });

        statusMessage = `Analyzing content with Oracle...`;
        const fileEntities: DiscoveredEntity[] = [];
        await analyzer.analyze(result.text, {
          signal,
          completedIndices: registry.completedIndices,
          onChunkActive: (idx) => {
            importQueue.updateChunkStatus(idx, "active");
            statusMessage = `Analyzing chunk ${idx + 1}/${totalChunks}...`;
          },
          onChunkProcessed: async (idx, res) => {
            await markChunkComplete(hash, idx);
            importQueue.updateChunkStatus(idx, "completed");
            fileEntities.push(...res.entities);
            discoveredEntities = [...discoveredEntities, ...res.entities];
          },
        });

        item.detectedEntities = fileEntities;
        item.status = "ready";
      } catch (err: any) {
        if (err.message === "Analysis Aborted") {
          console.log("Analysis aborted gracefully.");
          return;
        }
        item.status = "error";
        item.error = err.message;
      }
    }

    if (!signal.aborted) {
      step = "review";
    }
  };

  const handleRestart = async () => {
    if (abortController) {
      abortController.abort();
    }
    if (currentFileHash) {
      await clearRegistryEntry(currentFileHash);
      step = "upload";
      statusMessage = "Progress cleared. Please select the file again.";
    }
  };

  const handleSave = async (toSave: DiscoveredEntity[]) => {
    statusMessage = `Saving ${toSave.length} items...`;

    for (const entity of toSave) {
      const content = generateMarkdownFile(entity);
      onPersist({ filename: entity.suggestedFilename, content });
    }

    step = "complete";
    setTimeout(() => onClose(), 1500);
  };

  const cancelAndClose = () => {
    if (abortController) {
      abortController.abort();
    }
    onClose();
  };
</script>

<div class="import-modal">
  <div class="header">
    <div class="flex items-center gap-3">
      <div
        class="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center"
      >
        <span class="icon-[lucide--import] text-theme-primary"></span>
      </div>
      <h2 class="text-xl font-serif font-bold tracking-tight">
        Import Content
      </h2>
    </div>
    <button class="close" onclick={cancelAndClose}>&times;</button>
  </div>

  <div class="body">
    {#if showResumeToast}
      <div
        transition:slide
        class="mb-4 p-3 bg-theme-secondary/10 border border-theme-secondary/20 rounded-lg flex items-center justify-between gap-4"
      >
        <div
          class="flex items-center gap-2 text-xs font-bold text-theme-secondary"
        >
          <span class="icon-[lucide--history] w-4 h-4"></span>
          RESUMING PREVIOUS IMPORT
        </div>
        <button
          onclick={handleRestart}
          class="text-[9px] font-bold underline hover:text-theme-text"
        >
          START OVER
        </button>
      </div>
    {/if}

    {#if step === "upload"}
      <ImportDropzone onFileSelect={handleFiles} />
    {:else if step === "processing"}
      <div class="loading space-y-6">
        <div class="relative py-4">
          <div class="spinner"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span
              class="icon-[lucide--zap] text-theme-primary animate-pulse w-5 h-5"
            ></span>
          </div>
        </div>

        <div class="space-y-1">
          <p class="text-sm font-medium">{statusMessage}</p>
          <p
            class="text-[10px] text-theme-muted uppercase tracking-widest font-bold"
          >
            Oracle is interpreting your notes
          </p>
        </div>

        {#if totalChunks > 0}
          <div
            transition:fade
            class="bg-theme-bg/50 p-4 rounded-lg border border-theme-border/20"
          >
            <ImportProgress {totalChunks} />
          </div>
        {/if}

        <button
          onclick={handleRestart}
          class="text-[10px] font-bold text-theme-muted hover:text-red-400 transition-colors uppercase tracking-widest"
        >
          Cancel & Clear Progress
        </button>
      </div>
    {:else if step === "review"}
      <ReviewList
        entities={discoveredEntities}
        onSave={handleSave}
        onCancel={() => (step = "upload")}
      />
    {:else if step === "complete"}
      <div class="success space-y-4">
        <div
          class="w-16 h-16 rounded-full bg-theme-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <span class="icon-[lucide--check-circle] text-theme-primary w-8 h-8"
          ></span>
        </div>
        <h3 class="text-lg font-bold">Import Complete!</h3>
        <p class="text-sm text-theme-muted">
          {discoveredEntities.length} items added to Codex.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .import-modal {
    background: var(--color-theme-surface);
    color: var(--color-theme-text);
    padding: 2rem;
    border-radius: var(--theme-border-radius, 8px);
    width: 600px;
    max-width: 90vw;
    box-shadow: var(--theme-glow, 0 4px 20px rgba(0, 0, 0, 0.15));
    border: var(--theme-border-width, 1px) solid var(--color-theme-border);
    font-family: var(--theme-font-sans, ui-sans-serif);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-theme-muted);
    transition: color 0.2s;
  }

  .close:hover {
    color: var(--color-theme-primary);
  }

  .loading,
  .success {
    text-align: center;
    padding: 1rem 0;
  }

  .spinner {
    border: 2px solid var(--color-theme-bg);
    border-top: 2px solid var(--color-theme-primary);
    border-radius: 50%;
    width: 48px;
    height: 48px;
    animation: spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
