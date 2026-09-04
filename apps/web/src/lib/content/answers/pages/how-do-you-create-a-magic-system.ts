import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateAMagicSystem: AnswerConfigInput = {
  slug: "how-do-you-create-a-magic-system",
  category: "worldbuilding",
  publishedAt: "2026-09-04",
  question: "How do you create a magic system?",
  kind: "framework",
  shortAnswer:
    "To create a compelling magic system for worldbuilding and tabletop gaming, focus first on limitations, costs, and societal consequences rather than lists of spectacular spells. Define where the energy originates, what physical or psychological price it extracts from the caster, what problems it cannot solve, and how mundane institutions like law, commerce, and warfare have adapted to its existence.",
  sections: [
    {
      kind: "prose",
      heading: "Limitations create tension, not power levels",
      paragraphs: [
        "A common trap when designing magic is compiling extensive lists of flashy elemental effects and destructive spells. In both fiction and tabletop roleplaying, magic becomes dramatic and engaging because of what it cannot accomplish and what it costs the practitioner, rather than what it effortlessly solves.",
        "When magic has no defined friction or expense, it trivialises mystery, logistics, and mortal struggle. If a spellcaster can conjure clean water, cure plagues, and collapse castle battlements at no meaningful cost, your setting agriculture, medicine, and architecture should look radically unrecognisable. Grounding your system in strict boundaries preserves tension and keeps player decisions consequential.",
      ],
    },
    {
      kind: "list",
      heading: "The four structural pillars of a magic system",
      intro:
        "Build your system around these four foundational questions before writing individual spells or abilities:",
      items: [
        {
          term: "The Source and Conduit",
          text: "Where does magical energy reside, and how does a mortal channel it? Is it an ambient environmental field, divine favour, extracted mineral fuel, or ancestral bloodline resonance?",
        },
        {
          term: "The Inescapable Cost",
          text: "What does working magic consume or risk? Costs can be material reagents, physical stamina, cognitive degradation, social stigma, or irreversible corruptive entropy.",
        },
        {
          term: "The Hard Limitations",
          text: "What can magic never do under any circumstance? Absolute rules, such as being unable to reverse true death, create matter from nothing, or read unvocalised thoughts, give the setting its distinct identity.",
        },
        {
          term: "The Societal Ripples",
          text: "How have ordinary people, laws, and commerce adapted? If fire magic exists, are wooden buildings illegal in city centres? Are truth-seeking mages required in courtrooms, or are their testimonies barred as corruptible hearsay?",
        },
      ],
    },
    {
      kind: "list",
      heading: "Categories of magical friction and costs",
      intro:
        "Select and combine different forms of friction to make spellcasting feel tactile and dangerous:",
      items: [
        {
          term: "Physiological costs",
          text: "Nosebleeds, temporary blindness, thermal exhaustion, or bone brittleness. Sorcerers carry visible physical marks and rely heavily on apothecary support.",
        },
        {
          term: "Material consumption",
          text: "Consumes refined metals, rare alchemical ash, or relics of ancient beasts. Magic is dominated by wealthy guilds, cartels, and imperial mining monopolies.",
        },
        {
          term: "Cognitive degradation",
          text: "The caster must sacrifice cherished personal memories or emotional empathy. Veteran practitioners become emotionally detached, erratic, or amnesiac hermits.",
        },
        {
          term: "Environmental entropy",
          text: "Casting blights local soil, silences birdsong, or draws hungry planar parasites. Mages are quarantined outside municipal walls and treated with suspicion.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: Designing the Ash-Weaving System",
      paragraphs: [
        "Observe how grounding magic in tangible costs reshapes an urban fantasy setting.",
      ],
      items: [
        {
          term: "The generic spell-list approach",
          text: "The creator wrote a standard wizard list: firebolts, telekinesis, and light spells cast by memorising words from leather-bound tomes, with resting slots as the only restriction. The city looked like standard medieval London, with no obvious signs that people could hurl lightning.",
        },
        {
          term: "The cost-and-consequence design",
          text: "The creator establishes that magic requires inhaling the cremated remains of sanctified martyrs, granting fleeting telekinetic control over burning embers and smoke. The cost is severe lung degradation and gradual loss of taste and smell. The societal ripples are profound: the cathedral operates a state-controlled mausoleum, crematoriums are fortified like banks, and elite city watchmen carry ceramic masks, salt-water sprayers, and fire blankets specifically designed to snuff out caster catalysts.",
        },
        {
          term: "Why it works",
          text: "Tying magic to a tangible, scarce resource created natural geopolitical conflict and distinctive city architecture. The physical cost gave characters identifiable traits and made spellcasting a deliberate, weighty tactical choice rather than an unthinking routine.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Magic system worldbuilding consistency checklist",
      intro:
        "Test the robustness of your magical rules against these practical worldbuilding questions:",
      items: [
        "Is the source of power distinct, memorable, and limited in availability?",
        "Are there clear, absolute prohibitions on what magic cannot achieve?",
        "Does casting require physical time, audible words, or tactile focus that enemies can interrupt?",
        "Have you accounted for how common folk and non-magical guards protect themselves from hostile spells?",
        "Does the existence of magic alter how armies fight, how merchants trade, and how rulers maintain authority?",
        "Is the failure state of a spell interesting and dangerous rather than a boring binary miss?",
      ],
    },
  ],
  codexConnection: {
    heading: "Structuring magic rules in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica allows you to organise magical traditions, arcane colleges, and rare spell components into an interconnected knowledge web. Link magical side effects directly to character sheets and faction records.",
      "Use custom entity tags and bidirectional links to track which guilds control rare reagents and which noble houses outlaw specific schools of sorcery.",
    ],
    linkText: "Explore the worldbuilding tool",
    href: "/solutions/worldbuilding-tool",
  },
  relatedTools: [
    {
      title: "Magic item generator",
      description:
        "Generate wondrous items, cursed relics, and volatile magical catalysts with distinct flaws.",
      href: "/generators/magic-item",
    },
    {
      title: "Faction generator",
      description:
        "Create arcane orders, clandestine covens, and inquisitorial witch-hunting guilds.",
      href: "/generators/faction",
    },
    {
      title: "Settlement generator",
      description:
        "Produce magical academies, fortified enclaves, and ritual sites adapted to magical laws.",
      href: "/generators/settlement",
    },
  ],
  relatedAnswers: [
    "how-do-you-start-worldbuilding-from-scratch",
    "how-do-you-handle-character-death-in-a-tabletop-rpg",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
  ],
  discovery: {
    id: "answer-create-magic-system",
    parentCluster: "worldbuilding",
    primaryIntent: "how to create a magic system",
    intentAliases: [
      "how to design a magic system",
      "worldbuilding magic system guide",
      "creating magic rules for ttrpg",
      "hard vs soft magic system design",
      "tabletop rpg magic system creation",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A step-by-step worldbuilding framework for designing gameable, thematic magic systems rooted in tangible costs, hard limits, and institutional consequences.",
    relatedIntents: [
      "answer-worldbuilding-from-scratch",
      "answer-npcs-memorable",
    ],
  },
  seo: {
    title:
      "How to Create a Magic System for Worldbuilding & TTRPGs | Codex Cryptica",
    description:
      "Learn how to design a cohesive magic system for tabletop RPGs and fiction. Focus on hard limits, tangible costs, and societal consequences to deepen worldbuilding.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-create-a-magic-system.jpg",
    imageAlt:
      "Fantasy illustration of an arcane scholar consulting a parchment inscribed with glowing geometric seals and alchemical crucibles",
  },
};
