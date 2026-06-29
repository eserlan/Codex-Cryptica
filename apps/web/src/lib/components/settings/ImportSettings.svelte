<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { importQueue } from "$lib/stores/import-queue.svelte";
  import ImportDropzone from "$lib/features/importer/ImportDropzone.svelte";
  import ReviewList from "$lib/features/importer/ReviewList.svelte";
  import ImportProgress from "../import/ImportProgress.svelte";
  import InlineKeySetup from "../oracle/InlineKeySetup.svelte";
  import {
    TextParser,
    DocxParser,
    JsonParser,
    PdfParser,
    OracleAnalyzer,
    calculateFileHash,
    getRegistry,
    markChunkComplete,
    clearRegistryEntry,
    splitTextIntoChunks,
    mergeEntities,
    getFileExtension,
    validateImportFile,
  } from "@codex/importer";
  import type { DiscoveredEntity } from "@codex/importer";
  import { sanitizeId } from "$lib/utils/markdown";
  import { slide, fade } from "svelte/transition";
  import { aiClientManager } from "$lib/services/ai/client-manager";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { listPacks, packToDiscoveredEntities } from "@codex/content-packs";
  import type { CreaturePack } from "@codex/content-packs";

  type MarkdownFrontmatterValidator =
    typeof import("@codex/vault-engine").validateMarkdownFrontmatter;

  let { isStandalone = false } = $props<{ isStandalone?: boolean }>();

  let step = $state<"upload" | "processing" | "review" | "complete">("upload");
  let statusMessage = $state("");
  let discoveredEntities = $state<DiscoveredEntity[]>([]);
  let extractedAssets = new Map<string, any>(); // filename -> asset
  let totalChunks = $state(0);
  let showResumeToast = $state(false);
  let currentFileHash = $state("");
  let rejectedFiles = $state<{ name: string; reason: string }[]>([]);

  const availablePacks = listPacks();
  const targetGenre = $derived.by(() => {
    const rawId = (
      themeStore?.worldThemeId ||
      themeStore?.activeTheme?.id ||
      ""
    ).toLowerCase();
    if (
      [
        "scifi",
        "starwars",
        "startrek",
        "lancer",
        "space-opera-resistance",
      ].includes(rawId)
    )
      return "scifi";
    if (["cyberpunk", "modern"].includes(rawId)) return "cyberpunk";
    if (["apocalyptic", "fallout"].includes(rawId)) return "apocalyptic";
    if (["horror"].includes(rawId)) return "horror";
    if (["steampunk", "western"].includes(rawId)) return "steampunk";
    return "fantasy";
  });
  const masterPacks = $derived(
    availablePacks.filter(
      (p) => !p.parentPackId && (p.genre || "fantasy") === targetGenre,
    ),
  );
  const getSubpacks = (masterId: string) =>
    availablePacks.filter((p) => p.parentPackId === masterId);

  let expandedPacks = $state<Record<string, boolean>>({});

  const getPackImportStatus = (pack: CreaturePack) => {
    const existingSlugs = new Set(
      Object.values(vault.entities).map((e) =>
        e.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      ),
    );
    let importedCount = 0;
    for (const entry of pack.entries) {
      const slug = entry.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (existingSlugs.has(slug)) {
        importedCount++;
      }
    }
    return {
      importedCount,
      total: pack.entries.length,
      isFullyImported:
        pack.entries.length > 0 && importedCount === pack.entries.length,
      isPartiallyImported:
        importedCount > 0 && importedCount < pack.entries.length,
    };
  };

  function handlePackSelect(pack: CreaturePack) {
    const knownTitleToId = new Map(
      Object.entries(vault.entities).map(([id, e]) => [
        e.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        id,
      ]),
    );
    discoveredEntities = packToDiscoveredEntities(pack, knownTitleToId);
    step = "review";
  }

  $effect(() => {
    modalUIStore.isImporting = step === "processing" || step === "review";

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === "processing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      modalUIStore.isImporting = false;
    };
  });

  const parsers = [
    new TextParser(),
    new DocxParser(),
    new JsonParser(),
    new PdfParser(),
  ];

  let markdownFrontmatterValidator: MarkdownFrontmatterValidator | null = null;

  const getMarkdownFrontmatterValidator = async () => {
    markdownFrontmatterValidator ??= (await import("@codex/vault-engine"))
      .validateMarkdownFrontmatter;

    return markdownFrontmatterValidator;
  };

  const handleFiles = async (files: File[]) => {
    const apiKey = oracle.effectiveApiKey || "";

    step = "processing";
    const analyzer = new OracleAnalyzer((modelName: string) =>
      aiClientManager.getModel(apiKey, modelName),
    );

    discoveredEntities = [];
    extractedAssets.clear();
    rejectedFiles = [];

    const signal = connectionModeStore.abortSignal;

    // Build known entities map for revision
    const knownEntities: Record<string, string> = {};
    Object.values(vault.entities).forEach((e) => {
      knownEntities[e.title] = e.id;
    });

    for (const file of files) {
      if (signal.aborted) break;

      const extension = getFileExtension(file.name);
      const isMarkdown = extension === ".md" || extension === ".markdown";

      const fileValidation = validateImportFile(file);
      if (!fileValidation.success) {
        rejectedFiles.push({
          name: file.name,
          reason: fileValidation.reason,
        });
        continue;
      }

      statusMessage = `Hashing ${file.name}...`;
      const hash = await calculateFileHash(file);
      currentFileHash = hash;

      const parser = parsers.find((p) => p.accepts(file));
      if (!parser) {
        console.error(`No parser for ${file.name}`);
        rejectedFiles.push({
          name: file.name,
          reason: "Unsupported file type",
        });
        continue;
      }

      try {
        statusMessage = `Parsing ${file.name}...`;
        const result = await parser.parse(file);

        if (isMarkdown) {
          const validateMarkdownFrontmatter =
            await getMarkdownFrontmatterValidator();
          const validation = validateMarkdownFrontmatter(result.text);
          if (!validation.success) {
            console.warn(`Skipping ${file.name}: invalid YAML frontmatter`);
            rejectedFiles.push({
              name: file.name,
              reason: "Invalid YAML frontmatter",
            });
            continue;
          }
        }

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
            statusMessage = `Already processed: ${file.name}.`;

            continue; // Skip to next file
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

            discoveredEntities = mergeEntities([
              ...discoveredEntities,

              ...res.entities,
            ]);
          },
        });

        if (signal.aborted) break;
      } catch (err: any) {
        if (err.message === "Analysis Aborted") {
          console.log("Analysis aborted gracefully.");

          return;
        }

        console.error(`Failed to process ${file.name}:`, err);

        // On unexpected errors, clear any partial registry state for this file

        try {
          await clearRegistryEntry(hash);
        } catch (cleanupErr) {
          console.error(
            `Failed to clear analysis progress for ${file.name}:`,

            cleanupErr,
          );
        }
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

    const signal = connectionModeStore.abortSignal;

    const mapType = (type: string) => {
      const t = type.toLowerCase();

      if (t === "character") return "character";

      if (t === "creature") return "creature";

      if (["location", "item", "event", "faction", "note"].includes(t))
        return t;

      return "note";
    };

    const batchData: any[] = [];

    vault.suspendSaving();
    try {
      for (const entity of toSave) {
        if (signal.aborted) break;

        const title = entity.suggestedTitle;

        const entityId = sanitizeId(title) || "untitled";

        const type = mapType(entity.suggestedType) as any;

        const existingId =
          entity.matchedEntityId ||
          (vault.entities[entityId] ? entityId : null);

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
                  (c) =>
                    c.target === newConn.target && c.label === newConn.label,
                ),
            );

          if (newConnections.length > 0) {
            await vault.updateEntity(existing.id, {
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
            const savedAssets = await vault.saveImageToVault(
              asset.blob,
              entityId,
              asset.originalName,
            );
            imagePath = savedAssets.image;
            thumbnailPath = savedAssets.thumbnail;
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

      if (batchData.length > 0) {
        await vault.batchCreateEntities(batchData);
      }

      statusMessage = "Finalizing and saving to vault...";
      await vault.flushPendingSaves();
      step = "complete";
    } catch (err) {
      console.error("Batch import failed:", err);

      notificationStore.notify(
        "Import failed — entities could not be saved. Check the console for details.",
        "error",
      );

      step = "review";

      return;
    } finally {
      vault.resumeSaving();
    }

    setTimeout(() => {
      step = "upload";

      discoveredEntities = [];
    }, 3000);
  };
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

  {#if !oracle.isEnabled}
    {#if isStandalone}
      <InlineKeySetup />
    {:else}
      <div
        class="p-4 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-3"
      >
        <span
          class="icon-[lucide--alert-triangle] w-5 h-5 text-red-400 shrink-0 mt-0.5"
        ></span>

        <div class="flex flex-col gap-1">
          <span
            class="text-sm font-bold text-red-400 uppercase font-header tracking-wider"
            >Oracle Connection Required</span
          >

          <p class="text-xs text-red-400/80 leading-tight">
            Intelligent importing requires an active Gemini API key. Please
            configure your access in the

            <button
              class="underline hover:text-red-300"
              onclick={() => (modalUIStore.activeSettingsTab = "intelligence")}
              >AI</button
            > tab.
          </p>
        </div>
      </div>
    {/if}
  {:else}
    {#if showResumeToast}
      <div
        transition:slide
        class="p-3 bg-theme-secondary/10 border border-theme-secondary/20 rounded flex items-center justify-between gap-4"
      >
        <div
          class="flex items-center gap-2 text-[11px] font-bold text-theme-secondary uppercase font-header tracking-wider"
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
      class="flex-1 flex flex-col relative overflow-hidden {isStandalone
        ? ''
        : 'bg-theme-surface border border-theme-border p-4 rounded-lg justify-center'}"
    >
      {#if step === "upload"}
        <div class="flex-1 flex flex-col min-h-0 gap-4">
          <ImportDropzone onFileSelect={handleFiles} {isStandalone} />

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
                        onclick={() => handlePackSelect(masterPack)}
                        class="flex items-start gap-3 text-left flex-1 min-w-0 group"
                        aria-label="Import {masterPack.name}"
                      >
                        <span
                          class="icon-[lucide--book-open] w-4 h-4 mt-0.5 text-theme-muted group-hover:text-theme-primary shrink-0 transition-colors"
                        ></span>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p
                              class="text-xs font-bold text-theme-primary truncate"
                            >
                              {masterPack.name}
                            </p>
                            {#if status.isFullyImported}
                              <span
                                class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 shrink-0"
                              >
                                <span class="icon-[lucide--check] w-2.5 h-2.5"
                                ></span> Imported
                              </span>
                            {:else if status.isPartiallyImported}
                              <span
                                class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0"
                              >
                                {status.importedCount}/{status.total} Imported
                              </span>
                            {/if}
                          </div>
                          <p
                            class="text-[10px] text-theme-muted leading-snug mt-0.5"
                          >
                            {masterPack.description}
                          </p>
                          <div
                            class="flex items-center justify-between gap-2 mt-1 flex-wrap"
                          >
                            <p
                              class="text-[10px] text-theme-muted/60 font-mono"
                            >
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
                          onclick={(e) => {
                            e.stopPropagation();
                            expandedPacks[masterPack.id] =
                              !expandedPacks[masterPack.id];
                          }}
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
                        transition:slide={{ duration: 200 }}
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
                              onclick={() => handlePackSelect(subpack)}
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
                                    <span
                                      class="px-1 py-0.5 text-[8px] font-bold uppercase rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-0.5 shrink-0"
                                    >
                                      <span class="icon-[lucide--check] w-2 h-2"
                                      ></span> Imported
                                    </span>
                                  {:else if subStatus.isPartiallyImported}
                                    <span
                                      class="px-1 py-0.5 text-[8px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0"
                                    >
                                      {subStatus.importedCount}/{subStatus.total}
                                    </span>
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

          <div
            class="text-center space-y-1"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p
              class="text-xs font-mono text-theme-primary uppercase tracking-tight"
            >
              {statusMessage}
            </p>

            <p
              class="text-[10px] text-theme-muted uppercase tracking-[0.2em] font-header"
            >
              Oracle is interpreting your notes
            </p>
          </div>

          {#if totalChunks > 0}
            <div transition:fade class="w-full max-w-md px-4">
              <ImportProgress {totalChunks} />
            </div>
          {/if}

          <button
            onclick={() => connectionModeStore.abortActiveOperations()}
            class="text-[10px] font-bold text-theme-muted hover:text-red-400 transition-colors uppercase font-header tracking-widest"
          >
            Cancel Import
          </button>
        </div>
      {:else if step === "review"}
        {#if rejectedFiles.length > 0}
          <div
            class="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded flex flex-col gap-2"
            transition:slide
          >
            <div class="flex items-center gap-2">
              <span class="icon-[lucide--alert-triangle] w-4 h-4 text-red-400"
              ></span>
              <span
                class="text-sm font-bold text-red-400 uppercase tracking-wider"
                >Skipped {rejectedFiles.length} Invalid File(s)</span
              >
            </div>
            <ul
              class="text-xs text-red-400/80 leading-tight space-y-1 pl-6 list-disc"
            >
              {#each rejectedFiles as file (`${file.name}:${file.reason}`)}
                <li><strong>{file.name}</strong>: {file.reason}</li>
              {/each}
            </ul>
          </div>
        {/if}
        <ReviewList
          entities={discoveredEntities}
          onSave={handleSave}
          onCancel={() => (step = "upload")}
          {isStandalone}
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
          <p class="text-base font-bold uppercase font-header tracking-widest">
            Import Successful
          </p>
          <p class="text-[11px] text-theme-muted uppercase font-mono">
            Archive updated with {discoveredEntities.length} records
          </p>
        </div>
      {/if}
    </div>
  {/if}
</div>
