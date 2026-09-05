import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2664. Fills the 'adventure' kind gap (#2645) with an
 * Adventure generator roll in Pirate & High Seas. Output reproduced
 * verbatim, demonstrating a full arc — hook, complications, stakes,
 * multiple resolution paths — rather than a single scene.
 */
export const lettersOfMarqueExpired: ExampleConfigInput = {
  slug: "letters-of-marque-expired-pirate-adventure",
  labels: ["pirate"],
  name: "Letters of Marque, Expired",
  title: "Pirate adventure example: Letters of Marque, Expired",
  kind: "adventure",
  genre: "Pirate",
  theme: "pirate",
  summary:
    "The party's privateering commission lapsed at midnight, their captain vanished aboard a ship reported sunk two years ago, and a naval patrol that no longer has to pretend they're not pirates is already closing.",
  provenance: "raw",
  generator: {
    name: "Adventure generator",
    href: "/generators/adventure-generator",
  },
  context: [
    { label: "Genre", value: "Pirate & High Seas" },
    { label: "Archetype", value: "Hunt & Pursuit" },
    { label: "Tone", value: "Gritty & Nautical" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/adventure-dead-mans-tontine.jpg",
    alt: "Privateers on a lantern-lit sloop deck at midnight examining an iron cipher cylinder under the shadow of a blockading naval squadron",
  },
  output: [
    {
      kind: "prose",
      heading: "Initial Situation",
      paragraphs: [
        "Three nights ago, the ship's first mate rowed the captain out to a lightless anchorage off the reef and came back alone, refusing to say why. Two nights ago, the crown's letter of marque that made the party's raiding legal expired at midnight, on schedule, with no renewal filed. Last night, a ship matching the description of the Marrow Gale — reported burned to the waterline by a naval squadron two years ago — sailed openly into the free port where the party is currently taking on water.",
        "The first mate, Corwyn Ashe, has stopped answering questions about where the captain went. The crew has started asking the party instead, because the party is the only authority left aboard that anyone still trusts.",
      ],
    },
    {
      kind: "prose",
      heading: "Primary Objective & Pressure",
      paragraphs: [
        "Find the captain — or find out what happened to them — before the naval patrol that's been tracking the ship's movements for a month stops treating the expired commission as a technicality and starts treating it as an arrest warrant. The patrol's flagship was last sighted two days out; at its current heading, it reaches the free port within the week.",
      ],
    },
    {
      kind: "list",
      heading: "Key Locations",
      items: [
        {
          text: "A free port that operates on the principle that everyone's money is equally legal, currently hosting both the party's ship and, as of last night, the Marrow Gale.",
        },
        {
          text: "A hidden anchorage off the reef whose location is the most valuable thing it contains — Corwyn rowed the captain there and back, and refuses to say what's anchored inside it.",
        },
        {
          text: "A naval anchorage further up the coast whose commander is known to be open to arrangements off the record, if the party can reach him before the flagship does.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Important NPCs & Factions",
      items: [
        {
          term: "First Mate Corwyn Ashe",
          text: "Knows exactly what happened to the captain and is protecting the party from that knowledge, not withholding it out of malice.",
        },
        {
          term: "The experienced harbour pilot, Old Maren",
          text: "Knows these waters and what moves in them — including, if paid or persuaded, what she saw the night the Marrow Gale supposedly burned.",
        },
        {
          term: "The captured merchant captain, held in the free port's debtor's hold",
          text: "Has information about what was actually in the Marrow Gale's hold two years ago, and will trade it for passage out.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Threats & Antagonists",
      items: [
        {
          text: "A naval patrol running a dragnet that is not going away, now legally entitled to treat the party's ship as an unlicensed pirate vessel.",
        },
        {
          text: "A rival crew with a faster ship, also converging on the free port, also very interested in whatever is anchored at the hidden reef.",
        },
        {
          text: "Whatever crewed the Marrow Gale back into port under its own power two years after it was declared destroyed — currently unconfirmed, and Corwyn will not discuss it.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Clues, Secrets & Discoveries",
      items: [
        {
          text: "A flag recovered from the free port's harbourmaster office belongs, unmistakably, to the Marrow Gale — filed as evidence from the ship that was reported sunk.",
        },
        {
          text: "A blood-stained sea chart in the captain's own quarters shows a passage through the reef that matches no official survey and leads directly toward the hidden anchorage.",
        },
        {
          text: "A letter from a naval authority to a pirate captain, found half-burned in Corwyn's effects, predates the current war and names a debt still outstanding.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Complications & Escalating Pressures",
      items: [
        {
          text: "The Marrow Gale is not hiding from the free port's authorities — it is herding the party's ship toward the naval patrol's expected heading, and has been since it arrived.",
        },
        {
          text: "The captured merchant captain's information about the Marrow Gale's old cargo is real, but the buyer he named has since been told a different story, and is no longer interested in confirming it.",
        },
        {
          text: "The crew has a vote pending on whether to sail without the captain rather than risk the patrol, and the vote is not going the way the party expected.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Rewards & Stakes",
      items: [
        {
          text: "The blood-stained chart itself, once recovered and understood, is worth more than any cargo currently sitting in the free port's warehouses.",
        },
        {
          text: "A renewed letter of marque — if the party can reach the sympathetic naval commander before the flagship arrives, he can backdate one, for a price that will matter later.",
        },
        {
          text: "The crew's continued loyalty, which is not guaranteed regardless of how the captain situation resolves — how the party handles the vote matters as much as how they handle the ship.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Possible Outcomes",
      items: [
        {
          text: "The captain is found alive at the hidden anchorage, changed by whatever happened there, and the crew has to decide whether they still follow them.",
        },
        {
          text: "The naval threat is evaded by reaching the sympathetic commander first; he backdates the commission, and now the party owes him a debt with no fixed price.",
        },
        {
          text: "The Marrow Gale's herding succeeds and the party's ship is delivered directly into the patrol's path — which creates its own opportunities for whoever handles the encounter best.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Adventure Hooks",
      items: [
        {
          text: "A ship matching the description of a vessel the party knows to be sunk just sailed into port.",
        },
        {
          text: "The harbourmaster asks to see the party privately and produces a document with the captain's name on it that was filed the night they disappeared.",
        },
        {
          text: "A rival crew is offering double shares for anyone willing to transfer, effective immediately, for one job, destination undisclosed — and the destination, it turns out, is the reef.",
        },
      ],
    },
  ],
  annotation: {
    heading: "What makes this a full arc instead of a hook",
    paragraphs: [
      "A one-line adventure seed gives a GM a starting scene. This roll gives something closer to a small campaign's worth of connected pressure: an objective with a real clock (the flagship's heading), a mystery with physical evidence (the flag, the chart, the letter), a social complication that has nothing to do with combat (the crew's vote), and three genuinely different ways it can end. None of that requires the GM to invent connective tissue — the generator already tied the threats, locations, and discoveries to the same underlying situation.",
      "The most useful thing to notice is that the possible outcomes are not a win/lose branch, they're three different follow-on adventures. Finding the captain alive-but-changed opens a character arc; reaching the sympathetic commander first opens an ongoing-debt plotline; getting herded into the patrol opens a completely different kind of encounter than the party was expecting. A GM does not need to pick one in advance — running the situation honestly and letting the party's choices determine which outcome triggers is the entire point of a situation-based adventure rather than a scripted one.",
      "It's also worth noticing what the generator didn't do: it never explains what's actually anchored at the hidden reef, or what crewed the Marrow Gale back to port. That's not an oversight — the 'Threats & Antagonists' section marks it explicitly as unconfirmed. A GM gets to decide that detail based on what fits their table, which is exactly the kind of gap a situation-based generator should leave open rather than a scripted one.",
    ],
  },
  relatedGenerators: [
    {
      title: "Adventure generator",
      description:
        "Generate a full adventure concept — situation, stakes, opposition, and multiple resolution paths — for any genre. Free, no login.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Adventure idea generator",
      description:
        "For a shorter premise rather than a full structured scenario.",
      href: "/generators/adventure-idea-generator",
    },
  ],
  relatedAnswers: [],
  relatedForPages: [],
  relatedExamples: [],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2664",
  seo: {
    title:
      "Pirate adventure example: Letters of Marque, Expired | Codex Cryptica",
    description:
      "A full Pirate & High Seas adventure roll from the Adventure generator, with a real clock, physical clues, a social complication, and three genuinely different outcomes.",
  },
};
