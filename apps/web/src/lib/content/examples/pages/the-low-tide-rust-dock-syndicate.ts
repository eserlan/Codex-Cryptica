import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2551. The continuity half of the pair — rolled inside the
 * Gull's Roost session, so it reuses that town's places and people rather than
 * inventing parallel ones. Output reproduced unedited.
 */
export const theLowTideRust: ExampleConfigInput = {
  slug: "the-low-tide-rust-dock-syndicate",
  name: "The Low-Tide Rust",
  title: "RPG faction example: The Low-Tide Rust",
  kind: "faction",
  genre: "Fantasy",
  summary:
    "A corrosion-obsessed dock syndicate that dissolves bulkhead locks and drowns rival crews in the limestone stacks of Gull's Roost.",
  provenance: "raw",
  generator: { name: "Faction generator", href: "/generators/faction" },
  context: [
    { label: "Genre", value: "Fantasy" },
    { label: "Faction type", value: "Criminal syndicate" },
    { label: "Setting", value: "Rolled inside the Gull's Roost session" },
    {
      label: "Carried-forward locations",
      value:
        "The Jaw-Arch, The High House, The Salt-Stained Ledger, Mother Orelia's Parlor",
    },
    { label: "Carried-forward people", value: "Bramley Vance, Tressa Miller" },
    { label: "Carried-forward tension", value: "The hijacked spice-ketch" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/faction-low-tide-rust.jpg",
    alt: "A rusted anchor fouled with rotting kelp, the sigil of a dock syndicate operating from a flooded sea-cave",
  },
  output: [
    {
      kind: "prose",
      heading: "What they control",
      paragraphs: [
        "The Low-Tide Rust dominates the dark recesses of The Jaw-Arch, converting the underwater sea-cave into a secure dry-dock for unloading hijacked hulls. They hold a monopoly on the black-market distribution of heavy spice plundered from the recent ketch incident, securely warehousing it beneath coastal floorboards.",
      ],
    },
    {
      kind: "prose",
      heading: "What they want",
      paragraphs: [
        "They intend to completely break the municipal authority of The High House by blackmailing Council Magistrate Bramley Vance over his secret involvement in the spice hijacking. Their ultimate ambition is to formalize their extortion ring into a recognized maritime tax authority, bleeding every independent merchant in Gull's Roost dry.",
      ],
    },
    {
      kind: "prose",
      heading: "Why they are dangerous",
      paragraphs: [
        "Operating from the shadows of the collapsed sea-arch, these cutthroats utilize specialized acid mixtures that eat through ship hulls and city ironwork in minutes. They view violence not as a last resort, but as routine property management when dealing with inquisitive outsiders or unpaid protection fees.",
      ],
    },
    {
      kind: "prose",
      heading: "How to use them at the table",
      paragraphs: [
        "Introduce the faction when the characters investigate the missing spice-ketch and find their informant dissolving into a rusty puddle inside Mother Orelia's Parlor. Use the syndicate's brutal enforcement tactics to force players into choosing between aiding corrupt officials at The High House or running dangerous contraband through The Jaw-Arch.",
      ],
    },
    {
      kind: "list",
      heading: "At a glance",
      items: [
        { term: "Base", text: "The Jaw-Arch" },
        {
          term: "Resource",
          text: "Undetectable hull-corrosive acids and hijacked spice cargo",
        },
        { term: "Symbol", text: "A rusted anchor fouled with rotting kelp" },
        {
          term: "Secret",
          text: "They caused the ketch's pilot to steer into the stacks on purpose to bankrupt independent net-weavers",
        },
        {
          term: "Immediate hook",
          text: "A nervous message left at The Salt-Stained Ledger claims the syndicate is poisoning the town's bilge pumps with slow-acting venom.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Notable NPCs",
      items: [
        {
          term: '"Rust-Tooth" Garrow',
          text: "One-eyed gang boss who oversees cargo distribution from behind the bar at The Salt-Stained Ledger.",
        },
        {
          term: '"Bail-Water" Fia',
          text: "Silent saboteur who slips through underwater limestone tunnels to plant corrosive charges.",
        },
        {
          term: '"Salt-Pox" Miri',
          text: "Chemist and poison-brewer who operates out of hidden alcoves beneath Mother Orelia's Parlor.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Internal conflict",
      paragraphs: [
        "Garrow wants to negotiate a peaceful tax-farming arrangement with the local municipal leadership, but his younger lieutenants prefer a bloody overthrow of the harbor district.",
      ],
    },
    {
      kind: "list",
      heading: "Rival faction",
      items: [
        {
          term: "The Deep-Net Drifters",
          text: "Independent fishermen and net-weavers led by Tressa Miller who refuse to pay protection tribute for using the coastal waters.",
        },
      ],
    },
  ],
  annotation: {
    heading: "What continuity actually buys you",
    paragraphs: [
      "Nothing in this faction is invented in isolation. Its base is the sea-cave the settlement already had, its leverage is a magistrate the settlement already named, its crime is the hijacking the settlement already listed as its live tension, and its rival is led by the net-weaver whose shop overlooks the slipway. Roll a faction with a separate tool and you get a good faction attached to nowhere.",
      "The most useful line is the rivalry. Tressa Miller was a piece of background colour in the settlement — an elderly artisan who knows everyone's family history. She comes back as the head of the group refusing to pay protection money, which promotes a throwaway detail into a faction leader without anyone deciding to do that.",
      "Read the two together and a scenario assembles itself: a magistrate being blackmailed, a shopkeeper refusing to pay, a boss who wants a deal and lieutenants who want a war. None of that was planned. It fell out of generating the second thing inside the first.",
    ],
  },
  connectedTo: {
    slug: "gulls-roost-coastal-smuggling-town",
    note: "Rolled inside the Gull's Roost session, so the town's locations, officials and live crisis carried forward as context rather than being reinvented.",
  },
  relatedGenerators: [
    {
      title: "Faction generator",
      description:
        "Roll a faction with an agenda, leadership, resources and rivals. Free, no login.",
      href: "/generators/faction",
    },
    {
      title: "Secret society generator",
      description: "For factions whose membership is itself the secret.",
      href: "/generators/secret-society",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you create a fantasy faction?",
      description:
        "Six questions that make a faction act on its own — the framework this output follows.",
      href: "/answers/how-do-you-create-a-fantasy-faction",
    },
    {
      title: "How do you organise NPC relationships?",
      description:
        "Why the Garrow/Tressa rivalry is worth recording as a directed link rather than a list.",
      href: "/answers/how-do-you-organise-npc-relationships",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Keeping factions, places and people connected as a setting grows.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedExamples: ["gulls-roost-coastal-smuggling-town"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2551",
  seo: {
    title: "RPG faction example: The Low-Tide Rust | Codex Cryptica",
    description:
      "Unedited faction generator output, rolled inside an existing settlement so it reuses that town's sea-cave, magistrate and live crisis instead of inventing new ones.",
  },
};
