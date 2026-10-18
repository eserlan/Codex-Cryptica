import { z } from "zod";

export const SYSTEM_NEUTRAL_ID = "generic" as const;
export const TOV_SYSTEM_ID = "tales-of-the-valiant" as const;

export const RulesProvenanceSchema = z.object({
  source: z.string().min(1),
  version: z.string().min(1),
  license: z.string().min(1),
  retrievalDate: z.string().optional(),
  attribution: z.string().optional(),
});

export type RulesProvenance = z.infer<typeof RulesProvenanceSchema>;

export const GameSystemCapabilitySchema = z.object({
  characterTemplateId: z.string().optional(),
  npcTemplateId: z.string().optional(),
  creatureTemplateId: z.string().optional(),
  supportedResources: z.array(z.string()).default([]),
  hasLuck: z.boolean().default(false),
  hasDoom: z.boolean().default(false),
  generatorHints: z.record(z.string(), z.unknown()).optional(),
  referenceUrl: z.string().optional(),
});

export type GameSystemCapability = z.infer<typeof GameSystemCapabilitySchema>;

export const GameSystemProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(""),
  isDefault: z.boolean().default(false),
  version: z.string().optional(),
  provenance: RulesProvenanceSchema.optional(),
  capabilities: GameSystemCapabilitySchema.default({
    supportedResources: [],
    hasLuck: false,
    hasDoom: false,
  }),
});

export type GameSystemProfile = z.infer<typeof GameSystemProfileSchema>;

export const SYSTEM_NEUTRAL_PROFILE: GameSystemProfile = {
  id: SYSTEM_NEUTRAL_ID,
  label: "System Neutral",
  description:
    "System-neutral campaign mode without game-specific rule constraints.",
  isDefault: true,
  capabilities: {
    supportedResources: ["hp"],
    hasLuck: false,
    hasDoom: false,
  },
};

export const TOV_SYSTEM_PROFILE: GameSystemProfile = {
  id: TOV_SYSTEM_ID,
  label: "Tales of the Valiant",
  description:
    "Black Flag Roleplaying / Tales of the Valiant system profile with Lineage, Heritage, Talents, and Luck.",
  isDefault: false,
  version: "1.0.0",
  provenance: {
    source: "https://github.com/koboldpress/black-flag",
    version: "1.0.0",
    license: "CC-BY-4.0",
    retrievalDate: "2024-07-16",
    attribution:
      "This work includes material from the Black Flag Reference Document, made available under the Creative Commons Attribution 4.0 International License (CC BY 4.0) by Open Design LLC d/b/a Kobold Press.",
  },
  capabilities: {
    characterTemplateId: "builtin-tov-character",
    npcTemplateId: "builtin-tov-npc",
    creatureTemplateId: "builtin-tov-monster",
    supportedResources: ["hp", "luck", "doom"],
    hasLuck: true,
    hasDoom: true,
    referenceUrl: "https://github.com/koboldpress/black-flag",
  },
};

export class GameSystemRegistry {
  private profiles = new Map<string, GameSystemProfile>();

  constructor(
    initialProfiles: GameSystemProfile[] = [
      SYSTEM_NEUTRAL_PROFILE,
      TOV_SYSTEM_PROFILE,
    ],
  ) {
    for (const profile of initialProfiles) {
      this.register(profile);
    }
  }

  register(profile: GameSystemProfile): void {
    const validated = GameSystemProfileSchema.parse(profile);
    this.profiles.set(validated.id, validated);
  }

  get(id?: string | null): GameSystemProfile {
    if (
      !id ||
      id.trim() === "" ||
      id === SYSTEM_NEUTRAL_ID ||
      id === "neutral"
    ) {
      return this.profiles.get(SYSTEM_NEUTRAL_ID) ?? SYSTEM_NEUTRAL_PROFILE;
    }

    const found = this.profiles.get(id);
    if (found) {
      return found;
    }

    // Graceful fallback for unknown custom system IDs
    return {
      id,
      label: id,
      description: `Custom game system: ${id}`,
      isDefault: false,
      capabilities: {
        supportedResources: ["hp"],
        hasLuck: false,
        hasDoom: false,
      },
    };
  }

  has(id: string): boolean {
    return this.profiles.has(id);
  }

  list(): GameSystemProfile[] {
    return Array.from(this.profiles.values());
  }

  resolve(context?: {
    entitySystemId?: string | null;
    vaultSystemId?: string | null;
  }): GameSystemProfile {
    if (context?.entitySystemId && context.entitySystemId.trim() !== "") {
      return this.get(context.entitySystemId);
    }

    if (context?.vaultSystemId && context.vaultSystemId.trim() !== "") {
      return this.get(context.vaultSystemId);
    }

    return this.get(SYSTEM_NEUTRAL_ID);
  }
}

export const gameSystemRegistry = new GameSystemRegistry();

export function resolveGameSystemProfile(context?: {
  entitySystemId?: string | null;
  vaultSystemId?: string | null;
}): GameSystemProfile {
  return gameSystemRegistry.resolve(context);
}
