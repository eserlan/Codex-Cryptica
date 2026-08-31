import type { ExampleConfigInput } from "../schema";

/**
 * Generated locally with the Ship Generator using the Space Western genre.
 * Output is published verbatim; the PR is its first public record.
 */
export const fvCoyote: ExampleConfigInput = {
  slug: "fv-coyote-space-western-ship",
  name: "F/V Coyote",
  title: "Space Western ship example: F/V Coyote",
  kind: "ship",
  genre: "Space Western",
  summary:
    "An experimental converted patrol gunship whose underwater mortgage, disputed salvage cargo, and stolen AI core make every stop at a frontier port a new negotiation.",
  provenance: "raw",
  generator: { name: "Ship Generator", href: "/generators/ship-generator" },
  context: [
    { label: "Genre", value: "Space Western" },
    { label: "Role", value: "Generated at random" },
    { label: "Condition", value: "Generated at random" },
    { label: "Generation", value: "Local deterministic generator output" },
  ],
  output: [
    {
      kind: "prose",
      heading: "Core concept",
      paragraphs: [
        "F/V Coyote is a light freighter / gunship converted patrol gunship in experimental condition. Desperate in character, it serves its purpose and asks few questions. Beneath the operational surface, rival scrappers have staked a legal claim on the ship's salvage cargo.",
      ],
    },
    {
      kind: "prose",
      heading: "First look",
      paragraphs: [
        "The approach is all geometry — hard angles, running lights on slow rotation, hull plating scarred by re-entry or something worse. The docking bay smells of recycled air and machine oil.",
      ],
    },
    {
      kind: "prose",
      heading: "History",
      paragraphs: [
        "F/V Coyote has served as a converted patrol gunship for long enough that its original documentation no longer tells the whole story. Independent captain-owner with an underwater mortgage holds the current registration, though how that arrangement came about is a matter of some discretion. The experimental state of the hull is honest in a way the manifest is not.",
      ],
    },
    {
      kind: "prose",
      heading: "Captain, officers & crew",
      paragraphs: [
        "Captain Vera Sterling commands a licensed bounty hunters with loaded weapons and expired permits. Hides an old military court-martial conviction behind an easy frontier grin and a quick draw.",
        "The crew's culture is defined by independent belters and drifters who take turns in the galley and know how to jury-rig any system with scrap metal. Their loyalty is practical rather than ornamental: it survives as long as the chain of command, shared purpose, and next horizon remain worth defending.",
      ],
    },
    {
      kind: "list",
      heading: "Officer roster",
      items: [
        {
          term: "First Mate Zeke Walker",
          text: "Maintains the crew manifest and contraband stash, keeping one ledger for the captain and one for themselves.",
        },
        {
          term: "Gunner Mose Calder",
          text: "Cleans their projectile rifle at the mess table whenever uninvited guests board.",
        },
        {
          term: "Purser Lula Bennett",
          text: "Keeps the sub-light manifold from overheating with a calibrated blowtorch and sheer stubbornness.",
        },
      ],
    },
    {
      kind: "facts",
      heading: "Ship profile",
      facts: [
        {
          label: "Class",
          value: "Converted Patrol Gunship / Light Freighter / Gunship",
        },
        { label: "Condition", value: "Experimental" },
        {
          label: "Owner / Affiliation",
          value: "Independent captain-owner with an underwater mortgage",
        },
        {
          label: "Crew complement",
          value:
            "Licensed bounty hunters with loaded weapons and expired permits",
        },
        { label: "Tone", value: "Desperate" },
      ],
    },
    {
      kind: "list",
      heading: "Key zones",
      items: [
        {
          term: "Crew quarters",
          text: "A key area tied to the ship's primary function.",
        },
        {
          term: "Engineering",
          text: "A key area tied to the ship's primary function.",
        },
        {
          term: "Bridge",
          text: "A key area tied to the ship's primary function.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Complication & secret",
      paragraphs: [
        "Rival scrappers have staked a legal claim on the ship's salvage cargo. The crew is managing it, but the window is narrowing.",
        "A false floor in the cargo hold contains a military-grade AI core stolen from a core system.",
      ],
    },
    {
      kind: "list",
      heading: "Adventure hooks",
      items: [
        {
          text: "The party learns about rival scrappers claiming the ship's salvage cargo — and they are the only ones who can act.",
        },
        {
          text: "Someone on the docks knows about the false floor and is willing to sell that information.",
        },
        {
          text: "The owner needs the party to deliver something to — or retrieve something from — F/V Coyote. They are not told everything.",
        },
      ],
    },
  ],
  annotation: {
    heading: "A ship that creates a frontier before the crew leaves dock",
    paragraphs: [
      "F/V Coyote is useful because its problems occupy different layers. The legal salvage claim gives the table a public dispute; the underwater mortgage gives it a continuing material pressure; and the hidden AI core supplies the secret that can turn either problem dangerous. None needs a villain to be useful, and each can pull a different player character into the story.",
      "The crew entries do more than fill bunks. One officer keeps two ledgers, another responds to visitors by cleaning a rifle, and the engineer's solution to a failing drive is a blowtorch. Those details tell a GM how the ship behaves when pressed, while the three named zones give the first boarding, chase, or repair scene somewhere concrete to happen.",
    ],
  },
  relatedGenerators: [
    {
      title: "Ship Generator",
      description:
        "Generate another working vessel with crew, complications, and secrets.",
      href: "/generators/ship-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create the scrappers, creditors, or marshal office closing in on the Coyote.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Space Western Campaigns",
      description:
        "A connected campaign workflow for ships, frontier outposts, and contested claims.",
      href: "/for/space-western",
    },
  ],
  relatedExamples: ["the-venting-helix-derelict-hazard"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/pull/2607",
  seo: {
    title: "Space Western ship example: F/V Coyote | Codex Cryptica",
    description:
      "Raw Ship Generator output for a Space Western converted patrol gunship, with disputed salvage, a compromised crew, and a stolen AI core.",
  },
};
