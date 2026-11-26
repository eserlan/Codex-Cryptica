export interface GeneratorContinuationConfig {
  /** Headline shown at the top of the continuation callout. */
  headline: string;
  /** Concise benefit summary aligned with shipped vault capabilities. */
  summary: string;
  /** Honest, shipped capabilities unlocked after importing into Codex. */
  capabilities: readonly string[];
  /** Explicit local-first privacy and storage notice. */
  localFirstNotice: string;
  /** Primary action button label. */
  ctaLabel: string;
}

export interface GeneratorContinuationVisibilityInput {
  generatorType: string | null | undefined;
  userGenerationSucceeded: boolean;
  isExampleDraft: boolean;
  isBusy: boolean;
  variant: "default" | "names";
}

const LOCAL_FIRST_NOTICE = "No account needed; stored locally in this browser.";
const CTA_LABEL = "Add to my Codex";

const NPC_CONTINUATION: GeneratorContinuationConfig = {
  headline: "Give this character a place in your world",
  summary:
    "Stage this NPC for your local Codex vault so their public details and GM-only secrets stay separate and ready for play.",
  capabilities: [
    "Keep public character notes separate from GM-only secrets and hooks",
    "Link them to factions, settlements, and campaign notes inside your vault",
    "Build on their story across sessions as your campaign evolves",
  ],
  localFirstNotice: LOCAL_FIRST_NOTICE,
  ctaLabel: CTA_LABEL,
};

const WAVE_1_CONTINUATION_CONFIGS: Record<string, GeneratorContinuationConfig> =
  {
    "star-system": {
      headline: "Keep this system connected",
      summary:
        "Turn this star system into a working campaign hub in your local Codex vault.",
      capabilities: [
        "Preserve all orbital bodies and the system diagram in one Location entry",
        "Develop individual worlds in depth while keeping them tied to this system",
        "Link competing factions, locations, hazards, and campaign notes",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    npc: NPC_CONTINUATION,
    "rpg-npc-generator": NPC_CONTINUATION,
    "dnd-npc": NPC_CONTINUATION,
    "origin-generator": {
      headline: "Keep developing this origin",
      summary:
        "Save this origin as a Character entry in your local Codex vault so its truth and fallout stay connected to your campaign.",
      capabilities: [
        "Store the origin event, public story, and GM-only truth in one Character entry",
        "Track ongoing consequences and unresolved hooks across sessions",
        "Connect this hero to campaign characters, factions, and threats",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "nomad-clan": {
      headline: "Keep this clan on the road",
      summary:
        "Stage this nomad clan for your local Codex vault so their convoy profile, notable members, and rivalries stay ready for play.",
      capabilities: [
        "Store the clan's profile, notable members, and rival faction in one Faction entry",
        "Link this clan to settlements, characters, and campaign notes inside your vault",
        "Update their routes, crisis, and alliances as your campaign evolves",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "pantheon-generator": {
      headline: "Bring this pantheon into your world",
      summary:
        "Stage this pantheon for your local Codex vault so its divine rivalries, clergy, and GM-only hidden problem stay ready for play.",
      capabilities: [
        "Store the pantheon's origin, deity roster, and GM-only rumours in one Faction entry",
        "Link member deities, temples, and cults to settlements and campaign notes inside your vault",
        "Track schisms, prophetic omens, and shifting alliances across sessions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
  };

/**
 * Returns the Wave 1 value-led continuation config for a canonical generator
 * type, or `null` for unconfigured / Wave 2 generators.
 */
export function getGeneratorContinuationConfig(
  generatorType: string | null | undefined,
): GeneratorContinuationConfig | null {
  if (!generatorType) return null;
  return WAVE_1_CONTINUATION_CONFIGS[generatorType] ?? null;
}

/**
 * Gates the continuation callout strictly on an explicit, completed user
 * generation for a configured non-names generator.
 */
export function shouldShowGeneratorContinuation(
  input: GeneratorContinuationVisibilityInput,
): boolean {
  if (input.variant === "names") return false;
  if (!input.userGenerationSucceeded) return false;
  if (input.isExampleDraft) return false;
  if (input.isBusy) return false;
  return getGeneratorContinuationConfig(input.generatorType) !== null;
}
