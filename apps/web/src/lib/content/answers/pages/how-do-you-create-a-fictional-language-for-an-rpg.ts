import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateAFictionalLanguageForAnRpg: AnswerConfigInput = {
  slug: "how-do-you-create-a-fictional-language-for-an-rpg",
  category: "worldbuilding",
  publishedAt: "2026-09-05",
  question: "How do you create a fictional language for an RPG?",
  kind: "how-to",
  shortAnswer:
    "Create a fictional language for an RPG by choosing a small set of sounds, repeatable naming patterns, three simple structural rules and a dozen words the party will encounter. Write a pronunciation key, build names from recurring roots, and tie greetings or titles to local customs. Test it on a sign, an NPC introduction and a place name before expanding the vocabulary.",
  discovery: {
    id: "answer-fictional-language",
    parentCluster: "naming",
    primaryIntent: "how to create a fictional language for an rpg",
    intentAliases: [
      "lightweight conlang for tabletop games",
      "how to design a fantasy language for roleplaying",
    ],
    userJob: "understand",
    uniqueValue:
      "A playable language kit with a pronunciation key, reusable roots, three structural rules and a worked harbour encounter, with a stopping point short of full conlang construction.",
    relatedIntents: ["generator-language-generator"],
    acknowledgedOverlap: [
      {
        with: "generator-language-generator",
        reason:
          "The answer teaches and demonstrates a manual language-design workflow; the generator creates a draft language profile.",
      },
    ],
  },
  sections: [
    {
      kind: "prose",
      heading: "Decide what the language needs to do in play",
      paragraphs: [
        "Write down its next three appearances: a harbour sign, a ferryman introducing herself and a ruined watchtower on the map. Those uses give you a manageable vocabulary. Leave words for subjects the party will never discuss until you need them.",
        "A full constructed language, or conlang, can support original conversation and translation through a much broader vocabulary and grammar. That is a separate creative project. For an RPG, a consistent naming system and a few phrases can do the job. Keep ordinary dialogue in your table's shared language and describe which fictional language the characters are speaking.",
        "If a character knows the language, give their player the meaning. Do not require players to memorise vocabulary to use a character ability. An inscription can still contain a mystery about who wrote it or why it matters after its words have been translated.",
      ],
    },
    {
      kind: "list",
      heading: "Build a one-page language kit",
      items: [
        {
          term: "Sound and pronunciation",
          text: "Choose sounds you can repeat comfortably and a syllable pattern. For the invented port language below, use m, n, p, t, k, s, l, r and vowels a, e, i, o, u. Give the vowels the sounds in father, bed, machine, more and rule; these are table cues, so agree a pronunciation together. Use consonant-vowel syllables and stress the first syllable. Mera is MEH-rah. Read six names aloud and simplify any you stumble over.",
        },
        {
          term: "Names from recurring roots",
          text: "Keep personal names short, such as Mera and Tali. Give settlements a shared ending: -na means settlement. Sula means river, so Sulana is River Settlement; kela means stone, so Kelana is Stone Settlement. Keep the spelling of each root stable. Players can then recognise connections between names.",
        },
        {
          term: "Three structural rules",
          text: "For this kit, put describing words after nouns, use separate li before a noun for a plural, and combine roots with the main thing last. Sula kela means stone river; li sula means rivers; sula-na means river-settlement, written Sulana as a place name. These rules cover labels and names. Decide sentence word order only when you need to write a sentence.",
        },
        {
          term: "Vocabulary with a use",
          text: "Start with words for the actual scenes you prepared. Include a greeting, a warning and a title alongside place-name roots. Record each word's meaning and pronunciation in one glossary rather than inventing it again in each location note.",
        },
        {
          term: "A cultural reason to speak",
          text: "Choose who uses the language, where people learn it and when speakers switch languages. In these ports, boat crews share a trade language across several nations. Visitors address a ferry pilot by their work title before their name. A family may use a different language at home; borders and ancestry need not decide what everyone speaks.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A starter glossary for the river ports",
      intro:
        "These invented roots follow the same sound rules. The meanings are enough for the harbour scene; they do not define a complete grammar.",
      items: [
        {
          term: "Places and things",
          text: "sula: river; kela: stone; na: settlement; pala: boat; neri: gate; luma: lamp.",
        },
        {
          term: "People and obligations",
          text: "tala: ferry pilot; sana: guest; rima: debt.",
        },
        {
          term: "Speech at the dock",
          text: "sali: a greeting used when arriving; taku: stop, used as a warning; mali: safe, placed after the thing it describes. Li is the separate plural marker.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Before and after: arriving at Sulana",
      paragraphs: [
        "The party needs a ferry to the stone settlement upstream. One character speaks the port language. Put the glossary beside the map and reuse it across the scene.",
      ],
      items: [
        {
          term: "Before",
          text: "The map calls the port Xz'qrath, its boats have unrelated invented labels, and the ferryman speaks a fresh string of syllables. The players have nothing they can recognise next time and cannot tell which details matter.",
        },
        {
          term: "After",
          text: "The map names Sulana and Kelana. A dock sign reads li pala mali, meaning safe boats. The pilot introduces herself as Tala Mera. A shouted taku warns the party away from a damaged gangplank. Tell the fluent character all those meanings immediately, and offer translations through Mera for the others.",
        },
        {
          term: "Why it works",
          text: "The settlement ending repeats on the map, the title returns whenever someone addresses Mera, and one warning has an immediate physical consequence. Players can recognise useful words without completing a language lesson. On their next journey, a damaged sign with pala still tells them they have found somewhere associated with boats.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Add variation when the campaign gives you a reason",
      paragraphs: [
        "Record one difference between formal and everyday use. Harbour officials insist on Tala Mera; her crew simply say Mera. An inland court might use an older place name on its tax records. Explain that mismatch through a guide or document so it becomes evidence about the setting rather than a spelling mistake the players must guess around.",
        "For science fiction, use the same kit for station names, docking warnings and crew titles. A translator can convey literal words while your description supplies the custom: saying someone's job title first is courteous here. Avoid making a translator arbitrarily fail just to force a vocabulary puzzle.",
        "Sounds do not establish a speaker's morality or intelligence. Give speakers different occupations and opinions, and avoid using an imitation of a real accent as shorthand for an alien or villainous people. Borrow a design idea such as repeated name endings, then write your own examples.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before bringing the language to the table",
      items: [
        "Read six names aloud and write pronunciation cues for the awkward ones.",
        "Check that every place name follows the chosen root and ending pattern.",
        "Translate one sign using only your glossary and stated rules.",
        "Prepare a greeting, warning and title that each appear in a scene.",
        "Note who speaks the language and how other characters can get a translation.",
        "Give fluent characters the meaning without testing their players' memory.",
        "Stop expanding once the next session's names and phrases are covered; add new words to the same glossary during play.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep language notes connected to their speakers",
    paragraphs: [
      "Use the Fictional Language Generator to draft a sound profile, naming patterns and sample vocabulary, then check the result against your own glossary before using it. Keep the agreed rules in a worldbuilding entity and link it to the cultures, nations, settlements and NPCs that use them. Those links help you find the same naming rules when you return to a region.",
    ],
    linkText: "Try the Fictional Language Generator",
    href: "/generators/language-generator",
  },
  relatedTools: [
    {
      title: "Fictional Language Generator",
      description:
        "Draft a language profile and sample words to edit into your campaign glossary.",
      href: "/generators/language-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Fantasy worldbuilding",
      description:
        "Connect speakers, settlements and customs across a fantasy setting.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "Dystopian science fiction",
      description:
        "Keep station cultures, institutions and their terminology connected.",
      href: "/for/dystopian-sci-fi",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-believable-fictional-religion",
    "what-should-an-rpg-settlement-contain",
  ],
  seo: {
    title:
      "How do you create a fictional language for an RPG? | Codex Cryptica",
    description:
      "Build a playable fictional language with sound rules, naming patterns, a small glossary and cultural customs. Includes a worked harbour scene and prep checklist.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-create-a-fictional-language-for-an-rpg.png",
    imageAlt:
      "A linguist's notebook and carved harbour sign beside a lamplit river-port window",
  },
};
