<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { importQueue } from "$lib/stores/import-queue.svelte";
  import ImportDropzone from "$lib/features/importer/ImportDropzone.svelte";
  import ReviewList from "$lib/features/importer/ReviewList.svelte";
  import ImportProgress from "../import/ImportProgress.svelte";
  import {
    TextParser,
    DocxParser,
    JsonParser,
    OracleAnalyzer,
    calculateFileHash,
    getRegistry,
    markChunkComplete,
    clearRegistryEntry,
    splitTextIntoChunks,
  } from "@codex/importer";
  import type { DiscoveredEntity } from "@codex/importer";
  import { sanitizeId } from "$lib/utils/markdown";
  import { slide, fade } from "svelte/transition";

  let step = $state<"upload" | "processing" | "review" | "complete">("upload");
  let statusMessage = $state("");
  let discoveredEntities = $state<DiscoveredEntity[]>([]);
  let extractedAssets = new Map<string, any>(); // filename -> asset
  let totalChunks = $state(0);
  let showResumeToast = $state(false);
  let currentFileHash = $state("");

  $effect(() => {
    uiStore.isImporting = step === "processing" || step === "review";

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === "processing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      uiStore.isImporting = false;
    };
  });

  const parsers = [
    new TextParser(),
    new DocxParser(),
    new JsonParser(),
    // new PdfParser()
  ];

  const handleFiles = async (files: File[]) => {
    const apiKey = oracle.apiKey || import.meta.env.VITE_SHARED_GEMINI_KEY;
    if (!apiKey) {
      alert("Oracle API Key required for intelligent import.");
      return;
    }

    step = "processing";
    const analyzer = new OracleAnalyzer(apiKey);

    discoveredEntities = [];
    extractedAssets.clear();

    const signal = uiStore.abortSignal;

    // Build known entities map for reconciliation
    const knownEntities: Record<string, string> = {};
    Object.values(vault.entities).forEach((e) => {
      knownEntities[e.title] = e.id;
    });

    for (const file of files) {
      if (signal.aborted) break;

      statusMessage = `Hashing ${file.name}...`;
      const hash = await calculateFileHash(file);
      currentFileHash = hash;

      const parser = parsers.find((p) => p.accepts(file));
      if (!parser) {
        console.error(`No parser for ${file.name}`);
        continue;
      }

      try {
        statusMessage = `Parsing ${file.name}...`;
        const result = await parser.parse(file);

        // Store assets for dimension lookups later
        result.assets.forEach((asset) => {
          extractedAssets.set(asset.placementRef, asset);
        });

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

        if (signal.aborted) break;

        statusMessage = `Analyzing ${file.name} with Oracle...`;
        const fileEntities: DiscoveredEntity[] = [];

        await analyzer.analyze(result.text, {
          signal,
          knownEntities,
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

        if (signal.aborted) break;
      } catch (err: any) {
        if (err.message === "Analysis Aborted") {
          console.log("Analysis aborted gracefully.");
          return;
        }
        console.error(`Failed to process ${file.name}:`, err);
      }
    }

    if (signal.aborted) {
      step = "upload";
      discoveredEntities = [];
      return;
    }

    step = "review";
  };

  const handleRestart = async () => {
    if (currentFileHash) {
      await clearRegistryEntry(currentFileHash);
      step = "upload";
      statusMessage = "Progress cleared. Please select the file again.";
    }
  };

  const handleSave = async (toSave: DiscoveredEntity[]) => {
    step = "processing";
    statusMessage = `Finalizing ${toSave.length} entities...`;

    const signal = uiStore.abortSignal;

    const mapType = (type: string) => {
      const t = type.toLowerCase();
      if (t === "character") return "character";
      if (["location", "item", "event", "faction", "note"].includes(t))
        return t;
      return "note";
    };

    const batchData: any[] = [];

    for (const entity of toSave) {
      if (signal.aborted) break;

      const title = entity.suggestedTitle;
      const entityId = sanitizeId(title) || "untitled";
      const type = mapType(entity.suggestedType) as any;

      const existingId =
        entity.matchedEntityId || (vault.entities[entityId] ? entityId : null);
      if (existingId && vault.entities[existingId]) {
        const existing = vault.entities[existingId];
        statusMessage = `Updating connections for existing entity: ${existing.title}...`;

        const newConnections = (entity.detectedLinks || [])
          .map((link) => {
            const targetName = typeof link === "string" ? link : link.target;
            const label =
              typeof link === "string" ? link : link.label || link.target;
            return {
              target: sanitizeId(targetName) || "untitled",
              label,
              type: "related_to",
              strength: 1,
            };
          })
          .filter(
            (newConn) =>
              !existing.connections.some(
                (c) => c.target === newConn.target && c.label === newConn.label,
              ),
          );

        if (newConnections.length > 0) {
          vault.updateEntity(existing.id, {
            connections: [...existing.connections, ...newConnections],
          });
        }
        continue;
      }

      // Check for image metadata in extracted assets
      const imgRef = entity.frontmatter.image;
      let width = entity.frontmatter.width;
      let height = entity.frontmatter.height;
      let imagePath = entity.frontmatter.image;
      let thumbnailPath = entity.frontmatter.thumbnail;

      if (imgRef && extractedAssets.has(imgRef)) {
        const asset = extractedAssets.get(imgRef);
        width = width || asset.width;
        height = height || asset.height;

        try {
          imagePath = await vault.saveImageToVault(
            asset.blob,
            entityId,
            asset.originalName,
          );
        } catch (err) {
          console.error("Failed to save imported asset:", err);
        }
      }

      batchData.push({
        type,
        title,
        initialData: {
          content: entity.chronicle || entity.content,
          lore: entity.lore,
          labels: entity.frontmatter.labels || [],
          metadata: {
            width: typeof width === "number" ? width : undefined,
            height: typeof height === "number" ? height : undefined,
          },
          image: imagePath,
          thumbnail: thumbnailPath,
          connections: (entity.detectedLinks || []).map((link) => {
            const targetName = typeof link === "string" ? link : link.target;
            const label =
              typeof link === "string" ? link : link.label || link.target;
            return {
              target: sanitizeId(targetName) || "untitled",
              label: label,
              type: "related_to",
              strength: 1,
            };
          }),
        },
      });
    }

    if (signal.aborted) {
      step = "review";
      return;
    }

    try {
      if (batchData.length > 0) {
        await vault.batchCreateEntities(batchData);
      }
      step = "complete";
    } catch (err) {
      console.error("Batch import failed:", err);
      alert("Failed to save imported entities. Check console for details.");
      step = "review";
      return;
    }

    setTimeout(() => {
      step = "upload";
      discoveredEntities = [];
    }, 3000);
  };
</script>

<div class="space-y-4">
  <h3 class="text-xs font-bold text-theme-primary uppercase tracking-widest">
    Archive Ingestion
  </h3>
  <p class="text-[13px] text-theme-text/70 leading-relaxed">
    Import existing documents, lore bibles, or JSON data. The Oracle will
    automatically fragment monolithic files into distinct entities and extract
    embedded art.
  </p>

  {#if !oracle.isEnabled}
    <div
      class="p-4 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-3"
    >
      <span
        class="icon-[lucide--alert-triangle] w-5 h-5 text-red-400 shrink-0 mt-0.5"
      ></span>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-bold text-red-400 uppercase tracking-wider"
          >Oracle Connection Required</span
        >
        <p class="text-[11px] text-red-400/80 leading-tight">
          Intelligent ingestion requires an active Gemini API key. Please
          configure your access in the
          <button
            class="underline hover:text-red-300"
            onclick={() => (uiStore.activeSettingsTab = "intelligence")}
            >Intelligence</button
          > tab.
        </p>
      </div>
    </div>
  {/if}

  {#if showResumeToast}
    <div
      transition:slide
      class="p-3 bg-theme-secondary/10 border border-theme-secondary/20 rounded flex items-center justify-between gap-4"
    >
      <div
        class="flex items-center gap-2 text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
      >
        <span class="icon-[lucide--history] w-3.5 h-3.5"></span>
        Resuming previous import
      </div>
      <button
        onclick={handleRestart}
        class="text-[9px] font-bold underline hover:text-theme-text"
      >
        START OVER
      </button>
    </div>
  {/if}

  <div
    class="bg-theme-surface border border-theme-border p-4 rounded-lg min-h-[200px] flex flex-col justify-center relative overflow-hidden"
  >
    {#if step === "upload"}
      <ImportDropzone onFileSelect={handleFiles} />
    {:else if step === "processing"}
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

        <div class="text-center space-y-1">
          <p
            class="text-xs font-mono text-theme-primary uppercase tracking-tight"
          >
            {statusMessage}
          </p>
          <p class="text-[9px] text-theme-muted uppercase tracking-[0.2em]">
            Oracle is interpreting your notes
          </p>
        </div>

        {#if totalChunks > 0}
          <div transition:fade class="w-full max-w-md px-4">
            <ImportProgress {totalChunks} />
          </div>
        {/if}

        <button
          onclick={() => uiStore.abortActiveOperations()}
          class="text-[9px] font-bold text-theme-muted hover:text-red-400 transition-colors uppercase tracking-widest"
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
      <div
        class="flex flex-col items-center gap-2 py-8 text-theme-primary"
        transition:fade
      >
        <div
          class="w-16 h-16 rounded-full bg-theme-primary/10 flex items-center justify-center mb-2"
        >
          <span class="icon-[lucide--check-circle] w-8 h-8"></span>
        </div>
        <p class="text-sm font-bold uppercase tracking-widest">
          Import Successful
        </p>
        <p class="text-[10px] text-theme-muted uppercase font-mono">
          Archive updated with {discoveredEntities.length} records
        </p>
      </div>
    {/if}
  </div>
</div>
