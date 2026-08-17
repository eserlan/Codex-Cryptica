import type { CreaturePack } from "@codex/content-packs";
import { listPacks, packToDiscoveredEntities } from "@codex/content-packs";
import { mapThemeToGenre } from "./theme-mapper";

export interface PackManagerDeps {
  getThemeId: () => string;
  getVaultEntities: () => { title: string; id: string }[];
  buildOracleSession: (
    entities: any[],
    sourceLabel: string,
    signal: AbortSignal,
  ) => Promise<any>;
  getAbortSignal: () => AbortSignal;
  setImportMode: (mode: "oracle" | "cc" | null) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  setStatusMessage: (msg: string) => void;
  clearStateForPack: () => void;
  setSession: (session: any) => void;
  rejectFile: (name: string, reason: string) => void;
}

export class ImportPackManager {
  expandedPacks = $state<Record<string, boolean>>({});
  availablePacks = listPacks();

  constructor(private deps: PackManagerDeps) {}

  toTitleSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  get targetGenre(): string {
    return mapThemeToGenre(this.deps.getThemeId());
  }

  get masterPacks(): CreaturePack[] {
    return this.availablePacks.filter(
      (p) => !p.parentPackId && (p.genre || "fantasy") === this.targetGenre,
    );
  }

  get existingEntitySlugs(): Set<string> {
    const slugs = new Set<string>();
    for (const entity of this.deps.getVaultEntities()) {
      slugs.add(this.toTitleSlug(entity.title));
    }
    return slugs;
  }

  getSubpacks = (masterId: string) =>
    this.availablePacks.filter((p) => p.parentPackId === masterId);

  togglePackExpanded = (packId: string) => {
    this.expandedPacks[packId] = !this.expandedPacks[packId];
  };

  getPackImportStatus = (pack: CreaturePack) => {
    let importedCount = 0;
    const slugs = this.existingEntitySlugs;
    for (const entry of pack.entries) {
      const slug = this.toTitleSlug(entry.title);
      if (slugs.has(slug)) importedCount++;
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
    for (const e of this.deps.getVaultEntities()) {
      knownTitleToId.set(this.toTitleSlug(e.title), e.id);
    }
    const entities = packToDiscoveredEntities(pack, knownTitleToId);

    this.deps.setImportMode("oracle");
    this.deps.setStep("processing");
    this.deps.setStatusMessage(`Preparing ${pack.name} for review...`);
    this.deps.clearStateForPack();

    try {
      const session = await this.deps.buildOracleSession(
        entities,
        pack.name,
        this.deps.getAbortSignal(),
      );
      this.deps.setSession(session);
      this.deps.setStep("review");
    } catch (error) {
      this.deps.rejectFile(
        pack.name,
        error instanceof Error
          ? error.message
          : "Could not prepare this pack for review.",
      );
      this.deps.setStep("upload");
    }
  };
}
