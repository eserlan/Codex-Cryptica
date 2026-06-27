<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { importQueue } from "$lib/stores/import-queue.svelte";
  import ImportDropzone from "$lib/features/importer/ImportDropzone.svelte";
  import ReviewList from "$lib/features/importer/ReviewList.svelte";
  import CCImportReview from "$lib/features/importer/CCImportReview.svelte";
  import CCImportReport from "$lib/features/importer/CCImportReport.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { createWebVaultWriter } from "$lib/features/importer/web-vault-writer";
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
    parseScabardExport,
    ImportEngine,
    setItemDecision,
    setMatchDecision,
  } from "@codex/importer";
  import type {
    DiscoveredEntity,
    CCImportSession,
    ImportReport,
    ItemDecision,
    MatchDecision,
  } from "@codex/importer";
  import { sanitizeId } from "$lib/utils/markdown";
  import { slide, fade } from "svelte/transition";
  import { aiClientManager } from "$lib/services/ai/client-manager";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  type MarkdownFrontmatterValidator =
    typeof import("@codex/vault-engine").validateMarkdownFrontmatter;
  type ImportMode = "oracle" | "cc" | null;

  let { isStandalone = false } = $props<{ isStandalone?: boolean }>();

  let step = $state<"upload" | "processing" | "review" | "complete" | "report">(
    "upload",
  );
  let importMode = $state<ImportMode>(null);
  let statusMessage = $state("");
  let discoveredEntities = $state<DiscoveredEntity[]>([]);
  let ccSession = $state<CCImportSession | null>(null);
  let ccReport = $state<ImportReport | null>(null);
  let extractedAssets = new Map<string, any>(); // filename -> asset
  let totalChunks = $state(0);
  let showResumeToast = $state(false);
  let currentFileHash = $state("");
  let rejectedFiles = $state<{ name: string; reason: string }[]>([]);
  let processingSubtitle = $derived(
    importMode === "cc"
      ? "Deterministic import is preparing your review"
      : "Oracle is interpreting your notes",
  );

  $effect(() => {
    modalUIStore.isImporting =
      step === "processing" || step === "review" || step === "report";

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

  const isScabardExport = (jsonObj: any): boolean => {
    return (
      jsonObj &&
      typeof jsonObj === "object" &&
      Array.isArray(jsonObj.pages) &&
      Array.isArray(jsonObj.conns)
    );
  };
  const createEngine = () =>
    new ImportEngine({ writer: createWebVaultWriter(vault) });

  const handleFiles = async (files: File[]) => {
    step = "processing";
    importMode = null;
    discoveredEntities = [];
    ccSession = null;
    ccReport = null;
    extractedAssets.clear();
    rejectedFiles = [];
    totalChunks = 0;
    showResumeToast = false;

    const signal = connectionModeStore.abortSignal;
    const apiKey = oracle.effectiveApiKey || "";
    let analyzer: OracleAnalyzer | null = null;
    let lockedMode: ImportMode = null;

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

        let parsedJson: unknown = null;
        try {
          parsedJson = JSON.parse(result.text);
        } catch {
          parsedJson = null;
        }

        const isScabard = isScabardExport(parsedJson);

        if (isScabard && lockedMode === "oracle") {
          rejectedFiles.push({
            name: file.name,
            reason: "Run Scabard imports on their own",
          });
          continue;
        }

        if (!isScabard && lockedMode === "cc") {
          rejectedFiles.push({
            name: file.name,
            reason: "Scabard imports cannot be mixed with Oracle imports",
          });
          continue;
        }

        if (isScabard) {
          importMode = "cc";
          lockedMode = "cc";
          statusMessage = `Preparing Scabard import review...`;

          try {
            const scabardPackage = parseScabardExport(result.text);
            ccSession = await createEngine().prepare(scabardPackage);
          } catch (error) {
            rejectedFiles.push({
              name: file.name,
              reason:
                error instanceof Error
                  ? error.message
                  : "Invalid Scabard import package",
            });
          }

          continue;
        }

        importMode = "oracle";
        lockedMode = "oracle";

        if (!oracle.isEnabled) {
          rejectedFiles.push({
            name: file.name,
            reason: "This file needs Oracle. Scabard JSON works without AI.",
          });
          continue;
        }

        analyzer ??= new OracleAnalyzer((modelName: string) =>
          aiClientManager.getModel(apiKey, modelName),
        );

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

        const knownEntities: Record<string, string> = {};
        Object.values(vault.entities).forEach((e) => {
          knownEntities[e.title] = e.id;
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
      ccSession = null;
      ccReport = null;
      importMode = null;

      return;
    }

    if (importMode === "cc") {
      step = ccSession ? "review" : "upload";
      if (!ccSession && rejectedFiles.length === 0) {
        statusMessage = "No Scabard package was prepared.";
      }
      return;
    }

    step =
      discoveredEntities.length > 0 || rejectedFiles.length > 0
        ? "review"
        : "upload";
  };

  const handleRestart = async () => {
    if (currentFileHash) {
      await clearRegistryEntry(currentFileHash);

      step = "upload";

      statusMessage = "Progress cleared. Please select the file again.";
    }
    discoveredEntities = [];
    ccSession = null;
    ccReport = null;
    importMode = null;
    rejectedFiles = [];
  };

  const handleOracleSave = async (toSave: DiscoveredEntity[]) => {
    step = "processing";
    importMode = "oracle";

    statusMessage = `Finalizing ${toSave.length} entities...`;

    const signal = connectionModeStore.abortSignal;

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

    try {
      if (batchData.length > 0) {
        await vault.batchCreateEntities(batchData);
      }

      step = "complete";
    } catch (err) {
      console.error("Batch import failed:", err);

      notificationStore.notify(
        "Import failed — entities could not be saved. Check the console for details.",
        "error",
      );

      step = "review";

      return;
    }

    setTimeout(() => {
      step = "upload";

      discoveredEntities = [];
    }, 3000);
  };

  const handleCCItemDecisionChange = (
    draftRef: string,
    decision: ItemDecision,
  ) => {
    if (!ccSession) return;
    ccSession = setItemDecision(ccSession, draftRef, decision);
  };

  const handleCCMatchDecisionChange = (
    draftRef: string,
    decision: MatchDecision,
  ) => {
    if (!ccSession) return;
    ccSession = setMatchDecision(ccSession, draftRef, decision);
  };

  const handleCCCommit = async () => {
    if (!ccSession) return;

    step = "processing";
    importMode = "cc";
    statusMessage = `Importing ${ccSession.sourceLabel}...`;

    try {
      ccReport = await createEngine().commit(ccSession);
      step = "report";
    } catch (error) {
      notificationStore.notify(
        error instanceof Error
          ? error.message
          : "Import failed before the report could be created.",
        "error",
      );
      step = "review";
    }
  };

  const handleCCReportDone = () => {
    step = "upload";
    importMode = null;
    ccSession = null;
    ccReport = null;
    rejectedFiles = [];
    statusMessage = "";
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
      <div class="flex-1 flex flex-col min-h-0">
        <ImportDropzone onFileSelect={handleFiles} {isStandalone} />
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
            {processingSubtitle}
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

      {#if importMode === "cc" && ccSession}
        <div class="flex flex-col gap-4">
          <FeatureHint hintId="deterministic-imports" />
          <CCImportReview
            session={ccSession}
            onItemDecisionChange={handleCCItemDecisionChange}
            onMatchDecisionChange={handleCCMatchDecisionChange}
            onCommit={handleCCCommit}
            onCancel={handleCCReportDone}
            {isStandalone}
          />
        </div>
      {:else}
        <ReviewList
          entities={discoveredEntities}
          onSave={handleOracleSave}
          onCancel={() => (step = "upload")}
          {isStandalone}
        />
      {/if}
    {:else if step === "report" && ccReport}
      <CCImportReport report={ccReport} onDone={handleCCReportDone} />
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
</div>
