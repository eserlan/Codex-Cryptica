import type { AnswerConfigInput } from "../schema";

export const howShouldMagicHaveBeenDiscoveredInMyWorld: AnswerConfigInput = {
  slug: "how-should-magic-have-been-discovered-in-my-world",
  category: "worldbuilding",
  labels: ["fantasy"],
  publishedAt: "2026-10-02",
  question: "How should magic have been discovered in my world?",
  kind: "framework",
  shortAnswer:
    "Choose how your people first learned to use magic separately from where magic itself comes from, then decide who remembers, controls, or forbids that discovery today. The model you pick, whether slow natural enquiry, divine gift, inheritance from a fallen civilisation, planar catastrophe, outsider teaching, rediscovery of banned lore, multiple independent traditions, or an ancient force only recently made usable, shapes who claims authority, which institutions guard the knowledge, and what laws, customs, and beliefs shape play now.",
  sections: [
    {
      kind: "prose",
      heading: "Origin and discovery are two different questions",
      paragraphs: [
        "Worldbuilders often start by defining where magic comes from, then assume everyone learned about it at the same time and in the same way. That flattens your setting. Where magic originates (a natural field, the favour of gods, the physics of another plane) is a cosmological question. How mortal cultures first encountered, understood, and learned to use it is a historical one, and the two do not have to match.",
        "A world where magic has always existed as a quiet natural force can still have a recent, contested discovery: perhaps only the last century produced instruments sensitive enough to measure it. A world where magic arrived in a planar storm can have cultures that treat it as a divine revelation because priests were first to interpret the event. Separating origin from discovery lets you give competing groups different, plausible stories about the same phenomena, and those stories become sources of authority, rivalry, and plot.",
        "Use this separation as your first decision. State your origin in one sentence, then state your discovery model in another. If they are identical (the gods gave magic and priests were the first to use it) note that directly, because that identity itself explains why one priesthood claims a monopoly. If they differ, note the gap, because the gap is where alternative histories and heresies grow.",
      ],
    },
    {
      kind: "list",
      heading: "Eight discovery models and what each one buys you",
      intro:
        "Choose the dominant discovery history for the setting you want at the table. Other models can describe different regions or later periods when they materially change present-day authority, access, or conflict:",
      items: [
        {
          term: "Natural force, gradually understood",
          text: "Scholars, artisans, and healers notice patterns over generations, name them, and build techniques. This suits settings where magic feels like craft or science, with guilds, treatises, and slow refinement. Authority rests with universities and workshops rather than temples, and progress feels cumulative and arguable.",
        },
        {
          term: "Divine gift or revelation",
          text: "A god, spirit court, or prophet discloses use to chosen people. Magic carries moral weight and liturgy from the start. Temples claim legitimate ownership, heresy matters, and competing revelations produce rival orthodoxies that each insist their rite is the proper form.",
        },
        {
          term: "Inheritance from an older civilisation",
          text: "Your cultures did not invent magic, they inherited its ruins, libraries, and tools. This creates a prestige language, lost techniques, and custodians who control access to surviving sites. Antiquarian politics, restoration projects, and disputes over who owns a dead empire's archive drive conflict.",
        },
        {
          term: "Catastrophe or planar event",
          text: "A comet, breach, war, or collapse makes magic suddenly usable, visible, or dangerous. Discovery is dated and traumatic. Expect calendars reset to the event, quarantine laws, veteran survivors with status, and a living memory that shapes caution, blame, and reparations.",
        },
        {
          term: "Introduced by outsiders or non-human peoples",
          text: "Elves, spirits, travellers from another world, or a neighbouring culture teach or trade the art. The transfer might come through exchange, alliance, apprenticeship, migration, conquest, coercion, espionage, or secrecy. Ask who had power to teach or withhold the knowledge, how it was translated, and who receives credit now.",
        },
        {
          term: "Rediscovered or forbidden knowledge",
          text: "Magic was known, banned, or buried, then unearthed again. Secrecy, censorship, and black archives shape the present. Expect expurgated texts, licensing regimes, and dangerous branches that researchers are told not to pursue, which of course some do.",
        },
        {
          term: "Multiple independent discoveries",
          text: "Different cultures find workable methods on their own, with distinct names, gestures, and theories. This produces real cultural difference rather than cosmetic reskinning. Contrasting traditions can agree on results while disagreeing on explanation, which causes trade, rivalry, and mistranslation at borders.",
        },
        {
          term: "Always present, only recently made usable",
          text: "Magic existed but lacked a catalyst, lens, or population change that made organised use possible. Perhaps refined reagents, a new alloy, a linguistic shift, or a demographic threshold made it usable. This explains why ancient sources hint at wonders nobody could replicate until now, and why control of the new enabler matters more than the old lore.",
        },
      ],
    },
    {
      kind: "list",
      heading: "From phenomenon to living tradition",
      intro:
        "A discovery can mean different things: people may discover a phenomenon, invent a usable technique, domesticate an unpredictable force, standardise local practices, or rediscover lost knowledge. A setting can have several such turning points, and no single first practitioner needs to be known. A quick method is **phenomenon → breakthrough → replication → transmission → standardisation → control → legacy**. In Saltspire, storm-lit water leads to charged glass, fishers gather it, glassworkers reproduce the effect, harbour apprentices spread the method, the Salt Guild grades safe cuts, the city requires its seals, and temple and university contest its legacy. Trace how usable knowledge became repeatable, teachable, and socially important:",
      items: [
        {
          term: "Phenomenon and prerequisites",
          text: "Who first noticed what was happening, and what had to exist before anyone could use it? A reagent, writing system, measuring tool, ritual space, specialist institution, or contact with a particular place or being may have made practical work possible.",
        },
        {
          term: "Breakthrough and replication",
          text: "Who found a workable technique, and who proved it could be repeated? The breakthrough may belong to a community rather than a named discoverer; surviving evidence, oral histories, and official accounts may disagree about who did the work.",
        },
        {
          term: "Transmission",
          text: "How did the practice travel: through families, apprenticeships, temples, armies, trade, migration, texts, conquest, or theft? Ask what carried the knowledge, what slowed or distorted it, and how it changed in translation or new conditions—a ritual might be shortened for soldiers, or fail where its reagents do not grow.",
        },
        {
          term: "Standardisation and control",
          text: "When did local practice become a recognised tradition, and who set its names, training, or safety rules? An institution may later claim authority over that process; decide how it acquired its position, rather than assuming it survived from the first discovery.",
        },
        {
          term: "Legacy and false starts",
          text: "Who is remembered as the discoverer, and who actually developed the practice? Keep room for erased contributors, a useful but mistaken theory, an abandoned dangerous method, or an experiment no one can repeat. These can shape present-day prestige, taboos, and popular beliefs.",
        },
      ],
    },
    {
      kind: "list",
      heading: "How discovery shapes the present day",
      intro:
        "Trace the history into present-day institutions and everyday life. Its legacy might appear in language, education, faith, trade, class, architecture, warfare, safety customs, or law; connect it to something the party can see, hear, or break:",
      items: [
        {
          term: "Who claims ownership",
          text: "Name one body that claims rightful custody of magical knowledge today (a college, temple, guild, lineage, or state office) and one rival that disputes it. Put their disagreement on a document, a licence, or a border the players will cross.",
        },
        {
          term: "Origin myths and competing histories",
          text: "Give at least two cultures different stories about the same discovery event. One may celebrate a saint, the other a pragmatic engineer. Let NPCs cite those stories to justify present policy, so history arrives as argument rather than exposition.",
        },
        {
          term: "Institutions and monopolies",
          text: "Decide which institution now claims authority and how it acquired that position: entrance exams, oaths, guild marks, or state vetting may reflect a recent reform, a takeover, or succession from an older power. Show its reach in prices, permits, uniforms, and who is allowed to teach. If there is no monopoly, show why it failed and who benefits from that absence.",
        },
        {
          term: "Lost techniques and taboos",
          text: "List one technique that no longer works reliably, one that is forbidden to teach, and one that is pursued in secret. Give each a visible sign, a ruined site, a censored chapter, a smuggler's reagent, so players can find the gap rather than be told about it.",
        },
        {
          term: "Cultural difference from independent traditions",
          text: "If traditions diverged, give each a distinct practice the other finds strange: different tools, prohibitions, or courtesies. A healer from a chant tradition and a scribe from a sigil tradition may cure the same wound while disagreeing on everything else, which creates fertile miscommunication during joint tasks.",
        },
        {
          term: "Modern access, law, and politics",
          text: "Translate history into current rules and customs. Who may learn, teach, or carry catalysts, and who judges misuse? Write one statute, one street-level habit, and one loophole that adventurers, smugglers, or reformers exploit. The legacy might instead—or also—shape a calendar, professional title, school curriculum, market, or popular misconception.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The same city with two different histories",
      paragraphs: [
        "A small port city, Saltspire, sits on a tidal flat where storm light once set the sea aglow. The GM wants magic to feel regulated and story-rich. Two discovery histories produce two playable presents from the same premise.",
      ],
      items: [
        {
          term: "Before: vague ancient gift with no present consequence",
          text: "The notes say magic is an old divine gift, used by wizards in towers. The city looks like any other port. Guards treat a street ritual the same as a brawl, the temple and the college agree on everything, and no record explains who is allowed to teach. Players hear that magic is ancient and powerful, but see no difference in streets, courts, or prices.",
        },
        {
          term: "After: catastrophe model with visible legal fallout",
          text: "The GM decides a planar storm cracked the tidal flat forty years ago, making refracted sea glass capable of holding a charge. Fisher families who gathered the glass first formed a cooperative that became the licensed Salt Guild. The temple declared the storm a judgement and claims only ordained cleansers may handle raw glass. The university, founded after, argues the effect is natural and publishable. Today raw glass transport requires a guild seal, temple cleansers bless each shipment at the harbour shrine, and university demonstrators hand out pamphlets that cite tide tables instead of prayer. A stolen crate of unblessed glass is therefore a legal, religious, and economic problem at once.",
        },
        {
          term: "After: multiple independent traditions variant",
          text: "Alternatively, the GM keeps the storm but says two peoples learned to use the glass separately: the port's glass-cutters who grind lenses, and hill herders who sing to it using overtone chant. The cutters' lenses produce precise beams for signalling and surgery, the herders' chant coaxes slow growth in crops and bone. City law recognises only the lens licence, so herders must register as apprentices to sell their work, which fuels resentment. A herder healer treating a guard captain creates a scene where law, medicine, and custom collide visibly.",
        },
        {
          term: "Why it works",
          text: "Each history answers who controls memory, money, and permission today. Players do not need a lecture on the storm; they encounter seals, shrines, pamphlets, and licensing queues. Choosing a discovery model first forces those concrete details into existence, so the party experiences history as present-day procedure and conflict.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Discovery history checklist",
      intro:
        "Use this before your next session to turn the history into playable detail:",
      items: [
        "Write one sentence for origin and one for discovery; note whether they match and who exploits any gap.",
        "Choose the dominant discovery history from the eight, then add another model only where it changes present-day institutions or conflict. A single first discoverer may be unknown or unknowable.",
        "Trace one practice from first encounter through repeatable technique, transmission, standardisation, and present-day control; note any material or institution it depended on.",
        "Name who is credited with the discovery, who did the work, and one rival account or erased contributor.",
        "Name the present-day claimant to authority, how it gained that position, and one visible sign of its control (a licence, uniform, seal, or schedule).",
        "Define one lost technique, one forbidden branch, and one dangerous line of research your players could actually find traces of.",
        "Add one false start, obsolete theory, or abandoned practice that still leaves a mark on custom or public belief.",
        "If you use independent traditions, give each a distinct tool, gesture, or prohibition that the other tradition finds odd or rude.",
        "Write one current statute and one loophole: who may learn, who may teach, and how a clever party might work around the rule.",
        "Place three table-visible consequences in your next location: a price, a patrol habit, and a piece of street argument that stems directly from the discovery you chose.",
      ],
    },
  ],
  codexConnection: {
    heading: "Trace magical history in your campaign bible",
    paragraphs: [
      "Once you have chosen a discovery model, record it as linked history in Codex Cryptica rather than a paragraph buried in notes. Create an entity for the discovery event, link it to the institutions, families, and sites that claim or dispute it, and map how rival traditions branch from that moment.",
      "Use the graph and timeline to keep competing origin myths, monopolies, and forbidden techniques visible during prep, so that when players question a licence, visit a ruin, or hire a teacher from another tradition, you have the consequences to hand.",
    ],
    linkText: "Try the worldbuilding tool",
    href: "/solutions/worldbuilding-tool",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Create the colleges, guilds, and orders that now claim or contest magical authority.",
      href: "/generators/faction",
    },
    {
      title: "Pantheon generator",
      description:
        "Sketch the gods, saints, or prophets whose revelation story underpins a divine discovery.",
      href: "/generators/pantheon-generator",
    },
    {
      title: "Settlement generator",
      description:
        "Build a city whose districts, laws, and trade reflect how magic was discovered there.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Connect pantheons, factions and centuries of lore in one local-first workspace.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-magic-system",
    "how-do-you-create-a-believable-fictional-religion",
    "how-do-you-create-a-pantheon",
    "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-start-worldbuilding-from-scratch",
    "how-does-magic-create-social-classes-and-inequality",
    "how-common-should-magic-be-in-a-fantasy-world",
    "how-does-magic-change-society-in-a-fantasy-world",
  ],
  discovery: {
    id: "answer-magic-discovery-origin",
    parentCluster: "worldbuilding",
    primaryIntent: "how should magic have been discovered in my world",
    intentAliases: [
      "magic origin vs discovery worldbuilding",
      "how was magic discovered fantasy setting",
      "magic discovery history fantasy world",
      "divine gift vs natural magic discovery",
    ],
    userJob: "understand",
    uniqueValue:
      "A framework that separates the origin of magic from how people learned to use it, with eight discovery models and a checklist that traces each history into modern authority, law, and cultural difference.",
    relatedIntents: [
      "answer-create-magic-system",
      "answer-fictional-religion",
      "answer-pantheon",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-create-magic-system",
        reason:
          "This answer explains how people discovered magic and how that history shapes access and authority; the magic-system answer designs the rules, costs, and limits of using it.",
      },
    ],
  },
  seo: {
    title:
      "How Should Magic Have Been Discovered in My World? | Codex Cryptica",
    description:
      "Pick a magic discovery model for your setting and trace how it shapes who controls lore, faith, and law today, with eight origins and a table-ready checklist.",
    image:
      "https://assets.codexcryptica.com/og/how-should-magic-have-been-discovered-in-my-world.jpg",
    imageAlt:
      "Scholars unrolling an illuminated scroll of arcane constellations in a candlelit archive beside glass vessels that hold faint stormlight",
  },
};
