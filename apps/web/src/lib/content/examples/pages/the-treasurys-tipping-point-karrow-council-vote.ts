import type { ExampleConfigInput } from "../schema";

/**
 * Source: issue #3369 / answer follow-up #3337.
 * A Classic Fantasy Senate vote in the Republic of Karrow showcasing the Council Vote
 * Generator: provincial tax hoarding, syndicate bribery, a five-seat council teetering on
 * a simple majority, and a costly military concession path tied to General Ostrelle.
 * Output reproduced verbatim.
 */
export const theTreasurysTippingPoint: ExampleConfigInput = {
  slug: "the-treasurys-tipping-point-karrow-council-vote",
  labels: ["fantasy"],
  name: "The Treasury's Tipping Point",
  title: "Council vote example: The Treasury's Tipping Point",
  kind: "council-vote",
  genre: "Classic Fantasy",
  theme: "fantasy",
  summary:
    "A high-stakes senate vote in the Republic of Karrow: provincial tax hoarding, grain syndicate corruption, and a five-seat council teetering on a simple majority.",
  provenance: "raw",
  generator: {
    name: "Council Vote Generator",
    href: "/generators/council-vote",
  },
  context: [
    { label: "Setting", value: "Republic of Karrow" },
    { label: "Genre", value: "Classic Fantasy" },
    { label: "Governing Body", value: "Senate (5 seats)" },
    { label: "Voting Rule", value: "Simple Majority (3 of 5 needed)" },
    {
      label: "Proposal",
      value:
        "First Consul's Emergency Tax Decree (centralising garrison payrolls)",
    },
    {
      label: "Deadline",
      value: "Three weeks (seven weeks before consular election)",
    },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/council-vote-karrow-tipping-point.jpg",
    alt: "The Senate of the Republic of Karrow debating the emergency tax decree under high stone colonnades",
  },
  output: [
    {
      kind: "prose",
      heading: "The Proposal & Situation",
      paragraphs: [
        "The Republic of Karrow teeters on the brink of fiscal catastrophe. Amid whispers of provincial governors hoarding garrison pay and grain syndicates buying influence, the First Consul has introduced an Emergency Tax Decree. This proposal seeks to centralise tax collection and garrison payrolls, moving all provincial chests to the capital's treasury to prevent regional manipulation.",
        "The stakes are high: failure to pass the decree could see Karrow's garrisons falter and its capital run dry, just as election season looms. The Senate must reach a decision in three weeks—seven weeks before the crucial consular general election. As trusted advisors to influential figures in the capital, the party is swept into the intrigue, tasked with securing enough votes to safeguard Karrow's stability. The challenge is simple in its complexity: achieve a simple majority among the five-seat council.",
        "With General Ostrelle's shadow cast over the frontier and grain syndicates pulling strings, the party must navigate political mazes, leverage secrets, and forge alliances to sway the vote in favour of the decree.",
      ],
    },
    {
      kind: "list",
      heading: "Voting Procedure & Current Estimate",
      items: [
        {
          term: "Threshold",
          text: "To pass the First Consul's Emergency Tax Decree, a simple majority is required. The Senate comprises five seats, meaning three votes are needed to secure the proposal's approval.",
        },
        {
          term: "Procedural rules",
          text: "Abstentions and recusals may create openings but do not lower the threshold; a tie will result in the status quo being maintained, effectively defeating the proposal. The voting process is public, allowing for open persuasion and accountability.",
        },
        {
          term: "Current Vote Estimate",
          text: "1 Support, 2 Leaning, 2 Oppose. The room is genuinely divided; no faction starts with a guaranteed majority.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Council Members",
      items: [
        {
          term: "Branric (Greedy Broker)",
          text: "Publicly supports the decree, hoping to cement his influence in the central treasury. True agenda involves securing preferential contracts for his affiliates. Would be swayed by offers of exclusivity in future trade deals. Holds a secret wealth stash, vulnerable to scrutiny. Initial stance: Support.",
        },
        {
          term: "Morgrin (Beleaguered Ally)",
          text: "Leaning towards support, burdened by responsibilities in a district affected by regional hoarding. Genuinely persuaded by evidence that centralisation benefits his constituents without amendments. Vulnerable due to a family member's connection to grain syndicates, which could expose him politically. Initial stance: Leaning.",
        },
        {
          term: "Aelwen (Idealist)",
          text: "Opposes the decree, viewing it as a power grab eroding regional autonomy. Would be convinced by evidence demonstrating the proposal's necessity for preventing a military collapse. Holds a correspondence with a respected but controversial philosopher that could sway public opinion. Initial stance: Oppose.",
        },
        {
          term: "Caelric (Loyal Shadow)",
          text: "Leaning against the decree, following Aelwen's lead. Persuasion hinges on Aelwen's stance; however, a personal appeal involving military accolades could shift his views. Holds an unrequited romantic interest in Aelwen, influencing decisions. Initial stance: Leaning.",
        },
        {
          term: "Daxmar (Traditionalist)",
          text: "Staunchly opposes the decree, committed to preserving provincial rights. Persuadable only by a compelling show of unity from Karrow's military or a direct endorsement from General Ostrelle. Keeps a family heirloom with historical military significance that could be used diplomatically. Initial stance: Oppose.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Antagonist Influence & Investigation Leads",
      intro:
        "Grain syndicates actively bribe and coerce members of the Senate, monitoring any efforts by the party to sway votes in favour of the decree. Their influence is formidable, backed by considerable financial resources.",
      items: [
        {
          term: "Branric's finances",
          text: "Investigate Branric's secret wealth stash for leverage to ensure his vote does not defect under syndicate pressure.",
        },
        {
          term: "Morgrin's family",
          text: "Discover Morgrin's family ties to grain syndicates as a political pressure point or provide security to neutralise the blackmail.",
        },
        {
          term: "Aelwen's papers",
          text: "Uncover Aelwen's correspondence with the philosopher to frame the centralisation as constitutional preservation rather than tyranny.",
        },
        {
          term: "Caelric's honour",
          text: "Appeal to Caelric's interest in military accolades for a potential shift in allegiance independent of Aelwen.",
        },
        {
          term: "Frontier dispatch",
          text: "Seek out General Ostrelle on the frontier for a potential military endorsement to sway Daxmar's traditionalist faction.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Possible Paths",
      items: [
        {
          term: "1. Smallest Viable Coalition",
          text: "Stabilise Morgrin and secure Caelric's initial leaning towards support. Provide Morgrin with irrefutable evidence that centralisation will directly benefit his district, such as exposing provincial hoarding practices. For Caelric, a personal appeal involving military accolades will secure his support. Branric already supports the decree, so this coalition achieves the necessary three votes (Branric - Support, Morgrin - Support, Caelric - Support) to pass the decree.",
        },
        {
          term: "2. Broader Alternative",
          text: "In addition to the smallest viable coalition path, target Aelwen by presenting concrete evidence demonstrating the military's risk without the decree, aligning with her ideals of safeguarding Karrow's autonomy. This broader coalition aims to shift Aelwen's stance, creating an insurance vote (Branric - Support, Morgrin - Support, Caelric - Support, Aelwen - Support), thus providing a buffer against potential defections.",
        },
        {
          term: "3. Costly Best Solution",
          text: "To fully resolve the dilemma and ensure broad stability, persuade Daxmar by obtaining a direct endorsement from General Ostrelle. This approach requires significant political manoeuvring but aims to align Daxmar's traditionalist views with the proposal's necessity through the general's influence. This path seeks a four-vote coalition (Branric - Support, Morgrin - Support, Caelric - Support, Daxmar - Support), ensuring stability and addressing potential regional resistance to centralisation. The cost lies in negotiating General Ostrelle's terms, which may involve strategic military concessions altering military-civil relations in Karrow.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Follow-Up Hooks",
      items: [
        {
          term: "General Ostrelle's reaction",
          text: "Following the vote, word arrives that General Ostrelle, previously observing from the frontier, has taken a keen interest in the centralisation development, prompting unexpected military movements or demands for oversight.",
        },
        {
          term: "Syndicates' retaliation",
          text: "The grain syndicates react to the successful passage by launching a political campaign to discredit the party or its allies, possibly leading to direct confrontations or attempts to manipulate future legislation.",
        },
        {
          term: "Provincial backlash",
          text: "News of the decree's passage incites unrest in some provinces, with governors resisting the transfer of their treasury stocks. The party might be called upon to mediate these tensions or authorise military interventions.",
        },
        {
          term: "Economic ripples",
          text: "With the central treasury now holding the garrison chests, economic shifts begin affecting Karrow's markets, creating opportunities for profit or peril depending on the party's alliances and actions during the vote.",
        },
      ],
    },
  ],
  annotation: {
    heading: "Turning an institutional crisis into an open political puzzle",
    paragraphs: [
      "In tabletop campaigns, legislative assemblies are notoriously difficult to run without either railroading the outcome or reducing politics to a single Persuasion dice roll. The Treasury's Tipping Point demonstrates how the Council Vote Generator turns a complex constitutional crisis into an interactive, multi-vector puzzle for players.",
      "Rather than treating the Senate as a monolithic obstacle, the scenario gives each councillor an explicit public posture, private agenda, and tangible vulnerability. Crucially, the 1-2-2 starting vote estimate means victory is mathematically impossible without breaking existing alliances or exposing corruption, yet multiple distinct coalitions remain viable.",
      "The costly best solution highlights the core ethos of political worldbuilding: solving an immediate institutional deadlock by enlisting a charismatic frontier general does not make the crisis vanish—it shifts the danger into civil-military relations for the next arc of the campaign.",
    ],
  },
  relatedGenerators: [
    {
      title: "Council Vote Generator",
      description:
        "Generate legislative votes with secret agendas, swing blocs, and costly best solutions.",
      href: "/generators/council-vote",
    },
    {
      title: "Faction Generator",
      description:
        "Create the provincial governors, grain syndicates, and military cliques driving the crisis.",
      href: "/generators/faction",
    },
    {
      title: "Rumour Generator",
      description:
        "Generate whisper campaigns, scandal sheets, and market panic across the capital.",
      href: "/generators/rumour",
    },
  ],
  relatedAnswers: [
    {
      title: "How to build a believable constitutional crisis or coup",
      description:
        "The legal authority, practical power, and legitimacy framework behind the Republic of Karrow.",
      href: "/answers/how-do-i-build-a-believable-constitutional-crisis-or-coup",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Fantasy Worldbuilding",
      description:
        "Organise political assemblies, laws, and crisis timelines in one linked vault.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedExamples: [],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/3369",
  seo: {
    title:
      "Council vote example: The Treasury's Tipping Point | Codex Cryptica",
    description:
      "A table-ready political council vote in the Republic of Karrow: swing blocs, syndicate leverage, and costly solutions before an emergency senate ballot.",
  },
};
