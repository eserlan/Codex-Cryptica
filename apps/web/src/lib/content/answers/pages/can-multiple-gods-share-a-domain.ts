import type { AnswerConfigInput } from "../schema";

export const canMultipleGodsShareADomain: AnswerConfigInput = {
  slug: "can-multiple-gods-share-a-domain",
  category: "worldbuilding",
  labels: ["fantasy", "religion"],
  publishedAt: "2026-10-03",
  question: "Can multiple gods or supernatural beings share the same domain?",
  kind: "framework",
  shortAnswer:
    "Yes. A world can give several gods or other supernatural beings influence over the same concept, with each expressing a different aspect, claiming it in a different culture, or competing for the same power. Decide what their overlap means to worshippers and play, rather than treating every domain as exclusive by default.",
  sections: [
    {
      kind: "prose",
      heading: "A domain is a claim, not a filing cabinet",
      paragraphs: [
        "A tidy list gives each god one subject and makes every other claimant look like a mistake. That is a useful convention for a reference chart, but it need not describe how the cosmos works. Mortals may sort powers into names such as war, death, disease, storms, fertility, worms and fire because those labels help them pray, bargain and argue. The beings themselves may have no interest in keeping those borders clean.",
        "Treat a portfolio as a relationship between a power and a part of life. The same event can matter to several powers, and a person can ask more than one of them for help. Their claims become useful when they change what a village does, what a priest promises, or which danger the characters face.",
      ],
    },
    {
      kind: "list",
      heading: "Five models for shared domains",
      intro:
        "Pick the model that creates the kind of trouble you want at the table:",
      items: [
        {
          term: "Different aspects",
          text: "One god governs honourable war and sworn defence; another embodies slaughter, panic or the spoils of victory. Both answer soldiers, but their rites and demands pull in different directions.",
        },
        {
          term: "Different cultures",
          text: "Neighbouring peoples recognise different gods in the same storm, river or harvest. They may be separate beings, local names for one being, or an unresolved argument. Let each culture's practice show what the difference means to them.",
        },
        {
          term: "A greater power and its subordinate",
          text: "A lesser spirit, saint, demon or local god works inside, beneath or beside a larger portfolio. It might carry out one task, govern one place, or exploit a loophole the greater power cannot close.",
        },
        {
          term: "Competing claims",
          text: "Two powers genuinely want the same metaphysical territory. Each may answer the same prayer, contest a sacred site or persuade followers that the other has stolen its due. Decide what evidence mortals can see when both act.",
        },
        {
          term: "A changing office",
          text: "A domain can pass between powers, be divided after a defeat, or remain disputed after a succession. Older rites and surviving cults keep the former claim alive long after the official account says it ended.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A god of pestilence and a demon lord of worms",
      paragraphs: [
        "Both powers touch disease and decay, but their relationship is a choice for the setting. Their overlap becomes clear when a village has to decide which danger to resist and whose help to accept.",
      ],
      items: [
        {
          term: "The flat version",
          text: "The setting assigns disease to the god and worms to the demon lord, then treats each as the sole owner of that subject. When a fever leaves white larvae in a well, the categories stop helping the characters understand what is happening.",
        },
        {
          term: "Give each claim a consequence",
          text: "The god's clergy can slow a plague by burning bedding and keeping the sick fed, while the demon lord's cult spreads worms through the wells and promises that the dead will rise again. The powers overlap in sickness and death, but their followers offer different remedies and want different futures.",
        },
        {
          term: "Put the overlap in play",
          text: "A healer trained by the god asks the party to guard a quarantine house. A local worm-priest claims the larvae are sacred and has hidden infected neighbours in a shrine. If the party burns the shrine, the village's only burial ground is lost; if they leave it alone, the well remains unsafe.",
        },
        {
          term: "Why it works",
          text: "Neither being has to be excluded from the other's sphere. Their overlapping claims create a practical choice with costs the players can see, and the cults' rivalry can lead to a truce, a purge, a shared rite or a story about one power taking the other's place.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Let theology cause visible consequences",
      paragraphs: [
        "Overlap gives people reasons to disagree. Two temples may compete for offerings or accuse each other of false miracles. A ruler might back one cult and outlaw the other, turning doctrine into a holy war. Elsewhere, worshippers may combine rites, honour both beings at different stages of a funeral, or insist that two names refer to one power. Myths of succession can make today's bargain feel temporary: a defeated god may return, or a demon lord may claim a vacant office.",
        "Keep the uncertainty where it helps. Mortals can impose neat categories on a cosmos that ignores them, and the setting does not need to settle whether a local god is truly a separate being before the characters encounter its shrine, its followers and the price of asking for aid.",
      ],
      cta: {
        text: "Read the companion brief on gods and demon lords in issue #3741",
        href: "https://github.com/eserlan/Codex-Cryptica/issues/3741",
        external: true,
      },
    },
    {
      kind: "checklist",
      heading: "Make an overlap ready for play",
      intro: "For each pair of powers, write down:",
      items: [
        "What each power wants from the shared concept, in terms its followers would use.",
        "One visible sign that distinguishes their influence, if the setting has such signs.",
        "What a worshipper gains or risks by serving each power.",
        "A place, rite or community where their claims collide.",
        "What could happen if the powers cooperate, lose influence, or change places.",
      ],
    },
  ],
  codexConnection: {
    heading: "Track claims and their consequences in Codex Cryptica",
    paragraphs: [
      "Keep each power, cult, shrine and affected community connected as its own part of the setting. A graph can show where rival claims meet, while campaign notes preserve what the characters changed when they backed one side or another.",
    ],
    linkText: "Try the pantheon generator",
    href: "/generators/pantheon-generator",
  },
  relatedTools: [
    {
      title: "Pantheon generator",
      description:
        "Create gods with relationships and rivalries that can support overlapping claims.",
      href: "/generators/pantheon-generator",
    },
    {
      title: "Faction generator",
      description:
        "Develop the cults, churches and orders that act on competing beliefs.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Connect gods, cults, regions and history as your setting grows.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-pantheon",
    "how-do-you-create-a-believable-fictional-religion",
    "how-do-you-create-a-fantasy-faction",
    "how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
  ],
  discovery: {
    id: "answer-overlapping-divine-domains",
    parentCluster: "gods-and-faith",
    clusters: ["religion", "gods-and-faith", "fantasy-worldbuilding"],
    primaryIntent: "can multiple gods share the same domain",
    intentAliases: [
      "can two gods have the same domain",
      "can gods and demons share a domain",
      "overlapping divine portfolios in fantasy worldbuilding",
    ],
    uniqueValue:
      "Explains five system-neutral models for overlapping divine claims, then shows how a pestilence god and worm demon create practical choices for a campaign.",
    relatedIntents: ["answer-pantheon", "answer-fictional-religion"],
    acknowledgedOverlap: [
      {
        with: "answer-fictional-religion",
        reason:
          "The fictional-religion answer covers the rites and institutions of a faith; this page focuses on how supernatural claims can overlap and what those claims cause in play.",
      },
      {
        with: "answer-pantheon",
        reason:
          "Pantheon design uses overlapping claims to create relationships between gods; this page helps a worldbuilder choose how shared domains work and what their consequences look like in play.",
      },
    ],
  },
  seo: {
    title: "Can multiple gods share a domain? | Codex Cryptica",
    description:
      "Choose how gods and other powers share a portfolio, compete for influence, or serve different cultures, with a pestilence god and worm demon example.",
    image:
      "https://assets.codexcryptica.com/og/can-multiple-gods-share-a-domain.jpg",
    imageAlt:
      "A masked plague priest and a giant worm demon at a ruined shrine",
  },
};
