import type { ExampleConfigInput } from "../schema";

/**
 * Source: issue #2850 (heist cluster expansion). Generated directly through
 * the production heist generator for this content pass, not sourced from a
 * community discussion. Reformatted into the example page's block structure
 * and given editorial headings; the generated text itself is unaltered.
 */
export const theDawnheartDiadem: ExampleConfigInput = {
  slug: "the-dawnheart-diadem-fantasy-heist",
  name: "The Dawnheart Diadem",
  title: "Classic Fantasy heist example: The Dawnheart Diadem",
  kind: "heist",
  genre: "Classic Fantasy",
  theme: "fantasy",
  summary:
    "A sun-gold circlet holding a captive phoenix ember, warded to its cradle by three anchoring runes beneath the Argent Ledger Guild, with a hidden verification scribe and a fifteen-minute dawn countdown.",
  provenance: "lightly-edited",
  provenanceNote:
    "Generated directly through the heist generator for this content pass rather than pulled from a community discussion. The generated text is unaltered; only headings and block structure were added to fit the example page format.",
  generator: { name: "Heist generator", href: "/generators/heist" },
  context: [
    { label: "Theme", value: "Classic Fantasy" },
    { label: "Heist Type", value: "Theft" },
    { label: "Target Type", value: "Guild Archive Vault" },
    { label: "Target Scale", value: "Major" },
    { label: "Prize", value: "The Dawnheart Diadem" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/heist-the-dawnheart-diadem.jpg",
    alt: "A glowing sun-gold circlet holding a trapped phoenix ember, resting on a warded basalt cradle in a torch-lit vault",
  },
  output: [
    {
      kind: "list",
      heading: "GM Quick Reference",
      items: [
        {
          term: "Objective",
          text: "Free all three anchors, take the Dawnheart Diadem, and clear the guild district carrying it before dawn staff arrive.",
        },
        {
          term: "Primary obstacle",
          text: "Three warded anchors hold the diadem to its basalt cradle, each requiring several uninterrupted minutes to release.",
        },
        {
          term: "Hidden factor",
          text: "The vaultmaster's ledger has a second, living verification mark added after a recent forgery scandal.",
        },
        {
          term: "Point of no return",
          text: "Beginning the first anchor stage starts the three-stage work clock; the third completed stage starts a fifteen-minute dawn-staff countdown.",
        },
        {
          term: "Pressure",
          text: "Dawn staff begin arriving fifteen minutes after the third anchor is completed.",
        },
        {
          term: "Default complication",
          text: "A senior clerk unexpectedly conducts the vault's scheduled inspection as anchor work begins.",
        },
        {
          term: "Escape problem",
          text: "The absence is noticed ten minutes after the diadem is taken, unless its registration is bypassed.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The Score",
      paragraphs: [
        "Steal the Dawnheart Diadem from the Argent Ledger Guild beneath Guildhall Arithmancy, free it from its anchoring runes, and get clear before dawn staff arrive. The guild holds the diadem for the crown, but the crew must leave the guild district carrying it.",
        "The Dawnheart Diadem is a sun-gold circlet containing a captive phoenix ember; the crown wants it to renew the royal ward-fires, while the guild wants to sell its location to rival princes. Its ember can expose forged oaths and burn through ordinary enchantments, making it valuable beyond its jewels. It normally rests on a basalt cradle in the Inner Vault, watched by three anchoring runes; the crew can free it by counter-inscribing the runes, dismantling the cradle's locking pins, or shifting the whole cradle with a prepared levitation rite before separating the diadem.",
      ],
    },
    {
      kind: "list",
      heading: "The Catch and the Pressure",
      items: [
        {
          term: "The catch",
          text: "The diadem is physically fixed to the cradle by three warded anchors, and each anchor requires several uninterrupted minutes to release.",
        },
        {
          term: "Pressure",
          text: "Pressure begins when the first anchor is worked; each completed anchor advances the house clock. The third completed anchor starts a separate fifteen-minute countdown; dawn staff begin arriving when it ends.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Casing the Target",
      items: [
        {
          term: "Entry vector",
          text: "A disused rain cistern reaches the guild's lower archive wall, but its grate is sealed with a guild surveyor's wax mark and a silent bell-thread.",
        },
        {
          term: "Known obstacle",
          text: "The archive stair is crossed by a roster ward that notices anyone whose name is not entered in the nightly ledger.",
        },
        {
          term: "Prize handling",
          text: "The diadem lies in the Inner Vault beneath the vaultmaster's glass, and its cradle must be opened, unpinned, or moved before the circlet can be carried.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The Hidden Factor",
      paragraphs: [
        "The crew's intelligence says the nightly ledger alone satisfies the roster ward, but the guild recently added a living scribe's verification mark after a forgery scandal. This becomes obvious when a copied entry opens the archive door yet causes the stair ward to demand the absent scribe's spoken countersign.",
      ],
    },
    {
      kind: "list",
      heading: "Security Rings",
      items: [
        {
          term: "Perimeter",
          text: "The guildhall's public doors, roof bridges, and cistern grate are watched by doorkeepers, gargoyle sentries, and a bell-thread. The crew can enter during the midnight tithe procession, bribe a gargoyle-binder, use the cistern with stolen surveyor wax, or cross the roof under an illusion of guild maintenance.",
        },
        {
          term: "Access",
          text: "The archive stair's roster ward checks the ledger and living verification mark, while clerks patrol between shelves. The crew can impersonate a scheduled auditor, coerce the verification scribe, obtain the scribe's cooperation, or bypass the stair through a booklift shaft after jamming its counterweight.",
        },
        {
          term: "Inner Vault",
          text: "The vaultmaster's glass, a rotating brass key-wheel, and a listening homunculus protect the cradle; tampering during the bell-tower's quarter-hour chime masks delicate sounds. The crew can steal the vaultmaster's key sequence, persuade the vaultmaster to open it, use the chime to work the wheel by feel, or enter through the drainage channel after flooding and clearing its silt gate.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Alarm Track",
      items: [
        {
          term: "0 — Quiet",
          text: "Routine patrols continue and all planned routes remain available.",
        },
        {
          term: "1 — Suspicion",
          text: "Clerks compare faces and ledger entries, slowing social access; the cistern and roof remain usable but now require cover stories.",
        },
        {
          term: "2 — Alert",
          text: "Gargoyles begin searching for intruders and the archive stair is watched; the crew can still use the booklift or bribe a clerk, but hurried movement risks escalation.",
        },
        {
          term: "3 — Lockdown",
          text: "Brass shutters seal the public doors and vault corridors, making the original route unusable; the cistern drain, roof cranes, and a guild insider remain viable exits.",
        },
        {
          term: "4 — Lethal Response",
          text: "Bound sentinels and the vaultmaster pursue whoever carries the diadem, while ward-fire threatens to consume the vault; the crew can escape through the flooded drainage channel, but must abandon bulky equipment or accept a dangerous confrontation.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Complications",
      items: [
        {
          term: "The inspection (default)",
          text: "Senior clerk Mirabel Quince arrives as anchor work begins to verify the nightly ledger; her living countersign cannot be faked by ink alone.",
        },
        {
          term: "Cradle resonance",
          text: "Removing one anchor makes the other two hum loudly unless the crew keeps the quarter-hour chime or a silencing charm active.",
        },
        {
          term: "The rival bid",
          text: "Prince-merchant Odran Pell's agents enter through the roof to steal the diadem for themselves, turning a clean withdrawal into a choice between concealment, alliance, and pursuit.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When the Prize Is Taken",
      paragraphs: [
        "Once the final anchor is freed and the diadem leaves the cradle, the vault's absence register begins a ten-minute verification delay; lifting the prize itself does not raise the alarm. A prior bypass of the register prevents discovery through absence. Otherwise, when the delay expires, the next scheduled audit discovers the missing diadem and raises the alarm by two levels; from Quiet this becomes Alert and gargoyles begin searching. The report also activates the vaultmaster's sympathetic trace on the diadem, allowing pursuit to begin immediately and continue until the trace is shielded or disabled.",
      ],
    },
    {
      kind: "list",
      heading: "The Getaway",
      items: [
        {
          term: "Cistern retreat",
          text: "Return through the grate quickly, but the gargoyles now inspect anyone carrying the diadem.",
        },
        {
          term: "Clerk's escort",
          text: "Have Mirabel Quince present the crew as auditors, a covert route that risks her exposing the forgery.",
        },
        {
          term: "Roof-crane escape",
          text: "Reach the maintenance gantry before or during Lockdown and use a roof crane to cross the outer wall while carrying the diadem.",
        },
        {
          term: "Drainage escape",
          text: "Slide the freed diadem through the flooded channel, abandoning packs, tools, and heavy weapons to fit beside it.",
        },
        {
          term: "Pursuit",
          text: "If the absence audit reports before the crew clears the guild district, the vaultmaster follows the active sympathetic trace; a clean register bypass or successful clerk escort prevents that report and pursuit.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Flashback Opportunities",
      items: [
        {
          text: "Plant surveyor's wax that opens the cistern grate without ringing its bell-thread.",
        },
        {
          text: "Secure a midnight tithe costume and procession pass for the perimeter crossing.",
        },
        {
          text: "Recruit or blackmail the living verification scribe for the roster ward.",
        },
        {
          text: "Prepare a silencing charm keyed to the quarter-hour bell chime.",
        },
        {
          text: "Hide a tool or rope cache beside the drainage channel for the Lockdown escape.",
        },
      ],
    },
  ],
  annotation: {
    heading: "A prize whose properties write the security for you",
    paragraphs: [
      "The Dawnheart Diadem shows the payoff of the property-first approach described in the companion answer on heist target design: the ember's provenance and the crown's need for it are what make the ledger's living verification mark, the anchoring runes, and the sympathetic trace all feel inevitable rather than arbitrary. Nothing here is a generic lock; every obstacle traces back to what the diadem actually is.",
      "The escalation is also worth studying on its own. The point of no return is not the theft itself but the ten-minute verification delay after it, which turns a quiet infiltration into a race the crew may already be winning without realising it. That gap between success and safety is exactly the tension a good getaway needs.",
    ],
  },
  relatedGenerators: [
    {
      title: "Heist generator",
      description:
        "Generate a full score with a warded prize, layered security, and an escalating alarm track.",
      href: "/generators/heist",
    },
    {
      title: "Faction generator",
      description:
        "Create the guild, house, or crown authority that currently holds the prize.",
      href: "/generators/faction",
    },
    {
      title: "NPC generator",
      description:
        "Generate the clerk, scribe, or vaultmaster standing between the crew and the vault.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    {
      title: "What makes a good heist target in a tabletop RPG",
      description:
        "The design checklist behind a prize with a practical weight, an owner, and a built-in complication.",
      href: "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
    },
    {
      title: "How to run a heist in a tabletop RPG",
      description:
        "The four-phase framework for running the session once the target is set.",
      href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Dungeons & Dragons",
      description:
        "Guilds, vaults, and warded prizes built for a D&D campaign, all connected on the graph.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedExamples: ["the-quell-extraction-cyberpunk-heist"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/2850",
  seo: {
    title:
      "Classic Fantasy heist example: The Dawnheart Diadem | Codex Cryptica",
    description:
      "A table-ready fantasy heist: a warded crown jewel, three anchoring runes, a hidden verification scribe, and a ten-minute race against discovery.",
  },
};
