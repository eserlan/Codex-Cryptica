import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2846. Fills the launch gap for the new Constellation
 * generator (#2811/#2815) with a single-mode roll in Classic Fantasy, using
 * campaign context to anchor the constellation to a specific culture
 * (coastal eel-fishers) rather than a generic pantheon read.
 */
export const theEelWyrm: ExampleConfigInput = {
  slug: "the-eel-wyrm-classic-fantasy-constellation",
  labels: ["fantasy"],
  name: "The Eel-Wyrm",
  title: "Classic Fantasy constellation example: The Eel-Wyrm",
  kind: "location",
  genre: "Classic Fantasy",
  theme: "fantasy",
  summary:
    "A serpent-shaped constellation the fishers of a coastal eel-harvesting culture read as a rising and setting timer for their autumn migration season, complete with an origin myth, a set of omens, and a hook about a star that has gone missing.",
  provenance: "raw",
  generator: {
    name: "Constellation generator",
    href: "/generators/constellation",
  },
  context: [
    { label: "Genre", value: "Classic Fantasy" },
    { label: "Generate", value: "Single Constellation" },
    { label: "Visual Impression", value: "Serpent or Dragon" },
    { label: "Practical Use", value: "Migration timing" },
    { label: "Cultural Meaning", value: "An omen-bearer" },
    {
      label: "Campaign Context",
      value:
        "The Salt Coast, a chain of fishing towns that time their eel harvest by the night sky.",
    },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/constellation-eel-wyrm.jpg",
    alt: "An artist's impression of the Eel-Wyrm, a serpentine star-formed creature winding across the night sky above a lantern-lit fishing village and its docked boats",
  },
  output: [
    {
      kind: "prose",
      heading: "Core Concept",
      paragraphs: [
        "The Eel-Wyrm is a constellation the eel-fishers and tidewardens of the Salt Coast read as a long, sinuous creature with a raised, bright head, a dipping spine, and a hooked tail, resembling both a river serpent and a small dragon swimming through the stars. Its rising position tells eel-fishers when to begin trapping, when the migration is moving into deeper channels, and when the season is ending and boats should return before winter seas worsen.",
      ],
    },
    {
      kind: "prose",
      heading: "Origin Myth",
      paragraphs: [
        "The Salt Coast says the first eel migration was led by a colossal wyrm that carried lost fishers through an underground sea. When it finally surfaced beneath the night sky, the sea's salt hardened its body into stars, leaving its head forever turned toward the rivers and its tail toward the open ocean.",
      ],
    },
    {
      kind: "list",
      heading: "Star Pattern",
      items: [
        {
          term: "Mouth of the Wyrm",
          text: "The bright lead star. Its clearing of the eastern horizon at dusk marks the start of the trapping season.",
        },
        {
          term: "Drowned Tail",
          text: "The far, lower star at the pattern's opposite end. It is usually the first part of the constellation lost to winter haze.",
        },
      ],
    },
    {
      kind: "facts",
      heading: "Reading the sky",
      facts: [
        {
          label: "Seasonal Visibility",
          value:
            "First visible low in the eastern sky after dusk near the end of summer; climbs through the night during the first cold weeks; sinks toward the western sea by midwinter, when its tail is usually lost in haze.",
        },
        {
          label: "Practical Use",
          value:
            "Eel fishers begin setting traps when the Wyrm's bright head clears the eastern horizon at dusk, and judge the run's progress by how far its body has risen, shifting from river-mouth nets to deeper tidal channels as it reaches its highest point.",
        },
        {
          label: "Cultural & Religious Meaning",
          value:
            "Treated with wary respect rather than worship. Shrine keepers hang braided eel-skin cords beneath its image, asking that the creature guide travellers and return the year's harvest without demanding too many lives from the sea.",
        },
        {
          label: "Omens",
          value:
            "A clear night in which the Eel-Wyrm appears unusually sharp is taken as a promise of a strong run. If its middle seems broken by cloud or sea mist, fishers expect the migration to scatter; a red star or wandering light near its head is feared as a warning of a wreck, feud, or sudden change in the coastal currents.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Adventure Hook",
      paragraphs: [
        "A Salt Coast tidewarden reports that the Eel-Wyrm's head has vanished from every clear sky, even though the rest of the pattern remains visible. The eel run has halted, boats are leaving to investigate, and the characters are hired to recover a stolen brass signal-lantern from a sea cave whose light was used to counterfeit the missing star.",
      ],
    },
  ],
  annotation: {
    heading: "What the campaign context field actually buys you",
    paragraphs: [
      "Leave the campaign context field blank and the generator still produces a workable constellation, but a generic one: an unnamed culture, a mood-word meaning, a myth that could belong to any setting. Naming a specific culture and its economy (eel-fishers who time a seasonal harvest) is what turns 'a deity or divine figure' and 'migration timing' into a fishing-town instrument with a maintenance job attached to it, rather than a decoration hanging in the sky.",
      "Notice what the practical use field actually did to the myth: because migration timing was chosen, the origin story is about a wyrm that led fishers through the sea, not a wyrm that merely exists. The generator's fields aren't independent flavour text; the cultural meaning, the practical use, and the origin myth all have to agree with each other, and that agreement is what makes the result feel authored rather than assembled.",
      "The adventure hook is worth stealing on its own. 'A star has gone missing' is a clean, low-prep mystery hook for any sky-reading culture: it needs no combat to resolve, it explains itself through the fiction already established (the star matters because the season depends on it), and the fix (a stolen signal-lantern used to fake the missing light) gives a GM a concrete object and location rather than an abstract omen to hand-wave.",
    ],
  },
  relatedGenerators: [
    {
      title: "Constellation generator",
      description:
        "Generate a single named constellation, or switch to Full Night Sky mode for 8-15 constellations from one shared culture. Free, no login.",
      href: "/generators/constellation",
    },
    {
      title: "Star System generator",
      description:
        "For the system the sky belongs to: worlds, orbits, and an orbital diagram using the same mechanical-diagram approach as this constellation's star chart.",
      href: "/generators/star-system",
    },
    {
      title: "Pantheon generator",
      description: "For settings where the sky's meaning does come from gods.",
      href: "/generators/pantheon-generator",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you create a pantheon?",
      description:
        "For when a setting's sky lore is meant to trace back to named gods rather than a culture's own reading of the stars.",
      href: "/answers/how-do-you-create-a-pantheon",
    },
    {
      title: "How do you create a believable fictional religion?",
      description:
        "The same practice-before-doctrine logic that makes the Eel-Wyrm's omens and shrine practice read as lived-in rather than decorative.",
      href: "/answers/how-do-you-create-a-believable-fictional-religion",
    },
  ],
  relatedForPages: [],
  relatedExamples: [],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2846",
  seo: {
    title:
      "Classic Fantasy constellation example: The Eel-Wyrm | Codex Cryptica",
    description:
      "A serpent-shaped constellation that times a coastal culture's eel migration, from the Constellation generator: origin myth, omens, star chart, and an adventure hook.",
  },
};
