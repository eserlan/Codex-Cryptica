import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { importQueue } from "$lib/stores/import-queue.svelte";
import { aiClientManager } from "@codex/ai-engine";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { createWebVaultWriter } from "$lib/features/importer/web-vault-writer";
import type { CreaturePack } from "@codex/content-packs";
import {
  TextParser,
  DocxParser,
  JsonParser,
  PdfParser,
  calculateFileHash,
  mergeEntities,
  clearRegistryEntry,
  getFileExtension,
  isScabardExport,
  validateImportFile,
  ImportEngine,
  cifSourceRefBuilder,
  CIF_MAPPING_RULES,
  vaultFileSourceRefBuilder,
} from "@codex/importer";
import type {
  CCImportSession,
  DiscoveredEntity,
  ImportReport,
  ItemDecision,
  MappingRuleSet,
  MatchDecision,
  DroppedItem,
  MissingImageReference,
  CCImportPackage,
} from "@codex/importer";
import { ImportMissingImagesHandler } from "./import-missing-images.svelte";
import {
  looksLikeCifFile,
  looksLikeThreadWeaverFile,
  processCifFile,
  processThreadWeaverFile,
  type CifProcessorCallbacks,
} from "./import-cif-processor";
import { buildOracleSession } from "./import-oracle-session";
import { ImportReviewManager } from "./import-review-manager";
import { processChronicaFiles } from "./import-chronica-processor";
import { processScabardFile } from "./import-scabard-processor";
import { runOracleFileAnalysis } from "./import-oracle-analyzer";
import { ImportPackManager } from "./import-pack-manager.svelte";
import { VaultFilesProcessor } from "./import-vault-files-processor";
import { wrapWithAbort } from "./import-abort-utils";

type MarkdownFrontmatterValidator =
  typeof import("@codex/vault-engine").validateMarkdownFrontmatter;

export type ImportMode = "oracle" | "cc" | null;
export type ImportStep = "upload" | "processing" | "review" | "report";

export interface ImportSettingsControllerDeps {
  oracle: typeof oracle;
  vault: typeof vault;
  importQueue: typeof importQueue;
  aiClientManager: typeof aiClientManager;
  modalUIStore: typeof modalUIStore;
  connectionModeStore: typeof connectionModeStore;
  notificationStore: typeof notificationStore;
  themeStore: typeof themeStore;
}

const defaultDeps: ImportSettingsControllerDeps = {
  oracle,
  vault,
  importQueue,
  aiClientManager,
  modalUIStore,
  connectionModeStore,
  notificationStore,
  themeStore,
};

export class ImportSettingsController {
  step = $state<ImportStep>("upload");
  importMode = $state<ImportMode>(null);
  statusMessage = $state("");
  discoveredEntities = $state<DiscoveredEntity[]>([]);
  ccSession = $state<CCImportSession | null>(null);
  ccReport = $state<ImportReport | null>(null);
  extractedAssets = new Map<string, any>();
  totalChunks = $state(0);
  showResumeToast = $state(false);
  currentFileHash = $state("");
  rejectedFiles = $state<{ name: string; reason: string }[]>([]);
  importProgress = $state<{ current: number; total: number } | null>(null);
  missingImageRefs = $state<MissingImageReference[]>([]);
  private vaultFilesPackage: CCImportPackage | null = null;
  private markdownFrontmatterValidator: MarkdownFrontmatterValidator | null =
    null;

  processingSubtitle = $derived(
    this.importMode === "cc"
      ? "Deterministic import is preparing your review"
      : "Oracle is interpreting your notes",
  );
  oracleEnabled = $derived.by(() => this.deps.oracle.isEnabled);
  private readonly parsers = [
    new TextParser(),
    new DocxParser(),
    new JsonParser(),
    new PdfParser(),
  ];

  constructor(private deps: ImportSettingsControllerDeps = defaultDeps) {}

  syncModalImportState = () => {
    this.deps.modalUIStore.isImporting =
      this.step === "processing" ||
      this.step === "review" ||
      this.step === "report";
  };

  resetModalImportState = () => {
    this.deps.modalUIStore.isImporting = false;
  };

