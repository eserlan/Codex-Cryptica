import type { Canvas } from "@codex/canvas-engine";
import type { Entity } from "schema";
import {
  DelveStockingService,
  getRelevantStockingFields,
  mergeRelevantStocking,
  parseDelveClimaxResolution,
  resolveGeneratedDelveAreaName,
  type DelveEdgeData,
  type DelveRoomNodeData,
} from "generator-engine";
import { aiClientManager } from "@codex/ai-engine";
import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { systemClock, type Clock } from "$lib/utils/runtime-deps";
import { z } from "zod";

const EnhancedAreaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().min(1),
  climax: z
    .object({
      stakes: z.string().min(1),
      decision: z.string().min(1),
      outcomes: z.array(z.string().min(1)).min(2),
    })
    .optional(),
  stocking: z
    .object({
      encounters: z.array(z.string()).optional(),
      hazards: z.array(z.string()).optional(),
      treasure: z.array(z.string()).optional(),
      secrets: z.array(z.string()).optional(),
      factionPresence: z.string().optional(),
      atmosphere: z.string().optional(),
    })
    .default({}),
});

const EnhancedPassageSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  condition: z.string().min(1).optional(),
});

const EnhancedSectorSchema = z.object({
  areas: z.array(EnhancedAreaSchema).default([]),
  passages: z.array(EnhancedPassageSchema).default([]),
});

interface LocationVaultGateway {
  entities: Record<string, Entity>;
  loadEntityContent(id: string): Promise<void>;
}

interface AreaEnhancementModel {
  generateContent(request: any): Promise<{
    response: { text(): string };
  }>;
}

interface AreaEnhancementAIClient {
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<AreaEnhancementModel>;
}

interface AreaEnhancementSettings {
  readonly effectiveApiKey: string | null;
  readonly modelName: string;
}

export interface EnhanceDelveAreaParams {
  canvas: Canvas;
  room: DelveRoomNodeData;
  nearbyAreas: DelveRoomNodeData[];
}

export interface AreaPopulationProgress {
  completed: number;
  total: number;
  updatedAreas: DelveRoomNodeData[];
}

export interface AreaPopulationResult {
  nodes: Canvas["nodes"];
  edges: Canvas["edges"];
  completed: number;
  total: number;
  failed: number;
  failedPassages: number;
}

