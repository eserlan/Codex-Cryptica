import type {
  DelveRoomNodeData,
  DelveRoomStocking,
} from "./delve-builder-types";

export interface SingleRoomRegenParams {
  room: DelveRoomNodeData;
  conceptLore?: string;
  aiDisabled?: boolean;
  modelRunner?: (
    systemInstruction: string,
    userPrompt: string,
  ) => Promise<string>;
}

export class DelveStockingService {
  public async regenerateSingleRoom(
    params: SingleRoomRegenParams,
  ): Promise<DelveRoomNodeData> {
    const { room, conceptLore, aiDisabled, modelRunner } = params;

    if (!aiDisabled && modelRunner && conceptLore) {
      try {
        const systemInstruction = `You are an expert tabletop RPG dungeon master stocking a single room node within a delve. Respond in valid JSON matching { "description": string, "stocking": { "encounters": string[], "hazards": string[], "treasure": string[], "secrets": string[], "atmosphere": string } }.`;
        const userPrompt = `Dungeon Context: ${conceptLore}\nRoom Role: ${room.role}\nRoom Name: ${room.name}\nCurrent Description: ${room.description}\nRegenerate room description and stocking.`;

        const responseText = await modelRunner(systemInstruction, userPrompt);
        const parsed = JSON.parse(responseText);

        if (parsed && typeof parsed.description === "string") {
          return {
            ...room,
            description: parsed.description,
            stocking: {
              ...room.stocking,
              ...parsed.stocking,
            },
          };
        }
      } catch (err) {
        console.warn(
          "AI room regeneration unavailable, falling back to deterministic theme tables:",
          err,
        );
      }
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
    };
  }
}