  private _packManager: ImportPackManager | null = null;
  private get packManager(): ImportPackManager {
    return (this._packManager ??= new ImportPackManager({
      getThemeId: () =>
        this.deps.themeStore?.worldThemeId ||
        this.deps.themeStore?.activeTheme?.id ||
        "",
      getVaultEntities: () => this.deps.vault.allEntities,
      buildOracleSession: (entities, label, signal) =>
        this.buildOracleSession(entities, label, signal),
      getAbortSignal: () => this.deps.connectionModeStore.abortSignal,
      setImportMode: (mode) => (this.importMode = mode),
      setStep: (step) => (this.step = step),
      setStatusMessage: (msg) => (this.statusMessage = msg),
      clearStateForPack: () => {
        this.rejectedFiles = [];
        this.ccReport = null;
        this.discoveredEntities = [];
      },
      setSession: (session) => (this.ccSession = session),
      rejectFile: (name, reason) => this.rejectedFiles.push({ name, reason }),
    }));
  }

  get availablePacks() {
    return this.packManager.availablePacks;
  }
  get targetGenre() {
    return this.packManager.targetGenre;
  }
  get masterPacks() {
    return this.packManager.masterPacks;
  }
  get existingEntitySlugs() {
    return this.packManager.existingEntitySlugs;
  }
  get expandedPacks() {
    return this.packManager.expandedPacks;
  }

  getSubpacks = (masterId: string) => this.packManager.getSubpacks(masterId);
  togglePackExpanded = (packId: string) =>
    this.packManager.togglePackExpanded(packId);
  getPackImportStatus = (pack: CreaturePack) =>
    this.packManager.getPackImportStatus(pack);
  handlePackSelect = (pack: CreaturePack) =>
    this.packManager.handlePackSelect(pack);

  private readonly ccMappingRules: MappingRuleSet = {
    rules: [
      { when: { sourceType: "Character" }, thenType: "character" },
      { when: { sourceType: "Creature" }, thenType: "creature" },
      { when: { sourceType: "Location" }, thenType: "location" },
      { when: { sourceType: "Faction" }, thenType: "faction" },
      { when: { sourceType: "Item" }, thenType: "item" },
      { when: { sourceType: "Event" }, thenType: "event" },
      { when: { sourceType: "Note" }, thenType: "note" },
      // Oracle's own extraction prompt uses "Lore" for background/worldbuilding
      // concepts that aren't a concrete entity — map it to "note" explicitly so
      // it doesn't show as a type fallback (that's the correct type, not a guess).
      { when: { sourceType: "Lore" }, thenType: "note" },
      { when: { sourceType: "character" }, thenType: "character" },
      { when: { sourceType: "creature" }, thenType: "creature" },
      { when: { sourceType: "place" }, thenType: "location" },
      { when: { sourceType: "location" }, thenType: "location" },
      { when: { sourceType: "faction" }, thenType: "faction" },
      { when: { sourceType: "item" }, thenType: "item" },
      { when: { sourceType: "event" }, thenType: "event" },
      { when: { sourceType: "note" }, thenType: "note" },
      { when: { sourceType: "lore" }, thenType: "note" },
    ],
    defaultType: "note",
  };

  private getMarkdownFrontmatterValidator = async () => {
    this.markdownFrontmatterValidator ??= (
      await import("@codex/vault-engine")
    ).validateMarkdownFrontmatter;

    return this.markdownFrontmatterValidator;
  };

  private createEngine = () =>
    new ImportEngine(
      { writer: createWebVaultWriter(this.deps.vault) },
      { mappingRules: this.ccMappingRules },
    );

  /**
   * CIF gets its own engine: a kind-independent, injective sourceRefBuilder
   * (FR-014 — a producer changing an entity's kind must never break repeat-
   * import matching) and CIF's own kind→category mapping rules (FR-011).
   */
  private createCifEngine = () =>
    new ImportEngine(
      {
        writer: createWebVaultWriter(this.deps.vault, {
          titleFallback: false,
        }),
      },
      {
        mappingRules: CIF_MAPPING_RULES,
        sourceRefBuilder: cifSourceRefBuilder,
        updatePolicy: "cif",
      },
    );

  /**
   * This source also gets its own engine, mirroring createCifEngine: an
   * exact, sourcePath-only sourceRefBuilder (never title-fuzzy — FR-006/
   * FR-007 define "conflict" as an exact path match) and a mapping rule set
   * derived per-batch from the actual dropped files' own types (entity
   * types are free-form, not a fixed enum — see research.md). Takes
   * mappingRules as a parameter since it must be built from that batch's
   * entityDrafts before the engine can be constructed.
   */
  private createVaultFilesEngine = (mappingRules: MappingRuleSet) =>
    new ImportEngine(
      {
        writer: createWebVaultWriter(this.deps.vault, {
          titleFallback: false,
        }),
      },
      {
        mappingRules,
        sourceRefBuilder: vaultFileSourceRefBuilder,
      },
    );

