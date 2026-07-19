import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { importQueue } from "$lib/stores/import-queue.svelte";
import { aiClientManager } from "@codex/ai-engine";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { createWebVaultWriter } from "$lib/features/importer/web-vault-writer";
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
  discoveredEntitiesToPackage,
  ImportEngine,
  setItemDecision,
  setMatchDecision,
  setItemType,
  parseCifPackage,
  resolveCifAssets,
  validateCifManifest,
  normalizeCifPackage,
  cifSourceRefBuilder,
  CIF_MAPPING_RULES,
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
export type ImportStep = "upload" | "processing" | "review" | "report";

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
  existingEntitySlugs = $derived.by(() => {
    const slugs = new Set<string>();
    for (const entity of this.deps.vault.allEntities) {
      slugs.add(this.toTitleSlug(entity.title));
    }
    return slugs;
  });

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

  constructor(private deps: ImportSettingsControllerDeps = defaultDeps) {}

  private toTitleSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

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
    let importedCount = 0;
    for (const entry of pack.entries) {
      const slug = this.toTitleSlug(entry.title);
      if (this.existingEntitySlugs.has(slug)) importedCount++;
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

  handlePackSelect = async (pack: CreaturePack) => {
    const knownTitleToId = new Map<string, string>();
    for (const e of this.deps.vault.allEntities) {
      knownTitleToId.set(this.toTitleSlug(e.title), e.id);
    }
    const entities = packToDiscoveredEntities(pack, knownTitleToId);

    this.importMode = "oracle";
    this.step = "processing";
    this.statusMessage = `Preparing ${pack.name} for review...`;
    this.rejectedFiles = [];
    this.ccReport = null;
    this.discoveredEntities = [];

    try {
      this.ccSession = await this.buildOracleSession(
        entities,
        pack.name,
        this.deps.connectionModeStore.abortSignal,
      );
      this.step = "review";
    } catch (error) {
      this.rejectedFiles.push({
        name: pack.name,
        reason:
          error instanceof Error
            ? error.message
            : "Could not prepare this pack for review.",
      });
      this.step = "upload";
    }
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
   * Filename is the primary signal (`.cif.json`/`.cif.zip`); a `.json` file
   * that doesn't follow the convention but self-declares the CIF format is
   * also recognised, so this errs toward routing genuine CIF packages to
   * their dedicated (safer) validation path rather than the generic parsers.
   */
  private async looksLikeCifFile(file: File): Promise<boolean> {
    if (/\.cif\.(json|zip)$/i.test(file.name)) return true;
    if (!file.name.toLowerCase().endsWith(".json")) return false;
    try {
      const parsed = JSON.parse(await file.text());
      return (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as Record<string, unknown>).format === "codex-world-interchange"
      );
    } catch {
      return false;
    }
  }

  /**
   * CIF is a single self-contained package (FR-001): parse + validate fully
   * before opening review (FR-003), never mutating the vault on failure or
   * cancellation (FR-009). Guests never reach the flow (FR-019).
   */
  private async handleCifFile(file: File, signal: AbortSignal) {
    if (this.deps.vault.isGuest) {
      this.rejectedFiles.push({
        name: file.name,
        reason: "Guests cannot import into a vault.",
      });
      this.step = "upload";
      return;
    }

    this.importMode = "cc";
    this.statusMessage = "Preparing CIF import review...";

    const parseResult = await parseCifPackage({
      fileName: file.name,
      size: file.size,
      text: () => file.text(),
      bytes: async () => new Uint8Array(await file.arrayBuffer()),
    });

    if (!parseResult.ok) {
      this.rejectedFiles.push({
        name: file.name,
        reason: parseResult.errors.map((e) => e.message).join(" "),
      });
      this.step = "upload";
      this.importMode = null;
      return;
    }

    // Cross-record validation (FR-002/FR-003): a schema-valid manifest can
    // still be structurally broken (duplicate keys, unresolved references,
    // hierarchy cycles, unsupported version) — never open a review session
    // for one of those.
    const validation = validateCifManifest(parseResult.manifest);
    if (!validation.ok) {
      this.rejectedFiles.push({
        name: file.name,
        reason: validation.errors.map((e) => e.message).join(" "),
      });
      this.step = "upload";
      this.importMode = null;
      return;
    }

    // ZIP packages: verify and resolve binary assets before review. Integrity
    // failures (missing files, digest mismatches, unsafe paths) block the
    // package the same way cross-record validation errors do.
    let resolvedAssets: Awaited<ReturnType<typeof resolveCifAssets>> | null =
      null;
    if (parseResult.zip) {
      resolvedAssets = await resolveCifAssets(
        parseResult.manifest,
        parseResult.zip.files,
      );
      if (resolvedAssets.errors.length > 0) {
        this.rejectedFiles.push({
          name: file.name,
          reason: resolvedAssets.errors.map((e) => e.message).join(" "),
        });
        this.step = "upload";
        this.importMode = null;
        return;
      }
    }

    const { pkg } = normalizeCifPackage(parseResult.manifest, {
      assets: resolvedAssets?.assets,
      zipIgnoredPaths: parseResult.zip?.ignoredPaths,
    });

    // validateCifManifest's own warnings (e.g. cif.unmapped-kind, which
    // normalizeCifPackage doesn't separately compute) must still reach the
    // review/report — merge in anything not already present, deduped by
    // code+ref+message so categories both functions independently compute
    // (no-world-key, unknown-extension, assets-not-imported) don't double up.
    const seenWarnings = new Set(
      pkg.warnings.map((w) => `${w.code}:${w.ref ?? ""}:${w.message}`),
    );
    for (const warning of [
      ...validation.warnings,
      ...(resolvedAssets?.warnings ?? []),
    ]) {
      const key = `${warning.code}:${warning.ref ?? ""}:${warning.message}`;
      if (!seenWarnings.has(key)) {
        pkg.warnings.push(warning);
        seenWarnings.add(key);
      }
    }

    try {
      this.ccSession = await wrapWithAbort(
        this.createCifEngine().prepare(pkg),
        signal,
      );
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.message === "Import aborted")
      ) {
        this.step = "upload";
        this.ccSession = null;
        this.ccReport = null;
        this.importMode = null;
        return;
      }
      this.rejectedFiles.push({
        name: file.name,
        reason:
          error instanceof Error ? error.message : "Invalid CIF import package",
      });
    }

    this.step = this.ccSession ? "review" : "upload";
    if (!this.ccSession && this.rejectedFiles.length === 0) {
      this.statusMessage = "No CIF package was prepared.";
    }
  }

  /**
   * Converts AI-discovered entities (Oracle analysis, creature packs) into a
   * CCImportPackage and runs it through the same generic engine as Scabard/
   * Chronica, so they share one preview/decision/commit/report pipeline.
   * Local blob images are resolved to real vault paths first since the
   * converter itself stays a pure, side-effect-free function.
   */
  private buildOracleSession = async (
    entities: DiscoveredEntity[],
    sourceLabel: string,
    signal: AbortSignal,
  ): Promise<CCImportSession> => {
    const resolvedEntities = await Promise.all(
      entities.map(async (entity) => {
        const imgRef = entity.frontmatter?.image;
        if (!imgRef || !this.extractedAssets.has(imgRef)) return entity;

        const asset = this.extractedAssets.get(imgRef);
        try {
          const saved = await this.deps.vault.saveImageToVault(
            asset.blob,
            entity.id,
            asset.originalName,
          );
          return {
            ...entity,
            frontmatter: {
              ...entity.frontmatter,
              image: saved.image,
              thumbnail: saved.thumbnail,
              width: entity.frontmatter.width ?? asset.width,
              height: entity.frontmatter.height ?? asset.height,
            },
          };
        } catch {
          return entity;
        }
      }),
    );

    const pkg = discoveredEntitiesToPackage(resolvedEntities, sourceLabel);
    const session = await wrapWithAbort(
      this.createEngine().prepare(pkg),
      signal,
    );

    const matchedById = new Map(
      resolvedEntities
        .filter((e) => e.matchedEntityId)
        .map((e) => [e.id, e.matchedEntityId as string]),
    );

    return {
      ...session,
      items: session.items.map((item) => {
        const matchedEntityId = item.draft.sourceId
          ? matchedById.get(item.draft.sourceId)
          : undefined;
        if (!matchedEntityId) return item;
        return {
          ...item,
          match: { entityId: matchedEntityId },
          matchDecision: "update" as const,
        };
      }),
    };
  };

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

    // CIF: a single self-contained package, detected before chronica/scabard
    // (FR-001). Guest/read-only sessions never reach the flow (FR-019),
    // consistent with the rest of this deterministic import surface.
    if (files.length === 1 && (await this.looksLikeCifFile(files[0]))) {
      await this.handleCifFile(files[0], signal);
      return;
    }

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
        this.ccSession = await wrapWithAbort(
          this.createEngine().prepare(chronicaPackage),
          signal,
        );
      } catch (error) {
        if (
          signal.aborted ||
          (error instanceof Error && error.message === "Import aborted")
        ) {
          this.step = "upload";
          this.ccSession = null;
          this.ccReport = null;
          this.importMode = null;
          return;
        }
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
          this.importMode = "cc";
          lockedMode = "cc";
          this.statusMessage = "Preparing Scabard import review...";
          try {
            const scabardPackage = parseScabardExport(result.text);
            this.ccSession = await wrapWithAbort(
              this.createEngine().prepare(scabardPackage),
              signal,
            );
          } catch (error) {
            if (
              signal.aborted ||
              (error instanceof Error && error.message === "Import aborted")
            ) {
              this.step = "upload";
              this.ccSession = null;
              this.ccReport = null;
              this.importMode = null;
              return;
            }
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

    if (this.importMode === "cc") {
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

  handleCCItemDecisionChange = (draftRef: string, decision: ItemDecision) => {
    if (!this.ccSession) return;
    this.ccSession = setItemDecision(this.ccSession, draftRef, decision);
  };

  handleCCMatchDecisionChange = (draftRef: string, decision: MatchDecision) => {
    if (!this.ccSession) return;
    this.ccSession = setMatchDecision(this.ccSession, draftRef, decision);
  };

  handleCCItemTypeChange = (draftRef: string, type: string) => {
    if (!this.ccSession) return;
    this.ccSession = setItemType(this.ccSession, draftRef, type);
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
      this.ccReport = await wrapWithAbort(
        this.createEngine().commit(
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
        ),
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
    this.discoveredEntities = [];
    this.ccSession = null;
    this.ccReport = null;
    this.rejectedFiles = [];
    this.statusMessage = "";
    this.importProgress = null;
  };
}

function wrapWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error("Import aborted"));

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Import aborted"));
    };
    signal.addEventListener("abort", onAbort);

    promise
      .then((val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      })
      .catch((err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      });
  });
}
