import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { importQueue } from "$lib/stores/import-queue.svelte";
import { aiClientManager } from "$lib/services/ai/client-manager";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { createWebVaultWriter } from "$lib/features/importer/web-vault-writer";
import { sanitizeId } from "$lib/utils/markdown";
import { listPacks, packToDiscoveredEntities } from "@codex/content-packs";
import type { CreaturePack } from "@codex/content-packs";
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
  detectChronicaExport,
  parseChronicaExports,
  ImportEngine,
  setItemDecision,
  setMatchDecision,
} from "@codex/importer";
import type {
  ChronicaExportDocument,
  CCImportSession,
  DiscoveredEntity,
  ImportReport,
  ItemDecision,
  MappingRuleSet,
  MatchDecision,
} from "@codex/importer";

type MarkdownFrontmatterValidator =
  typeof import("@codex/vault-engine").validateMarkdownFrontmatter;

export type ImportMode = "oracle" | "cc" | null;
export type ImportStep =
  | "upload"
  | "processing"
  | "review"
  | "complete"
  | "report";

export function mapThemeToGenre(themeId: string): string {
  const rawId = (themeId || "").toLowerCase();
  if (
    [
      "scifi",
      "starwars",
      "startrek",
      "lancer",
      "space-opera-resistance",
    ].includes(rawId)
  ) {
    return "scifi";
  }
  if (["cyberpunk", "modern"].includes(rawId)) return "cyberpunk";
  if (["apocalyptic", "fallout"].includes(rawId)) return "apocalyptic";
  if (["horror"].includes(rawId)) return "horror";
  if (["steampunk", "western"].includes(rawId)) return "steampunk";
  return "fantasy";
}

