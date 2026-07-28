import type {
  DelveClimaxResolution,
  DelveRoomNodeData,
  DelveRoomStocking,
  DungeonRoomRole,
} from "./delve-builder-types";

export interface SingleRoomRegenParams {
  room: DelveRoomNodeData;
  conceptLore?: string;
  nearbyAreas?: string;
  aiDisabled?: boolean;
  fallbackOnFailure?: boolean;
  modelRunner?: (
    systemInstruction: string,
    userPrompt: string,
  ) => Promise<string>;
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

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const genericClimateModifiers = new Set([
  "arid",
  "continental",
  "humid",
  "polar",
  "temperate",
  "tropical",
]);

const roleNameNouns: Record<DungeonRoomRole, string> = {
  entrance: "Threshold",
  hazard: "Peril",
  encounter: "Stand",
  treasure: "Cache",
  secret: "Secret",
  lore: "Archive",
  faction: "Hold",
  climax: "Reckoning",
  special: "Wonder",
};

function normalizedNameWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

export function cleanGeneratedDelveAreaName(
  value: string,
  sourceCanon = "",
): string {
  const cleaned = value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ");
  const firstWord = words[0]?.toLowerCase();
  const canonWords = new Set(normalizedNameWords(sourceCanon));
  if (
    words.length > 1 &&
    genericClimateModifiers.has(firstWord) &&
    !canonWords.has(firstWord)
  ) {
    return words.slice(1).join(" ");
  }
  return cleaned;
}

export function resolveGeneratedDelveAreaName(
  proposedName: string,
  options: {
    sourceCanon?: string;
    sectorName: string;
    role: DungeonRoomRole;
    existingNames?: Iterable<string>;
  },
): string {
  const cleaned =
    cleanGeneratedDelveAreaName(proposedName, options.sourceCanon) ||
    roleNameNouns[options.role];
  const existing = [...(options.existingNames ?? [])].map((name) =>
    normalizedNameWords(name),
  );
  const words = normalizedNameWords(cleaned);
  const headNoun = words[words.length - 1];
  const sectorWords = normalizedNameWords(options.sectorName);
  const isMechanical =
    words.includes("area") ||
    words.some((word) => /^\d+$/.test(word)) ||
    (sectorWords.length > 0 &&
      sectorWords.every((word) => words.includes(word)));
  const conflicts = existing.some((otherWords) => {
    if (otherWords.join(" ") === words.join(" ")) return true;
    const shared = words.filter((word) => otherWords.includes(word)).length;
    const similarity = shared / Math.max(words.length, otherWords.length, 1);
    return (
      similarity >= 0.8 ||
      (headNoun !== undefined && headNoun === otherWords[otherWords.length - 1])
    );
  });
  if (!isMechanical && !conflicts) return cleaned;

  const roleNoun = roleNameNouns[options.role];
  const duplicatesHeadNoun =
    headNoun !== undefined &&
    existing.some((other) => other[other.length - 1] === headNoun);
  const baseWords = duplicatesHeadNoun ? words.slice(0, -1) : words;
  const repairedBase =
    baseWords.length > 0 && !isMechanical
      ? baseWords
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : roleNoun;
  let repaired =
    repairedBase === roleNoun ? roleNoun : `${repairedBase} ${roleNoun}`;
  let suffix = 2;
  const normalizedExisting = new Set(
    existing.map((otherWords) => otherWords.join(" ")),
  );
  while (normalizedExisting.has(normalizedNameWords(repaired).join(" "))) {
    repaired = `${repairedBase} ${roleNoun} ${suffix}`;
    suffix += 1;
  }
  return repaired;
}

export function parseDelveClimaxResolution(
  value: unknown,
): DelveClimaxResolution | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const stakes =
    typeof candidate.stakes === "string" ? candidate.stakes.trim() : "";
  const decision =
    typeof candidate.decision === "string" ? candidate.decision.trim() : "";
  const outcomes = stringArray(candidate.outcomes);
  return stakes && decision && outcomes && outcomes.length >= 2
    ? { stakes, decision, outcomes }
    : undefined;
}

export type DelveStockingArrayField =
  "encounters" | "hazards" | "treasure" | "secrets";

const stockingArrayFields: readonly DelveStockingArrayField[] = [
  "encounters",
  "hazards",
  "treasure",
  "secrets",
];

function generatedStockingValues(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const candidate = value as Record<string, unknown>;
  return stockingArrayFields.flatMap(
    (field) => stringArray(candidate[field]) ?? [],
  );
}

