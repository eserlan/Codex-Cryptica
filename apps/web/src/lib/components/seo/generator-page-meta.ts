import type { ValidSlug, SlugMetaEntry } from "./generator-types";
export type { ValidSlug, SlugMetaEntry };

const ADVENTURE_CANVAS_FAQ: NonNullable<SlugMetaEntry["faqs"]>[number] = {
  question: "Can I turn this into an interactive adventure canvas?",
  answer:
    "Yes — select Open Adventure Canvas on any generated scenario to create an interactive relationship map of its situation, locations, NPCs and factions, threats, clues, and possible outcomes. You can rearrange the nodes, edit their connections, and create linked vault entities as the adventure develops. The Adventure Canvas is exclusive to Codex Cryptica, but it is still free and needs no account — just open your world in the app.",
  image: "/images/adventure-canvas.png",
  imageAlt:
    "An interactive Adventure Canvas showing a non-linear scenario with situations, locations, factions, threats, clues, and outcomes connected by labeled relationships",
  inlineImage: "/images/adventure-canvas-button.png",
  inlineImageAlt:
    "The Open Adventure Canvas button, next to Save to Codex and Copy, on a generated adventure result",
  exclusiveLabel:
    "Codex Cryptica exclusive — build full Adventure Canvases inside the app",
  inlineImageCaption:
    "The Open Adventure Canvas button on any generated result",
};

