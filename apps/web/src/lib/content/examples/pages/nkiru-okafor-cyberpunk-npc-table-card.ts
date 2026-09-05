import type { ExampleConfigInput } from "../schema";

/**
 * Source: #2757. Fills the other end of the 'character' kind spectrum from
 * Lady Vivienne Morvath (#2656): a condensed NPC Table Card roll from the
 * public NPC generator, table-ready in five elements instead of a dossier.
 * Output reproduced verbatim.
 */
export const nkiruOkafor: ExampleConfigInput = {
  slug: "nkiru-okafor-cyberpunk-npc-table-card",
  labels: ["cyberpunk"],
  name: "Nkiru Okafor",
  title: "Cyberpunk NPC example: Nkiru Okafor, a Table Card roll",
  kind: "character",
  genre: "Cyberpunk",
  theme: "cyberpunk",
  summary:
    "Nkiru Okafor is a razor-tongued street fixer who needs the crew to move a stolen biotech case before her gang-backed clinic gets raided, despite being squeamish enough to gag at a paper cut.",
  provenance: "raw",
  generator: {
    name: "NPC generator",
    href: "/generators/npc",
  },
  context: [
    { label: "Genre", value: "Cyberpunk / Corporate" },
    { label: "Ancestry", value: "Human" },
    { label: "Role", value: "Street Fixer" },
    { label: "Moral stance", value: "Street Pragmatist" },
    { label: "Prep style", value: "Table Card (5-Element 60-Second Prep)" },
  ],
  output: [
    {
      kind: "list",
      heading: "The Five Elements",
      items: [
        {
          term: "Immediate Want",
          text: "Needs the party to transport a sealed biotech case through a corporate checkpoint within the next twenty minutes, before her clinic crew is arrested.",
        },
        {
          term: "Physical Mannerism",
          text: "Taps two fingers against her wrist whenever calculating a price, then snaps the same hand toward whoever owes her an answer.",
        },
        {
          term: "Sharp Contradiction",
          text: "A ruthless deal broker who goes visibly pale at blood and refuses to watch anyone get hurt, even when violence would be cheaper.",
        },
        {
          term: "Relationship Hook",
          text: "Owes protection money to the Kestrel Nine street gang, whose lieutenant is holding her younger brother as leverage.",
        },
        {
          term: "Sensory Tag",
          text: "Smells of clove oil and overheated circuitry, with a strip of luminous orange tape wrapped around her left thumb.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Table Delivery",
      paragraphs: [
        'Nkiru steps out of a flickering noodle kiosk, taps her wrist, and says, "You\'re late, choom. Case goes through the checkpoint now, or my people start sleeping in morgue drawers." When someone mentions the danger, she cuts them off: "Don\'t bleed on me. I price risk; I don\'t admire it."',
      ],
    },
    {
      kind: "facts",
      heading: "At a glance",
      facts: [
        {
          label: "Genre",
          value: "Cyberpunk / Corporate",
        },
        {
          label: "Ancestry",
          value: "Human, second-generation Nigerian megacity resident",
        },
        {
          label: "Role",
          value:
            "Street fixer arranging contraband routes, introductions, and emergency logistics",
        },
        {
          label: "Moral stance",
          value:
            "Street pragmatist who protects her immediate crew first and treats every other promise as negotiable",
        },
        {
          label: "Prep style",
          value:
            "Table Card (5-Element 60-Second Prep), as opposed to the generator's Full Dossier mode",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Faction Connection",
      paragraphs: [
        "Nkiru is tolerated by the Kestrel Nine and quietly sells route intelligence to a low-level logistics manager inside Helix Meridian Biotech.",
      ],
    },
    {
      kind: "facts",
      heading: "GM quick reference",
      facts: [
        {
          label: "Immediate Want",
          value:
            "Needs the party to carry a stolen biotech case through a corporate checkpoint within twenty minutes.",
        },
        {
          label: "Mannerism / Vocal Tell",
          value:
            "Taps two fingers against her wrist while calculating, speaking in clipped, exhausted street slang.",
        },
        {
          label: "Contradiction",
          value:
            "A hard-nosed fixer who is deeply squeamish around blood and actively prevents unnecessary violence.",
        },
        {
          label: "Relationship Hook",
          value:
            "The Kestrel Nine gang protects her clinic but holds her younger brother hostage over unpaid protection debt.",
        },
        {
          label: "Sensory Tag",
          value:
            "Clove oil, hot circuitry, and luminous orange tape wrapped around her left thumb.",
        },
        {
          label: "Tags",
          value:
            "street-fixer, corporate-espionage, squeamish-negotiator, table-card, rpg-character",
        },
      ],
    },
  ],
  annotation: {
    heading: "Five cues are often enough to run an NPC",
    paragraphs: [
      "Nkiru Okafor never gets a biography on this page, and she does not need one. Her immediate want makes her act rather than wait: she is not a background fixture the party might eventually approach, she is already mid-negotiation when they meet her. A GM can run her from the first line without inventing anything extra.",
      "The mannerism is something a real person at the table can perform in a few seconds: two taps on the wrist, a snapping hand. The contradiction does the heavier lifting. A ruthless deal broker who cannot stand the sight of blood is a more interesting negotiation partner than a generic tough who folds under pressure, because it tells the party exactly what lever to pull if talking fails and violence starts. The relationship hook ties her to a faction and a captive, so pursuing her leads somewhere in the wider setting rather than dead-ending at a single transaction. The sensory tag, clove oil and warm circuitry, is the detail players will remember when she shows up again three sessions later.",
      "Compare this to Lady Vivienne Morvath, where six plan stages, three lieutenants, and a discovery ladder are appropriate because she is meant to drive months of play. Nkiru is built for a single scene, maybe a recurring contact if the party keeps her alive. Neither format is the better generator output; they answer different questions. A GM prepping a campaign villain needs the dossier. A GM who needs a memorable face for tonight's checkpoint job needs exactly this.",
    ],
  },
  relatedGenerators: [
    {
      title: "NPC generator",
      description:
        "Roll NPCs in Table Card mode for 60-second table prep, or Full Dossier mode for campaign-scale characters. Free, no login.",
      href: "/generators/npc",
    },
    {
      title: "Rumour Generator",
      description:
        "Generate rumours about this character: what locals say, what is true, what is distorted, and what might send the party looking for them.",
      href: "/generators/rumour",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you make NPCs memorable without lots of prep?",
      description:
        "The five-element approach behind Table Card mode: immediate want, mannerism, contradiction, relationship hook, sensory tag.",
      href: "/answers/how-do-you-make-npcs-memorable-without-lots-of-prep",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cyberpunk RED",
      description:
        "Managing fixers, edgerunner crews, megacorps, and gig-based campaigns.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedExamples: ["lady-vivienne-morvath-gothic-horror-villain"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/2757",
  seo: {
    title:
      "Cyberpunk NPC example: Nkiru Okafor, a Table Card roll | Codex Cryptica",
    description:
      "A table-ready cyberpunk NPC generated in Table Card mode: immediate want, mannerism, contradiction, relationship hook, and sensory tag in five lines.",
  },
};