export function getRelevantStockingFields(
  stocking: DelveRoomStocking,
): DelveStockingArrayField[] {
  return stockingArrayFields.filter((field) => Array.isArray(stocking[field]));
}

export function mergeRelevantStocking(
  current: DelveRoomStocking,
  generated: unknown,
  clearOmittedRelevantFields = false,
): DelveRoomStocking {
  if (!generated || typeof generated !== "object") return current;

  const candidate = generated as Record<string, unknown>;
  const merged: DelveRoomStocking = { ...current };
  if (typeof candidate.atmosphere === "string") {
    merged.atmosphere = candidate.atmosphere.trim();
  }
  if (
    typeof candidate.factionPresence === "string" &&
    candidate.factionPresence.trim()
  ) {
    merged.factionPresence = candidate.factionPresence.trim();
  }

  for (const field of getRelevantStockingFields(current)) {
    const values = stringArray(candidate[field]);
    if (values?.length) {
      merged[field] = values;
    } else if (clearOmittedRelevantFields) {
      merged[field] = [];
    }
  }
  return merged;
}

export class DelveStockingService {
  public async regenerateSingleRoom(
    params: SingleRoomRegenParams,
  ): Promise<DelveRoomNodeData> {
    const {
      room,
      conceptLore,
      nearbyAreas,
      aiDisabled,
      fallbackOnFailure = true,
      modelRunner,
    } = params;

    if (!aiDisabled && modelRunner && conceptLore) {
      try {
        const relevantFields = getRelevantStockingFields(room.stocking);
        const systemInstruction = `You are an expert tabletop RPG location designer enhancing one Area in an existing delve. Ground every detail in the supplied Location canon, including its explicitly connected canon. Treat that canon as the closed roster of factions, peoples, and creatures: never invent or substitute a named faction, ancestry, creature type, or enemy group that is not present there. When no specific inhabitant is established, describe a generic role or evidence of occupation without assigning a new creature identity. Reuse established history, hazards, materials, mysteries, and motifs when relevant, but do not invent facts that contradict the source. Give the Area a distinctive, evocative 2-6 word name tied to its function, history, material, inhabitants, hazard, or secret. Never use "Area", a number, the sector name plus a suffix, unsupported climate words, or the same head noun as a NEARBY AREA. The Area's gameplay categories were assigned during delve creation: only populate the explicitly allowed gameplay fields and do not add other categories. Secrets must be information, revelations, evidence, or clues—not a straightforward cache or valuable item. Treasure must be a tangible reward. For a faction Area, populate factionPresence with the faction's purpose in the Area, defenses or leverage, and likely reaction; do not reduce it to a generic sentry encounter. Exception: when the role is climax, the listed fields are candidates and you must select only the 1-3 categories relevant to the culmination you design. Decide from the Location's central secret, current conflict, factions, hazards, purpose, and current state whether the climax is a confrontation, negotiation, ritual, revelation, environmental crisis, siege, escape, or another decisive turn; do not default to a boss fight. A climax must reveal, transform, or resolve the central secret, substantially change the situation, present an immediate decision, and provide at least two concrete outcomes. Never repeat an earlier encounter unchanged; a recurring threat must be meaningfully escalated or transformed. Description and atmosphere are always allowed. Write concrete, table-ready details, avoid repeated phrases and doubled word roots, and proofread the prose. Respond only with valid JSON matching { "name": string, "description": string, "climax"?: { "stakes": string, "decision": string, "outcomes": string[] }, "stocking": { "encounters"?: string[], "hazards"?: string[], "treasure"?: string[], "secrets"?: string[], "factionPresence"?: string, "atmosphere": string } }. The climax object is required when the Area role is climax and must be omitted for every other role.`;
        const userPrompt = `LOCATION CANON
${conceptLore}

AREA TO ENHANCE
Sector: ${room.sectorName}
Name: ${room.name}
Role: ${room.role}
Summary: ${room.summary}
Current description: ${room.description}
Current stocking: ${JSON.stringify(room.stocking)}
Allowed gameplay fields: ${relevantFields.join(", ") || "none"}

NEARBY AREAS
${nearbyAreas || "No neighboring Area details supplied."}

Invent a distinctive location-relevant name, then create an evocative 2-4 sentence description and concise, immediately usable stocking. For a climax, choose and populate only the relevant candidate fields; for every other role, populate every allowed gameplay field. Omit encounters, hazards, treasure, and secrets that are not relevant or allowed. Mention a named faction only when its presence, evidence, or influence makes sense for this Area. Preserve the Area's role and avoid repeating details assigned to nearby Areas.`;

        const responseText = await modelRunner(systemInstruction, userPrompt);
        const parsed = JSON.parse(extractJsonObject(responseText));

        if (
          parsed &&
          typeof parsed.description === "string" &&
          parsed.description.trim()
        ) {
          const stocking =
            parsed.stocking && typeof parsed.stocking === "object"
              ? parsed.stocking
              : {};
          const climax =
            room.role === "climax"
              ? parseDelveClimaxResolution(parsed.climax)
              : undefined;
          if (room.role === "climax" && !climax) {
            throw new Error("AI returned incomplete climax resolution.");
          }
          if (
            room.role === "climax" &&
            nearbyAreas &&
            generatedStockingValues(stocking).some((value) =>
              nearbyAreas.toLowerCase().includes(value.toLowerCase()),
            )
          ) {
            throw new Error(
              "AI repeated an existing Area detail in the climax.",
            );
          }
          return {
            ...room,
            name:
              typeof parsed.name === "string" && parsed.name.trim()
                ? resolveGeneratedDelveAreaName(parsed.name, {
                    sourceCanon: conceptLore,
                    sectorName: room.sectorName,
                    role: room.role,
                    existingNames: nearbyAreas
                      ?.split("\n")
                      .map((area) => area.split(/\[|:/)[0]?.trim())
                      .filter(Boolean),
                  })
                : room.name,
            description: parsed.description.trim(),
            stocking: mergeRelevantStocking(
              room.stocking,
              stocking,
              room.role === "climax",
            ),
            climax,
          };
        }
        throw new Error("AI returned an invalid Area description.");
      } catch (err) {
        if (!fallbackOnFailure) throw err;
        console.warn(
          "AI room regeneration unavailable, falling back to deterministic theme tables:",
          err,
        );
      }
    }

    if (!aiDisabled && !fallbackOnFailure) {
      throw new Error("AI enhancement requires Location context and a model.");
    }

    // Deterministic rule-based fallback
    return this.generateDeterministicStocking(room);
  }

  private generateDeterministicStocking(
    room: DelveRoomNodeData,
  ): DelveRoomNodeData {
    const role = room.role;

    const deterministicStockingMap: Record<string, DelveRoomStocking> = {
      entrance: {
        atmosphere: "Echoing damp archway",
        hazards: ["Slippery wet steps"],
        encounters: ["Guard Patrol"],
      },
      hazard: {
        atmosphere: "Thick sulfurous miasma",
        hazards: ["Pressurized Steam Vent", "Unstable Flagstones"],
      },
      encounter: {
        atmosphere: "Scattered bones and broken weapons",
        encounters: ["Sentry Squad", "Ambush Stalker"],
      },
      treasure: {
        atmosphere: "Gilded dust and ironbound chests",
        treasure: ["Ironbound Coffer with 120gp", "Jeweled Dagger"],
        hazards: ["Poison Needle Lock"],
      },
      secret: {
        atmosphere: "Silent hidden alcove behind loose masonry",
        secrets: ["Hidden Inscription detailing ancient lore"],
        treasure: ["Scroll of Darkvision"],
      },
      lore: {
        atmosphere: "Faded murals and carved runic tablets",
        secrets: ["Decipherable relief map of the lower sectors"],
      },
      faction: {
        atmosphere: "Makeshift barricades and banner poles",
        encounters: ["Faction Lieutenant and 3 Guards"],
        factionPresence: "Heavy fortification",
      },
      climax: {
        atmosphere: "Every pressure within the delve converges here",
        encounters: ["The central conflict reaches a decisive turn"],
        hazards: ["The environment changes as the climax escalates"],
        secrets: ["The delve's central mystery is finally exposed"],
      },
      special: {
        atmosphere: "Strange glowing crystals suspended in midair",
        hazards: ["Wild Magic Anomaly"],
      },
    };

    const fallbackStocking = deterministicStockingMap[role] || {
      atmosphere: "Quiet shadows and damp stone",
      encounters: ["Roaming Creature"],
    };

    return {
      ...room,
      description: `${room.description} (Refreshed)`,
      stocking: {
        ...room.stocking,
        ...fallbackStocking,
      },
      climax:
        role === "climax"
          ? (room.climax ?? {
              stakes: "The delve's central conflict reaches a decisive turn.",
              decision:
                "Choose which force, truth, or danger will shape what remains.",
              outcomes: [
                "The immediate danger is contained, but its source survives.",
                "The old order is broken and the delve changes permanently.",
              ],
            })
          : undefined,
    };
  }
}