export const slugMeta: Record<ValidSlug, SlugMetaEntry> = {
  npc: {
    pageTitle:
      "RPG NPC Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Characters | Codex Cryptica",
    metaDescription:
      "Create a quick NPC Table Card or a Full Dossier for fantasy, cyberpunk, horror, sci-fi and more. Give contacts a want, a relationship and something to conceal.",
    introTitle: "RPG NPC Generator",
    eyebrow: "RPG NPC Generator",
    introText:
      "Need someone to bargain with, question or revisit? Choose a genre, ancestry, role and moral stance, then generate a quick Table Card or a Full Dossier for a recurring character. No account required.",
    canonicalPath: "/generators/npc",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-npc.jpg",
    ogImageAlt:
      "Codex Cryptica RPG NPC generator showing a character draft with secret, motivation, and table-ready hook",
    keywords: [
      "rpg npc generator",
      "npc generator",
      "character generator",
      "dnd npc",
      "ttrpg npc creator",
    ],
    faqs: [
      {
        question: "Which prep style should I choose?",
        answer:
          "Table Card gives six cues for a quick encounter: immediate want, mannerism, contradiction, relationship hook, sensory tag, and knowledge and secrets. Full Dossier adds a longer account of who they are, what they want, why they are useful and how to use them, with reference notes about loyalties, leverage and secrets.",
      },
      {
        question: "Can I use this outside D&D?",
        answer:
          "Yes. Choose a vibe to change the available ancestries, roles and moral stances. The result is system-neutral character and roleplaying material, not a combat stat block.",
      },
      {
        question: "Does campaign context work in both modes?",
        answer:
          "AI generation uses your optional campaign context to tailor the draft. Non-AI Table Cards draw from prepared cues without incorporating that text; non-AI Full Dossiers display it in the background, rather than tailoring every detail to it. Dungeon or delve context can add lair-specific notes in either mode.",
      },
      {
        question: "Can I use the generator without an account?",
        answer:
          "Yes. Generate or copy the draft without signing in. Add to my Codex opens your local vault and imports one new Character. You can link the character to existing people and factions yourself; named relationships in the draft do not create separate entities or links.",
      },
      {
        question: "What happens to the NPC's secrets?",
        answer:
          "When saving a generated NPC, the labelled Table Card Knowledge & Secrets and Full Dossier reference notes stay in GM notes. Check AI-written prose before sharing it. Copy and share links include the complete draft; imported remixes keep the restored text in GM notes because the original split cannot be recovered reliably.",
      },
    ],
    relatedLinks: [
      { href: "/solutions/ai-gm-assistant", label: "AI GM assistant" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
    ],
  },
  settlement: {
    pageTitle:
      "Settlement Generator | RPG Inhabited Place Creator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready settlements, districts, colonies, and communities for any RPG genre. Set the function, environment, tone, and tension — get a place with a reason to exist and a problem worth solving.",
    introTitle: "Settlement Generator",
    eyebrow: "Settlement Generator",
    introText:
      "Generate an inhabited place that answers three questions: why does it exist, who really controls it, and what is about to go wrong. Works for any genre — fantasy, cyberpunk, sci-fi, horror, post-apocalyptic, and more.",
    canonicalPath: "/generators/settlement",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-settlement.jpg",
    ogImageAlt:
      "Codex Cryptica settlement generator showing an inhabited place with district layout, tension, and power structures",
    keywords: [
      "rpg settlement generator",
      "city generator",
      "town generator",
      "worldbuilding location creator",
      "district generator",
    ],
  },
  "magic-item": {
    pageTitle:
      "Magic Item Generator | Free Fantasy RPG Loot Tool | Codex Cryptica",
    metaDescription:
      "Generate fantasy RPG magic items with a description, magical properties, and lore. Copy the draft or save it into your local campaign vault.",
    introTitle: "Magic Item Generator",
    eyebrow: "Magic Item Generator",
    introText:
      "Create a magic item with a description, magical properties, and lore. Works without login.",
    canonicalPath: "/generators/magic-item",
    labels: ["fantasy"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-magic-item.jpg",
    ogImageAlt:
      "Codex Cryptica magic item generator drafting fantasy relics and artifacts with lore, abilities, and campaign hooks",
    keywords: [
      "magic item generator",
      "rpg loot generator",
      "dnd magic items",
      "fantasy weapon creator",
      "rpg artifact tool",
    ],
  },
  "minor-magic-item": {
    pageTitle:
      "Minor Magic Item & Trinket Generator | Single-Use Charms, Potions & Gadgets | Codex Cryptica",
    metaDescription:
      "Generate flavourful minor magic items, consumable potions, charms, talismans, and disposable tools for tabletop RPGs. System-agnostic, low-impact loot with quirks, clear limits, and creative utility.",
    introTitle: "Minor Magic Item & Trinket Generator",
    eyebrow: "Minor Magic Item Generator",
    introText:
      "Generate small-scale, consumable, and limited-use magic items, charms, alchemical draughts, and curiosities designed for creative problem-solving rather than numerical stat bloat. Works without login.",
    canonicalPath: "/generators/minor-magic-item",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-minor-magic-item.jpg",
    ogImageAlt:
      "Codex Cryptica minor magic item generator drafting consumable charms, alchemical potions, and disposable magical gadgets with quirks and usage limits",
    keywords: [
      "minor magic item generator",
      "single use magic items",
      "rpg trinket generator",
      "dnd consumable items",
      "potion generator",
      "charm generator",
      "tabletop rpg loot",
    ],
    faqs: [
      {
        question: "What makes these magic items 'minor' or single-use?",
        answer:
          "Unlike legendary artifacts or weapons with permanent mathematical bonuses, minor magic items focus on situational utility, creative tricks, sensory quirks, and limited charges (single-use consumables, fragile charges, or temporary blessings). They add flavour and tactical problem-solving without breaking campaign balance.",
      },
      {
        question: "Are these items system-agnostic?",
        answer:
          "Yes. All generated items use clear, concrete narrative and physical descriptions instead of system-specific math (like spell slot levels or exact DC numbers), making them immediately usable in D&D, Pathfinder, OSR, Shadowdark, Cairn, cyberpunk, and modern RPGs.",
      },
      {
        question: "What details are included in each generated item?",
        answer:
          "Each item includes an evocative name, tactile description of materials and craftsmanship, item form, usage limit or charge count, activation trigger, primary utility effect, a memorable quirk or sensory side effect, suggested tactical use in play, and a brief provenance or rumour.",
      },
      {
        question: "Can I save generated items directly to my campaign vault?",
        answer:
          "Yes. Clicking 'Save to Codex' stores the item draft in your browser's local storage. Open Codex Cryptica and it imports directly as an Item entity with frontmatter, Markdown notes, and linking ready to connect with your characters and factions.",
      },
    ],
    relatedLinks: [
      { href: "/generators/magic-item", label: "Major Magic Item Generator" },
      {
        href: "/generators/artifact-generator",
        label: "Artifact & Relic Generator",
      },
      { href: "/generators/quest", label: "RPG Quest Generator" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
    ],
  },
  "artifact-generator": {
    pageTitle:
      "RPG Artifact & Relic Generator | Legendary Magical & Precursor Relics | Codex Cryptica",
    metaDescription:
      "Generate campaign-shaping artifacts, ancient relics, and legendary objects with tiered powers, consequential curses, pursuing factions, and destruction conditions. System-agnostic worldbuilding anchors.",
    introTitle: "RPG Artifact & Relic Generator",
    eyebrow: "Artifact & Relic Generator",
    introText:
      "Create legendary artifacts and ancient relics with deep lore, multi-tier powers (dormant, awakened, ascendant), consequential costs, pursuing factions, and adventure hooks. Works without login.",
    canonicalPath: "/generators/artifact-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-artifact-generator.jpg",
    ogImageAlt:
      "Codex Cryptica artifact generator drafting legendary relics with multi-tier powers, attunement criteria, curses, and adventure hooks",
    keywords: [
      "rpg artifact generator",
      "relic generator",
      "legendary magic item generator",
      "dnd artifact generator",
      "campaign relic creator",
      "cursed artifact generator",
      "precursor technology generator",
    ],
    faqs: [
      {
        question: "How do Artifacts differ from standard magic items?",
        answer:
          "Artifacts and Relics are unique, named worldbuilding anchors that function as campaign engines rather than simple stat-sticks. They feature tiered powers (dormant, awakened, ascendant), attunement rituals, consequential costs or curses, interested factions hunting them, and legendary destruction conditions.",
      },
      {
        question: "Does this generator support non-fantasy genres?",
        answer:
          "Yes. When you choose a genre like Sci-Fi, Cyberpunk, Western, Steampunk, or Cosmic Horror, the generator adapts the underlying causal logic — creating lost precursor super-tech, cursed outlaw iron, or eldritch relics without forcing fantasy spells into modern or technological settings.",
      },
      {
        question: "What details are included in each generated artifact?",
        answer:
          "Each artifact contains an evocative title, tactile craftsmanship description, Quick Reference metadata, multi-tier powers, attunement requirements, a consequential curse or taboo, historical provenance, 2-3 interested factions, rumours, adventure hooks, and destruction/sealing conditions.",
      },
      {
        question:
          "Can I save generated relics directly into my Codex Cryptica vault?",
        answer:
          "Yes. Clicking 'Save to Codex' stores the artifact draft in your browser. Open Codex Cryptica and it imports directly as an Item entity with full Markdown notes, ready to link to your factions, locations, and campaign timeline.",
      },
    ],
    relatedLinks: [
      { href: "/generators/magic-item", label: "Magic Item Generator" },
      {
        href: "/generators/minor-magic-item",
        label: "Minor Magic Item & Trinket Generator",
      },
      { href: "/generators/quest", label: "RPG Quest Generator" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
    ],
  },
  faction: {
    pageTitle:
      "RPG Faction Generator | Fantasy Guilds, Cyberpunk Megacorps & Vampire Courts | Codex Cryptica",
    metaDescription:
      "Generate detailed RPG factions. Perfect as a fantasy guild generator, cyberpunk megacorp creator, or gothic vampire court generator. Save drafts to your vault.",
    introTitle: "RPG Faction Generator",
    eyebrow: "Faction Generator",
    introText:
      "Forge campaign-ready organizations across any genre. Use it as a fantasy guild generator, cyberpunk megacorp creator, or gothic vampire court generator with distinct agendas, conflicts, and NPCs.",
    canonicalPath: "/generators/faction",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-faction.jpg",
    ogImageAlt:
      "Codex Cryptica RPG faction generator showing an organization draft with agenda, internal conflict, and notable NPCs",
    keywords: [
      "rpg faction generator",
      "fantasy guild generator",
      "cyberpunk megacorp creator",
      "secret organization generator",
      "worldbuilding factions",
    ],
    faqs: [
      {
        question: "What does the faction generator create?",
        answer:
          "It generates a complete RPG faction across any genre — fantasy guilds, cyberpunk megacorps, gothic vampire courts, and more. Each result includes a name, agenda, internal conflict, rival faction, notable NPCs, and a ready-to-use GM hook.",
      },
      {
        question: "Can I use it without an account?",
        answer:
          "Yes. Generate and copy faction notes on this page without logging in. When you're ready, save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "Can I aim the faction at my current campaign?",
        answer:
          "Yes. Add optional campaign context, such as a location, villain, ongoing conflict, or political tension. Offline drafts keep it in the GM notes and add a line to What they control, and the AI draft is built around it.",
      },
      {
        question: "How does saving a generated faction work?",
        answer:
          "Clicking 'Save to Codex' stores the faction draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
      },
    ],
    relatedLinks: [
      { href: "/tools/dnd-npc-generator", label: "D&D NPC Generator" },
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
    ],
  },
  "faction-roster": {
    pageTitle:
      "Faction Roster Generator | Notable Members for Any RPG Faction | Codex Cryptica",
    metaDescription:
      "Build a faction roster of 3 to 6 named members with individual duties, motives, loyalties and connections. Prepare negotiations and rivalries for your RPG.",
    introTitle: "Faction Roster Generator",
    eyebrow: "Faction Roster Generator",
    introText:
      "A faction's banner tells you who belongs. Its members tell you whom the party can approach when orders conflict. Paste a faction's details and build a cast with personal wants, duties, loyalties and connections to other members.",
    canonicalPath: "/generators/faction-roster",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-faction-roster.jpg",
    ogImageAlt:
      "Codex Cryptica faction roster generator showing several named faction members with roles, motives, and a connection between two of them",
    keywords: [
      "faction roster generator",
      "faction npc generator",
      "rpg organization members generator",
      "guild members generator",
      "cult members generator",
    ],
    faqs: [
      {
        question: "Do I need a generated faction first?",
        answer:
          "No. Use Generate Roster on a generated faction to carry its details over, or paste your own faction into The faction on this page. A faction name and a short description are enough to start.",
      },
      {
        question: "Can I keep members I have already named?",
        answer:
          "Paste the generated faction's Notable NPCs list intact and choose a Roster size large enough for the named people. Offline generation uses those members and their existing descriptions first, then fills the remaining slots. The AI prompt asks it to retain them; check the draft before using it.",
      },
      {
        question: "Will the roster always be a leader and underlings?",
        answer:
          "No. How the faction is organised offers several arrangements, including Council, Cell network and Warband. The structure shapes new members' duties and gives you a starting point for deciding who can make decisions; existing named members retain their copied descriptions in an offline draft.",
      },
      {
        question:
          "Does saving the roster create separate characters or connections?",
        answer:
          "Add to my Codex imports one Note with the roster and GM reference into your local vault. The member names and connections are text, not separate Character entries or graph links. Use Open as Character on an individual section to continue that member in the NPC generator, then save the character separately if you want to link them.",
      },
      {
        question: "Can I give the roster to my players?",
        answer:
          "Review it first. Members' descriptions include private motives, loyalties and leverage, not just their public duties. Copy a member section and remove anything the players should not yet know, rather than sharing the whole roster unchanged.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/npc", label: "RPG NPC Generator" },
    ],
  },
  puzzle: {
    pageTitle:
      "RPG Puzzle Generator | Table-Ready Encounter Puzzles | Codex Cryptica",
    metaDescription:
      "Create adaptable RPG encounter puzzles with layered clues, multiple solutions, character spotlight opportunities, and fail-forward consequences.",
    introTitle: "RPG Puzzle Generator",
    eyebrow: "RPG Puzzle Generator",
    introText:
      "Build a playable obstacle with a purpose, clue ladder, alternative approaches and ways for the whole party to contribute. Decide what a failed attempt costs and what success changes in the next scene.",
    canonicalPath: "/generators/puzzle",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-puzzle.png",
    ogImageAlt:
      "Codex Cryptica RPG Puzzle Generator showing the input form, generated puzzle draft, and GM reference rail",
    keywords: [
      "rpg puzzle generator",
      "dnd puzzle generator",
      "tabletop encounter puzzle",
      "gm puzzle builder",
    ],
    labels: ["puzzle"],
    faqs: [
      {
        question: "Does this puzzle generator require a specific RPG system?",
        answer:
          "No. It is system-neutral by default. You can choose D&D 5e, Pathfinder 2e or Tales of the Valiant under System tailoring: the AI draft uses that system, and an offline draft records it with any party level and player count in the GM notes.",
      },
      {
        question: "Will a puzzle require one spell or character class?",
        answer:
          "No. Every puzzle is designed with multiple viable approaches, so capabilities create useful opportunities without becoming mandatory gates.",
      },
      {
        question: "What happens when players fail?",
        answer:
          "Failure pressure decides. With None, a failed attempt only gives feedback. Otherwise it adds a complication, a clock, danger or a fight, and the party still has a way forward.",
      },
      {
        question: "How can solving the puzzle affect the next encounter?",
        answer:
          "Use Optional downstream consequence to name a meaningful change, such as reinforcements being delayed or a guardian losing its shield. Let the method the party chooses determine whether it earns that benefit.",
      },
      {
        question: "What gets saved in my Codex?",
        answer:
          "Add to my Codex saves the generated encounter as one Note in your local browser vault. The setup, clues and alternate approaches remain in the main text; the GM-Only Solution and Escalating Hints are in GM notes. A shared link includes the complete draft, including its solution; text-only remixes should be reviewed before sharing as the combined text is not separated automatically.",
      },
    ],
    relatedLinks: [
      {
        href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
        label: "How to Design RPG Puzzles (Guide)",
      },
      {
        href: "/topics/puzzles",
        label: "RPG Puzzles Topic Hub",
      },
      {
        href: "/answers/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
        label: "How to Give Puzzle Hints Without Spoiling It (Guide)",
      },
      {
        href: "/examples/the-venting-helix-derelict-hazard",
        label: "Derelict Hazard Puzzle Example",
      },
      {
        href: "/examples/the-bell-beneath-blackglass-fantasy-puzzle",
        label: "Classic Fantasy Puzzle Example",
      },
      {
        href: "/examples/the-null-key-reliquary-cyberpunk-puzzle",
        label: "Cyberpunk Puzzle Example",
      },
      { href: "/generators/quest", label: "Quest Hook Generator" },
      {
        href: "/generators/dungeon-generator",
        label: "Dungeon & Delve Generator",
      },
    ],
  },
  quest: {
    pageTitle:
      "RPG Quest Hook Generator | Free Fantasy & Cyberpunk Adventure Tool | Codex Cryptica",
    metaDescription:
      "Create RPG quest hooks with a location, key NPC, threat, complication, twist and reward. Set the stakes and keep the hidden details in your local Codex.",
    introTitle: "RPG Quest Generator",
    eyebrow: "Quest Hook Generator",
    introText:
      "Need a job for tonight or a problem the party might return to? Draft a quest hook with a location, key NPC, threat, hidden complication, twist and reward. Set the scale and give players a reason to investigate.",
    canonicalPath: "/generators/quest",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-quest.jpg",
    ogImageAlt:
      "Codex Cryptica quest hook generator showing adventure seeds with twists, complications, and rewards",
    faqs: [
      {
        question: "Is a quest hook a complete adventure?",
        answer:
          "No. It provides a starting situation, people involved, hidden complications and a reward. Decide which encounters, approaches and outcomes make sense for your table rather than treating the hook as a fixed itinerary.",
      },
      {
        question: "Can I connect a quest to my existing campaign?",
        answer:
          "Use Optional Campaign Context to name an existing NPC, place or unresolved problem. With AI enabled, the context is included in the generation prompt; without AI, it is kept in the GM notes for you to adapt.",
      },
      {
        question: "Can I share the hook without giving away the twist?",
        answer:
          "Review the hook and copy only the information you want players to know. The full Copy action includes GM notes, so keep hidden complications, the twist and any undisclosed rewards out of the player handout.",
      },
      {
        question: "What is saved when I add a quest to my Codex?",
        answer:
          "The quest becomes one Event entry in your local vault, with the hook, location, contact and threat in its content and hidden details in GM lore. Named people and places are not created as separate entries; you can link existing entries yourself.",
      },
    ],
    keywords: [
      "rpg quest hook generator",
      "adventure seed generator",
      "quest creator",
      "dnd quest generator",
      "ttrpg plot hooks",
    ],
  },
  rumour: {
    pageTitle:
      "RPG Rumour Generator | Free Tavern & Town Gossip Tool | Codex Cryptica",
    metaDescription:
      "Generate a d6 table of six local rumours for any tavern, shrine, market, or settlement -- each with a concrete lead, a source, and hidden GM-only truth. Free, no login required.",
    introTitle: "RPG Rumour Generator",
    eyebrow: "Rumour Generator",
    introText:
      "Create a d6 table of six local rumours the party can overhear and choose to chase. Four are essentially true, one is exaggerated, and one is a dangerous misconception. Every rumour names a real lead; the truth stays hidden in GM notes until someone investigates.",
    canonicalPath: "/generators/rumour",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-rumour.jpg",
    ogImageAlt:
      "Codex Cryptica Rumour Generator showing a d6 table of local rumours with a player-facing lead and source, and a GM-only truth rail",
    keywords: [
      "rpg rumour generator",
      "rpg rumor generator",
      "fantasy rumour generator",
      "tavern rumour generator",
      "tavern rumor generator",
      "dnd rumour generator",
      "random rumours for a town",
      "fantasy town rumours",
    ],
    labels: ["rumour"],
    faqs: [
      {
        question: "How is a rumour different from a quest hook?",
        answer:
          "A quest hook presents something the party could explicitly go and do. A rumour presents something people are saying, with enough specificity that the players can decide for themselves whether it's worth investigating. This generator stays deliberately lighter than the Quest Hook Generator -- no objectives, rewards, or encounter structure, just a gossip line, a lead, and a source.",
      },
      {
        question: "Are the rumours always true?",
        answer:
          "No. Each table of six rolls a fixed hidden distribution: four rumours are essentially true, one is an exaggeration of something real, and one is a dangerous misconception that sounds plausible but is materially wrong. Which is which is never shown to players -- it lives in the GM-only notes beneath each entry.",
      },
      {
        question: "Will every rumour actually be useful at the table?",
        answer:
          "Yes. Every rumour names at least one concrete, pursuable lead -- a specific person, place, faction, or item the players can seek out, question, or investigate. Vague ominous statements with nothing to act on are treated as a quality failure, not a feature.",
      },
      {
        question: "Does this work for genres other than fantasy?",
        answer:
          "Yes. Set the genre to fantasy, cyberpunk, cosmic horror, space opera, western, and more -- the source, subject matter, and vocabulary adapt while the structure (rumour, lead, source, hidden truth) stays the same.",
      },
      {
        question: "Do I have to save all six rumours as separate entities?",
        answer:
          "No. The whole table copies and saves as a single lightweight note, so you're not forced to create six new entities in your campaign vault every time you roll a table of local gossip.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
      {
        href: "/generators/news-sheet-generator",
        label: "News Sheet Generator",
      },
      {
        href: "/answers/how-do-you-generate-useful-rpg-rumours",
        label: "How to generate useful RPG rumours",
      },
      {
        href: "/examples/lowmere-six-words-rumour-table",
        label: "Lowmere rumour table example",
      },
    ],
  },
  encounter: {
    pageTitle:
      "RPG Encounter Generator | Free Combat, Social & Exploration Tool | Codex Cryptica",
    metaDescription:
      "Generate playable RPG encounters -- combat, social, exploration, environmental, or mixed -- with participants, environment, a complication, and outcomes. System-neutral threat levels.",
    introTitle: "RPG Encounter Generator",
    eyebrow: "Encounter Generator",
    introText:
      "Create playable encounters your players can actually interact with, not just a monster list. Set the encounter type, environment, and threat, then import into your local vault.",
    canonicalPath: "/generators/encounter",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-encounter.jpg",
    ogImageAlt:
      "Codex Cryptica encounter generator showing participants, environment, and possible approaches for a playable RPG encounter",
    keywords: [
      "rpg encounter generator",
      "random encounter generator",
      "fantasy encounter generator",
      "dnd encounter generator",
      "travel encounter generator",
    ],
  },
  item: {
    pageTitle:
      "RPG Item & Loot Generator | Equipment, Curios and Relics | Codex Cryptica",
    metaDescription:
      "Draft distinctive RPG loot with an item type, rarity, physical description, magical property and history. Decide how a found object fits your campaign.",
    introTitle: "RPG Item Generator",
    eyebrow: "Item Generator",
    introText:
      "Give the party something specific to find in a strongbox, at a market or on a defeated foe. Choose the item type and rarity to draft an enchanted weapon, piece of equipment or curio with a description, property and history.",
    canonicalPath: "/generators/item",
    labels: ["fantasy"],
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-item.jpg",
    ogImageAlt:
      "Codex Cryptica loot and equipment generator drafting custom items and relics",
    keywords: [
      "rpg item generator",
      "loot generator",
      "rpg equipment",
      "tabletop items",
      "relic generator",
    ],
    faqs: [
      {
        question: "Can I generate completely non-magical equipment?",
        answer:
          "This page uses the same generation engine as the Magic Item Generator. Common is a rarity, not a non-magical setting. For a mundane object, retain the appearance and history you like and remove the magical property from your draft.",
      },
      {
        question: "Does Rarity determine the price or strength of an item?",
        answer:
          "No fixed price or system-specific balance is guaranteed. Offline generation selects a themed property independently of the chosen rarity, and the AI receives the rarity as context. Decide the item's value and adjust its effect to suit your game's rules and the party's existing equipment.",
      },
      {
        question: "How can I make the loot fit a specific location?",
        answer:
          "In Add campaign context, name the place where the object is found, its owner or a relevant faction. Offline results preserve this text in the main document under Campaign Context; AI generation receives it when drafting the item. Review the result and change any history that conflicts with your setting.",
      },
      {
        question: "What is saved when I add an item to Codex Cryptica?",
        answer:
          "Add to my Codex saves one Item in your local vault. The description, history and offline campaign context appear in the main document. Only sections headed GM Reference Information or Magical Properties are kept separately in GM reference; AI headings can vary, so check the rendered document before sharing it. Named references do not automatically become graph connections or inventory entries.",
      },
    ],
  },
  "social-hub": {
    pageTitle:
      "Social Hub Generator | RPG Venue Generator for Any Genre | Codex Cryptica",
    metaDescription:
      "Generate a social venue for any genre, from cyberpunk noodle bars to Western saloons and fantasy inns, with an operator, regulars, rumours and a hidden problem. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "Social Hub Generator",
    eyebrow: "Social Hub Generator",
    introText:
      "Create a campaign-ready social venue for any genre. Pick the setting, venue type, atmosphere, wealth level and clientele, and get a named location with an operator, regulars, rumours and a hidden problem.",
    canonicalPath: "/generators/social-hub",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-social-hub.jpg",
    ogImageAlt:
      "Codex Cryptica social hub generator showing an interactive venue draft with regulars and rumours",
    keywords: [
      "social hub generator",
      "rpg venue generator",
      "cyberpunk noodle bar",
      "spaceport cantina",
      "gathering place creator",
    ],
  },
  world: {
    pageTitle:
      "Sci-Fi World Generator | RPG Planet & Moon Creator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready sci-fi planets, moons, and artificial worlds with environments, societies, conflicts, notable locations, and adventure hooks.",
    introTitle: "Sci-Fi World Generator",
    eyebrow: "Sci-Fi World Generator",
    introText:
      "Create a detailed sci-fi world for your campaign. Choose its environment, habitability, civilisation, and defining feature, then generate a place with conflicts, locations, and playable hooks.",
    canonicalPath: "/generators/world",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-world.jpg",
    ogImageAlt:
      "Codex Cryptica sci-fi world generator drafting planets, moons, environments, and civilizations",
    keywords: [
      "scifi world generator",
      "planet generator",
      "moon generator",
      "scifi worldbuilding",
      "alien world creator",
    ],
  },
  kingdom: {
    pageTitle:
      "Kingdom Generator | Free Fantasy Realm & Empire Creator | Codex Cryptica",
    metaDescription:
      "Generate a detailed fantasy kingdom or empire with ruler, factions, geography, conflict, and adventure hooks. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "Kingdom Generator",
    eyebrow: "Kingdom Generator",
    introText:
      "Create a campaign-ready fantasy realm with a ruler, major factions, internal tensions, and adventure hooks. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/kingdom",
    labels: ["fantasy"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-kingdom.jpg",
    ogImageAlt:
      "Codex Cryptica kingdom generator drafting fantasy realms with rulers, capitals and rival factions",
    keywords: [
      "kingdom generator",
      "fantasy realm creator",
      "empire generator",
      "worldbuilding kingdoms",
      "rpg realm generator",
    ],
  },
  nation: {
    pageTitle:
      "Nation Generator | RPG Political Entity Creator for Any Genre | Codex Cryptica",
    metaDescription:
      "Generate a political entity for any RPG genre — fantasy kingdoms, cyberpunk megacorp-states, sci-fi federations, post-apoc warlord territories. Works without login.",
    introTitle: "Nation Generator",
    eyebrow: "Nation Generator",
    introText:
      "Create a campaign-ready political entity for any genre. Pick your setting and polity type — get a named state with power blocs, internal tensions, and adventure hooks.",
    canonicalPath: "/generators/nation",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-nation.jpg",
    ogImageAlt:
      "Codex Cryptica nation generator drafting polities, megacorp states, and federations with power blocs",
    keywords: [
      "nation generator",
      "rpg political entity generator",
      "polity creator",
      "worldbuilding nation",
      "federation generator",
    ],
  },
  tavern: {
    pageTitle:
      "Tavern Generator | Free RPG Inn & Alehouse Creator | Codex Cryptica",
    metaDescription:
      "Generate a detailed RPG tavern or inn with an owner, regular patrons, rumours, a hidden problem and an opening hook. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "Tavern Generator",
    eyebrow: "Tavern Generator",
    introText:
      "Create a campaign-ready tavern with atmosphere, owner, notable patrons, rumours, and a hidden problem. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/tavern",
    labels: ["fantasy"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-tavern.jpg",
    ogImageAlt:
      "Codex Cryptica tavern generator showing an alehouse with owner, regulars, rumours, and adventure hooks",
    keywords: [
      "rpg tavern generator",
      "inn generator",
      "fantasy tavern creator",
      "alehouse generator",
      "dnd tavern",
    ],
  },
  "vampire-clan": {
    pageTitle:
      "Vampire Clan Generator | Free RPG Bloodline & Coven Tool | Codex Cryptica",
    metaDescription:
      "Create detailed vampire clans, bloodlines, occult covens, and secret societies. Generate history, feeding habits, weaknesses, and plot hooks for your campaign.",
    introTitle: "Vampire Clan Generator",
    eyebrow: "Vampire Clan Generator",
    introText:
      "Create undead factions with bloodlines, feeding habits, dark agendas, and table-ready hooks. Works without login, then imports into your local Codex vault.",
    canonicalPath: "/generators/vampire-clan",
    labels: ["vampire"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-vampire-clan.jpg",
    ogImageAlt:
      "Codex Cryptica vampire clan generator drafting occult bloodlines, covens, and dark agendas",
    keywords: [
      "vampire clan generator",
      "rpg bloodline generator",
      "occult coven creator",
      "gothic horror faction",
      "vampire faction",
    ],
  },
  "nomad-clan": {
    pageTitle:
      "Cyberpunk Nomad Clan Generator | Free RPG Road Faction Tool | Codex Cryptica",
    metaDescription:
      "Generate cyberpunk nomad clans with convoy culture, road codes, corporate enemies, and table-ready hooks. Create mobile communities for any near-future or post-apocalyptic campaign.",
    introTitle: "Cyberpunk Nomad Clan Generator",
    eyebrow: "Nomad Clan Generator",
    introText:
      "Create road-hardened nomad clans with convoy culture, territory routes, internal tensions, and campaign-ready hooks. Works without login, then imports into your local Codex vault.",
    canonicalPath: "/generators/nomad-clan",
    labels: ["cyberpunk", "post-apocalyptic"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-nomad-clan.jpg",
    ogImageAlt:
      "Codex Cryptica cyberpunk nomad clan generator drafting road convoys, territory routes, and clan codes",
    keywords: [
      "cyberpunk nomad clan generator",
      "road faction generator",
      "convoy creator",
      "post-apocalyptic clan",
      "scifi nomad generator",
    ],
    faqs: [
      {
        question: "What does the nomad clan generator create?",
        answer:
          "It generates a complete cyberpunk nomad clan with a name, role, territory, convoy composition, clan code, internal crisis, rival faction, notable members, and table-ready GM hooks.",
      },
      {
        question: "Can I use it without an account?",
        answer:
          "Yes. Generate and copy clan notes on this page without logging in. After you generate a result, Add to my Codex stages the draft in your browser's local storage and imports it as a Faction entity when you open Codex Cryptica.",
      },
      {
        question: "Which RPG systems does it work with?",
        answer:
          "The generator is system-agnostic. It works for Cyberpunk Red, Starfinder, GURPS, Neon City Overdrive, or any near-future or post-apocalyptic campaign where mobile communities matter.",
      },
      {
        question: "Can I aim the clan at my current campaign?",
        answer:
          "With AI generation on, campaign context is used as input to tailor the clan, and the draft is asked to include it. Offline drafts display your context under Who they are, but do not use it to tailor the other generated details.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction generator" },
      { href: "/generators/npc", label: "RPG NPC generator" },
      { href: "/generators/settlement", label: "Settlement generator" },
    ],
  },
  "dark-fantasy-faction": {
    pageTitle:
      "Dark Fantasy Faction Generator | Free Grimdark RPG Tool | Codex Cryptica",
    metaDescription:
      "Generate dark fantasy and grimdark factions — fallen orders, cursed noble houses, plague cults, witch-hunter lodges, and corpse guilds — with agendas, secrets, and table-ready hooks.",
    introTitle: "Dark Fantasy Faction Generator",
    eyebrow: "Dark Fantasy Faction Generator",
    introText:
      "Create fallen orders, cursed noble houses, plague cults, witch-hunters, corpse guilds, and desperate powers with agendas, secrets, NPCs, and table-ready hooks. Works without login, then imports into your local Codex vault.",
    canonicalPath: "/generators/dark-fantasy-faction",
    labels: ["fantasy"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-dark-fantasy-faction.jpg",
    ogImageAlt:
      "Codex Cryptica dark fantasy faction generator drafting a cursed noble house with agenda, secrets, and rivals",
    keywords: [
      "dark fantasy faction generator",
      "grimdark faction generator",
      "dark rpg faction generator",
      "osr faction generator",
      "witch hunter faction generator",
      "cursed kingdom generator",
      "fantasy cult generator",
    ],
    faqs: [
      {
        question: "What does the dark fantasy faction generator create?",
        answer:
          "It generates a complete grimdark faction — a fallen order, cursed noble house, witch-hunter lodge, plague cult, corpse guild, or similar — with what they control, what they want, why they're dangerous, notable NPCs, an internal conflict, a rival faction, and a table-ready GM hook.",
      },
      {
        question: "Is every faction just evil for the sake of it?",
        answer:
          "No. The generator aims for morally sharp, table-usable factions — institutions doing something defensible in the worst possible way, not cartoon villains. Pick a moral posture (necessary evil, fallen idealists, fanatical purists, and more) to steer the tone.",
      },
      {
        question: "Can I use it without an account?",
        answer:
          "Yes. Generate and copy faction notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "How do I make a morally compromised faction believable?",
        answer:
          "Give them a real crisis nobody else is solving, such as holding a plague cordon or guarding a demon-haunted pass, then tie their cruelty to how they keep that bargain. The generator is system-agnostic and works with any dark fantasy or grimdark campaign without claiming official affiliation with any third-party system.",
      },
      {
        question: "Can I aim the faction at my current campaign?",
        answer:
          "Yes. Add optional campaign context and the generator will fit the faction to your table rather than producing a generic result.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/faction",
        label: "Classic Fantasy faction generator",
      },
      { href: "/generators/vampire-clan", label: "Vampire clan generator" },
      { href: "/generators/cosmic-horror", label: "Cosmic Horror generators" },
    ],
  },
  "urban-fantasy-faction": {
    pageTitle:
      "Urban Fantasy Faction Generator | Modern RPG Tool | Codex Cryptica",
    metaDescription:
      "Create urban fantasy factions for modern supernatural RPGs — mage cabals, paranormal agencies, occult crews and hidden-world institutions with agendas, NPCs and city-scale hooks.",
    introTitle: "Urban Fantasy Faction Generator",
    eyebrow: "Urban Fantasy Faction Generator",
    introText:
      "Build supernatural city factions, not cities: mage cabals, monster courts, paranormal agencies, occult crews and modern institutions with agendas, NPCs and playable conflicts. Generate locally without an account, then save a faction draft to your browser-local Codex.",
    canonicalPath: "/generators/urban-fantasy-faction",
    keywords: [
      "urban fantasy faction generator",
      "modern fantasy faction generator",
      "supernatural faction generator",
      "hidden-world faction generator",
      "mage cabal generator",
      "occult faction generator",
      "modern occult RPG factions",
    ],
    faqs: [
      {
        question: "What does the urban fantasy faction generator create?",
        answer:
          "It creates a faction for a modern supernatural city — such as a mage cabal, monster court, paranormal agency, occult gang, fae market or secret council — with city resources, NPCs, internal pressure and a table-ready hook.",
      },
      {
        question: "Does this generator create a city?",
        answer:
          "No. It creates one supernatural faction operating inside a modern city or network, not a city or settlement.",
      },
      {
        question: "Can I use it without AI or an account?",
        answer:
          "Yes. Local generation works with AI disabled or unavailable. You can generate and copy the result without an account, then save a draft to a browser-local Codex vault.",
      },
      {
        question: "Which RPG systems does it support?",
        answer:
          "The output is system-agnostic for modern fantasy, urban fantasy and occult campaigns. It does not claim official affiliation with any third-party game.",
      },
    ],
    relatedLinks: [
      { href: "/generators/vampire", label: "Vampire generators" },
      {
        href: "/generators/cosmic-horror",
        label: "Horror and occult generators",
      },
      { href: "/generators/cyberpunk", label: "Cyberpunk generators" },
      { href: "/generators/modern", label: "Modern generators" },
    ],
  },
  names: {
    pageTitle:
      "RPG Name Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Names | Codex Cryptica",
    metaDescription:
      "Generate names for characters, places, factions, and items across any genre — fantasy, cyberpunk, gothic horror, sci-fi, and more. Free for any tabletop RPG.",
    introTitle: "RPG Name Generator",
    eyebrow: "Name Generator",
    introText:
      "Use Quick names to roll a shortlist of character, place, faction or item names. Tap to copy a name, pin favourites or copy the whole list. Pick a vibe and naming style, then choose Generate names with notes when you want more context. No account is needed.",
    canonicalPath: "/generators/names",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-names.jpg",
    ogImageAlt:
      "Codex Cryptica RPG name generator generating character, place, and faction names across genres",
    keywords: [
      "rpg name generator",
      "fantasy name creator",
      "scifi character names",
      "place name generator",
      "faction name tool",
    ],
    faqs: [
      {
        question: "How can I make a shortlist that is easy to remember?",
        answer:
          "Choose the culture and Name Type, say the names out loud, and avoid near-identical names for people in the same scene. Pin a few unused names in Quick names before selecting New names.",
      },
      {
        question: "Can I generate names for a non-fantasy setting?",
        answer:
          "Choose a vibe to see the available styles. Some non-fantasy styles have no offline tables and fall back to generic fantasy syllables; check the Usage Suggestions. AI generation can use the chosen style and optional campaign context.",
      },
      {
        question: "How do I use the names in Codex?",
        answer:
          "Tap a name in Quick names to copy it, use Copy all for one name per line or Copy pinned for your favourites. Open Codex and paste a selected name into the appropriate existing or new Character, Location, Faction or Item. Generate names with notes has its own Copy action; neither mode creates a batch of vault entries.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/language-generator",
        label: "Fictional Language Generator",
      },
      { href: "/generators/npc", label: "RPG NPC Generator" },
    ],
  },
  "fantasy-names": {
    pageTitle:
      "Fantasy Name Generator for Characters & Places | Codex Cryptica",
    metaDescription:
      "Create fantasy character, place, faction and item names. Choose from ten cultural styles, add campaign context, then copy or save your favourites.",
    introTitle: "Fantasy Name Generator",
    eyebrow: "Fantasy Name Generator",
    introText:
      "Name your characters, settlements, factions and items across ten cultural styles. Add your campaign context to guide the result, then copy names or save them to your local vault. No account required.",
    canonicalPath: "/generators/fantasy-names",
    labels: ["fantasy"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-fantasy-names.jpg",
    ogImageAlt:
      "Codex Cryptica fantasy name generator generating names across cultural styles",
    keywords: [
      "fantasy name generator",
      "dnd character names",
      "worldbuilding name tool",
      "fantasy place names",
      "ttrpg names",
    ],
  },
  "dnd-npc": {
    pageTitle:
      "D&D NPC Generator | Free Fantasy Character Creator | Codex Cryptica",
    metaDescription:
      "Create a fantasy NPC with ancestry, role, personality, secret, faction tie, and plot hook. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "D&D NPC Generator",
    eyebrow: "D&D NPC Generator",
    introText:
      "Create a fantasy NPC with ancestry, role, personality traits, a hidden secret, and a table-ready GM hook. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/dnd-npc",
    labels: ["fantasy"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-dnd-npc.jpg",
    ogImageAlt:
      "Codex Cryptica D&D character generator drafting a fantasy NPC with ancestry, secrets, and quest hooks",
    keywords: [
      "dnd npc generator",
      "5e npc generator",
      "dungeons and dragons character generator",
      "fantasy npc creator",
      "dm prep tool",
    ],
    faqs: [
      {
        question: "What is the difference between Table Card and Full Dossier?",
        answer:
          "Table Card (the default) gives you six scannable cues for live play: Immediate Want, Physical Mannerism, Sharp Contradiction, Relationship Hook, Sensory Tag, and Knowledge & Secrets, plus a short Table Delivery note. Full Dossier switches to four background sections (Who they are, What they want, Why they are useful, How to use them at the table) alongside Faction Stance & Biases, Leverage & Price, Secret, and Personality.",
      },
      {
        question: "Does the D&D NPC generator include full 5e stat blocks?",
        answer:
          "No. It adds a Class / Archetype and Table Rating benchmark (such as Wizard / Level 5 and CR 3 for a Mage, or Level 3 and CR 1 for custom roles) at the top of At a Glance rather than full combat stat blocks or equipment lists.",
      },
      {
        question: "How does Add campaign context change the NPC?",
        answer:
          "Naming a town, guild, or conflict steers AI drafts and anchors offline Dossier drafts. If you mention a dungeon or delve in Add campaign context, both offline and AI drafts also add lair-specific fields and a three-stage Alert & Lair Response.",
      },
      {
        question: "What happens when I save a generated D&D NPC?",
        answer:
          "After you generate a result, Add to my Codex stages the NPC in your browser's local storage with no account required. Opening Codex Cryptica imports it as a Character entity with its At a Glance notes, Faction Connection, and labels.",
      },
    ],
  },
  "pantheon-generator": {
    pageTitle:
      "RPG Pantheon Generator | Free Deity & Divine Assembly Tool | Codex Cryptica",
    metaDescription:
      "Generate detailed RPG pantheons with alliances, rivalries, myths, and hooks. Save drafts directly to your Codex campaign vault.",
    introTitle: "RPG Pantheon Generator",
    eyebrow: "Pantheon Generator",
    introText:
      "Create a campaign-ready pantheon with alliances, cosmic conflicts, and detailed member deities. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/pantheon-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-pantheon-generator.jpg",
    ogImageAlt:
      "Codex Cryptica pantheon generator drafting divine assemblies, mythic hierarchies, and cosmic conflicts",
    keywords: [
      "rpg pantheon generator",
      "deity assembly creator",
      "mythology generator",
      "divine hierarchy tool",
      "worldbuilding gods",
    ],
    labels: ["religion"],
    faqs: [
      {
        question: "What does the pantheon generator create?",
        answer:
          "It creates a divine assembly with an origin myth, a sized deity roster, alliances and rivalries, clergy and temple notes, rumours, a GM-only hidden problem, and an immediate hook.",
      },
      {
        question: "Can I use it without an account?",
        answer:
          "Yes. Generate and copy pantheon notes on this page without logging in. After you generate a result, Add to my Codex stages the draft in your browser's local storage and imports it as a Faction entity (or a Character entity in Single Deity / Spirit mode) when you open Codex Cryptica.",
      },
      {
        question: "Can I switch between a full pantheon and a single deity?",
        answer:
          "Yes. Use Generate target to switch between Pantheon and Single Deity / Spirit, or adjust Pantheon Size and Pantheon Focus / Width to control how many gods appear and whether they cluster around one domain or span many.",
      },
      {
        question: "How does Campaign context (optional) affect the draft?",
        answer:
          "With AI generation on, your campaign context guides the entire pantheon and its myths in Pantheon mode, or shapes the deity and its cult in Single Deity / Spirit mode. Offline drafts display your context in an Influence of Campaign Context section while using your selected domain, worshippers, and, in Pantheon mode, conflict theme.",
      },
    ],
    relatedLinks: [
      { href: "/generators/god-generator", label: "God & deity generator" },
      { href: "/generators/faction", label: "Faction generator" },
      { href: "/generators/settlement", label: "Settlement generator" },
    ],
  },
  "god-generator": {
    pageTitle:
      "RPG God & Deity Generator | Free Tabletop Worldbuilding Tool | Codex Cryptica",
    metaDescription:
      "Generate fantasy RPG deities, saints, spirits, and demons with domains, taboos, symbols, and hooks. Save drafts directly to your campaign vault.",
    introTitle: "RPG God & Deity Generator",
    eyebrow: "Deity Generator",
    introText:
      "Design detailed single deities, ancestors, or abstract forces with portfolio, rituals, and myths. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/god-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-god-generator.jpg",
    ogImageAlt:
      "Codex Cryptica deity generator drafting gods, spirits, domains, taboos, and holy symbols",
    keywords: [
      "god generator",
      "deity generator",
      "rpg god creator",
      "mythic deity tool",
      "domain and taboos generator",
    ],
  },
  "ship-generator": {
    pageTitle:
      "RPG Ship Generator | Starships, Galleons & Vessels for Any Genre | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready ships for any RPG genre — sci-fi starships, fantasy galleons, pirate sloops, steampunk airships, and more. Each vessel has a crew, a complication, and a secret. No login required.",
    introTitle: "RPG Ship Generator",
    eyebrow: "Ship Generator",
    introText:
      "Create a campaign-ready vessel for any RPG genre. Sci-fi starships, fantasy galleons, pirate sloops, steampunk airships — pick the role, scale, and condition and get a ship with a crew, a mission, a problem, and a secret.",
    canonicalPath: "/generators/ship-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-ship-generator.jpg",
    ogImageAlt:
      "Codex Cryptica ship generator drafting starships, galleons, and vessels with crew and secrets",
    keywords: [
      "rpg ship generator",
      "starship generator",
      "fantasy galleon creator",
      "pirate vessel generator",
      "airship creator",
    ],
    faqs: [
      {
        question: "What does the ship generator create?",
        answer:
          "It generates a complete RPG ship — name, role, scale, condition, owner, current mission, crew type, dominant complication, hidden secret, key zones, and three adventure hooks. The result is immediately usable as a location, a quest seed, or a faction asset.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy ship notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "What genres does the ship generator support?",
        answer:
          "Sci-Fi, Space Opera, Cyberpunk, Optimistic Exploration Sci-Fi, Space Opera Resistance, Lancer, Post-Apocalyptic, Fantasy, Pirate / Age of Sail, Steampunk, Dark Fantasy, Western (River & Rail), and Space Western. Each genre has its own roles, names, crew types, and complications.",
      },
      {
        question: "Can I use it for D&D or fantasy RPGs?",
        answer:
          "Yes — select Fantasy for merchant galleons, war galleys, and arcane transports, or Pirate / Age of Sail for frigates, sloops, and buccaneers. The output is system-neutral and saves into any Codex vault as a location entity.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
      { href: "/generators/npc", label: "NPC Generator" },
    ],
  },
  "language-generator": {
    pageTitle:
      "RPG Fictional Language Generator | Worldbuilding Conlang Tool | Codex Cryptica",
    metaDescription:
      "Generate custom fictional language profiles for your tabletop worldbuilding campaign — pronunciations, naming rules, example names, and a vocabulary glossary. No login required.",
    introTitle: "RPG Fictional Language Generator",
    eyebrow: "Language Generator",
    introText:
      "Draft a small language profile that supports names, greetings, signs and clues in play. Choose its genre, sounds, role and naming structure, then check that recurring words and sample phrases have consistent meanings. Save your evolving glossary as one Note in your local Codex vault.",
    canonicalPath: "/generators/language-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-language-generator.jpg",
    ogImageAlt:
      "Codex Cryptica fictional language generator drafting pronunciation, naming rules, and vocabulary",
    keywords: [
      "fictional language generator",
      "conlang generator",
      "rpg language creator",
      "worldbuilding naming language",
      "fantasy language tool",
    ],
    faqs: [
      {
        question: "What does the fictional language generator create?",
        answer:
          "It drafts pronunciation, cultural role, word formation, example names, a glossary and sample phrases. Start with a few words and check that the naming rules and translations agree. It is a reference for worldbuilding, not a complete language or translation service.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy the language notes without an account. Add to my Codex opens one Note with pronunciation, word formation, vocabulary and phrases in main text, and example names and At the Table reference in GM notes. Connect it to existing cultures and speakers yourself.",
      },
      {
        question: "How should I use the language in a session?",
        answer:
          "Pick two or three roots and a greeting, and reuse them in signs, titles and dialogue. Give players a way to learn their meanings; avoid requiring them to guess an invented translation to progress.",
      },
    ],
    relatedLinks: [
      { href: "/generators/names", label: "RPG Name Generator" },
      { href: "/generators/npc", label: "NPC Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
    ],
  },
  "news-sheet-generator": {
    pageTitle:
      "News Sheet Generator | In-World RPG News & Cyberpunk Screamsheets | Codex Cryptica",
    metaDescription:
      "Generate an in-world news sheet for any RPG genre — cyberpunk screamsheets, fantasy broadsheets, station newsfeeds, wasteland bulletins. Headlines, rumours, classifieds, adverts, and GM-only adventure hooks. No login required.",
    introTitle: "News Sheet Generator",
    eyebrow: "News Sheet Generator",
    introText:
      "Create an in-world news sheet as a printable player handout — a lead headline, short articles, street rumours, classifieds, and propaganda, shaped by who owns the press. Cyberpunk players know it as a screamsheet; it works just as well as a fantasy broadsheet or a station newsfeed. The GM version holds the truth behind the stories and the adventure hooks.",
    canonicalPath: "/generators/news-sheet-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-news-sheet-generator.jpg",
    ogImageAlt:
      "Codex Cryptica news sheet generator drafting player screamsheets, broadsheets, and GM hooks",
    keywords: [
      "news sheet generator",
      "cyberpunk screamsheet",
      "rpg town broadsheet",
      "player handout generator",
      "in-world newsfeed",
    ],
    faqs: [
      {
        question: "What does the news sheet generator create?",
        answer:
          "It generates a complete in-world publication issue — masthead and tagline, a lead headline story, 2-4 secondary articles, rumours, classified ads, public notices, and an advert or piece of propaganda — plus a GM-only section with the truth behind the stories and adventure hooks.",
      },
      {
        question: "Is it only for cyberpunk games?",
        answer:
          "No. The screamsheet format is inspired by cyberpunk street news, but the generator works for any genre: fantasy town-crier broadsheets, station newsfeeds, wasteland bunker bulletins, frontier telegraphs, occult tabloids, and more.",
      },
      {
        question: "Can I hand the output to my players?",
        answer:
          "Yes. The handout body is player-safe by design — GM-only material (the truth behind the stories and the adventure hooks) is kept in a separate GM section, so you can copy the handout without leaking secrets.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy news sheets on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
    ],
  },
  "dungeon-generator": {
    pageTitle:
      "Dungeon & Delve Generator | Multi-Genre RPG Delve Generator | Codex Cryptica",
    metaDescription:
      "Generate multi-layered dungeons, ancient ruins, subterranean vaults, alien complexes, or cybernetic facilities for any RPG genre. Signature features, current conflicts, sectors, inhabitants, traps, boss mysteries, and loot.",
    introTitle: "Dungeon / Delve Idea Generator",
    eyebrow: "Dungeon Generator",
    introText:
      "Create rich, multi-layered dungeons, ancient ruins, abandoned facilities, or subterranean vaults for any RPG genre or world theme. Generates evocative premises, original histories, current operational states, signature landmarks, active conflicts, sectors, factions, hazards, secrets, treasures, and adventure hooks. Every generated delve can also become a fully explorable, room-by-room map — the interactive Dungeon Canvas is exclusive to Codex Cryptica, free to open once you're in the app.",
    canonicalPath: "/generators/dungeon-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-dungeon-generator.jpg",
    ogImageAlt:
      "Codex Cryptica dungeon & delve generator drafting complex subterranean sectors, hazards, and loot",
    keywords: [
      "dungeon generator",
      "rpg delve generator",
      "megadungeon creator",
      "dnd dungeon generator",
      "subterranean vault creator",
    ],
    faqs: [
      {
        question: "What does the dungeon generator create?",
        answer:
          "It creates complete, multi-layered dungeon & delve concepts including history, current state, signature landmark, active conflict, 3–5 distinct sectors, resident factions, environmental hazards, secrets, loot, and adventure hooks.",
      },
      {
        question: "Is it only for fantasy games?",
        answer:
          "No. The generator dynamically adapts to any world theme — fantasy delves, subterranean sci-fi research facilities, cyberpunk megastructure sectors, post-apocalyptic vaults, gothic cathedrals, post-human Lancer sites, or steampipe labyrinths.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy dungeons on this page without logging in. Save drafts directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "Can I turn this into an explorable map, not just text?",
        answer:
          "Yes — hit Build Delve Canvas on any generated dungeon to open an interactive, room-by-room map with connected areas, loops, and hidden routes you can rearrange and edit, plus a full GM Dossier with atmosphere, connections, and secrets written out room by room. The dungeon itself is saved as a Location entity in your vault, so it's linked up with the rest of your world from the start. Both are exclusive to Codex Cryptica: they're not part of the plain text generator, but they're still free and need no account — just open your world in the app.",
        image: "/images/dungeon-canvas.png",
        imageAlt:
          "The interactive Dungeon Canvas showing a two-sector delve map with entrance, hazard, secret, and faction nodes connected by labeled passages",
        inlineImage: "/images/dungeon-canvas-button.png",
        inlineImageAlt:
          "The Build Delve Canvas button, next to Save to Codex and Copy, on a generated dungeon result",
        exclusiveLabel:
          "Codex Cryptica exclusive — generate full Delve Canvases and Dossiers inside the app",
        inlineImageCaption:
          "The Build Delve Canvas button on any generated result",
      },
    ],
    relatedLinks: [
      { href: "/generators/settlement", label: "Settlement Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "adventure-generator": {
    pageTitle:
      "Adventure Idea Generator | Multi-Genre RPG Scenario Generator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready adventure concepts for any RPG genre — initial situations, primary objectives, key locations, threats, clues, complications, and possible outcomes.",
    introTitle: "Adventure Idea Generator",
    eyebrow: "Adventure Generator",
    introText:
      "Create rich, multi-layered adventure scenarios across any RPG genre or world theme. Generates initial situations, primary pressures, key locations, key actors, threats, discoveries, complications, stakes, and non-linear possible outcomes — a situation, not a plot.",
    canonicalPath: "/generators/adventure-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-adventure-generator.jpg",
    ogImageAlt:
      "Codex Cryptica adventure idea generator drafting multi-layered scenarios, objectives, and outcomes",
    keywords: [
      "adventure idea generator",
      "rpg scenario generator",
      "campaign plot generator",
      "dynamic adventure generator",
      "ttrpg scenario creator",
    ],
    faqs: [
      {
        question: "What does the adventure generator create?",
        answer:
          "It creates complete, campaign-ready adventure situations including initial situation, primary objective & pressure, key locations, important NPCs & factions, threats, discoveries, complications, rewards, and multiple possible outcomes.",
      },
      {
        question: "Does it force a linear plot?",
        answer:
          "No. The generator produces a dynamic situation with multiple non-linear resolutions and key actors, giving players full agency rather than railroading them through a fixed sequence of events.",
      },
      {
        question: "Is it only for fantasy games?",
        answer:
          "No. The generator dynamically adapts to all Codex Cryptica world themes — fantasy, sci-fi, cyberpunk, dark fantasy, gothic horror, post-apocalyptic, pirate, western, steampunk, modern conspiracy, and Lancer.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy adventure ideas on this page without logging in. Save drafts directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      ADVENTURE_CANVAS_FAQ,
    ],
    relatedLinks: [
      {
        href: "/generators/dungeon-generator",
        label: "Dungeon & Delve Generator",
      },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "plot-twist-generator": {
    pageTitle: "Plot Twist & Complication Generator | Codex Cryptica",
    metaDescription:
      "Generate coherent RPG plot twists that preserve established facts, add fair foreshadowing, and create meaningful player choices.",
    introTitle: "Plot Twist & Complication Generator",
    eyebrow: "Plot Twist Generator",
    introText:
      "Turn an established situation into a fair, playable reversal or complication. Keep the facts that matter, overturn an assumption, and give the players new choices.",
    canonicalPath: "/generators/plot-twist-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-plot-twist-generator.jpg",
    ogImageAlt:
      "Codex Cryptica plot twist generator drafting playable story reversals, foreshadowing, and complications",
    keywords: [
      "plot twist generator",
      "rpg plot twist",
      "story complication generator",
      "quest twist creator",
      "tabletop plot reversals",
    ],
  },
  holiday: {
    pageTitle:
      "Holiday & Festival Generator | RPG Culture Calendar Creator | Codex Cryptica",
    metaDescription:
      "Create culturally grounded holidays, festivals, memorials, and coherent calendars for any RPG setting. Add important people and history, then generate one observance or a connected calendar.",
    introTitle: "Holiday & Festival Generator",
    eyebrow: "Worldbuilding Calendar Generator",
    introText:
      "Create observances that feel like they grew from a society's history, climate, beliefs, and conflicts. Generate one memorable day or a coherent calendar, from celebratory festivals to contested memorials, without needing an account.",
    canonicalPath: "/generators/holiday",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-holiday.jpg",
    ogImageAlt:
      "Holiday and festival generator showing a culturally grounded observance and calendar details",
    keywords: [
      "rpg holiday generator",
      "fantasy festival generator",
      "worldbuilding calendar generator",
      "fictional holidays",
      "rpg festival generator",
    ],
    faqs: [
      {
        question: "Can I generate a full calendar?",
        answer:
          "Yes. Choose a calendar size to create a connected set of observances with a coherent mix, shared cultural motifs, and timing distributed across the society's year.",
      },
      {
        question: "Can I include historical figures and events?",
        answer:
          "Yes. Add people or events as optional context. The generator treats them as candidates and only builds observances around those a culture might plausibly commemorate.",
      },
      {
        question: "Does it only create cheerful festivals?",
        answer:
          "No. Results can include holy days, fasts, memorials, civic holidays, market fairs, rites of passage, celestial observances, and contested or secret traditions.",
      },
    ],
    relatedLinks: [
      {
        href: "/answers/how-do-you-create-a-believable-fictional-religion",
        label: "Create a believable fictional religion",
      },
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Run political intrigue and faction play",
      },
    ],
  },
  personality: {
    pageTitle:
      "Personality Generator | Free RPG Character Personality Tool | Codex Cryptica",
    metaDescription:
      "Draft a character's personality with drives, virtue and flaw, a contradiction, speech cues and behaviour under pressure. Prepare roleplay for your RPG.",
    introTitle: "Personality Generator",
    eyebrow: "Character Personality Generator",
    introText:
      "Work out how a character speaks, what they protect and what makes them lose their composure. Tailor a personality with AI, or take a random non-AI profile as a starting point for the next conversation.",
    canonicalPath: "/generators/personality",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-personality.jpg",
    ogImageAlt:
      "Codex Cryptica personality generator drafting a character's drives, contradiction, and roleplaying cues",
    keywords: [
      "personality generator",
      "random personality generator",
      "character personality generator",
      "rpg personality generator",
      "npc personality generator",
      "character trait generator",
    ],
    faqs: [
      {
        question: "What does the Personality Generator create?",
        answer:
          "A character profile with a core personality, speech style, a tell and roleplaying cues. The GM reference covers outward demeanour versus inner nature, drives, virtue and flaw, contradiction, pressure response, social behaviour, boundaries and example reactions. It is not a complete rules or statistics sheet.",
      },
      {
        question: "Do the personality settings affect non-AI generation?",
        answer:
          "The AI prompt uses your selected traits, role and optional context to tailor a profile. Non-AI generation instead picks a prewritten personality at random, independent of those choices; it does not incorporate the context you enter. Use the settings as editing prompts if you are working without AI.",
      },
      {
        question: "How do I use the profile at the table?",
        answer:
          "Choose a current want and one speech or physical cue for ordinary conversation. If the character is cornered, look at Under Pressure and Boundary / Trigger to work out what they do differently. Review the draft for consistency and adapt it to the character and situation.",
      },
      {
        question: "What does Add to my Codex save?",
        answer:
          "It imports one new Character into your local vault. The quick roleplaying cues and speech style remain in the main description, with deeper drives and reactions in GM notes in the standard draft. Review AI drafts before sharing. It does not automatically add relationships, create a game-system stat block or replace an existing Character.",
      },
      {
        question: "Can I enrich a character who already exists in my vault?",
        answer:
          "Yes. Copy the useful cues into the existing Character rather than importing a second one. For a Character already configured for Guest Character Chat, the edit-mode Chats panel also offers Generate Full Profile when AI is available; review and save the Personality & Voice lore on that entry.",
      },
    ],
    relatedLinks: [
      { href: "/generators/npc", label: "NPC Generator" },
      { href: "/generators/dnd-npc", label: "D&D NPC Generator" },
      { href: "/generators/bbeg-generator", label: "BBEG Generator" },
    ],
  },
  "bbeg-generator": {
    pageTitle:
      "BBEG / Campaign Villain Generator | Free RPG Antagonist Tool | Codex Cryptica",
    metaDescription:
      "Draft a campaign villain with a goal, lieutenants, clues, an escalating plan and weaknesses. Give your RPG party meaningful ways to interrupt it.",
    introTitle: "BBEG / Campaign Villain Generator",
    eyebrow: "Campaign Villain Generator",
    introText:
      "Give your campaign a villain who acts even when the party is elsewhere. Develop their public face, private goal, subordinates and escalating plan, then decide what the players can discover, interrupt or change.",
    canonicalPath: "/generators/bbeg-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-bbeg-generator.jpg",
    ogImageAlt:
      "Codex Cryptica BBEG / campaign villain generator drafting an antagonist's goal, methods, lieutenants, and escalating plan",
    keywords: [
      "bbeg generator",
      "campaign villain generator",
      "rpg antagonist generator",
      "dnd villain generator",
      "tabletop villain creator",
    ],
    faqs: [
      {
        question: "What does the BBEG Generator create?",
        answer:
          "A system-neutral antagonist profile with public reputation and early signs, plus motives, methods, named lieutenants, an escalating plan, discovery layers, a vulnerability and the consequences of defeat. It is not a combat stat block or a complete adventure.",
      },
      {
        question:
          "What is the difference between Villain Archetype and World Relation?",
        answer:
          "Archetype describes the kind of antagonist and their usual methods. World Relation describes what they want from the existing order. A Guardian might be a cult leader or a corrupt ruler, but both would harm others in the name of protecting something. Degree of Sympathy / Redeemability helps you decide whether the party could understand or negotiate with them.",
      },
      {
        question: "How do the AI and non-AI modes differ?",
        answer:
          "AI generation uses the selected tone, threat scale, archetype, sympathy, world relation and optional campaign context as guidance. Non-AI mode uses prewritten material and incorporates some selected details, but does not incorporate the campaign context or tailor the prose to Tone. Treat either result as a draft to adapt before play.",
      },
      {
        question: "What if the party disrupts a stage or ignores the villain?",
        answer:
          "The plan describes the villain's intended progression, not a set of required chapters. Use Escalation If Ignored to decide what happens without interference. If the players foil an objective, revise subsequent stages based on what the villain lost, who intervened and what the remaining allies can still accomplish.",
      },
      {
        question: "What does Add to my Codex save?",
        answer:
          "A newly generated villain becomes one new Character in your local vault, with the public face, calling card and first signs in the main description and the generated GM lore in GM notes. Named lieutenants and stages are text, not automatically created Characters, relationships or timeline events. Copy and Share include the full draft; a shared remix saves the restored text in GM notes, so you can decide which details to make public.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      {
        href: "/generators/secret-society",
        label: "Secret Society Generator",
      },
      {
        href: "/generators/villain-scheme-generator",
        label: "Villain Scheme Generator",
      },
    ],
  },
  "villain-scheme-generator": {
    pageTitle:
      "Superhero Villain Scheme Generator | Comic Book Plot Tool | Codex Cryptica",
    metaDescription:
      "Generate a staged, discoverable, escalating superhero villain scheme -- objective, motivation, current activity, resources, scheme stages, clues, complications, and consequences if nobody intervenes.",
    introTitle: "Superhero Villain Scheme Generator",
    eyebrow: "Superhero / Comic Book Generator",
    introText:
      "Create an ongoing villain plot for a Superhero / Comic Book campaign: an objective, why they want it, what they're doing right now, resources and minions, escalating scheme stages the heroes can discover and disrupt, complications, and consequences if nobody intervenes. Any villain -- existing or freshly imagined -- can be running it. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/villain-scheme-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-villain-scheme-generator.jpg",
    ogImageAlt:
      "Codex Cryptica superhero villain scheme generator drafting an escalating, discoverable plot with clues and consequences",
    keywords: [
      "villain scheme generator",
      "superhero plot generator",
      "comic book villain plan",
      "superhero campaign generator",
      "villain plot generator",
    ],
    faqs: [
      {
        question: "What does the Villain Scheme generator create?",
        answer:
          "It creates an ongoing villain plot, not a villain biography: an objective, why they want it, what they're doing right now, resources and minions, 4-6 escalating scheme stages with clues heroes can uncover at each one, complications, escalation if ignored, consequences if nobody intervenes, and an optional twist -- plus a ready-to-run Adventure Hook drawn from the scheme's current stage.",
      },
      {
        question: "Is this the same as the BBEG / Campaign Villain generator?",
        answer:
          "No. The BBEG generator writes up a full villain character. This generator writes the SCHEME itself -- a staged, discoverable, escalating plot that any villain, existing or freshly imagined, could be running.",
      },
      {
        question: "Can I send the result to another generator?",
        answer:
          "Yes. The generated draft includes a 'Generate Plot Twist' action that hands the scheme straight to the Plot Twist Generator as a premise, so you can spin up a twist that recontextualises the scheme.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/bbeg-generator",
        label: "BBEG / Campaign Villain Generator",
      },
      {
        href: "/generators/plot-twist-generator",
        label: "Plot Twist & Complication Generator",
      },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "comic-book-event-generator": {
    pageTitle:
      "Comic Book Event Generator | Superhero Campaign Crisis Generator | Codex Cryptica",
    metaDescription:
      "Generate a campaign-scale superhero event — an alien invasion, hero civil war, secret invasion, reality fracture, and more — with a staged escalation and concrete, lasting consequences, not just a flashy premise.",
    introTitle: "Comic Book Event Generator",
    eyebrow: "Superhero Event Generator",
    introText:
      "Create a large, crossover-tier superhero crisis a campaign can build an arc around: a premise, a staged escalation the party can witness and intervene in, and concrete, campaign-persistent consequences — a location changed, an institution's trust broken, a hero unmasked — not just a premise that resets to normal. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/comic-book-event-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-comic-book-event-generator.jpg",
    ogImageAlt:
      "Codex Cryptica Comic Book Event generator drafting a superhero campaign crisis with staged escalation and lasting consequences",
    keywords: [
      "comic book event generator",
      "superhero event generator",
      "superhero campaign crisis generator",
      "comic book crossover generator",
      "superhero rpg generator",
    ],
    faqs: [
      {
        question: "What does the Comic Book Event generator create?",
        answer:
          "It creates a large, campaign-scale superhero crisis: a premise / inciting incident, a public response, a staged escalation across several beats, the true cause behind the event, and concrete, lasting consequences that persist after the climax — a location destroyed, an institution's trust broken, a hero publicly unmasked, or a new political reality.",
      },
      {
        question: "Does the event actually change the campaign afterward?",
        answer:
          "Yes, by design. Every generated event includes a dedicated 'Lasting Consequences' section, and the generator is explicitly guarded against vague resolutions like 'the city was saved' or 'life returned to normal' — consequences must be specific enough for a GM to reference sessions later.",
      },
      {
        question: "What scale of event does this generate?",
        answer:
          "Comic Book Events are campaign-scale by nature, so the Scale option runs from National through Multiversal. For a smaller, single-villain threat, use the BBEG / Campaign Villain or Quest Hook generators instead.",
      },
    ],
    relatedLinks: [
      { href: "/generators/bbeg-generator", label: "BBEG Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
      {
        href: "/generators/secret-society",
        label: "Secret Society Generator",
      },
    ],
  },
  "origin-generator": {
    pageTitle:
      "Superhero Origin Generator | Free RPG Origin Story Tool | Codex Cryptica",
    metaDescription:
      "Generate a superhero origin story with a concrete origin event, a GM-usable campaign hook, and an ongoing consequence that the backstory itself never resolves.",
    introTitle: "Superhero Origin Generator",
    eyebrow: "Superhero Origin Story Generator",
    introText:
      "Build a superhero origin that is more than a backstory paragraph: a concrete origin event, at least one campaign hook a GM can use tonight, and an ongoing consequence that stays unresolved. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/origin-generator",
    keywords: [
      "superhero origin generator",
      "superhero backstory generator",
      "comic book origin generator",
      "superhero character generator",
      "rpg superpower origin",
    ],
    faqs: [
      {
        question: "What does the Superhero Origin Generator create?",
        answer:
          "It creates a full superhero origin: the concrete origin event itself (mutation, accident, experiment, technology, magic, alien heritage, artefact, cosmic event, inherited mantle, government programme, or divine/extradimensional intervention), what the public believes versus the full truth, at least one campaign hook a GM can use immediately, and at least one ongoing consequence the origin story does not resolve.",
      },
      {
        question:
          "Why does the origin include a hook and a consequence, not just a backstory?",
        answer:
          "An origin that only explains where the power came from is a dead end at the table. Every generated origin structurally separates the event from a usable hook and a lasting complication, so it plugs straight into an ongoing campaign instead of sitting as flavour text.",
      },
      {
        question: "Is this generator specific to the superhero genre?",
        answer:
          "Yes. Unlike most Codex Cryptica generators, this one is Superhero / Comic Book only by design — origins are an inherently superhero-genre concept, so there is no genre selector.",
      },
    ],
    relatedLinks: [
      { href: "/generators/npc", label: "RPG NPC Generator" },
      { href: "/generators/personality", label: "Personality Generator" },
      {
        href: "/generators/bbeg-generator",
        label: "BBEG / Campaign Villain Generator",
      },
    ],
  },
  "adventure-idea-generator": {
    pageTitle:
      "Adventure Idea Generator | Multi-Genre RPG Scenario Generator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready adventure concepts for any RPG genre — initial situations, primary objectives, key locations, threats, clues, complications, and possible outcomes.",
    introTitle: "Adventure Idea Generator",
    eyebrow: "Adventure Generator",
    introText:
      "Create rich, multi-layered adventure scenarios across any RPG genre or world theme. Generates initial situations, primary pressures, key locations, key actors, threats, discoveries, complications, stakes, and non-linear possible outcomes — a situation, not a plot.",
    canonicalPath: "/generators/adventure-generator",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-adventure-idea-generator.jpg",
    ogImageAlt:
      "Codex Cryptica adventure idea generator drafting dynamic RPG situations, threats, and discoveries",
    keywords: [
      "adventure idea generator",
      "rpg adventure concept",
      "scenario seed generator",
      "tabletop scenario tool",
      "adventure prep",
    ],
    faqs: [
      {
        question: "What does the adventure generator create?",
        answer:
          "It creates complete, campaign-ready adventure situations including initial situation, primary objective & pressure, key locations, important NPCs & factions, threats, discoveries, complications, rewards, and multiple possible outcomes.",
      },
      ADVENTURE_CANVAS_FAQ,
    ],
    relatedLinks: [
      {
        href: "/generators/dungeon-generator",
        label: "Dungeon & Delve Generator",
      },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "one-shot-adventure-generator": {
    pageTitle:
      "One-Shot Adventure Generator | Run-Ready, Timed RPG One-Shots | Codex Cryptica",
    metaDescription:
      "Generate a one-shot you can run tonight: a timed scene list, NPCs, clues with more than one route, a climax with two or more endings and a one-page GM cheat sheet. System-neutral and free.",
    introTitle: "One-Shot Adventure Builder",
    eyebrow: "One-Shot Adventure Generator",
    introText:
      "Pick a genre, session length and style, and get a complete single-session adventure: a GM briefing, an opening scene, three to six scenes with minute budgets, NPCs, challenges, clues, a finale and a cheat sheet. Each scene is marked essential or optional, with a way to shorten or skip it and a running-late path. Regenerate one scene or NPC without changing the rest. Works without login.",
    canonicalPath: "/generators/one-shot-adventure-generator",
    keywords: [
      "one shot adventure generator",
      "rpg one shot generator",
      "one shot builder",
      "ttrpg one shot ideas",
      "last minute rpg adventure",
    ],
    faqs: [
      {
        question: "What do I get from the One-Shot Adventure Builder?",
        answer:
          "A GM briefing, an opening scene with a first decision, three to six scenes with times, NPCs with motivations and roleplay cues, challenges with fail-forward outcomes, clues, at least two endings and a one-page GM cheat sheet. It is meant to be run, not just read.",
      },
      {
        question: "Will it fit my session length?",
        answer:
          "Scene times plus a buffer add up to the session length you pick (2, 3, 4 or 6 hours). Optional scenes can be cut, and a running-late path lists what to drop first. Times are planning guidance, not a promise about how your table will pace.",
      },
      {
        question: "Does it include stat blocks or rules for my system?",
        answer:
          "No. It is system-neutral and never invents stat blocks, difficulty numbers or rules text. If you pick a system, it reminds you to supply the mechanics yourself.",
      },
      {
        question: "Can I change one scene without losing the rest?",
        answer:
          "Yes. Regenerate a single scene or NPC. The core truth, clues, times, scene links and NPC names stay put, and you are warned if a change could cause a contradiction.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/adventure-generator",
        label: "Adventure Idea Generator",
      },
      { href: "/generators/npc", label: "NPC Generator" },
      {
        href: "/answers/how-do-you-write-a-one-shot-adventure",
        label: "How to write a one-shot adventure",
      },
      {
        href: "/answers/how-do-i-pace-an-rpg-one-shot",
        label: "How to pace an RPG one-shot",
      },
    ],
  },
  "council-vote": {
    pageTitle:
      "Council Vote Generator | RPG Political Quest Creator | Codex Cryptica",
    metaDescription:
      "Generate a political vote quest: a named council of voters with distinct agendas that the party must sway before a deadline decision. Works for any RPG genre.",
    introTitle: "Council Vote Generator",
    eyebrow: "Political Quest Generator",
    introText:
      "Create a campaign-ready political vote — a council of named voters with different motives, alliances, secrets, and demands, plus a deadline and a voting threshold. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/council-vote",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-council-vote.jpg",
    ogImageAlt:
      "Codex Cryptica council vote generator drafting political quests, voting blocs, and leverage",
    keywords: [
      "council vote generator",
      "political quest generator",
      "voting bloc creator",
      "rpg political intrigue",
      "noble council tool",
    ],
    faqs: [
      {
        question: "What does the council vote generator create?",
        answer:
          "It creates a complete political vote quest: the proposal being voted on, the deadline and voting procedure, and a named council where every voter has a public position, a true agenda, an initial stance, relationships to other voters, what would persuade them, and a secret or piece of leverage.",
      },
      {
        question:
          "Does the party always have a guaranteed way to win the vote?",
        answer:
          "No — by design, the generator never hands the party a single guaranteed majority. It aims for at least two viable voting coalitions, so players have to build a path from persuasion, evidence, leverage, and favours rather than following one prescribed solution.",
      },
      {
        question: "Can I use it for genres other than fantasy?",
        answer:
          "Yes. Town councils, noble courts, senates, clan moots, war councils, corporate boards, revolutionary committees, interstellar assemblies, criminal syndicates, and religious conclaves are all supported governing-body types.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/kingdom", label: "Kingdom Generator" },
    ],
  },
  heist: {
    pageTitle:
      "Heist Generator | RPG Score & Infiltration Creator | Codex Cryptica",
    metaDescription:
      "Generate a table-ready RPG heist: the score, a prize with a practical catch, casing intel, three security rings, an escalating alarm track, complications, and conditional getaway routes.",
    introTitle: "Heist Generator",
    eyebrow: "Score & Infiltration Generator",
    introText:
      "Prepare a score the crew can approach in different ways. Draft a concrete objective with a practical catch, casing intel, layered security, an alarm track and exit options that change as defenders respond. Generate without an account and keep the score in your local vault.",
    canonicalPath: "/generators/heist",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-heist.jpg",
    ogImageAlt:
      "Codex Cryptica heist generator drafting a score, layered security rings, and an alarm track",
    keywords: [
      "heist generator",
      "rpg heist generator",
      "tabletop rpg heist generator",
      "infiltration scenario generator",
      "blades in the dark score generator",
      "dnd heist ideas",
    ],
    labels: ["heist"],
    faqs: [
      {
        question: "What does the heist generator create?",
        answer:
          "A complete score: the objective, the prize and its practical complication, at least three pieces of casing intel, three distinct security rings, a five-state alarm track from Quiet to Lethal Response, complications, a transition into escape when the objective is achieved, alternate getaway routes and flashback opportunities. Discovery and alarm depend on the situation described in the score.",
      },
      {
        question: "Is there one correct way through the security?",
        answer:
          "No. Every security ring is written with at least two genuinely different approaches, so the crew can talk, sneak, forge, bribe, or force their way past each layer rather than hunting for the single intended solution.",
      },
      {
        question: "How do the flashback opportunities work?",
        answer:
          "They are options the players could plausibly establish after the fact. Agree the cost under your game’s rules, and use a flashback to make a preparation relevant to a choice the crew has just made.",
      },
      {
        question: "Does it work outside fantasy?",
        answer:
          "Yes. Choose a vibe and a matching Target, such as a fantasy Temple Reliquary or a cyberpunk Data Fortress. Adapt the score’s security and alarm response to your setting; it is not tied to a specific rules system.",
      },
      {
        question: "Does reaching the objective automatically trigger an alarm?",
        answer:
          "Not necessarily. Check the transition and Alarm Track: a scheduled inspection, witness or visible evidence may expose the crew later, leaving a window to escape. Change the available routes only when the stated response occurs.",
      },
      {
        question: "What gets saved in my Codex?",
        answer:
          "Add to my Codex opens the generated score as one Event, keeping the objective and casing in the main text and its hidden factor, security rings, alarm, complications and getaway in GM notes. Link the Event to existing locations, people and prizes yourself. A text-only shared remix retains the combined score in GM notes of an Event; review before sharing.",
      },
    ],
    relatedLinks: [
      {
        href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
        label: "How to Run a Heist (Guide)",
      },
      {
        href: "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
        label: "Choosing a Heist Target (Guide)",
      },
      {
        href: "/examples/the-breakwater-vault-space-western-heist",
        label: "Space Western Heist Example",
      },
      {
        href: "/examples/the-dawnheart-diadem-fantasy-heist",
        label: "Classic Fantasy Heist Example",
      },
      {
        href: "/examples/the-quell-extraction-cyberpunk-heist",
        label: "Cyberpunk Extraction Example",
      },
      {
        href: "/topics/heists",
        label: "RPG Heists Topic Hub",
      },
      { href: "/generators/dungeon-generator", label: "Dungeon Generator" },
      { href: "/generators/npc", label: "NPC Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "secret-society": {
    pageTitle:
      "Secret Society Generator | Cult & Conspiracy Creator | Codex Cryptica",
    metaDescription:
      "Create campaign-ready cults, secret societies, sects, and conspiracies with beliefs, rituals, public faces, hidden truths, and adventure hooks.",
    introTitle: "Secret Society Generator",
    eyebrow: "Cult, Sect & Conspiracy Generator",
    introText:
      "Build a reusable society with a belief, ritual, public cover, secret truth, and immediate hooks for your campaign.",
    canonicalPath: "/generators/secret-society",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-secret-society.jpg",
    ogImageAlt:
      "Codex Cryptica secret society generator drafting cults, hidden orders, rituals, and conspiracies",
    keywords: [
      "secret society generator",
      "cult generator",
      "conspiracy generator",
      "occult order creator",
      "rpg secret sect",
    ],
    faqs: [
      {
        question: "What does the secret society generator create?",
        answer:
          "It creates a campaign-ready cult, sect, conspiracy, or hidden order with a doctrine, revered thing, rituals, recruitment method, public cover, leadership structure, secret truth, signs, conflict, and adventure hooks.",
      },
      {
        question: "Can I use it outside fantasy?",
        answer:
          "Yes. It supports fantasy cults, corporate conspiracies, academic circles, criminal orders, cosmic-horror sects, and other genre-neutral hidden organisations.",
      },
      {
        question: "Can I save the result into my campaign?",
        answer:
          "Yes. Generate and copy a result without logging in, or save it as a Faction draft in your browser-local Codex Cryptica vault and link it to its people, places, rumours, and rivals.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/god-generator", label: "God & Deity Generator" },
    ],
  },
  "star-system": {
    pageTitle:
      "Star System Generator | Sci-Fi RPG Solar System Creator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready sci-fi star systems — star(s), 3-12 major bodies, factions, resources, travel hazards, and a system-wide conflict or mystery with adventure hooks.",
    introTitle: "Star System Generator",
    eyebrow: "Star System Generator",
    introText:
      "Create a coherent sci-fi star system for your campaign — not just an astronomical inventory. Choose its system type, genre, civilisation level, character, and scientific realism, then generate a star (or stars), major bodies, factions, resources, hazards, and a system-wide conflict or mystery worth building a campaign around.",
    canonicalPath: "/generators/star-system",
    labels: ["sci-fi"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-star-system.jpg",
    ogImageAlt:
      "Codex Cryptica star system generator drafting stellar bodies, space factions, hazards, and conflict",
    keywords: [
      "star system generator",
      "solar system creator",
      "scifi star system",
      "space campaign generator",
      "astronomical system creator",
    ],
    faqs: [
      {
        question: "What does the star system generator create?",
        answer:
          "It generates a complete sci-fi star system: the star or stars, 3-12 named major bodies (planets, moons, asteroid belts, stations, or anomalies), the factions competing for influence, the system's strategic resource, a named travel hazard, and a system-wide conflict or mystery with playable adventure hooks.",
      },
      {
        question: "Is this just a list of planets?",
        answer:
          "No. The generator is built to answer why anyone cares about the system, not just what orbits the star — every major body, faction, and hazard ties back to the system's central stakes.",
      },
      {
        question:
          "Can I turn a generated planet or moon into a full World Generator entry?",
        answer:
          "Yes — select Develop This World on any named body in the result to open the Sci-Fi World Generator with that body's context pre-filled, so the world you build fits the system it came from.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy star systems on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/world", label: "Sci-Fi World Generator" },
      { href: "/generators/ship-generator", label: "Ship Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/topics/star-systems", label: "Star Systems Topic Hub" },
    ],
  },
  constellation: {
    pageTitle:
      "Constellation Generator | RPG Night Sky & Star Lore Creator | Codex Cryptica",
    metaDescription:
      "Generate a culturally meaningful RPG constellation — a star pattern, an origin myth, seasonal visibility, practical use, cultural meaning, an omen, and an adventure hook.",
    introTitle: "Constellation Generator",
    eyebrow: "Constellation Generator",
    introText:
      "Create a night-sky constellation with a story behind it, not just a random name. Choose its genre, visual impression, practical use, and cultural meaning, then generate a star pattern, the culture that reads meaning into it, an origin myth, when it's visible, what it's used for, and one adventure hook.",
    canonicalPath: "/generators/constellation",
    labels: ["worldbuilding"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-constellation.jpg",
    ogImageAlt:
      "Codex Cryptica constellation generator drafting a star pattern, origin myth, and cultural meaning",
    keywords: [
      "constellation generator",
      "rpg night sky generator",
      "star lore generator",
      "fantasy constellation names",
      "worldbuilding star myths",
    ],
    faqs: [
      {
        question: "What does the constellation generator create?",
        answer:
          "It generates one named constellation: a star pattern, the specific culture that reads a shape into it, an origin myth explaining why that shape exists, when and where it's visible, a practical mundane use (navigation, planting, migration, timekeeping), its cultural or religious meaning, an omen, and one playable adventure hook.",
      },
      {
        question: "Is this astronomically accurate?",
        answer:
          "No, and it isn't meant to be. Star positions are a readable worldbuilding shape, not a real sky chart — the goal is a constellation a GM can use at the table, not a planetarium simulation.",
      },
      {
        question:
          "Can different cultures interpret the same stars differently?",
        answer:
          "The generator's data model is built to support that: a star pattern is kept separate from its cultural interpretation, so a later pass can hand the same pattern to a second culture with its own myth, use, and meaning.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy constellations on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/star-system", label: "Star System Generator" },
      { href: "/generators/world", label: "Sci-Fi World Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
    ],
  },
  "alien-race": {
    pageTitle:
      "Alien Race Generator | Sci-Fi Alien Species Creator | Codex Cryptica",
    metaDescription:
      "Generate coherent alien species for sci-fi RPG campaigns — biology, homeworld, senses, culture, technology, weaknesses, naming conventions, and adventure hooks that all follow from each other.",
    introTitle: "Alien Race Generator",
    eyebrow: "Alien Species & Xenobiology Generator",
    introText:
      "Build an alien species that is genuinely non-human. Every biological and environmental trait changes something else — six limbs reach their tools and architecture, chemical speech changes what privacy means, a long life reshapes their politics.",
    canonicalPath: "/generators/alien-race",
    labels: ["sci-fi"],
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-alien-race.jpg",
    ogImageAlt:
      "The Codex Cryptica alien race generator with an example species drafted: overview, evolutionary origin, homeworld, biology, weaknesses, naming conventions, and archetypes beside the input controls",
    keywords: [
      "alien race generator",
      "scifi alien creator",
      "xenobiology generator",
      "alien species worldbuilding",
      "extraterrestrial species creator",
    ],
    faqs: [
      {
        question: "What does the alien race generator create?",
        answer:
          "A campaign-ready alien species with a physical description, evolutionary origin, homeworld, biology and lifecycle, senses and communication, culture, technology, beliefs, relations with outsiders, internal factions, weaknesses, naming conventions, typical archetypes, and adventure hooks.",
      },
      {
        question:
          "How is this different from just describing an unusual-looking humanoid?",
        answer:
          "The generator is built around consequence: every major biological or environmental trait has to change something else about the species. A six-limbed species gets tools, architecture and social concepts that assume six limbs; a species that communicates chemically gets a different idea of privacy, deception and law. A trait that shows up in the biology section and nowhere else is treated as a failure.",
      },
      {
        question: "What is the difference between Grounded and Freeform mode?",
        answer:
          "Grounded / Evolutionary keeps the species biologically plausible and clearly shaped by selection pressure from its environment. Freeform / Fantastic also allows exotic life — crystalline organisms, colonial swarm minds, plasma structures, and self-replicating machine lineages — while still requiring that strangeness to have consistent consequences.",
      },
      {
        question: "Can I build a species to fit a world I already have?",
        answer:
          "Yes. Describe the world, system, or powers in the campaign context field and the species is built to fit it, keeping any names you introduce. Inside a Codex Cryptica vault, the in-app generator also grounds the species in your existing entities.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy alien species on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/star-system", label: "Star System Generator" },
      { href: "/generators/world", label: "Sci-Fi World Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
    ],
  },
  creature: {
    pageTitle:
      "Creature Generator | RPG Monster, Beast & Fauna Creator | Codex Cryptica",
    metaDescription:
      "Generate monsters, beasts, alien fauna, undead, and magical creatures for any tabletop RPG. Complete with appearance, ecology, signs, tactics, weaknesses, and adventure hooks.",
    introTitle: "Creature Generator",
    eyebrow: "Monster & Creature Generator",
    introText:
      "Draft a beast, construct, undead creature or alien inhabitant with a place in its ecosystem, signs the party can notice and behaviour they can respond to. Choose how dangerous and intelligent it is, then use its known abilities, hidden traits and hooks to plan an encounter.",
    canonicalPath: "/generators/creature",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-creature.jpg",
    ogImageAlt:
      "Codex Cryptica creature generator drafting monsters and beasts with ecology, signs, abilities, and adventure hooks",
    keywords: [
      "creature generator",
      "monster generator",
      "fantasy monster generator",
      "rpg monster creator",
      "alien fauna generator",
      "dnd monster maker",
      "tabletop beast generator",
    ],
    faqs: [
      {
        question: "What does the Creature Generator create?",
        answer:
          "A creature profile with name, classification, habitat, appearance, ecological role, signs, abilities, weaknesses, encounter behaviour, harvestable materials and GM hooks. It is a narrative profile, not a system-specific combat stat block.",
      },
      {
        question: "Is this only a fantasy monster generator?",
        answer:
          "No. Genre / Theme offers different settings, including cyberpunk, sci-fi, gothic horror and post-apocalyptic worlds. Choose an appropriate Creature Category / Origin and Habitat / Environment to situate it.",
      },
      {
        question:
          "Can it generate non-hostile creatures, mounts, or familiars?",
        answer:
          "Yes. Select roles such as Herbivore / Migratory Grazer, Mount / Domesticated Beast or Familiar / Companion and a suitable Threat Level. Decide how the creature reacts to attention, offerings or a threat to its home.",
      },
      {
        question: "How are intelligent or sapient creatures handled?",
        answer:
          "When a semi-sapient, fully sapient, or alien-minded temperament is selected, the generator adds communication methods, motives, social hierarchy, and relationship with nearby settlements, enabling memorable alien societies or monster cultures.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate, reroll and copy the full draft without signing in. Add to my Codex opens one Creature in your local browser vault. The AI is asked to put known characteristics and field signs in the main text and hidden ecology, secret weaknesses, surprise abilities and GM hooks in GM notes; review AI-written text before sharing it. Connect it to existing habitats and NPCs yourself. Shared links contain the full draft; text-only remixes need review since they cannot recover the original public/GM split.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/dungeon-generator", label: "Dungeon Generator" },
      { href: "/generators/alien-race", label: "Alien Race Generator" },
      { href: "/generators/npc", label: "RPG NPC Generator" },
    ],
  },
  tome: {
    pageTitle:
      "Tome & Forbidden Book Generator | Grimoires, Occult Treatises & Alien Codices | Codex Cryptica",
    metaDescription:
      "Generate forbidden tomes, cursed grimoires, occult field journals, and alien data-codices with physical descriptions, excerpted passages, research hazards, and campaign hooks. Works without login.",
    introTitle: "Tome & Forbidden Book Generator",
    eyebrow: "Forbidden Tome Generator",
    introText:
      "Create sinister grimoires, heretical treatises, and esoteric manuscripts with binding details, readable excerpts, investigation risks, and adventure hooks. Works without login, then saves directly to your local Codex vault.",
    canonicalPath: "/generators/tome",
    labels: ["fantasy", "horror", "investigation"],
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-tome.jpg",
    ogImageAlt:
      "Codex Cryptica forbidden tome generator showing a grimoire draft with binding details, significant excerpt, and research hazard",
    keywords: [
      "tome generator",
      "forbidden book generator",
      "grimoire generator",
      "call of cthulhu tomes",
      "occult book generator",
      "rpg spellbook generator",
      "cursed manuscript generator",
    ],
    faqs: [
      {
        question: "What does the Tome Generator create?",
        answer:
          "It produces a complete RPG book entry — title, author, binding materials and physical condition, a significant readable excerpt or marginal gloss, revelations or mechanical boons, reading hazards and investigation risks, current custodian and provenance, and table-ready campaign hooks.",
      },
      {
        question:
          "Can I use this for Call of Cthulhu and investigative horror games?",
        answer:
          "Yes. The generator is system-neutral and designed for Call of Cthulhu, Delta Green, Vaesen, Kult, D&D, OSR, and sci-fi games like Mothership or Lancer. It generates authentic period or genre tone, investigative clues, and narrative hazards rather than hardcoded dice math.",
      },
      {
        question: "Does it support genres outside fantasy and gothic horror?",
        answer:
          "Yes. In addition to fantasy grimoires and cosmic horror texts, it generates cyberpunk datapad archives, sci-fi precursor telemetry slates, post-apocalyptic bunker diaries, steampunk mechanist folios, and modern conspiracy intelligence files across 13 distinct world themes.",
      },
      {
        question: "Does the forbidden book generator require an account?",
        answer:
          "No. You can configure, generate, and copy tome notes without signing in. Selecting 'Save to Codex' stores the draft in your browser's local storage so it imports into your Codex Cryptica campaign vault as a connected Item entity.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/artifact-generator",
        label: "Artifact & Relic Generator",
      },
      { href: "/generators/secret-society", label: "Secret Society Generator" },
      {
        href: "/for/call-of-cthulhu",
        label: "Call of Cthulhu Campaign Workspace",
      },
      {
        href: "/generators/news-sheet-generator",
        label: "News Sheet Generator",
      },
    ],
  },
  business: {
    pageTitle:
      "Business Generator | Shops, Guilds & Enterprises for RPGs | Codex Cryptica",
    metaDescription:
      "Generate one commercial organisation for your tabletop campaign: its owner, staff, suppliers, rivals, reputation, pressure, secret and adventure hooks, with an option for the players to own it.",
    introTitle: "Business Generator",
    eyebrow: "Business Generator",
    introText:
      "Create a business the party can depend on, compete with or own. Draft the people who keep it running, the suppliers it cannot do without, its competitors and a pressure that could interrupt trade. Bring the enterprise and its staff into your Codex, then connect the outside parties that matter to your campaign.",
    canonicalPath: "/generators/business",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-business.png",
    ogImageAlt:
      "Codex Cryptica Business Generator showing the input form and a generated blacksmith with its identity and operations",
    labels: ["business", "economy", "settlement", "npc"],
    keywords: [
      "business generator",
      "rpg business generator",
      "shop generator",
      "rpg shop generator",
      "enterprise generator",
      "company generator",
    ],
    faqs: [
      {
        question: "What does the Business Generator create?",
        answer:
          "One organisation with a name, what it does, who runs it, its key staff, its clients, the suppliers it depends on, its rivals and other relationships, its reputation, a current pressure, an unusual asset, a secret, an opportunity, a complication and two or three adventure hooks.",
      },
      {
        question:
          "How is it different from the Tavern or Social Hub generator?",
        answer:
          "The tavern and social hub generators make a place where people gather. This one makes a business: a specific organisation with its own money, people, rivals and problems. Use it for a courier company, a ripper clinic or a shipyard.",
      },
      {
        question: "Can the players own the business?",
        answer:
          "Yes. Turn on Players own this business and the leader becomes a manager the party employs. You also get starting strengths, liabilities, upgrade paths, recurring obligations and what success attracts. Obligations are named, never priced.",
      },
      {
        question: "What gets created in my Codex?",
        answer:
          "For a generated business, Add to my Codex imports one Faction plus linked Characters for its leader and staff into this browser's local vault. Other suppliers, competitors and outside parties remain named references in the business text. The labelled Secret is stored in GM notes. Shared links contain the complete draft. A text-only remix saves that combined text in GM notes of a Note rather than recreating the business and its connections.",
      },
      {
        question: "Does it work without AI?",
        answer:
          "Yes. Every business can be generated from the built-in tables with AI off. With AI on, the business is written in three stages, and any stage that fails falls back to the tables.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/tavern",
        label: "Tavern Generator",
      },
      {
        href: "/generators/social-hub",
        label: "Social Hub Generator",
      },
    ],
  },
  "point-crawl": {
    pageTitle: "Point Crawl Generator | RPG Route Map Maker | Codex Cryptica",
    metaDescription:
      "Generate playable 6–15 node point crawls for Dungeons, Cities, Wilderness, Regions, and Star Systems. Includes branching paths, loops, hidden shortcuts, key-before-lock gates, and an interactive SVG graph.",
    introTitle: "Point Crawl Generator",
    eyebrow: "Point Crawl Generator",
    introText:
      "Generate an interconnected network of 6–15 locations with explicit travel routes, signposts, loops, hidden shortcuts, and key-before-lock gates. Inspect and rearrange the live node-and-edge graph, then save all or selected points directly into your Codex Cryptica vault.",
    canonicalPath: "/generators/point-crawl",
    labels: ["exploration", "hexcrawl", "dungeon", "adventure"],
    ogImage: "https://assets.codexcryptica.com/og/generator-point-crawl.jpg",
    ogImageAlt:
      "Codex Cryptica Point Crawl Generator showing an interactive node-and-route network diagram with start, hub, secret, and goal locations",
    keywords: [
      "point crawl generator",
      "pointcrawl generator",
      "rpg point crawl",
      "dnd point crawl generator",
      "point crawl map generator",
      "tabletop rpg exploration generator",
      "node based adventure generator",
    ],
    faqs: [
      {
        question: "What does the Point Crawl Generator create?",
        answer:
          "It builds a connected network of 6 to 15 locations (with a Start, hubs, obstacles, optional side nodes, secrets, and a Goal) linked by explicit travel routes. Every node includes sensory details, an encounter or feature, and concrete signposts pointing to connected routes. Every route includes distance or travel time, terrain, risk, and optional gates.",
      },
      {
        question: "How does it prevent dead-end or unsolvable locked routes?",
        answer:
          "A deterministic topology and playability verifier checks every generated network using breadth-first search (BFS). It guarantees at least two branching choice nodes, at least one loop for tactical flanking or retreat, at least one hidden or rumoured shortcut, and verifies that any key, clue, or tool required by a gated route is placed at a node reachable from the Start without crossing that locked route.",
      },
      {
        question:
          "Can I use it for cities, wilderness, or sci-fi star systems?",
        answer:
          "Yes. Choose from six scales — Dungeon, Settlement, City, Wilderness, Region, or Planet / System — across all 13 genres. Route travel times, terrain types, and hazards automatically adapt to your chosen scale and theme.",
      },
      {
        question:
          "How does saving a point crawl to my Codex Cryptica vault work?",
        answer:
          "When you click 'Save to Codex', you can save all generated points or toggle a subset on the interactive graph. Each selected point is imported as a Location entity with automatic route connections and a 'Routes & Exits' lore section, alongside a master overview Note entity that links the entire crawl together.",
      },
    ],
    relatedLinks: [
      {
        href: "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
        label: "How to Build a Point Crawl for an RPG",
      },
      {
        href: "/answers/point-crawl-vs-hex-crawl",
        label: "Point Crawl vs Hex Crawl",
      },
      {
        href: "/answers/what-is-a-point-crawl",
        label: "What Is a Point Crawl in Tabletop RPGs?",
      },
      {
        href: "/examples/the-receding-tide-road-point-crawl",
        label: "Point Crawl Example: The Receding Tide Road",
      },
      {
        href: "/generators/dungeon-generator",
        label: "Dungeon & Delve Generator",
      },
      {
        href: "/generators/one-shot-adventure-generator",
        label: "One-Shot Adventure Generator",
      },
      {
        href: "/generators/settlement",
        label: "Settlement Generator",
      },
    ],
  },
  "mystery-investigation": {
    pageTitle:
      "Mystery & Investigation Generator | Build Fair RPG Cases | Codex Cryptica",
    metaDescription:
      "Create a playable, system-neutral RPG mystery with a fixed GM-only truth, distinct suspects, testable clues, multiple independent leads, escalating pressure, and fair outcomes.",
    introTitle: "Mystery & Investigation Generator",
    eyebrow: "Mystery & Investigation Generator",
    introText:
      "Create a case your players can approach from more than one direction. Choose the mystery type, how many suspects to investigate, and how much pressure they face. Review the fixed truth and timeline, then check the clues against them. Keep the truth in GM notes and use the evidence to prepare what the players can discover.",
    canonicalPath: "/generators/mystery-investigation",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-mystery-investigation.png",
    ogImageAlt:
      "Mystery & Investigation Generator showing a fixed-truth case with player-facing clues and a separate GM-only truth panel.",
    labels: ["mystery", "investigation", "adventure"],
    keywords: [
      "rpg mystery generator",
      "mystery investigation generator",
      "ttrpg case generator",
      "rpg clue generator",
    ],
    faqs: [
      {
        question: "Does the generator choose a fixed culprit?",
        answer:
          "Yes. The draft has a fixed GM-only truth. Check the motive, opportunity and timeline before play; do not replace that answer just because the players suspect someone else.",
      },
      {
        question: "Can the players solve the case without one required roll?",
        answer:
          "The generator aims to provide independent leads that state what they support and what they do not prove. Check that a missed witness or clue cannot block an essential inference before running the case.",
      },
      {
        question: "Can I use the case in any role-playing game?",
        answer:
          "Yes. The generator is system-neutral and supports fantasy, noir, investigative horror, modern and science-fiction settings.",
      },
      {
        question: "Can I give the case to my players?",
        answer:
          "Copy Player Handout exports the player-facing case material. Review it before sharing, since clues may describe facts the party has not yet discovered. Copy GM Case File includes the fixed truth and GM notes, so keep that copy private.",
      },
      {
        question: "What happens when I add the mystery to Codex?",
        answer:
          "After generating, save it as one Note in your local vault with the case material and separate GM notes. The clue diagram is a preview aid when available; the Note preserves the written case, not a board of separate suspects. Link people and places yourself as you develop the case.",
      },
    ],
    relatedLinks: [
      {
        href: "/generators/one-shot-adventure-generator",
        label: "One-Shot Adventure Generator",
      },
      { href: "/generators/quest", label: "Quest Generator" },
      {
        href: "/answers/how-do-you-run-a-mystery-without-railroading",
        label: "Run a mystery without railroading",
      },
      {
        href: "/answers/how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
        label: "Handle a plausible but wrong conclusion",
      },
    ],
  },
};