  /**
   * Filename is the primary signal (`.cif.json`/`.cif.zip`); a `.json` file
   * that doesn't follow the convention but self-declares the CIF format is
   * also recognised, so this errs toward routing genuine CIF packages to
   * their dedicated (safer) validation path rather than the generic parsers.
   */
  private _missingImagesHandler: ImportMissingImagesHandler | null = null;
  private get missingImagesHandler(): ImportMissingImagesHandler {
    return (this._missingImagesHandler ??= new ImportMissingImagesHandler({
      notificationStore: this.deps.notificationStore,
      getVaultFilesPackage: () => this.vaultFilesPackage,
      setVaultFilesPackage: (pkg) => (this.vaultFilesPackage = pkg),
      getMissingImageRefs: () => this.missingImageRefs,
      setMissingImageRefs: (refs) => (this.missingImageRefs = refs),
      reprepareVaultFilesSession: () => this.prepareVaultFilesSession(),
    }));
  }

  handleAddMissingImageFile = (ref: MissingImageReference, file: File) =>
    this.missingImagesHandler.handleAddMissingImageFile(ref, file);

  handleResolveMissingImageFromFolder = (ref: MissingImageReference) =>
    this.missingImagesHandler.handleResolveMissingImageFromFolder(ref);

  private looksLikeCifFile = looksLikeCifFile;
  private looksLikeThreadWeaverFile = looksLikeThreadWeaverFile;

  private handleCifFile(file: File, signal: AbortSignal) {
    return processCifFile(file, signal, this.getCifCallbacks());
  }

  private handleThreadWeaverFile(file: File, signal: AbortSignal) {
    return processThreadWeaverFile(file, signal, this.getCifCallbacks());
  }

  private getCifCallbacks(): CifProcessorCallbacks {
    return {
      isGuest: this.deps.vault.isGuest,
      rejectFile: (name, reason) => this.rejectedFiles.push({ name, reason }),
      setImportMode: (mode) => (this.importMode = mode),
      setStatusMessage: (msg) => (this.statusMessage = msg),
      setStep: (step) => (this.step = step),
      createCifEngine: () => this.createCifEngine(),
      setSession: (session) => (this.ccSession = session),
      setReport: (report) => (this.ccReport = report),
    };
  }

  private buildOracleSession = (
    entities: DiscoveredEntity[],
    sourceLabel: string,
    signal: AbortSignal,
  ): Promise<CCImportSession> =>
    buildOracleSession(entities, sourceLabel, signal, {
      saveImageToVault: (blob, id, name) =>
        this.deps.vault.saveImageToVault(blob, id, name),
      extractedAssets: this.extractedAssets,
      createEngine: () => this.createEngine(),
    });

