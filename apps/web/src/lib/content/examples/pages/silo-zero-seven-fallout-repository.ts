import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2662. Fills the 'location' kind gap (#2644) with a
 * Dungeon generator roll in Post-Apocalyptic — a single explorable site
 * (sectors, factions, hazards, secret) rather than a settlement-scale
 * community. Output reproduced verbatim.
 */
export const siloZeroSeven: ExampleConfigInput = {
  slug: "silo-zero-seven-fallout-repository",
  name: "Silo Zero-Seven Fallout Repository",
  title: "Post-Apocalyptic dungeon example: Silo Zero-Seven Fallout Repository",
  kind: "location",
  genre: "Post-Apocalyptic",
  summary:
    "A sealed federal fallout shelter that never got its all-clear, now split between a cult that worships its unexploded warhead and a starving vault-dweller remnant that just wants the radiation breach fixed.",
  provenance: "raw",
  generator: {
    name: "Dungeon generator",
    href: "/generators/dungeon-generator",
  },
  context: [
    { label: "Genre", value: "Post-Apocalyptic" },
    { label: "Purpose", value: "Fallout Shelter" },
    { label: "Current State", value: "Sealed Vault" },
    { label: "Scale", value: "Medium Complex (3-4 Sectors)" },
  ],
  output: [
    {
      kind: "prose",
      heading: "History & Original Purpose",
      paragraphs: [
        "Silo Zero-Seven was commissioned by a pre-collapse federal contractor as a continuity-of-government shelter, built into reinforced concrete deep enough to survive a direct strike on the regional command centre it served. It housed a rotating staff of essential personnel, a small missile silo for the base's own defence battery, and enough sealed stores to outlast a decade of surface unlivability.",
        "It was never meant to be found by anyone outside its clearance list. The blast door's entrance, a slab half-melted into its frame by whatever hit the surface nearby, was disguised as a maintenance access point for a rail spur that no longer exists.",
      ],
    },
    {
      kind: "prose",
      heading: "Current State & Function",
      paragraphs: [
        "The shelter is still sealed, waiting for an all-clear that never came. Its original staff are long dead, but the facility itself never fully failed — a diesel generator still turns over when called on, and the lower levels have been claimed by two groups who arrived generations apart and now hold an uneasy, unequal truce over what's left of it.",
      ],
    },
    {
      kind: "list",
      heading: "Signature Feature",
      items: [
        {
          term: "The Unexploded Warhead",
          text: "A nuclear missile still resting upright in its rusted launch bay in the Command Bunker Silo, worshipped by the facility's cult faction as a sleeping god they believe must never be woken — and never disarmed, either.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Key Sectors & Layout",
      items: [
        {
          term: "Sector 1: Decontamination Shaft",
          text: "Rusted airlock with dead battery banks and warning signs painted in flaking orange pigment. The only intact entrance, and both factions keep a watch rotation on it.",
        },
        {
          term: "Sector 2: Living Quarters Block B",
          text: "Bunkrooms littered with fifty-year-old personal effects, rusted lockers, and overturned cots. The Vault-Dweller Remnant has resettled here, one family to a bunkroom.",
        },
        {
          term: "Sector 3: Water Reclamation Loop",
          text: "Dripping pipework and rust-choked filtration tanks feeding a stagnant reserve pool. A breach here is slowly flooding the lower level with lightly irradiated runoff.",
        },
        {
          term: "Sector 4: Command Bunker Silo",
          text: "Reinforced control room looking out through thick leaded glass onto the still-loaded launch tube. Held exclusively by the Cinder-Walker Cult, who allow no one else inside.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Faction Situation",
      paragraphs: [
        "The Vault-Dweller Remnant and the Cinder-Walker Cult do not fight, exactly — they coexist on a truce neither side will call by that name, each convinced the other needs them more. The Remnant needs the cult's tacit permission to draw water past the silo checkpoint; the cult needs the Remnant's numbers to keep outsiders from ever reaching the warhead they guard. Both arrangements are fraying, and both sides know it.",
      ],
    },
    {
      kind: "list",
      heading: "The Feral Vault-Dweller Remnant",
      items: [
        {
          term: "Identity",
          text: "Descendants of the shelter's original support staff, three generations removed from the surface and deeply suspicious of anyone who claims to be from it.",
        },
        {
          term: "Virtue & Vice",
          text: "Fiercely protective of their own, but reflexively hostile to any outsider, including ones who could genuinely help them.",
        },
        {
          term: "Goal",
          text: "Seal the radiation breach in the Water Reclamation Loop before it poisons the only water source they have left.",
        },
        { term: "Drive", text: "Survival." },
        {
          term: "Obstacle",
          text: "Radiation creeping in through a breach they cannot seal without tools and expertise none of them possess.",
        },
        {
          term: "Origin",
          text: "Founded by the shelter's last surviving duty roster, who chose to stay rather than risk the surface.",
        },
        {
          term: "Belief",
          text: "The surface killed everyone who ever left to check on it, so no one leaves anymore.",
        },
        {
          term: "Territory",
          text: "Living Quarters Block B, and contested access to the Water Reclamation Loop.",
        },
        {
          term: "Strength",
          text: "Numbers — roughly forty souls, more than the cult can match in a direct confrontation.",
        },
        {
          term: "Leader",
          text: "Warden Yeva Osric — the closest thing they have to elected authority, and the only one still willing to negotiate with the cult directly.",
        },
        {
          term: "Notable",
          text: "Deacon Marl — their last remaining member with any pre-collapse technical training, and the only person alive who might actually be able to fix the breach.",
        },
        {
          term: "Relationship",
          text: "Locked in an unspoken truce with the Cinder-Walker Cult over water access, and increasingly desperate as the breach worsens.",
        },
      ],
    },
    {
      kind: "list",
      heading: "The Cinder-Walker Cult",
      items: [
        {
          term: "Identity",
          text: "A congregation formed two generations ago around the belief that the facility's silence after the collapse was a deliberate sign from the old world, not an accident.",
        },
        {
          term: "Virtue & Vice",
          text: "Genuinely disciplined and orderly, but rigid to the point of letting people suffer rather than break a rule about the warhead.",
        },
        {
          term: "Goal",
          text: "Keep the warhead in the Command Bunker Silo untouched and unwoken until whatever sign they're waiting for finally arrives.",
        },
        { term: "Drive", text: "Devotion." },
        {
          term: "Obstacle",
          text: "Their own internal discord — a growing faction within the cult believes the sign has already come and been ignored.",
        },
        {
          term: "Origin",
          text: "Founded by a scavenger who found the Command Bunker Silo intact and undisturbed and decided that meant something.",
        },
        {
          term: "Belief",
          text: "The facility's silence for thirty clean years is proof it is protected, and disturbing the warhead would end that protection.",
        },
        {
          term: "Territory",
          text: "Command Bunker Silo, exclusively, and the checkpoint at Sector 1.",
        },
        {
          term: "Strength",
          text: "Control of the only sealed, radiation-clean sector in the facility, which the Remnant needs and cannot take by force.",
        },
        {
          term: "Leader",
          text: "First Warden Cass Thorne — presides over the vigil and has not left the Command Bunker Silo in eleven years.",
        },
        {
          term: "Notable",
          text: "Acolyte Renn — leads the internal faction that believes the sign has already come, and is one bad winter from acting on it alone.",
        },
        {
          term: "Relationship",
          text: "Tolerates the Remnant's presence in exchange for their numbers discouraging outside scavengers, but trusts them with nothing that matters.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Dungeon Layout & Sector Connections",
      items: [
        {
          text: "Sector 1 (Decontamination Shaft) is the only way in, and connects directly to Sector 2 (Living Quarters Block B).",
        },
        {
          text: "Sector 2 connects onward to Sector 3 (Water Reclamation Loop), where the breach is slowly worsening.",
        },
        {
          text: "Sector 4 (Command Bunker Silo) connects only to Sector 1's checkpoint, sealed and cult-controlled — there is no route to it through Sectors 2 or 3.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Central Secret / Boss Mystery",
      paragraphs: [
        "The all-clear was received, decades ago, over the shelter's own shortwave set. Someone in command at the time chose not to pass it on — the duty log shows the message logged and initialled, and nothing after it. Whether that choice was cowardice, a mistake, or something more deliberate is a mystery neither faction has ever had the means to investigate, because neither of them knows the log exists.",
      ],
    },
    {
      kind: "list",
      heading: "Hazards & Traps",
      items: [
        {
          text: "Concentrated radiation pockets near the ruptured section of the reclamation loop.",
        },
        {
          text: "Unstable flooring in Sector 2 threatening to collapse into a submerged lower level.",
        },
        {
          text: "A rigged tripwire connected to a decades-old but still-armed shotgun trap, left by the shelter's original security detail and never disarmed.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Treasures & Artifacts",
      items: [
        {
          text: "A pristine, unopened case of pre-war medical antibiotics, still sealed in the Medical Ward stores.",
        },
        {
          text: "A working shortwave set with four other shelters' frequencies inked inside the lid — including the duty log entry that names who silenced the all-clear.",
        },
        {
          text: "A crate of pre-collapse seed stock, viability-tested and still good, that the Remnant does not know is in the facility.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Adventure Hooks & Rumours",
      items: [
        {
          text: "A dying wanderer hands the party a keycard and a hand-drawn map leading to Silo Zero-Seven's sealed bio-vault.",
        },
        {
          text: "Radio chatter picked up near the ruin suggests someone — or something — is still alive down there, decades after it should have gone silent.",
        },
        {
          text: "A nearby settlement's last doctor has heard rumours of pre-war medical supplies sealed inside and is willing to pay well for anything the party can bring back.",
        },
      ],
    },
    {
      kind: "facts",
      heading: "Location profile",
      facts: [
        { label: "Purpose", value: "Fallout Shelter" },
        { label: "Current State", value: "Sealed Vault" },
        { label: "Scale", value: "Medium Complex (4 sectors)" },
        { label: "Genre", value: "Post-Apocalyptic" },
      ],
    },
  ],
  annotation: {
    heading: "What makes this read as a site, not a settlement",
    paragraphs: [
      "The generator's own settlement model and dungeon model share a lot of DNA — both give you named factions with goals and obstacles — but the dungeon model constrains everything to a fixed set of sectors, and that constraint is what makes Silo Zero-Seven playable as a single site rather than an open-ended community. Four sectors, two factions, one route in: a GM can hold the whole thing in their head without notes.",
      "The two factions are deliberately locked into a truce rather than an open war, which is worth noticing as a design choice. An active war between the Remnant and the cult would turn this into a fight the party has to referee or join; a fraying truce turns it into a fuse the party can choose to defuse, light, or simply watch burn while they're busy elsewhere. That's a meaningfully different table experience, and it costs nothing extra to write — it's just which relationship value the generator picked.",
      "The central secret is also doing real structural work: it explains why the facility never got help (the all-clear was suppressed) without requiring either faction to know that's the reason. Players can solve the site's actual mystery — who silenced the all-clear, and why — entirely independently of whichever faction conflict they get pulled into first, which means a GM can run this site twice with two different tables and have it play out completely differently both times.",
    ],
  },
  relatedGenerators: [
    {
      title: "Dungeon generator",
      description:
        "Generate a structured, multi-sector site — ruin, vault, or lair — with factions, hazards, and a central secret. Free, no login.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Settlement generator",
      description:
        "For when the party needs a living community rather than a single explorable site.",
      href: "/generators/settlement",
    },
  ],
  relatedAnswers: [
    {
      title: "What is a point crawl?",
      description:
        "The sector-and-connection structure behind sites like this one, and why it beats a hallway-by-hallway map.",
      href: "/answers/what-is-a-point-crawl",
    },
    {
      title: "How do you design RPG puzzles that do not stall the game?",
      description:
        "Why a fraying truce between two factions gives players more to do than a locked door ever could.",
      href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    },
  ],
  relatedForPages: [],
  relatedExamples: [],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2662",
  seo: {
    title:
      "Post-Apocalyptic dungeon example: Silo Zero-Seven Fallout Repository | Codex Cryptica",
    description:
      "A four-sector Post-Apocalyptic dungeon roll from the Dungeon generator, with two truce-bound factions, a suppressed all-clear, and a fixed sector map a GM can run cold.",
  },
};