export function isScabardExport(jsonObj: unknown): boolean {
  return (
    !!jsonObj &&
    typeof jsonObj === "object" &&
    Array.isArray((jsonObj as { pages?: unknown[] }).pages) &&
    Array.isArray((jsonObj as { conns?: unknown[] }).conns)
  );
}

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
  expandedPacks = $state<Record<string, boolean>>({});
  importProgress = $state<{ current: number; total: number } | null>(null);

  processingSubtitle = $derived(
    this.importMode === "cc"
      ? "Deterministic import is preparing your review"
      : "Oracle is interpreting your notes",
  );
  oracleEnabled = $derived.by(() => this.deps.oracle.isEnabled);

  availablePacks = listPacks();
  targetGenre = $derived.by(() =>
    mapThemeToGenre(
      this.deps.themeStore?.worldThemeId ||
        this.deps.themeStore?.activeTheme?.id ||
        "",
    ),
  );
  masterPacks = $derived.by(() =>
    this.availablePacks.filter(
      (p) => !p.parentPackId && (p.genre || "fantasy") === this.targetGenre,
    ),
  );

  private markdownFrontmatterValidator: MarkdownFrontmatterValidator | null =
    null;
  private readonly parsers = [
    new TextParser(),
    new DocxParser(),
    new JsonParser(),
    new PdfParser(),
  ];
  private readonly ccMappingRules: MappingRuleSet = {
    rules: [
      { when: { sourceType: "Character" }, thenType: "character" },
      { when: { sourceType: "Location" }, thenType: "location" },
      { when: { sourceType: "Faction" }, thenType: "faction" },
      { when: { sourceType: "Item" }, thenType: "item" },
      { when: { sourceType: "Event" }, thenType: "event" },
      { when: { sourceType: "Note" }, thenType: "note" },
      { when: { sourceType: "character" }, thenType: "character" },
      { when: { sourceType: "place" }, thenType: "location" },
      { when: { sourceType: "faction" }, thenType: "faction" },
      { when: { sourceType: "item" }, thenType: "item" },
      { when: { sourceType: "event" }, thenType: "event" },
      { when: { sourceType: "note" }, thenType: "note" },
    ],
    defaultType: "note",
  };

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

  getSubpacks = (masterId: string) =>
    this.availablePacks.filter((p) => p.parentPackId === masterId);

  togglePackExpanded = (packId: string) => {
    this.expandedPacks[packId] = !this.expandedPacks[packId];
  };

  getPackImportStatus = (pack: CreaturePack) => {
    const existingSlugs = new Set(
      Object.values(this.deps.vault.entities).map((e) =>
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
      if (existingSlugs.has(slug)) importedCount++;
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

  handlePackSelect = (pack: CreaturePack) => {
    const knownTitleToId = new Map(
      Object.entries(this.deps.vault.entities).map(([id, e]) => [
        e.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        id,
      ]),
    );
    this.discoveredEntities = packToDiscoveredEntities(pack, knownTitleToId);
    this.importMode = "oracle";
    this.step = "review";
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
    let analyzer: OracleAnalyzer | null = null;
    let lockedMode: ImportMode = null;

    const chronicaDocuments: ChronicaExportDocument[] = [];
    const chronicaMixedRejections: { name: string; reason: string }[] = [];

    for (const file of files) {
      const fileValidation = validateImportFile(file);
      if (!fileValidation.success) continue;

      const parser = this.parsers.find((p) => p.accepts(file));
      if (!(parser instanceof JsonParser)) continue;

      try {
        const result = await parser.parse(file);
        const parsedJson = JSON.parse(result.text);
        if (detectChronicaExport(parsedJson)) {
          chronicaDocuments.push({ fileName: file.name, json: parsedJson });
          continue;
        }

        chronicaMixedRejections.push({
          name: file.name,
          reason: "Chronica imports cannot be mixed with other import types",
        });
      } catch {
        // Invalid JSON is handled in the main pass.
      }
    }

    if (chronicaDocuments.length > 0) {
      this.importMode = "cc";
      this.statusMessage = "Preparing Chronica import review...";

      for (const rejection of chronicaMixedRejections) {
        this.rejectedFiles.push(rejection);
      }

      for (const file of files) {
        if (chronicaDocuments.some((doc) => doc.fileName === file.name)) {
          continue;
        }
        if (chronicaMixedRejections.some((entry) => entry.name === file.name)) {
          continue;
        }

        const fileValidation = validateImportFile(file);
        if (!fileValidation.success) {
          this.rejectedFiles.push({
            name: file.name,
            reason: fileValidation.reason,
          });
          continue;
        }

        const parser = this.parsers.find((p) => p.accepts(file));
        if (!parser) {
          this.rejectedFiles.push({
            name: file.name,
            reason: "Unsupported file type",
          });
          continue;
        }

        if (parser instanceof JsonParser) {
          try {
            const result = await parser.parse(file);
            JSON.parse(result.text);
          } catch {
            this.rejectedFiles.push({
              name: file.name,
              reason: "Invalid JSON",
            });
          }
          continue;
        }

        this.rejectedFiles.push({
          name: file.name,
          reason: "Chronica imports cannot be mixed with other import types",
        });
      }

      try {
        const chronicaPackage = parseChronicaExports(chronicaDocuments);
        this.ccSession = await this.createEngine().prepare(chronicaPackage);
      } catch (error) {
        this.rejectedFiles.push({
          name: chronicaDocuments.map((doc) => doc.fileName).join(", "),
          reason:
            error instanceof Error
              ? error.message
              : "Invalid Chronica import package",
        });
      }

      this.step = this.ccSession ? "review" : "upload";
      if (!this.ccSession && this.rejectedFiles.length === 0) {
        this.statusMessage = "No Chronica package was prepared.";
      }
      return;
    }

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
        const result = await parser.parse(file);

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
            reason: "Scabard imports cannot be mixed with Oracle imports",
          });
          continue;
        }

        if (scabard) {
          this.importMode = "cc";
          lockedMode = "cc";
          this.statusMessage = "Preparing Scabard import review...";
          try {
            const scabardPackage = parseScabardExport(result.text);
            this.ccSession = await this.createEngine().prepare(scabardPackage);
          } catch (error) {
            this.rejectedFiles.push({
              name: file.name,
              reason:
                error instanceof Error
                  ? error.message
                  : "Invalid Scabard import package",
            });
          }
          continue;
        }

        this.importMode = "oracle";
        lockedMode = "oracle";

        if (!this.deps.oracle.isEnabled) {
          this.rejectedFiles.push({
            name: file.name,
            reason: "This file needs Oracle. Scabard JSON works without AI.",
          });
          continue;
        }

        analyzer ??= new OracleAnalyzer((modelName: string) =>
          this.deps.aiClientManager.getModel(apiKey, modelName),
        );

        if (isMarkdown) {
          const validateMarkdownFrontmatter =
            await this.getMarkdownFrontmatterValidator();
          const validation = validateMarkdownFrontmatter(result.text);
          if (!validation.success) {
            this.rejectedFiles.push({
              name: file.name,
              reason: "Invalid YAML frontmatter",
            });
            continue;
          }
        }

        result.assets.forEach((asset) => {
          this.extractedAssets.set(asset.placementRef, asset);
        });

        const knownEntities: Record<string, string> = {};
        Object.values(this.deps.vault.entities).forEach((e) => {
          knownEntities[e.title] = e.id;
        });

        const chunks = splitTextIntoChunks(result.text);
        this.totalChunks = chunks.length;
        const registry = await getRegistry(hash, file.name, this.totalChunks);

        if (registry.completedIndices.length > 0) {
          if (registry.completedIndices.length === this.totalChunks) {
            this.statusMessage = `Already processed: ${file.name}.`;
            continue;
          }
          this.showResumeToast = true;
          setTimeout(() => (this.showResumeToast = false), 5000);
        }

        this.deps.importQueue.activeItemChunks = {};
        registry.completedIndices.forEach((idx) => {
          this.deps.importQueue.updateChunkStatus(idx, "skipped");
        });

        if (signal.aborted) break;

        this.statusMessage = `Analyzing ${file.name} with Oracle...`;
        await analyzer.analyze(result.text, {
          signal,
          knownEntities,
          completedIndices: registry.completedIndices,
          onChunkActive: (idx) => {
            this.deps.importQueue.updateChunkStatus(idx, "active");
            this.statusMessage = `Analyzing chunk ${idx + 1}/${this.totalChunks}...`;
          },
          onChunkProcessed: async (idx, res) => {
            await markChunkComplete(hash, idx);
            this.deps.importQueue.updateChunkStatus(idx, "completed");
            this.discoveredEntities = mergeEntities([
              ...this.discoveredEntities,
              ...res.entities,
            ]);
          },
        });
      } catch (err: any) {
        if (err.message === "Analysis Aborted") return;
        try {
          await clearRegistryEntry(hash);
        } catch {
          // Keep the original error path silent during cleanup.
        }
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

    if (this.importMode === "cc") {
      this.step = this.ccSession ? "review" : "upload";
      if (!this.ccSession && this.rejectedFiles.length === 0) {
        this.statusMessage = "No Scabard package was prepared.";
      }
      return;
    }

    this.step =
      this.discoveredEntities.length > 0 || this.rejectedFiles.length > 0
        ? "review"
        : "upload";
  };

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
  };

  handleOracleSave = async (toSave: DiscoveredEntity[]) => {
    this.step = "processing";
    this.importMode = "oracle";
    this.statusMessage = `Finalizing ${toSave.length} entities...`;

    const signal = this.deps.connectionModeStore.abortSignal;
    const mapType = (type: string) => {
      const t = type.toLowerCase();
      if (t === "character") return "character";
      if (t === "creature") return "creature";
      if (["location", "item", "event", "faction", "note"].includes(t)) {
        return t;
      }
      return "note";
    };

    const batchData: any[] = [];

    this.deps.vault.suspendSaving();
    try {
      for (const entity of toSave) {
        if (signal.aborted) break;

        const title = entity.suggestedTitle;
        const entityId = sanitizeId(title) || "untitled";
        const type = mapType(entity.suggestedType) as any;
        const existingId =
          entity.matchedEntityId ||
          (this.deps.vault.entities[entityId] ? entityId : null);

        if (existingId && this.deps.vault.entities[existingId]) {
          const existing = this.deps.vault.entities[existingId];
          this.statusMessage = `Updating connections for existing entity: ${existing.title}...`;
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
            await this.deps.vault.updateEntity(existing.id, {
              connections: [...existing.connections, ...newConnections],
            });
          }
          continue;
        }

        const imgRef = entity.frontmatter.image;
        let width = entity.frontmatter.width;
        let height = entity.frontmatter.height;
        let imagePath = entity.frontmatter.image;
        let thumbnailPath = entity.frontmatter.thumbnail;

        if (imgRef && this.extractedAssets.has(imgRef)) {
          const asset = this.extractedAssets.get(imgRef);
          width = width || asset.width;
          height = height || asset.height;
          try {
            const savedAssets = await this.deps.vault.saveImageToVault(
              asset.blob,
              entityId,
              asset.originalName,
            );
            imagePath = savedAssets.image;
            thumbnailPath = savedAssets.thumbnail;
          } catch {
            // Keep importing even if a single asset fails.
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
                label,
                type: "related_to",
                strength: 1,
              };
            }),
          },
        });
      }

      if (signal.aborted) {
        this.step = "review";
        return;
      }

      if (batchData.length > 0) {
        await this.deps.vault.batchCreateEntities(batchData);
      }

      this.statusMessage = "Finalizing and saving to vault...";
      await this.deps.vault.flushPendingSaves();
      this.step = "complete";
    } catch (err) {
      console.error("Batch import failed:", err);
      this.deps.notificationStore.notify(
        "Import failed — entities could not be saved. Check the console for details.",
        "error",
      );
      this.step = "review";
      return;
    } finally {
      this.deps.vault.resumeSaving();
    }

    setTimeout(() => {
      this.step = "upload";
      this.discoveredEntities = [];
    }, 3000);
  };

  handleCCItemDecisionChange = (draftRef: string, decision: ItemDecision) => {
    if (!this.ccSession) return;
    this.ccSession = setItemDecision(this.ccSession, draftRef, decision);
  };

  handleCCMatchDecisionChange = (draftRef: string, decision: MatchDecision) => {
    if (!this.ccSession) return;
    this.ccSession = setMatchDecision(this.ccSession, draftRef, decision);
  };

  handleCCCommit = async () => {
    if (!this.ccSession) return;

    this.step = "processing";
    this.importMode = "cc";
    this.statusMessage = `Importing ${this.ccSession.sourceLabel}...`;
    this.importProgress = null;

    const signal = this.deps.connectionModeStore.abortSignal;

    this.deps.vault.suspendSaving();
    try {
      this.ccReport = await this.createEngine().commit(
        this.ccSession,
        (stage, current, total) => {
          this.importProgress = { current, total };
          if (stage === "entity") {
            this.statusMessage = `Importing entities (${current}/${total})...`;
          } else if (stage === "connection") {
            this.statusMessage = `Importing connections (${current}/${total})...`;
          } else if (stage === "asset") {
            this.statusMessage = `Importing assets (${current}/${total})...`;
          }
        },
        signal,
      );
      if (signal.aborted) {
        throw new Error("Import aborted");
      }
      this.statusMessage = "Finalizing and saving to vault...";
      await this.deps.vault.flushPendingSaves();
      this.step = "report";
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.message === "Import aborted")
      ) {
        this.step = "review";
      } else {
        this.deps.notificationStore.notify(
          error instanceof Error
            ? error.message
            : "Import failed before the report could be created.",
          "error",
        );
        this.step = "review";
      }
    } finally {
      this.deps.vault.resumeSaving();
    }
  };

  handleCCReportDone = () => {
    this.step = "upload";
    this.importMode = null;
    this.ccSession = null;
    this.ccReport = null;
    this.rejectedFiles = [];
    this.statusMessage = "";
    this.importProgress = null;
  };
}
