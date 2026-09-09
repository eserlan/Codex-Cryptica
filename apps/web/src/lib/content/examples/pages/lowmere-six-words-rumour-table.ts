import type { ExampleConfigInput } from "../schema";

export const lowmereSixWordsRumourTable: ExampleConfigInput = {
  slug: "lowmere-six-words-rumour-table",
  labels: ["fantasy"],
  name: "Six Words from Lowmere",
  title: "RPG rumour table example: Six Words from Lowmere",
  kind: "rumour",
  genre: "Classic Fantasy",
  theme: "fantasy",
  summary:
    "A six-entry local rumour table about a midnight ferry, a submerged bell, and the evidence moving through Lowmere on a black barge.",
  provenance: "lightly-edited",
  provenanceNote:
    "The generated six-entry structure and truth distribution are preserved. Names and phrasing were lightly edited so the output reads as one connected Lowmere situation and can be read as a standalone showcase.",
  generator: { name: "Rumour Generator", href: "/generators/rumour" },
  context: [
    { label: "Genre", value: "Classic Fantasy" },
    { label: "Tone", value: "Uneasy and local" },
    { label: "Danger level", value: "Moderate" },
    { label: "Subject focus", value: "Balanced Mix" },
    { label: "Location", value: "Lowmere ferry and marsh district" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/settlement-gulls-roost.jpg",
    alt: "A foggy fantasy settlement beside dark water where travellers trade news by lantern light",
  },
  output: [
    {
      kind: "list",
      heading: "Player-facing rumours",
      intro:
        "Each line is short enough to overhear at the table, but specific enough to give the party somewhere to look next.",
      items: [
        {
          term: "Rumour 1",
          text: "The ferryman's daughter says the boats hide their lights so the marsh wardens cannot see who crosses. Lead: ferry-master Odo Pell and the west landing. Source: a child who helps coil the ropes.",
        },
        {
          term: "Rumour 2",
          text: "A shrine keeper claims a bell rings beneath the reed beds whenever a traveller is about to die. Lead: the half-sunken bell tower at Saint Orra's cut. Source: a priest who heard one note during a storm.",
        },
        {
          term: "Rumour 3",
          text: "Market fishers say the black barge at Moorlock Quay carries bodies under its tarpaulin. Lead: the barge and its owner, Sella Voss. Source: two fishers who saw no crew aboard.",
        },
        {
          term: "Rumour 4",
          text: "A guard insists that Odo Pell drowned last winter and that the person running his ferry is a marsh ghost. Lead: Odo's house beside the rope store. Source: a gate guard who has never crossed the river.",
        },
        {
          term: "Rumour 5",
          text: "A travelling knife-grinder says every third reed bundle bears a red thread for the Lantern League. Lead: the reed market behind the old granary. Source: a trader who wants buyers to use his private landing.",
        },
        {
          term: "Rumour 6",
          text: "A dockworker says Sella Voss keeps a silver chest that hums when the moon is low. Lead: the locked cabin on the black barge. Source: a deckhand paid to unload it.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "At a glance",
      paragraphs: [
        "Lowmere's ferry has started arriving after midnight with its lanterns covered. The settlement is already tense because the marsh wardens have begun charging travellers twice, while a magistrate's evidence is moving through the district under cover of ordinary cargo. The rumours give the party several ways to notice the same pressure.",
        "The player-facing table does not tell the party which line is safe. It gives them voices, places, and objects that can be tested through conversation, observation, or a decision to wait and see what changes.",
      ],
    },
    {
      kind: "list",
      heading: "GM-only truth notes",
      intro:
        "Keep these notes behind the screen. The distribution is four essentially true rumours, one exaggeration, and one dangerous misconception.",
      items: [
        {
          term: "Rumour 1: Essentially true",
          text: "Odo is avoiding a corrupt patrol that charges illegal night tolls. If investigated, the party can learn which wardens are taking the money and why Odo has not reported them.",
        },
        {
          term: "Rumour 2: Essentially true",
          text: "A submerged warning bell is being pulled by the current, and someone is using its sound to cover movements on the bank. A careful investigation reveals a path into the reeds.",
        },
        {
          term: "Rumour 3: Exaggeration",
          text: "The barge carries sealed medicine, not bodies, but Sella is hiding one living stowaway from the magistrate. The false detail points at a real secret.",
        },
        {
          term: "Rumour 4: Dangerous misconception",
          text: "Odo is alive. Treating him as an undead threat turns a frightened witness into an enemy and gives the corrupt wardens a reason to seize the ferry.",
        },
        {
          term: "Rumour 5: Essentially true",
          text: "The red thread identifies safe paths through a faction's controlled marsh. Following the mark reveals the Lantern League's local contact and its current dispute with the wardens.",
        },
        {
          term: "Rumour 6: Essentially true",
          text: "The silver chest contains the magistrate's stolen evidence. Opening it changes who controls the investigation and puts Sella's hidden passenger at risk.",
        },
      ],
    },
    {
      kind: "facts",
      heading: "How the threads connect",
      facts: [
        {
          label: "Settlement",
          value: "Lowmere ferry, west landing, reed market, and Moorlock Quay",
        },
        {
          label: "People",
          value: "Odo Pell, Sella Voss, the shrine keeper, and the gate guard",
        },
        {
          label: "Faction",
          value: "The Lantern League and the marsh wardens",
        },
        {
          label: "Evidence",
          value: "The submerged bell, red reed threads, and silver chest",
        },
        {
          label: "Difference from a quest hook",
          value:
            "The party chooses which lead matters instead of receiving one assigned objective",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What happens when the party waits",
      paragraphs: [
        "If the party follows the ferry, Odo stops using the west landing and the wardens move their toll station closer to the rope store. If they question Sella, the medicine reaches the marsh before dawn but the hidden passenger loses their safest route out. If they ignore every line, the magistrate's evidence disappears into the Lantern League's network and the next rumours become more confident, less accurate, and harder to trace.",
        "That movement is the important part of the example. The six entries are not six errands waiting in a queue. They are public views of one situation, each carried by a different person with a different reason to speak.",
      ],
    },
  ],
  annotation: {
    heading: "Why this table is ready for play",
    paragraphs: [
      "The output gives the GM more than six atmospheric sentences. Each rumour names a source and a lead, so a player who asks one follow-up question has somewhere concrete to go. The same underlying situation appears through a child, priest, fisher, guard, trader, and dockworker, which lets Lowmere sound like a settlement rather than a noticeboard handing out identical quests.",
      "The truth distribution also has a practical purpose. Four entries reward investigation, the exaggeration turns a correct instinct into a complication, and the misconception makes overconfidence costly without making caution mandatory. Players can act on incomplete information and still find something useful. The GM has enough hidden structure to let the town react when the party repeats a story, protects a witness, or waits until the evidence moves.",
    ],
  },
  relatedGenerators: [
    {
      title: "Rumour Generator",
      description:
        "Generate six local rumours with concrete leads, named sources, and separate GM truth notes.",
      href: "/generators/rumour",
    },
    {
      title: "Settlement Generator",
      description:
        "Create a settlement whose places, people, factions, and current tension give rumours somewhere to lead.",
      href: "/generators/settlement",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you generate useful RPG rumours?",
      description:
        "The six-entry framework behind this table: four true, one exaggerated, one dangerous misconception, all with named leads.",
      href: "/answers/how-do-you-generate-useful-rpg-rumours",
    },
    {
      title: "How to create rumours for a fantasy town",
      description:
        "Build rumour sources, local tensions, and consequences that change when the party acts.",
      href: "/answers/how-to-create-rumours-for-a-fantasy-town",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for sandbox campaigns",
      description:
        "Keep rumours, settlements, factions, and consequences connected between sessions.",
      href: "/for/sandbox-campaigns",
    },
  ],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/2851",
  seo: {
    title: "RPG rumour table example: Six Words from Lowmere | Codex Cryptica",
    description:
      "A complete six-entry RPG rumour table with player-facing gossip, GM truth notes, named sources, concrete leads, and consequences for ignoring it.",
  },
};
