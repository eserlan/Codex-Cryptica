import {
  appendToAiNotes,
  buildHexContext,
  getHexRecord,
  hasPendingParts,
  matchFaction,
  normalizeHexCrawlState,
  pinsInHex,
  planDiscoverySave,
  planFactionSave,
  selectNearestLocation,
  settleDraft,
  withPartStatus,
  type ContextEntity,
  type DiscoveryPartId,
  type DiscoveryResult,
  type HexContext,
  type HexCoord,
  type HexDiscoveryDraft,
  type HexDiscoveryService,
  type ModelRunner,
} from "hex-crawl-engine";
import type { Entity, Map as MapRecord } from "schema";
import type { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";
import { extractJsonObject } from "$lib/services/generators/ai-generator-gateway";
import { publishGeneratedSaved } from "$lib/services/generator-journal-capture";

/** Label on every entity saved from a discovery (FR-028). */
const DISCOVERY_LABEL = "hex-crawl-discovery";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_OUTPUT_TOKENS = 2400;

/** The slice of the vault this controller reads and writes. */
export interface HexVaultPort {
  readonly entities: Readonly<Record<string, Entity>>;
  readonly maps: Readonly<
    Record<string, Pick<MapRecord, "pins" | "hexCrawl"> | undefined>
  >;
  createEntity(
    type: Entity["type"],
    title: string,
    data: Partial<Entity>,
  ): Promise<string>;
  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<unknown>;
}

/** The slice of the map store this controller uses. */
export interface HexMapPort {
  /** Pins an entity at the centre of a hex on the map (FR-008, FR-024). */
  pinAtHex(mapId: string, entityId: string, hex: HexCoord): Promise<void>;
  /** Formats a hex the way the map labels it. */
  formatHex(hex: HexCoord): string;
}

export interface HexDiscoveryControllerDeps {
  service: HexDiscoveryService;
  aiClient: {
    getModel(
      apiKey: string,
      modelName: string,
      systemInstruction?: string,
    ): Promise<{
      generateContent(
        request: unknown,
        options?: { signal?: AbortSignal },
      ): Promise<{ response: { text(): string } }>;
    }>;
  };
  settings: {
    readonly effectiveApiKey: string | null;
    readonly modelName: string;
  };
  isAiDisabled: () => boolean;
  isGuest: () => boolean;
  vault: HexVaultPort;
  mapStore: HexMapPort;
  store: HexCrawlStore;
  clock: { now(): number };
  /** Campaign context for the prompt, when the caller has any. */
  campaignContext?: () => string | undefined;
}

export interface SaveEntityOptions {
  encounterType?: "event" | "note";
  linkTicked: boolean;
}

function abortError(): Error {
  const error = new Error("The discovery was cancelled.");
  error.name = "AbortError";
  return error;
}

/**
 * Drives hex discovery for the GM (FR-021 to FR-034). The engine decides what
 * a draft says and how it is saved. This class gathers context, calls the AI
 * only when asked and not disabled, and persists through the hex store.
 * Guest vaults are refused by every write (FR-032).
 */
export class HexDiscoveryController {
  constructor(private readonly deps: HexDiscoveryControllerDeps) {}

  /** Starts a discovery, or returns the pending draft if there is one (FR-033a). */
  async explore(
    mapId: string,
    hex: HexCoord,
    signal: AbortSignal,
  ): Promise<DiscoveryResult> {
    this.assertWritable();
    const pending = this.deps.store.recordFor(mapId, hex)?.draft;
    if (pending && hasPendingParts(pending)) {
      return { draft: pending, fellBackToTables: false };
    }
    const aiDisabled = this.deps.isAiDisabled();
    const result = await this.deps.service.generate({
      context: this.contextFor(mapId, hex),
      terrain: this.deps.store.recordFor(mapId, hex)?.terrain,
      aiDisabled,
      modelRunner: aiDisabled ? undefined : this.modelRunner(),
      signal,
    });
    await this.persistDraft(mapId, hex, result);
    return result;
  }

  /** Redoes one part and keeps the rest exactly as they are (FR-023). */
  async regenerate(
    mapId: string,
    hex: HexCoord,
    part: DiscoveryPartId,
    signal: AbortSignal,
  ): Promise<DiscoveryResult> {
    this.assertWritable();
    const draft = this.draftOf(mapId, hex);
    const aiDisabled = this.deps.isAiDisabled();
    const result = await this.deps.service.regeneratePart({
      part,
      draft,
      context: this.contextFor(mapId, hex),
      terrain: this.deps.store.recordFor(mapId, hex)?.terrain,
      aiDisabled,
      modelRunner: aiDisabled ? undefined : this.modelRunner(),
      signal,
    });
    await this.persistDraft(mapId, hex, result);
    return result;
  }

  /** Builds a draft from the offline terrain tables (FR-030). Never calls the AI. */
  async rollTables(mapId: string, hex: HexCoord): Promise<DiscoveryResult> {
    this.assertWritable();
    const context = this.contextFor(mapId, hex);
    const draft = this.deps.service.rollFromTables(
      this.deps.store.recordFor(mapId, hex)?.terrain,
      context.nearestFactions.map((faction) => faction.title),
    );
    await this.deps.store.setDraft(mapId, hex, draft);
    return { draft, fellBackToTables: true };
  }

  async discardPart(
    mapId: string,
    hex: HexCoord,
    part: DiscoveryPartId,
  ): Promise<void> {
    this.assertWritable();
    const next = settleDraft(
      withPartStatus(this.draftOf(mapId, hex), part, "discarded"),
    );
    await this.deps.store.setDraft(mapId, hex, next ?? null);
  }

  async discardDraft(mapId: string, hex: HexCoord): Promise<void> {
    this.assertWritable();
    await this.deps.store.setDraft(mapId, hex, null);
  }

  /** Saves the landmark or encounter as an entity pinned at the hex centre (FR-024). */
  async saveEntityPart(
    mapId: string,
    hex: HexCoord,
    part: "landmark" | "encounter",
    options: SaveEntityOptions,
  ): Promise<{ entityId: string }> {
    this.assertWritable();
    const proposed = this.proposedLinkFor(mapId, hex);
    const plan = planDiscoverySave({
      draft: this.draftOf(mapId, hex),
      part,
      encounterType: options.encounterType,
      proposedLink: proposed ? { entityId: proposed.entityId } : null,
      linkTicked: options.linkTicked,
    });
    const entityId = await this.deps.vault.createEntity(
      plan.entity.type,
      plan.entity.title,
      {
        status: plan.entity.status,
        content: plan.entity.content,
        labels: plan.entity.labels,
      },
    );
    await this.deps.mapStore.pinAtHex(mapId, entityId, hex);
    if (plan.link) {
      await this.deps.vault.addConnection(
        entityId,
        plan.link.toEntityId,
        plan.link.type,
      );
    }
    if (plan.factionLink) {
      await this.deps.vault.addConnection(
        entityId,
        plan.factionLink.toEntityId,
        plan.factionLink.type,
      );
    }
    publishGeneratedSaved(
      { title: plan.entity.title, category: plan.entity.type },
      { clock: this.deps.clock },
    );
    await this.deps.store.setDraft(mapId, hex, settleDraft(plan.draft) ?? null);
    return { entityId };
  }

  /** Adds a hazard, secret or atmosphere to AI-drafted notes only (FR-026, FR-027). */
  async saveNotePart(
    mapId: string,
    hex: HexCoord,
    part: "hazard" | "secret" | "atmosphere",
  ): Promise<void> {
    this.assertWritable();
    const { patch } = appendToAiNotes(
      this.deps.store.recordFor(mapId, hex),
      part,
      this.draftOf(mapId, hex),
      this.deps.clock.now(),
    );
    await this.deps.store.updateHex(mapId, hex, patch);
  }

  /**
   * Saves the faction presence (FR-025). With an existing faction of that exact
   * name, links it to every entity already saved from this hex. A missing
   * faction is only created when the caller allows it.
   */
  async saveFactionPart(
    mapId: string,
    hex: HexCoord,
    options: { createIfMissing: boolean },
  ): Promise<{ factionId: string | null }> {
    this.assertWritable();
    const draft = this.draftOf(mapId, hex);
    const name = draft.parts.factionPresence.factionName;
    if (!name) return { factionId: null };

    const factions = Object.values(this.deps.vault.entities)
      .filter((entity) => entity.type === "faction")
      .map((entity) => ({ id: entity.id, title: entity.title }));
    const existing = matchFaction(name, factions);
    let factionId: string;
    let factionTitle: string;
    if (existing) {
      factionId = existing.id;
      factionTitle = factions.find((f) => f.id === existing.id)?.title ?? name;
    } else if (options.createIfMissing) {
      factionId = await this.deps.vault.createEntity("faction", name, {
        status: "draft",
        labels: [
          DISCOVERY_LABEL,
          draft.parts.factionPresence.source === "ai" ? "ai-drafted" : "rolled",
        ],
      });
      factionTitle = name;
    } else {
      return { factionId: null };
    }

    const savedEntityIds = this.savedDiscoveryEntityIds(mapId, hex);
    const plan = planFactionSave({
      draft,
      factionId,
      factionTitle,
      savedEntityIds,
      record: this.deps.store.recordFor(mapId, hex),
      now: this.deps.clock.now(),
    });
    for (const link of plan.links) {
      await this.deps.vault.addConnection(
        link.fromEntityId,
        link.toEntityId,
        link.type,
      );
    }
    await this.deps.store.updateHex(mapId, hex, plan.patch);
    return { factionId };
  }

  /**
   * The nearest location within two hexes, to offer as a link before saving
   * (FR-024a). Guests are never offered one.
   */
  proposedLinkFor(
    mapId: string,
    hex: HexCoord,
  ): { entityId: string; title: string } | null {
    if (this.deps.isGuest()) return null;
    const candidates = (this.deps.vault.maps[mapId]?.pins ?? []).flatMap(
      (pin) => {
        if (!pin.entityId || !pin.hexCoordinates) return [];
        const entity = this.deps.vault.entities[pin.entityId];
        if (!entity || entity.type !== "location") return [];
        return [
          { entityId: entity.id, title: entity.title, hex: pin.hexCoordinates },
        ];
      },
    );
    const nearest = selectNearestLocation(candidates, hex);
    return nearest
      ? { entityId: nearest.entityId, title: nearest.title }
      : null;
  }

  private assertWritable(): void {
    if (this.deps.isGuest()) {
      throw new Error("Hex discovery is not available in a guest vault.");
    }
  }

  private draftOf(mapId: string, hex: HexCoord): HexDiscoveryDraft {
    const draft = this.deps.store.recordFor(mapId, hex)?.draft;
    if (!draft) throw new Error("There is no discovery draft for this hex.");
    return draft;
  }

  private async persistDraft(
    mapId: string,
    hex: HexCoord,
    result: DiscoveryResult,
  ): Promise<void> {
    if (result.draft && !result.failure) {
      await this.deps.store.setDraft(mapId, hex, result.draft);
    }
  }

  /** Entities pinned in this hex that a discovery created (FR-025). */
  private savedDiscoveryEntityIds(mapId: string, hex: HexCoord): string[] {
    const pins = this.deps.vault.maps[mapId]?.pins ?? [];
    const exists = (id: string) => Boolean(this.deps.vault.entities[id]);
    return pinsInHex(pins, hex, exists).flatMap((pin) => {
      const entity = pin.entityId
        ? this.deps.vault.entities[pin.entityId]
        : undefined;
      return entity?.labels.includes(DISCOVERY_LABEL) ? [entity.id] : [];
    });
  }

  private contextFor(mapId: string, hex: HexCoord): HexContext {
    const map = this.deps.vault.maps[mapId];
    const entities: ContextEntity[] = [];
    for (const pin of map?.pins ?? []) {
      const entity = pin.entityId
        ? this.deps.vault.entities[pin.entityId]
        : undefined;
      if (!entity || !pin.hexCoordinates) continue;
      entities.push({
        entityId: entity.id,
        title: entity.title,
        type: entity.type,
        summary: entity.content,
        hex: pin.hexCoordinates,
      });
    }
    const state = normalizeHexCrawlState(map?.hexCrawl);
    return buildHexContext({
      hex,
      label: this.deps.mapStore.formatHex(hex),
      record: getHexRecord(state, hex),
      state,
      entities,
      labelFor: (other) => this.deps.mapStore.formatHex(other),
      campaign: this.deps.campaignContext?.(),
    });
  }

  /** Wraps the model in the same JSON mode as the delve enhancement (D10). */
  private modelRunner(): ModelRunner {
    return async (system, user, signal) => {
      if (signal?.aborted) throw abortError();
      const { aiClient, settings } = this.deps;
      const model = await aiClient.getModel(
        settings.effectiveApiKey ?? "",
        settings.modelName || DEFAULT_MODEL,
        system,
      );
      const response = await model.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
          },
        },
        { signal },
      );
      if (signal?.aborted) throw abortError();
      return JSON.parse(extractJsonObject(response.response.text()));
    };
  }
}
