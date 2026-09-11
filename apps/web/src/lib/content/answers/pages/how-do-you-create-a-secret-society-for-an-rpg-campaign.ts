import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateASecretSocietyForAnRpgCampaign: AnswerConfigInput = {
  slug: "how-do-you-create-a-secret-society-for-an-rpg-campaign",
  category: "worldbuilding",
  publishedAt: "2026-09-08",
  question: "How do you create a secret society for an RPG campaign?",
  kind: "framework",
  shortAnswer:
    "Write a secret society as a faction with two extra layers: a public face that lies about what the group is for, and a set of clues that let the party discover the truth at a pace you control. Define the hidden goal, the methods it uses to protect that goal, who it recruits and how, its internal hierarchy, and at least one crack in its unity, then decide what a curious party can actually find.",
  sections: [
    {
      kind: "prose",
      heading: "A secret society is a faction with a cover story",
      paragraphs: [
        "Everything that makes an ordinary faction usable, a specific goal, an obstacle, a method, still applies. What a secret society adds is a second, false answer to the question 'what is this group for', and a reason that the true answer is dangerous enough to hide.",
        "That reason is the part invented secret societies usually skip. 'They are secret because secrets are spooky' produces a group that feels arbitrary. 'They are secret because the city would burn the lodge down if it knew what the founders actually did to secure the charter' produces a group whose secrecy is a decision, made by specific people, for a specific reason a player could eventually learn.",
        "The practical consequence is that you are writing two documents, not one: the cover story a stranger is told, and the truth an initiate eventually learns. Everything else on this page follows from keeping those consistently separate.",
      ],
    },
    {
      kind: "list",
      heading: "Seven layers to write, in order",
      intro:
        "Answer them in this sequence; each one narrows what the next can plausibly be.",
      ordered: true,
      items: [
        {
          term: "The public face",
          text: "What a stranger is told the group is: a charitable guild, a gentlemen's dining club, a licensed order of physicians. It should be a real, functioning thing that does what it claims, badly enough to need cover and well enough that nobody looks twice.",
        },
        {
          term: "The hidden goal",
          text: "Concrete and achievable, the same test as any faction. Not 'seek forbidden knowledge', but 'recover the second half of a ledger that proves who really owns the harbour'.",
        },
        {
          term: "The methods",
          text: "How it pursues the goal without being seen doing it: blackmail, a smuggling route disguised as charity shipments, a rite that also happens to be a background check. The method is usually where the horror or the fun lives.",
        },
        {
          term: "Recruitment",
          text: "Who gets approached, on what evidence, and what the first honest conversation actually sounds like. A society that recruits carelessly gets infiltrated; write down what would make it refuse a candidate.",
        },
        {
          term: "The hierarchy",
          text: "Who knows how much. Most members should know only the cover story and a little more; the full truth should sit with very few people, so that unmasking one member never unmasks the whole thing.",
        },
        {
          term: "The internal fracture",
          text: "A disagreement about method, succession, or how far the hidden goal justifies the cover story's costs. This is what turns a monolith into something the party can split, rather than simply defeat.",
        },
        {
          term: "The clues",
          text: "What a curious outsider can actually find, and at what cost: a signet ring that recurs, a member who slips, a ledger with a code nobody has cracked. If nothing is findable, the secret is not designed, it is just withheld.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: the Amaranth Table",
      paragraphs: [
        "Built from the seven layers above, in a river city that already has the Ninefold Assize as its magistrates' guild.",
      ],
      items: [
        {
          term: "Public face",
          text: "A dining society for retired ship captains, meeting monthly to argue about tides and eat badly.",
        },
        {
          term: "Hidden goal",
          text: "Keep the wreck of the Amaranth, and what it was carrying, off every official salvage register permanently.",
        },
        {
          term: "Methods",
          text: "Two members sit on the harbour licensing board and quietly reject any salvage claim near the wreck site. A third pays informants to report anyone asking after it.",
        },
        {
          term: "Recruitment",
          text: "Only retired captains who served on ships the Amaranth once outran or robbed. Loyalty is tested by asking them to lie, on record, about something small first.",
        },
        {
          term: "Hierarchy",
          text: "Most members believe the wreck holds a rival captain's stolen fortune. Three founders know it actually holds a state cargo manifest that would implicate the city's harbourmaster in a decades-old smuggling arrangement.",
        },
        {
          term: "Fracture",
          text: "One founder wants to finally salvage the manifest and use it for leverage before he dies. The other two want it left on the seabed forever.",
        },
        {
          term: "Clues",
          text: "Every rejected salvage licence near the wreck site bears the same clerk's initials. A retired captain who left the Table five years ago will talk, for a price, about why he really quit.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Discovery is the actual gameplay",
      paragraphs: [
        "A secret that cannot be found is not a secret, it is a dead end, and players learn quickly which mysteries in your campaign are load-bearing and which are decoration. Treat the seven-layer write-up as raw material for evidence, the same way a conspiracy's truth becomes an evidence map: every layer above should be reachable through at least one concrete clue, even if that clue is expensive, dangerous, or requires trust the party has not yet earned.",
        "Pace the reveal in stages rather than one disclosure. The public face is free. The fact that a secret exists at all should cost a little digging. The full hidden goal should cost real effort, and the internal fracture is often the cheapest way in, because a disaffected member wants to talk to someone.",
        "Resist making every member equally guilty. A society with genuine internal disagreement gives the party someone to recruit, someone to pity, and someone to actually oppose, which reads as far more real than a uniform cabal of villains.",
      ],
    },
    {
      kind: "checklist",
      heading: "A secret society ready to run",
      items: [
        "You can state the cover story and the hidden goal in one sentence each, and they are different sentences.",
        "You know exactly what the society does to protect the secret, and what that costs the people it does it to.",
        "At least one member would talk, under the right pressure or the right offer.",
        "Two members could disagree about how far the secret is worth protecting.",
        "You can name a specific clue, and where it is, that starts the party down the path to the truth.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping the cover story and the truth straight",
    paragraphs: [
      "A secret society is two linked entities pretending to be one: the public organisation everyone can see, and the hidden goal and hierarchy only some members know. Holding both as connected data, rather than as one page of prose, is what stops a GM from accidentally letting a low-ranking member say something only a founder should know.",
      "Codex's graph makes that separation visible: link members to the roles and knowledge they actually hold, and the question of who knows what has an answer you can check mid-session instead of one you have to remember.",
    ],
    linkText: "Try the secret society generator",
    href: "/generators/secret-society",
  },
  relatedTools: [
    {
      title: "Secret society generator",
      description:
        "Free, no login. Cells, oaths, handlers and recognition signs for the group behind the cover story.",
      href: "/generators/secret-society",
    },
    {
      title: "Faction generator",
      description:
        "For the ordinary organisation, without the concealment layer, when that is all a scene needs.",
      href: "/generators/faction",
    },
    {
      title: "Council vote generator",
      description:
        "Turns a society's internal disagreement into a scene: who votes which way, and what buys them.",
      href: "/generators/council-vote",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for conspiracy campaigns",
      description:
        "Fronts, operatives, dossiers and hidden relationships in one local-first workspace.",
      href: "/for/conspiracy",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-organise-npc-relationships",
    "how-do-you-create-a-believable-fictional-religion",
  ],
  discovery: {
    id: "answer-secret-society",
    parentCluster: "faction-creation",
    primaryIntent: "how do you create a secret society for an rpg campaign",
    intentAliases: [
      "how to design a cult for an rpg",
      "secret society design framework",
    ],
    uniqueValue:
      "Seven layers, public face through discoverable clues, that turn a hidden organisation into something a party can actually uncover rather than a vague mysterious group.",
    relatedIntents: ["generator-secret-society", "answer-conspiracy-campaign"],
    acknowledgedOverlap: [
      {
        with: "answer-fantasy-faction",
        reason:
          "The faction page covers goal-driven organisations in general. This page covers the same design lens plus the two extra layers, cover story and clues, that a hidden organisation specifically needs.",
      },
      {
        with: "generator-secret-society",
        reason:
          "The answer teaches the seven-layer framework; the generator produces a randomised starting point for the same structure.",
      },
      {
        with: "answer-run-factions-sandbox",
        reason:
          "This page covers designing a hidden organisation from scratch. The other page assumes a faction already exists and covers running it as ongoing pressure across a sandbox campaign.",
      },
    ],
  },

  seo: {
    title:
      "How do you create a secret society for an RPG campaign? | Codex Cryptica",
    description:
      "Seven layers for a usable secret society: public face, hidden goal, methods, recruitment, hierarchy, internal fracture and discoverable clues, with a worked example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-create-a-secret-society-for-an-rpg-campaign.jpg",
    imageAlt:
      "A lantern-lit meeting room where hooded figures gather around a table beneath a hidden emblem",
  },
};
