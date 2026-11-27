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
    "news-sheet-generator": {
      headline: "Keep this issue in your campaign archive",
      summary:
        "Stage this news sheet for your local Codex vault so the player-safe handout and GM-only truth behind the stories stay separate.",
      capabilities: [
        "Store the front page, notices, and rumours separately from GM-only editorial slant and hooks",
        "Link the publication, editor, and witnesses to factions and settlements in your vault",
        "Track follow-up issues and evolving rumours across sessions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "ship-generator": {
      headline: "Dock this vessel in your campaign",
      summary:
        "Stage this ship for your local Codex vault so its hull profile, officer roster, and GM-only secrets stay separate and ready for play.",
      capabilities: [
        "Keep public vessel details and key zones separate from GM-only complications and secrets",
        "Connect the ship to captains, factions, ports, and star systems inside your vault",
        "Track hull condition, shifting alliances, and hooks across sessions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "dungeon-generator": {
      headline: "Turn this delve into a playable site",
      summary:
        "Stage this dungeon for your local Codex vault as a Location entry, ready to open in the interactive Delve Canvas and room-by-room GM Dossier.",
      capabilities: [
        "Keep sector lore and faction standoff separate from GM-only traps, treasures, and the central secret",
        "Open the delve in the interactive Delve Canvas to rearrange rooms, loops, and hidden shortcuts",
        "Link the site to nearby settlements, patrons, and campaign notes inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "adventure-idea-generator": {
      headline: "Turn this scenario into an active thread",
      summary:
        "Stage this adventure idea for your local Codex vault so its public situation, clues, and GM-only outcomes stay separate and ready to open in Adventure Canvas.",
      capabilities: [
        "Keep initial situation, key locations, and clues separate from GM-only complications and outcomes",
        "Open the scenario in Adventure Canvas to link scenes, actors, and secrets visually",
        "Connect the thread to existing campaign factions, NPCs, and locations in your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "one-shot-adventure-generator": {
      headline: "Save this run sheet for tonight's table",
      summary:
        "Stage this one-shot for your local Codex vault so the scene list, NPCs, and one-page GM Cheat Sheet stay ready for prep and live play.",
      capabilities: [
        "Store the timed scene breakdown, multi-route clues, and GM Cheat Sheet in one Note entry",
        "Keep essential vs. optional scene budgets and the running-late path handy during play",
        "Link pre-generated NPCs, locations, or follow-up hooks into your campaign vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "comic-book-event-generator": {
      headline: "Track this crisis across your campaign",
      summary:
        "Stage this comic book event for your local Codex vault so its escalation beats, hidden cause, and lasting consequences stay connected to your world.",
      capabilities: [
        "Keep public event beats separate from GM-only true cause, lasting consequences, and hooks",
        "Link the crisis to affected cities, hero teams, villains, and factions in your vault",
        "Reference permanent fallout and follow-up arcs across future sessions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "plot-twist-generator": {
      headline: "Keep this reversal tied to your plot",
      summary:
        "Stage this plot twist for your local Codex vault so its reveal, foreshadowing clues, and new player choices stay connected to your campaign.",
      capabilities: [
        "Store the reveal, overturned assumption, foreshadowing clues, and player choices in one Note entry",
        "Keep GM-only timing notes and honoured constraints beside the complication",
        "Link the reversal to the factions, NPCs, and quests it affects inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "villain-scheme-generator": {
      headline: "Keep this plot moving in your vault",
      summary:
        "Stage this villain scheme for your local Codex vault so public signs, scheme stages, and GM-only consequences stay ready across sessions.",
      capabilities: [
        "Keep public activity and rumours separate from GM-only scheme stages, minions, and fallout",
        "Attach the scheme to an existing villain, faction, or city inside your vault",
        "Track stage progression and hand the plot off to the Plot Twist Generator anytime",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    tome: {
      headline: "Shelve this book in your campaign",
      summary:
        "Save this tome to your local Codex vault so its physical details, provenance, reading hazard, and the people and places that want it stay in one reference.",
      capabilities: [
        "Store the physical description, provenance, and contents in one Item entry",
        "Keep the ground truth, the deception, and the actionable clue as GM-only lore",
        "Record the book's author, custodian, associated location, and interested factions inside the Item entry",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "alien-race": {
      headline: "Give this species a place in your world",
      summary:
        "Save this alien species as a Creature entry in your local Codex vault so its biology, culture, and internal split stay connected to your campaign.",
      capabilities: [
        "Store the overview, biology, culture, and technology in one Creature entry",
        "Keep weaknesses, typical archetypes, and adventure hooks as GM-only lore",
        "Link the species to its homeworld, allies, and rival species inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    "secret-society": {
      headline: "Bring this society into your world",
      summary:
        "Save this secret society as a Faction entry in your local Codex vault so its public face, belief, and hidden truth stay connected to your campaign.",
      capabilities: [
        "Store the belief, ritual, public face, and secret truth in one Faction entry",
        "Keep the leader, taboo, recruitment, and sacred object as GM-only lore",
        "Link the society to its members, rival cells, and the places it meets inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    constellation: {
      headline: "Keep this sky lore in your world",
      summary:
        "Save this constellation or full sky as a Note entry in your local Codex vault so its stories and uses stay connected to the cultures that read them.",
      capabilities: [
        "Store origin myths, practical uses, and a single constellation's star pattern in one Note entry",
        "Keep omens and adventure hooks as GM-only lore; the Night Sky season index stays in public Note content",
        "Link the sky lore to the cultures and places that read it inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    world: {
      headline: "Keep this world connected",
      summary:
        "Save this world as a Location entry in your local Codex vault so its profile and GM-only lore stay connected to your campaign.",
      capabilities: [
        "Store the world profile and environment in one Location entry",
        "Keep history, current conflicts, mysteries, and adventure hooks as GM-only lore",
        "Link the world to its factions, settlements, and star system inside your vault",
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
