export interface GeneratorContinuationConfig {
  /** Headline shown at the top of the continuation callout. */
  headline: string;
  /** Concise benefit summary aligned with shipped vault capabilities. */
  summary: string;
  /** Honest, shipped capabilities unlocked after importing into Codex. */
  capabilities: readonly string[];
  /** Explicit local-first privacy and storage notice. */
  localFirstNotice: string;
  /** Opt in to displaying the continuation immediately below result actions. */
  placement?: "near-result";
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

const RPG_NPC_CONTINUATION: GeneratorContinuationConfig = {
  headline: "Keep this contact ready for their return",
  summary:
    "Save this Table Card or Full Dossier as one new Character in your local Codex vault, and record what changed after the encounter.",
  capabilities: [
    "Keep labelled knowledge and secrets or dossier reference notes in GM notes",
    "Link them to people and factions already in your vault and update their price or loyalties after play",
  ],
  localFirstNotice: LOCAL_FIRST_NOTICE,
  ctaLabel: CTA_LABEL,
  placement: "near-result",
};

const ADVENTURE_CONTINUATION: GeneratorContinuationConfig = {
  headline: "Turn this scenario into an active thread",
  summary:
    "Save one adventure prep Note in your local Codex vault, with the scenario in GM notes and a short summary in the main text.",
  capabilities: [
    "Link the Note to existing characters, locations and factions as you prepare the next session",
    "Record which clues the party found, how the clock advanced and what changed after play",
  ],
  localFirstNotice: LOCAL_FIRST_NOTICE,
  ctaLabel: CTA_LABEL,
  placement: "near-result",
};

const WAVE_1_CONTINUATION_CONFIGS: Record<string, GeneratorContinuationConfig> =
  {
    "minor-magic-item": {
      headline: "Keep track of this small find",
      summary:
        "Save this find as one Item in your local Codex vault so you can record when its owner uses the last charge or reveals its effect.",
      capabilities: [
        "Keep its description in the Item and its usage limit, activation, effect, quirk and provenance in GM notes",
        "Link the Item to its owner or discovery site, and update it when spent",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "artifact-generator": {
      headline: "Keep the relic's history and demands together",
      summary:
        "Save this relic as one Item in your local Codex vault so you can record who holds it, which powers have awakened and what each use costs.",
      capabilities: [
        "Keep the description separate from the GM reference powers, requirements, cost, pursuers and sealing conditions",
        "Link the Item to existing owners, factions and locations and record the consequences as the campaign unfolds",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
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
    quest: {
      headline: "Keep this quest alive between sessions",
      summary:
        "Save this quest as an Event in your local Codex vault so you can revisit the lead and record how the party responds.",
      capabilities: [
        "Keep the complication, twist and reward in GM-only lore",
        "Link the Event to campaign NPCs and places, and update it as the party decides",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    faction: {
      headline: "Keep this organisation's next move in reach",
      summary:
        "Save this organisation as one new Faction in your local Codex vault, so you can record its bargains, rivalries and off-screen actions.",
      capabilities: [
        "Keep the secret, internal conflict and GM reference notes together in GM notes",
        "Link existing representatives, rivals or places and update the faction after it acts",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "faction-roster": {
      headline: "Keep the faction's people in play",
      summary:
        "Save this roster as one Note in your local Codex vault so you can revisit the members' obligations as their loyalties change.",
      capabilities: [
        "Keep each member's duties, motives, wants and named connections together",
        "Link the Note to the faction and people already in your vault, and update it after play",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    item: {
      headline: "Keep the find's history with the item",
      summary:
        "Save this find as one Item in your local Codex vault and record where it came from, who claims it and what the party does with it.",
      capabilities: [
        "Keep sections headed GM Reference Information or Magical Properties in GM reference; AI headings can vary, so check the rendered document before sharing it",
        "Link the Item to existing owners, places or campaign notes and update its story after play",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    npc: RPG_NPC_CONTINUATION,
    "rpg-npc-generator": RPG_NPC_CONTINUATION,
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
    personality: {
      headline: "Keep this character recognisable between sessions",
      summary:
        "Save the profile as one new Character in your local Codex vault so you can refer back to their habits and update what they want after play.",
      capabilities: [
        "Keep quick roleplaying cues and speech style alongside deeper GM reference notes",
        "Link the Character to people and places in your vault and record how a meeting changed their loyalties",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "magic-item": {
      headline: "Keep this treasure's history and powers together",
      summary:
        "Save one Item in your local Codex vault. The description and offline history are in main text; AI history may stay in GM notes when its labels do not activate the item layout, so check or move it before sharing. Only sections headed GM Reference Information or Magical Properties stay in GM reference; AI headings can vary, so check the rendered Item before sharing it.",
      capabilities: [
        "Record what the bearer has learned about the effect and its limits as it is identified",
        "Link the Item to existing owners, makers and discovery sites, and update its ownership between sessions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
    "god-generator": {
      headline: "Keep the faith connected to its worshippers",
      summary:
        "Save a single deity as one Character or a pantheon as one Faction in your local Codex vault. Record how its worship, promises and rivalries change after play.",
      capabilities: [
        "Keep a single deity's rites, secret, myths and hooks in GM notes, or a pantheon's hidden problem and rumours",
        "Link the entry to its temples, cults, communities and rival powers as you create them",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
    "language-generator": {
      headline: "Keep an evolving glossary for your world",
      summary:
        "Save the language profile as one Note in your local Codex vault, with pronunciation, naming rules, vocabulary and phrases in main text.",
      capabilities: [
        "Keep example names and At the Table reference in GM notes",
        "Link the Note to the cultures and places that use it, and record new words and agreed meanings after play",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
      headline: "Keep the delve ready for the party's next visit",
      summary:
        "Save one new Location in your local Codex vault and track explored sectors, changing faction territory and the party's discoveries.",
      capabilities: [
        "Keep the site and faction details together, with layout, central secret, traps, treasures and hooks in the GM reference; the main text is still GM prep",
        "Link the Location yourself to nearby settlements, patrons and factions; use Build Delve Canvas instead if you want an editable map and dossier",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "adventure-generator": ADVENTURE_CONTINUATION,
    "adventure-idea-generator": ADVENTURE_CONTINUATION,
    rumour: {
      headline: "Keep these rumours in circulation",
      summary:
        "Save all six rumours as one Note in your local Codex vault, with the gossip in the main text and the hidden truth in GM notes.",
      capabilities: [
        "Keep the leads and sources together for the next visit to the settlement",
        "Mark each rumour as checked or disproved and link the Note to the places and people already in your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "point-crawl": {
      headline: "Keep the chosen route network in your vault",
      summary:
        "Check the graph's Saving points count first. Add to my Codex opens an overview Note and creates one Location for each included point in your local vault.",
      capabilities: [
        "Preserve connections between selected points, with encounters, clues and route details in each Location's GM notes",
        "Use the full overview and, when available, its attached diagram for GM prep, then update the Locations as the party explores",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
    "urban-fantasy-faction": {
      headline: "Keep the hidden network behind the screen",
      summary:
        "Save one Faction in your local Codex vault. Its model-produced summary, operation, contacts, agenda and secrets stay in GM notes.",
      capabilities: [
        "Track what the party has discovered about the faction and how its rival responds",
        "Link the Faction to existing city locations, contacts and institutions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "social-hub": {
      headline: "Give the party a place to come back to",
      summary:
        "Save one Location in your local Codex vault, with the venue and its people in main text and hidden trouble and rumours in GM notes.",
      capabilities: [
        "Keep the regulars, entity seeds and table hooks together without creating new Characters automatically",
        "Link the Location to existing contacts and districts and record what changes on the next visit",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
      headline: "Keep the reversal ready, not revealed",
      summary:
        "Save one new Note in your local Codex vault with the complete twist and clues in GM notes. Record which evidence the players find and how their choices change the consequences.",
      capabilities: [
        "Keep the reveal, clue schedule and all draft preparation in GM notes; rename a spoiler-revealing title before sharing",
        "Link the Note to existing NPCs, quests and locations yourself and update it after the party acts",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "council-vote": {
      headline: "Bring this vote to your table",
      summary:
        "Save this council vote as an Event entry in your local Codex vault so the proposal, deadline, and each voter's agenda stay connected to your campaign.",
      capabilities: [
        "Store the proposal, deadline, and voting rule in one Event entry",
        "Keep each councillor's stance, persuasion route, and antagonist influence as GM-only lore",
        "Link the councillors to their NPC and faction entries inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    holiday: {
      headline: "Keep this tradition on your campaign's schedule",
      summary:
        "Save one new Note in your local Codex vault, containing the observance or full calendar. Use its timing to plan what changes when the party arrives.",
      capabilities: [
        "Keep origins, traditions and every observance together; add dated timeline Events yourself if needed",
        "Hidden history stays in GM notes; edit At the table tensions before sharing, and link the Note to your existing places, people or factions",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "bbeg-generator": {
      headline: "Keep the villain's next move ready for play",
      summary:
        "Save one new Character in your local Codex vault so you can track what the party has discovered and revise the antagonist's plan after each setback.",
      capabilities: [
        "For generated villains, keep the public face and first signs separate from the hidden plan and vulnerabilities in GM notes",
        "Link the villain to their lieutenants and affected locations as you add them, and record the consequences of each move",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
    "mystery-investigation": {
      headline: "Keep the truth fixed as the case unfolds",
      summary:
        "Save this case as one Note in your local Codex vault and record which clues the party has found and which accounts they have tested.",
      capabilities: [
        "Keep the case material separate from the fixed truth, timeline and next NPC moves in GM notes",
        "Link the Note to people and places already in your vault and record the outcome after play",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "dark-fantasy-faction": {
      headline: "Keep the faction's bargain and its cost in play",
      summary:
        "Save one new Faction in your local Codex vault so you can revisit what it protects, what it demands, and how the party changes that bargain.",
      capabilities: [
        "Keep danger, table guidance, secret, conflict, notable people and rival in GM-only lore",
        "Link the Faction entry to existing people and places, and record how it responds after play",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    "vampire-clan": {
      headline: "Keep the clan's mortal face and hidden agenda together",
      summary:
        "Save one new Faction in your local Codex vault and record which feeding habits, weaknesses and alliances the party has discovered.",
      capabilities: [
        "Keep GM reference, agenda, conflict, notable NPCs, rival and hook in GM notes",
        "Link the Faction to its mortal contacts, rivals and haunts as you develop them",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    settlement: {
      headline: "Keep the settlement ready for a return visit",
      summary:
        "Save one new Location in your local Codex vault and record what changes as the party uses its services, explores its places and meets its factions.",
      capabilities: [
        "Keep the settlement overview in the Location and people, factions, tension and hooks in GM notes",
        "Link existing contacts and locations, and expand the places the party actually visits",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    tavern: {
      headline: "Keep the party's favourite meeting place in play",
      summary:
        "Save one new Location in your local Codex vault and update its regulars, rumours and unresolved trouble after each visit.",
      capabilities: [
        "Keep trouble, hidden problem, hook, regulars and rumours in GM notes",
        "Link the tavern to existing people and settlements and record what the party learns",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    kingdom: {
      headline: "Keep the realm's power and pressures together",
      summary:
        "Save one new Faction in your local Codex vault and track which allies, resources and claims change as the campaign unfolds.",
      capabilities: [
        "Keep government detail, hidden problem, rivals, rumours and seeds in GM notes",
        "Link existing rulers, capitals and factions as you develop them, and update the realm after play",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    nation: {
      headline: "Keep the state's decisions and rival powers connected",
      summary:
        "Save this nation as one Faction entry in your local Codex vault, so you can record changes in its leadership, borders and political pressures.",
      capabilities: [
        "Store the state overview, power structure, and society in one Faction entry",
        "Keep power blocs, rumours, the hidden problem and entity seeds as GM-only lore",
        "Develop the leader, rival blocs, and centre of power into linked entries inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    business: {
      headline: "Keep the enterprise and its people together",
      summary:
        "Bring your generated business into the local Codex vault to revisit the contracts, staff and dependencies when trade is interrupted.",
      capabilities: [
        "Create a Faction with its owner or manager and staff as linked Characters; keep the labelled Secret in GM notes",
        "Develop outside suppliers and rivals from the named references in the business record",
        "A text-only shared remix keeps its combined draft in GM notes of one Note",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    encounter: {
      headline: "Run this encounter from your vault",
      summary:
        "Save this encounter as an Event entry in your local Codex vault so the scene, its participants, and its outcomes stay connected to your campaign.",
      capabilities: [
        "Store what the players see in one Event entry",
        "Keep participants, the complication, and the outcomes as GM-only lore",
        "Link the encounter to the places and factions it involves inside your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
    },
    heist: {
      headline: "Keep the score ready for changing plans",
      summary:
        "Save this score as one Event in your local Codex vault, so you can revisit the objective, alarm state and consequences after play.",
      capabilities: [
        "Keep the hidden factor, security plan, alarm track and escape options in GM notes",
        "Link the Event to the target, patron and prizes already in your vault",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    tome: {
      headline: "Keep the book and its evidence together",
      summary:
        "Save the tome in your local Codex vault so you can record who holds it, which passages the party has read and what they learn next.",
      capabilities: [
        "Keep physical description, provenance, contents, risks and hooks in one Item entry, with ground truth and handling reference in GM-only lore",
        "Link the Item to existing custodians, authors and locations yourself; extract only discovered passages before sharing with players",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
    },
    puzzle: {
      headline: "Keep the puzzle's setup and solution ready for play",
      summary:
        "Save the generated encounter as one Note in your local Codex vault, so you can prepare its place in the adventure and record how the party solves it.",
      capabilities: [
        "Keep the labelled GM-Only Solution and Escalating Hints in GM notes",
        "Link the Note to the place it blocks and the encounter or objective it changes",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
    creature: {
      headline: "Keep this inhabitant in your campaign's ecology",
      summary:
        "Save this generated creature as one Creature entry in your local Codex vault, so you can revisit its signs, behaviour and encounters.",
      capabilities: [
        "The AI is asked to keep hidden ecology, surprises and secret weaknesses in GM notes; review AI text before sharing",
        "Link the Creature to habitats, hunters or campaign events and update its behaviour as play changes the region",
      ],
      localFirstNotice: LOCAL_FIRST_NOTICE,
      ctaLabel: CTA_LABEL,
      placement: "near-result",
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