  handleFiles = async (files: File[]) => {
    this.step = "processing";
    this.importMode = null;
    this.discoveredEntities = [];
    this.ccSession = null;
    this.ccReport = null;
    this.extractedAssets.clear();
    this.rejectedFiles = [];
    this.totalChunks = 0;
    this.showResumeToast = false;
    this.importProgress = null;

    const signal = this.deps.connectionModeStore.abortSignal;
    const apiKey = this.deps.oracle.effectiveApiKey || "";
    let lockedMode: ImportMode = null;

    // CIF: a single self-contained package, detected before chronica/scabard
    // (FR-001). Guest/read-only sessions never reach the flow (FR-019),
    // consistent with the rest of this deterministic import surface.
    if (files.length === 1 && (await this.looksLikeCifFile(files[0]))) {
      await this.handleCifFile(files[0], signal);
      return;
    }

    // Raw Thread Weaver export: convert to CIF in-browser, then the same
    // review pipeline as above. Checked after looksLikeCifFile so an
    // already-converted `.cif.json` never gets re-converted.
    if (
      files.length === 1 &&
      (await this.looksLikeThreadWeaverFile(files[0]))
    ) {
      await this.handleThreadWeaverFile(files[0], signal);
      return;
    }

    const processedChronica = await processChronicaFiles(
      files,
      this.parsers,
      signal,
      {
        rejectFile: (name, reason) => this.rejectedFiles.push({ name, reason }),
        setImportMode: (mode) => (this.importMode = mode),
        setStatusMessage: (msg) => (this.statusMessage = msg),
        setStep: (step) => (this.step = step),
        createEngine: () => this.createEngine(),
        setSession: (session) => (this.ccSession = session),
        setReport: (report) => (this.ccReport = report),
      },
    );
    if (processedChronica) return;

    for (const file of files) {
      if (signal.aborted) break;

      const extension = getFileExtension(file.name);
      const isMarkdown = extension === ".md" || extension === ".markdown";

      const fileValidation = validateImportFile(file);
      if (!fileValidation.success) {
        this.rejectedFiles.push({
          name: file.name,
          reason: fileValidation.reason,
        });
        continue;
      }

      this.statusMessage = `Hashing ${file.name}...`;
      const hash = await calculateFileHash(file);
      this.currentFileHash = hash;

      const parser = this.parsers.find((p) => p.accepts(file));
      if (!parser) {
        this.rejectedFiles.push({
          name: file.name,
          reason: "Unsupported file type",
        });
        continue;
      }

      try {
        this.statusMessage = `Parsing ${file.name}...`;
        const result = await wrapWithAbort(parser.parse(file), signal);

        let parsedJson: unknown = null;
        try {
          parsedJson = JSON.parse(result.text);
        } catch {
          parsedJson = null;
        }

        const scabard = isScabardExport(parsedJson);
        if (scabard && lockedMode === "oracle") {
          this.rejectedFiles.push({
            name: file.name,
            reason: "Run Scabard imports on their own",
          });
          continue;
        }
        if (!scabard && lockedMode === "cc") {
          this.rejectedFiles.push({
            name: file.name,
            reason: "Deterministic imports cannot be mixed with Oracle imports",
          });
          continue;
        }

        if (scabard) {
          lockedMode = "cc";
          await processScabardFile(file, result.text, signal, {
            rejectFile: (name, reason) =>
              this.rejectedFiles.push({ name, reason }),
            setImportMode: (mode) => (this.importMode = mode),
            setStatusMessage: (msg) => (this.statusMessage = msg),
            setStep: (step) => (this.step = step),
            createEngine: () => this.createEngine(),
            setSession: (session) => (this.ccSession = session),
            setReport: (report) => (this.ccReport = report),
          });
          continue;
        }

        this.importMode = "oracle";
        lockedMode = "oracle";

        await runOracleFileAnalysis(file, result, hash, isMarkdown, signal, {
          aiClientManager: this.deps.aiClientManager,
          apiKey,
          vaultAllEntities: this.deps.vault.allEntities,
          importQueue: this.deps.importQueue,
          setStatusMessage: (msg) => (this.statusMessage = msg),
          setShowResumeToast: (show) => (this.showResumeToast = show),
          setTotalChunks: (total) => (this.totalChunks = total),
          setCurrentFileHash: (h) => (this.currentFileHash = h),
          extractedAssets: this.extractedAssets,
          addDiscoveredEntities: (entities) => {
            this.discoveredEntities = mergeEntities([
              ...this.discoveredEntities,
              ...entities,
            ]);
          },
          rejectFile: (name, reason) =>
            this.rejectedFiles.push({ name, reason }),
          getMarkdownFrontmatterValidator: () =>
            this.getMarkdownFrontmatterValidator(),
        });
      } catch (err: any) {
        if (
          err.message === "Analysis Aborted" ||
          err.message === "Import aborted" ||
          signal.aborted
        ) {
          return;
        }
        try {
          await clearRegistryEntry(hash);
        } catch {
          // Keep the original error path silent during cleanup.
        }

        // Surface the failure instead of silently producing no import at all
        // (previously Oracle errors were swallowed with zero feedback).
        this.rejectedFiles.push({
          name: file.name,
          reason:
            err instanceof Error
              ? err.message
              : "Oracle could not analyze this file.",
        });
      }
    }

    if (signal.aborted) {
      this.step = "upload";
      this.discoveredEntities = [];
      this.ccSession = null;
      this.ccReport = null;
      this.importMode = null;
      return;
    }

    if ((this.importMode as ImportMode) === "cc") {
      this.step = this.ccSession ? "review" : "upload";
      if (!this.ccSession && this.rejectedFiles.length === 0) {
        this.statusMessage = "No import package was prepared.";
      }
      return;
    }

    if (this.discoveredEntities.length > 0) {
      this.statusMessage = "Preparing review...";
      try {
        this.ccSession = await this.buildOracleSession(
          this.discoveredEntities,
          "Oracle Analysis",
          signal,
        );
        this.step = "review";
      } catch (error) {
        if (
          signal.aborted ||
          (error instanceof Error && error.message === "Import aborted")
        ) {
          this.step = "upload";
          this.ccSession = null;
          this.importMode = null;
          return;
        }
        this.rejectedFiles.push({
          name: "Oracle results",
          reason:
            error instanceof Error
              ? error.message
              : "Could not prepare a review for the detected entities.",
        });
        // No ccSession means CCImportReview won't render, and there's no
        // fallback UI on the review step anymore — go back to upload, which
        // already displays rejectedFiles via ImportSourcePicker.
        this.step = "upload";
      }
      return;
    }

    this.step = "upload";
  };