interface EnhancedSectorResult {
  rooms: DelveRoomNodeData[];
  passages: Map<string, DelveEdgeData>;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function areaUsageContext(room: DelveRoomNodeData): string {
  const usedDetails = [
    ...(room.stocking?.encounters ?? []),
    ...(room.stocking?.hazards ?? []),
    ...(room.stocking?.treasure ?? []),
    ...(room.stocking?.secrets ?? []),
  ].filter((value) => value.trim());
  return [
    `${room.name} [${room.role}]: ${room.description || room.summary}`,
    usedDetails.length ? `Used elements: ${usedDetails.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function stockingValues(stocking: unknown): string[] {
  if (!stocking || typeof stocking !== "object") return [];
  const candidate = stocking as Record<string, unknown>;
  return ["encounters", "hazards", "treasure", "secrets"].flatMap((field) =>
    Array.isArray(candidate[field])
      ? candidate[field].filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value.trim()),
        )
      : [],
  );
}

export function isPlaceholderDelveAreaName(
  room: Pick<DelveRoomNodeData, "name" | "sectorName">,
): boolean {
  const name = room.name.trim();
  if (/^area\s+\d+$/i.test(name)) return true;

  const sectorName = room.sectorName
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .trim();
  return new RegExp(`^${sectorName}\\s*[-–—:]\\s*area\\s+\\d+$`, "i").test(
    name,
  );
}

export class DelveAreaEnhancementService {
  constructor(
    private readonly vaultGateway: LocationVaultGateway = vault,
    private readonly aiClient: AreaEnhancementAIClient = aiClientManager,
    private readonly settings: AreaEnhancementSettings = oracle,
    private readonly stockingService = new DelveStockingService(),
    private readonly clock: Clock = systemClock,
  ) {}

  async enhanceArea({
    canvas,
    room,
    nearbyAreas,
  }: EnhanceDelveAreaParams): Promise<DelveRoomNodeData> {
    const locationCanon = await this.loadLocationCanon(canvas);
    const suppliedIds = new Set([
      room.id,
      ...nearbyAreas.map((area) => area.id),
    ]);
    const otherCanvasAreas = canvas.nodes
      .filter((node) => node.type === "delveRoom" && !suppliedIds.has(node.id))
      .map((node) => node.data as unknown as DelveRoomNodeData);
    const usedAreaContext = [...nearbyAreas, ...otherCanvasAreas];
    const nearbyContext = usedAreaContext.length
      ? usedAreaContext.map(areaUsageContext).join("\n").slice(0, 12_000)
      : undefined;

    const enhanced = await this.stockingService.regenerateSingleRoom({
      room,
      conceptLore: locationCanon,
      nearbyAreas: nearbyContext,
      fallbackOnFailure: false,
      modelRunner: async (systemInstruction, userPrompt) => {
        return this.runModel(systemInstruction, userPrompt, 1200);
      },
    });
    return { ...enhanced, aiEnhancedAt: this.clock.now() };
  }

  async populateAllAreas(
    canvas: Canvas,
    onProgress?: (progress: AreaPopulationProgress) => void,
  ): Promise<AreaPopulationResult> {
    const locationCanon = await this.loadLocationCanon(canvas);
    const allRooms = canvas.nodes
      .filter((node) => node.type === "delveRoom")
      .map((node) => node.data as unknown as DelveRoomNodeData);
    const pendingRooms = allRooms.filter(
      (room) =>
        !room.aiEnhancedAt ||
        isPlaceholderDelveAreaName(room) ||
        (room.role === "climax" && !room.climax),
    );
    const roomsById = new Map(allRooms.map((room) => [room.id, room]));
    const pendingPassages = canvas.edges.filter((edge) => {
      if (edge.type !== "delveEdge") return false;
      const data = edge.data as unknown as DelveEdgeData | undefined;
      return !data?.aiEnhancedAt;
    });
    const total = pendingRooms.length;
    if (total === 0 && pendingPassages.length === 0) {
      return {
        nodes: canvas.nodes,
        edges: canvas.edges,
        completed: 0,
        total: 0,
        failed: 0,
        failedPassages: 0,
      };
    }

    const sectorIds = new Set<string>();
    for (const room of pendingRooms) {
      sectorIds.add(room.sectorId);
    }
    for (const edge of pendingPassages) {
      const sourceRoom = roomsById.get(edge.source);
      if (sourceRoom) sectorIds.add(sourceRoom.sectorId);
    }

    let completed = 0;
    let failed = 0;
    let failedPassages = 0;
    const updates = new Map<string, DelveRoomNodeData>();
    const passageUpdates = new Map<string, DelveEdgeData>();
    for (const sectorId of sectorIds) {
      const sectorRooms = pendingRooms.filter(
        (room) => room.sectorId === sectorId,
      );
      const sectorPassages = pendingPassages.filter(
        (edge) => roomsById.get(edge.source)?.sectorId === sectorId,
      );
      try {
        const effectiveRooms = allRooms.map(
          (room) => updates.get(room.id) ?? room,
        );
        const enhanced = await this.enhanceSector(
          locationCanon,
          sectorId,
          sectorRooms,
          effectiveRooms,
          sectorPassages,
        );
        for (const room of enhanced.rooms) updates.set(room.id, room);
        for (const [id, passage] of enhanced.passages) {
          passageUpdates.set(id, passage);
        }
        completed += enhanced.rooms.length;
        failed += sectorRooms.length - enhanced.rooms.length;
        onProgress?.({
          completed,
          total,
          updatedAreas: enhanced.rooms,
        });
      } catch {
        failed += sectorRooms.length;
        failedPassages += sectorPassages.length;
        onProgress?.({ completed, total, updatedAreas: [] });
      }
    }

    return {
      nodes: canvas.nodes.map((node) => {
        const update = updates.get(node.id);
        return update
          ? { ...node, data: { ...(node.data ?? {}), ...update } }
          : node;
      }),
      edges: canvas.edges.map((edge) => {
        const update = passageUpdates.get(edge.id);
        return update
          ? { ...edge, data: { ...(edge.data ?? {}), ...update } }
          : edge;
      }),
      completed,
      total,
      failed,
      failedPassages,
    };
  }

  private async enhanceSector(
    locationCanon: string,
    sectorId: string,
    sectorRooms: DelveRoomNodeData[],
    allRooms: DelveRoomNodeData[],
    sectorPassages: Canvas["edges"],
  ): Promise<EnhancedSectorResult> {
    const roomsById = new Map(allRooms.map((room) => [room.id, room]));
    const neighboringAreas = allRooms
      .filter((room) => room.sectorId !== sectorId)
      .map(areaUsageContext)
      .join("\n");
    const systemInstruction = `You are an expert tabletop RPG location designer populating one complete sector of an existing delve. Ground every Area and passage in the supplied Location canon, including its explicitly connected canon. Treat that canon as the closed roster of factions, peoples, and creatures: never invent or substitute a named faction, ancestry, creature type, enemy group, key, ward, or access mechanism that is not present there. When no specific inhabitant is established, describe a generic role or evidence of occupation without assigning a new creature identity. Weave in established history, hazards, secrets, materials, and motifs where relevant without contradicting the source. Give every Area a distinct, evocative 2-6 word name tied to its function, history, material, inhabitants, hazard, or secret. Never use "Area", a number, the sector name plus a suffix, an unsupported climate word, or the same head noun repeatedly. Names must be unique across the supplied sector and must not duplicate or closely resemble OTHER AREAS. Each ordinary Area's gameplay categories were assigned during delve creation: populate every allowedStockingField and do not add other categories. Secrets must be information, revelations, evidence, or clues—not a straightforward cache or valuable item. Treasure must be a tangible reward. For a faction Area, populate factionPresence with the faction's purpose in the Area, defenses or leverage, and likely reaction; do not reduce it to a generic sentry encounter. For a climax Area, its allowedStockingFields are candidates: select only the 1-3 categories relevant to the culmination you design. Decide from the Location's central secret, current conflict, factions, hazards, purpose, and current state whether the climax is a confrontation, negotiation, ritual, revelation, environmental crisis, siege, escape, or another decisive turn; never default automatically to a boss fight. The climax must reveal, transform, or resolve the central secret, substantially change the situation, present an immediate decision, and provide at least two concrete outcomes. Never repeat an earlier encounter unchanged; a recurring threat must be meaningfully escalated or transformed. Description and atmosphere are always allowed. Keep Areas distinct, avoid repeated phrases and doubled word roots, and produce immediately usable table details.

Rewrite every supplied passage as a specific physical route between its named endpoints. A standard passage describes its actual corridor, opening, bridge, crawlway, or threshold and has no condition. A hidden passage explains canon-grounded concealment or discovery. A conditional passage names a concrete obstacle and an actionable way to satisfy or bypass it, without inventing an unsupported key or ward. A vertical passage describes the actual stairs, ladder, shaft, lift, climb, or descent. Never use canned phrases such as "Requires Iron Key", "sector ward", "concealed revolving wall", or "spiral stone stairs" unless that exact feature is supported by the canon.

Respond only with valid JSON matching { "areas": [{ "id": string, "name": string, "description": string, "climax"?: { "stakes": string, "decision": string, "outcomes": string[] }, "stocking": { "encounters"?: string[], "hazards"?: string[], "treasure"?: string[], "secrets"?: string[], "factionPresence"?: string, "atmosphere": string } }], "passages": [{ "id": string, "description": string, "condition"?: string }] }. The climax object is required for a climax Area and must be omitted for every other Area. Return exactly one result for every supplied Area and passage ID.`;
    const userPrompt = `LOCATION CANON
${locationCanon}

SECTOR TO POPULATE
${sectorRooms[0]?.sectorName || "Unnamed Sector"}
${JSON.stringify(
  sectorRooms.map((room) => ({
    id: room.id,
    name: room.name,
    role: room.role,
    summary: room.summary,
    currentDescription: room.description,
    currentStocking: room.stocking,
    allowedStockingFields: getRelevantStockingFields(room.stocking),
  })),
  null,
  2,
)}

PASSAGES TO ENHANCE
${JSON.stringify(
  sectorPassages.map((edge) => {
    const data = edge.data as unknown as DelveEdgeData | undefined;
    return {
      id: edge.id,
      type: data?.type ?? "standard",
      from: roomsById.get(edge.source)?.name ?? edge.source,
      to: roomsById.get(edge.target)?.name ?? edge.target,
      currentDescription: data?.description,
      currentCondition: data?.condition,
    };
  }),
  null,
  2,
)}

USED ELEMENTS AND OTHER AREAS TO AVOID DUPLICATING
${neighboringAreas.slice(0, 12_000) || "None supplied."}

For every Area, invent a distinctive location-relevant name and write a vivid 2-4 sentence description. For a climax, choose and populate only the relevant candidate fields; for every other role, populate every allowed stocking field. Omit encounters, hazards, treasure, and secrets that are not relevant or allowed. Use named factions when their presence, evidence, or influence makes sense. Proofread for repeated words and stock phrasing. Return a unique, canon-specific description for every supplied passage; include condition only for conditional passages.`;
    const response = await this.runModel(
      systemInstruction,
      userPrompt,
      Math.max(2400, sectorRooms.length * 900 + sectorPassages.length * 180),
    );
    const parsed = EnhancedSectorSchema.parse(
      JSON.parse(extractJsonObject(response)),
    );
    const requestedIds = new Set(sectorRooms.map((room) => room.id));
    const requestedPassages = new Map(
      sectorPassages.map((edge) => [
        edge.id,
        edge.data as unknown as DelveEdgeData | undefined,
      ]),
    );
    const generatedOrdinaryDetails = parsed.areas.flatMap((area) => {
      const original = sectorRooms.find((room) => room.id === area.id);
      return original?.role === "climax" ? [] : stockingValues(area.stocking);
    });
    const usedDetailContext = [neighboringAreas, ...generatedOrdinaryDetails]
      .join("\n")
      .toLowerCase();
    const usedNames = new Set(
      allRooms
        .filter((room) => room.sectorId !== sectorId)
        .map((room) => room.name.trim().toLowerCase()),
    );
    const now = this.clock.now();
    const enhancedRooms = parsed.areas
      .filter((area) => requestedIds.has(area.id))
      .map((area) => {
        const original = sectorRooms.find((room) => room.id === area.id)!;
        const isNameOnlyMigration =
          Boolean(original.aiEnhancedAt) &&
          isPlaceholderDelveAreaName(original);
        const name = resolveGeneratedDelveAreaName(area.name, {
          sourceCanon: locationCanon,
          sectorName: original.sectorName,
          role: original.role,
          existingNames: usedNames,
        });
        usedNames.add(name.toLowerCase());
        const climax =
          original.role === "climax"
            ? parseDelveClimaxResolution(area.climax)
            : undefined;
        if (original.role === "climax" && !climax) {
          throw new Error(
            `AI returned incomplete climax resolution for ${original.id}.`,
          );
        }
        if (
          original.role === "climax" &&
          stockingValues(area.stocking).some((value) =>
            usedDetailContext.includes(value.toLowerCase()),
          )
        ) {
          throw new Error(
            `AI repeated an existing Area detail in climax ${original.id}.`,
          );
        }
        return {
          ...original,
          name,
          description: isNameOnlyMigration
            ? original.description
            : area.description.trim(),
          stocking: isNameOnlyMigration
            ? original.stocking
            : mergeRelevantStocking(
                original.stocking,
                area.stocking,
                original.role === "climax",
              ),
          climax: isNameOnlyMigration ? (original.climax ?? climax) : climax,
          aiEnhancedAt: now,
        };
      });
    if (enhancedRooms.length !== requestedIds.size) {
      throw new Error("AI did not return every requested Area.");
    }

    const enhancedPassages = new Map<string, DelveEdgeData>();
    for (const passage of parsed.passages) {
      const original = requestedPassages.get(passage.id);
      if (!original) continue;
      if (original.type === "conditional" && !passage.condition?.trim()) {
        throw new Error(
          `AI returned a conditional passage without a condition: ${passage.id}.`,
        );
      }
      enhancedPassages.set(passage.id, {
        ...original,
        description: passage.description.trim(),
        condition:
          original.type === "conditional"
            ? passage.condition?.trim()
            : undefined,
        aiEnhancedAt: now,
      });
    }
    if (enhancedPassages.size !== requestedPassages.size) {
      throw new Error("AI did not return every requested passage.");
    }

    return { rooms: enhancedRooms, passages: enhancedPassages };
  }

  private async loadLocationCanon(canvas: Canvas): Promise<string> {
    const sourceEntityId = canvas.metadata?.sourceEntityId;
    if (typeof sourceEntityId !== "string" || !sourceEntityId) {
      throw new Error("This canvas is not linked to a source Location.");
    }

    await this.vaultGateway.loadEntityContent(sourceEntityId);
    const location = this.vaultGateway.entities[sourceEntityId];
    if (!location) {
      throw new Error("The source Location could not be found.");
    }

    const locationCanon = [
      `Title: ${location.title}`,
      location.labels?.length ? `Labels: ${location.labels.join(", ")}` : "",
      location.content ? `Content:\n${location.content}` : "",
      location.lore ? `Lore:\n${location.lore}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 16_000);

    const related = new Map<string, string>();
    for (const connection of location.connections ?? []) {
      const label = connection.label ? ` (${connection.label})` : "";
      related.set(connection.target, `Relation: ${connection.type}${label}`);
    }
    for (const entity of Object.values(this.vaultGateway.entities)) {
      if (entity.id === sourceEntityId || related.has(entity.id)) continue;
      const inbound = entity.connections?.find(
        (connection) => connection.target === sourceEntityId,
      );
      if (inbound) {
        const label = inbound.label ? ` (${inbound.label})` : "";
        related.set(entity.id, `Relation: inbound ${inbound.type}${label}`);
      }
    }

    const relatedEntries = [...related.entries()].slice(0, 8);
    await Promise.all(
      relatedEntries.map(([entityId]) =>
        this.vaultGateway.loadEntityContent(entityId),
      ),
    );
    const relatedCanon = relatedEntries
      .map(([entityId, relation]) => {
        const entity = this.vaultGateway.entities[entityId];
        if (!entity) return "";
        return [
          relation,
          `Title: ${entity.title}`,
          `Type: ${entity.type}`,
          entity.labels?.length ? `Labels: ${entity.labels.join(", ")}` : "",
          entity.content ? `Content:\n${entity.content}` : "",
          entity.lore ? `Lore:\n${entity.lore}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean)
      .join("\n\n---\n\n")
      .slice(0, 8_000);

    return relatedCanon
      ? `${locationCanon}\n\nCONNECTED CANON\n${relatedCanon}`
      : locationCanon;
  }

  private async runModel(
    systemInstruction: string,
    userPrompt: string,
    maxOutputTokens: number,
  ): Promise<string> {
    const model = await this.aiClient.getModel(
      this.settings.effectiveApiKey ?? "",
      this.settings.modelName || "gemini-3.5-flash-lite",
      systemInstruction,
    );
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens,
        responseMimeType: "application/json",
      },
    });
    return response.response.text();
  }
}

export const delveAreaEnhancementService = new DelveAreaEnhancementService();
