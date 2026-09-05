import type { AnswerConfigInput } from "../schema";

export const howToWriteAnInWorldNewspaperForAnRpg: AnswerConfigInput = {
  slug: "how-to-write-an-in-world-newspaper-for-an-rpg",
  category: "campaign-notes",
  publishedAt: "2026-09-05",
  question: "How do you write an in-world newspaper for an RPG?",
  kind: "framework",
  shortAnswer:
    "Write an in-world RPG newspaper as a playable handout: give it a local headline, two or three public facts, a recognisable editorial voice, one clear bias, a rumour marked by its source, and a hook the players can pursue. Keep the truth behind each item in your GM notes, then connect names, places and dates to the campaign so the paper changes when the world does.",
  discovery: {
    id: "answer-in-world-newspaper",
    parentCluster: "player-handouts",
    primaryIntent: "how to write an in world newspaper for an rpg",
    intentAliases: [
      "how to make an rpg newspaper",
      "writing a fictional newspaper for a campaign",
    ],
    userJob: "create",
    uniqueValue:
      "A compact newspaper framework that separates public facts, editorial bias, sourced rumours and GM-only hooks, so a handout can move a session forward.",
    relatedIntents: ["generator-news-sheet-generator"],
    acknowledgedOverlap: [
      {
        with: "generator-news-sheet-generator",
        reason:
          "The answer explains how to edit a playable handout around campaign truth; the generator drafts a news sheet as a starting artefact.",
      },
    ],
  },
  sections: [
    {
      kind: "prose",
      heading: "Start with what changed in the last session",
      paragraphs: [
        "Choose one event the public could have noticed: a warehouse fire, a noble's arrest, a vanished caravan or a new curfew. A newspaper is most useful when it reports a consequence the players recognise. If nothing in the campaign has changed, write about a pressure that is about to reach them and give it a named person or place.",
        "Decide the reader before you draft. A city broadsheet wants subscribers and access; a faction bulletin wants obedience; a cheap street sheet wants sales and outrage. The paper's purpose determines which fact it buries, which word it repeats and who gets quoted. Give the paper a name, publication rhythm and place of sale, then keep those details stable.",
        "Write the GM truth beside every public item. The handout can say that the fire was an accident while your notes say the dockmaster paid for it. Players need enough information to make a choice, not a solved mystery disguised as flavour text.",
      ],
    },
    {
      kind: "list",
      heading: "A compact newspaper structure",
      intro:
        "One page is enough for most sessions. Put the player-facing copy first and keep the answer key in a separate note.",
      items: [
        {
          term: "Masthead and date",
          text: "Name the paper, issue number, place of publication and date. A date lets players compare editions after the campaign timeline moves on.",
        },
        {
          term: "The local headline",
          text: "Use a specific event and a named location. 'Three barges held at West Lock after night fire' gives the table more to work with than 'Trouble on the river'.",
        },
        {
          term: "Public facts",
          text: "List two or three details that ordinary witnesses could know. Make them accurate, partial or deliberately framed, but record which they are in your GM notes.",
        },
        {
          term: "The paper's voice",
          text: "Choose a repeated habit: clipped official prose, breathless gossip, pious warnings or dry trade notices. Add one regular column or sign-off so the voice survives a later issue.",
        },
        {
          term: "Bias and omission",
          text: "State whose money, permission or protection keeps the paper running. Show the bias by leaving out a faction, blaming a convenient outsider or praising the person who supplies its ink.",
        },
        {
          term: "Rumour with a source",
          text: "Label a rumour as something heard at a named tavern, shrine, checkpoint or office. Note whether it is true, distorted or false, and what the source hopes the reader will do.",
        },
        {
          term: "A hook in plain sight",
          text: "End with a notice, advert, missing person, reward or meeting that points to a concrete action. Keep the explanation in your notes so the players can decide whether to follow it.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The Lantern Quay Gazette",
      paragraphs: [
        "The party stopped a smuggling boat at Lantern Quay last night. The editor is paid by the harbour office, while the dockworkers' union sells a rival sheet. Here is the public page and the useful truth behind it.",
      ],
      items: [
        {
          term: "Weak version",
          text: "THE HARBOUR IS SAFE AGAIN. Officials report that criminals were defeated. Citizens should remain calm and trust the watch. This contains no names, date or decision for the players to make.",
        },
        {
          term: "Stronger issue",
          text: "THE LANTERN QUAY GAZETTE, 18 Rainmoot: NIGHT BOAT SEIZED AT EAST PIER. Harbour Watch recovered three sealed crates from the vessel Quiet Mercy after a signalman raised the alarm. Captain Oren says the cargo was harmless lamp oil. A notice from the quay-master requests witnesses at first bell. Dockside talk, heard at the Blue Net, says one crate was opened before the watch arrived. Advert: honest crew wanted for a northbound barge, ask for Sella Venn at berth nine.",
        },
        {
          term: "GM notes",
          text: "The crates hold letters proving the quay-master's embezzlement. Captain Oren is protecting a frightened deckhand. The Blue Net rumour is true, but the source wants the party to search the wrong crate. Sella Venn is a union organiser and can connect the party to the rival paper.",
        },
        {
          term: "Why it works",
          text: "The date and named places anchor the event, the harbour office's bias appears in Oren's quote, the rumour has a source, and two notices offer different paths. Players can investigate, take the job or ignore the whole page while the GM still knows what each choice touches.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make propaganda and truth sit beside each other",
      paragraphs: [
        "A paper can be biased without being useless. Let its claims contain a mixture of accurate dates, selective quotations and a conclusion that serves its patron. A government sheet might report a tax increase precisely while calling the protest that followed a riot. A resistance bulletin might name the right warehouse but invent the number of guards. The contrast gives players something to assess.",
        "Use layout to show status. Give the lead story the largest space, put a faction's denial beneath it, and bury a useful clue in a classified notice. In a digital handout, the same order can be headings and short paragraphs. Do not make every item a puzzle; two clear facts help players judge the third.",
        "When the party changes the world, issue a correction or a new edition. A retraction, missing name or changed advert is a visible timeline consequence. Keep old issues so players can compare what the paper knew, what it claimed and when its story stopped matching events.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before you hand it to the players",
      items: [
        "Name the paper, issue date, place of publication and likely reader.",
        "Write one headline about a recent or imminent campaign event.",
        "Include two public facts and record the hidden truth behind each.",
        "Show the paper's patron or bias through a quote, omission or advert.",
        "Add one sourced rumour and mark it true, distorted or false in GM notes.",
        "Give the players one concrete hook with a person, place, time or reward.",
        "Check every name and date against the campaign timeline before printing.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep each issue connected to the campaign",
    paragraphs: [
      "The News Sheet Generator can draft the visible structure, headlines, classifieds, rumours and GM-only hooks. Edit its output against your campaign facts, then link the paper to the factions, settlements, characters and timeline events it mentions. Keeping the issue as a dated campaign note makes later corrections and follow-up stories easy to find.",
    ],
    linkText: "Try the News Sheet Generator",
    href: "/generators/news-sheet-generator",
  },
  relatedTools: [
    {
      title: "News Sheet Generator",
      description:
        "Draft a genre-fitting broadsheet, screamsheet or station bulletin with hooks for the GM.",
      href: "/generators/news-sheet-generator",
    },
    {
      title: "Rumour Generator",
      description:
        "Add sourced rumours with a lead and a hidden truth to the classifieds or local column.",
      href: "/generators/rumour",
    },
  ],
  relatedForPages: [
    {
      title: "Fantasy worldbuilding",
      description:
        "Connect newspapers to the factions, settlements and customs of a fantasy setting.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "Call of Cthulhu campaign tools",
      description:
        "Use clippings, police notices and period papers to carry clues through an investigation.",
      href: "/for/call-of-cthulhu",
    },
  ],
  relatedAnswers: [
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-create-a-fantasy-faction",
    "what-should-an-rpg-settlement-contain",
  ],
  seo: {
    title:
      "How do you write an in-world newspaper for an RPG? | Codex Cryptica",
    description:
      "Build a playable in-world RPG newspaper with headlines, bias, public facts, sourced rumours and hooks, plus a compact worked issue for your campaign.",
    image:
      "https://assets.codexcryptica.com/og/how-to-write-an-in-world-newspaper-for-an-rpg.png",
    imageAlt:
      "An in-world newspaper beside ink and campaign notes on a rainy town desk",
  },
};