  private _vaultFilesProcessor: VaultFilesProcessor | null = null;
  private get vaultFilesProcessor(): VaultFilesProcessor {
    return (this._vaultFilesProcessor ??= new VaultFilesProcessor({
      isGuest: this.deps.vault.isGuest,
      getAbortSignal: () => this.deps.connectionModeStore.abortSignal,
      getVault: () => this.deps.vault,
      getSession: () => this.ccSession,
      setSession: (session) => (this.ccSession = session),
      setReport: (report) => (this.ccReport = report),
      setStep: (step) => (this.step = step),
      setImportMode: (mode) => (this.importMode = mode),
      setStatusMessage: (msg) => (this.statusMessage = msg),
      setDiscoveredEntities: (entities) => (this.discoveredEntities = entities),
      setRejectedFiles: (files) => (this.rejectedFiles = files),
      setMissingImageRefs: (refs) => (this.missingImageRefs = refs),
      getVaultFilesPackage: () => this.vaultFilesPackage,
      setVaultFilesPackage: (pkg) => (this.vaultFilesPackage = pkg),
    }));
  }

  handleVaultFiles = (items: DroppedItem[]) =>
    this.vaultFilesProcessor.handleVaultFiles(items);

  private prepareVaultFilesSession = () =>
    this.vaultFilesProcessor.prepareVaultFilesSession();

  handleRestart = async () => {
    if (this.currentFileHash) {
      await clearRegistryEntry(this.currentFileHash);
      this.step = "upload";
      this.statusMessage = "Progress cleared. Please select the file again.";
    }
    this.discoveredEntities = [];
    this.ccSession = null;
    this.ccReport = null;
    this.importMode = null;
    this.rejectedFiles = [];
    this.missingImageRefs = [];
    this.vaultFilesPackage = null;
  };

  private _reviewManager: ImportReviewManager | null = null;
  private get reviewManager(): ImportReviewManager {
    return (this._reviewManager ??= new ImportReviewManager({
      getSession: () => this.ccSession,
      setSession: (session) => (this.ccSession = session),
      setStep: (step) => (this.step = step),
      setImportMode: (mode) => (this.importMode = mode),
      setStatusMessage: (msg) => (this.statusMessage = msg),
      setImportProgress: (progress) => (this.importProgress = progress),
      setReport: (report) => (this.ccReport = report),
      getAbortSignal: () => this.deps.connectionModeStore.abortSignal,
      suspendSaving: () => this.deps.vault.suspendSaving(),
      resumeSaving: () => this.deps.vault.resumeSaving(),
      flushPendingSaves: () => this.deps.vault.flushPendingSaves(),
      notifyError: (msg) => this.deps.notificationStore.notify(msg, "error"),
      createEngine: () => this.createEngine(),
      resetState: () => {
        this.step = "upload";
        this.importMode = null;
        this.discoveredEntities = [];
        this.ccSession = null;
        this.ccReport = null;
        this.rejectedFiles = [];
        this.statusMessage = "";
        this.importProgress = null;
        this.missingImageRefs = [];
        this.vaultFilesPackage = null;
      },
    }));
  }

  handleCCItemDecisionChange = (draftRef: string, decision: ItemDecision) =>
    this.reviewManager.handleCCItemDecisionChange(draftRef, decision);

  handleCCMatchDecisionChange = (draftRef: string, decision: MatchDecision) =>
    this.reviewManager.handleCCMatchDecisionChange(draftRef, decision);

  handleCCItemTypeChange = (draftRef: string, type: string) =>
    this.reviewManager.handleCCItemTypeChange(draftRef, type);

  handleCCCommit = () => this.reviewManager.handleCCCommit();

  handleCCReportDone = () => this.reviewManager.handleCCReportDone();
}
