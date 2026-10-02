import type { AnswerConfigInput } from "../schema";

export const howCommonShouldMagicBeInAFantasyWorld: AnswerConfigInput = {
  slug: "how-common-should-magic-be-in-a-fantasy-world",
  category: "worldbuilding",
  labels: ["fantasy"],
  publishedAt: "2026-10-02",
  question: "How common should magic be in a fantasy world?",
  kind: "framework",
  shortAnswer:
    "Decide what an ordinary person should expect from magic, then work backwards through aptitude, practical training access, legal permission, competence, service capacity and everyday exposure. Set those dials for the kinds of magic that matter to play; cost, risk, visibility and place shape the result.",
  sections: [
    {
      kind: "prose",
      heading:
        "Why low magic and high magic are not useful settings on their own",
      paragraphs: [
        "Labelling a world low magic or high magic rarely helps at the table, because those terms bundle together too many different choices. One table means rare by aptitude but cheap to learn and openly used. Another means everyone could learn but almost nobody masters anything stronger than a hedge charm. Both get called low magic, yet they play completely differently, produce different economies, and invite different stories.",
        "A more practical approach is to ask five separate questions: how many could learn, how many actually get trained, how many may legally practise, how many competent practitioners exist, and how often an ordinary person encounters magic's effects. Aptitude is not training access; practical access to teachers, books, sites, reagents or patrons is not legal permission; and neither guarantees competence. Keep this separate from the mastery ceiling: how exceptional can the best practitioners become compared with a competent one?",
        "Caster prevalence and magic-in-daily-life prevalence are separate dials. A few practitioners may support common services through durable wards, enchanted tools, public provision or high-throughput work; many people may know minor charms while powerful effects remain rare. Practitioner prevalence is also distinct from supernatural prevalence: enchanted landscapes, spirits, creatures, relics or seasonal events can make a world feel magical without living spellcasters. Set these dials by capability, since household charms, healing, divination and battle magic need not be equally common. Prevalence is a current state produced by systems and can change with schools, resources, war, migration or reform.",
        "Decide what an ordinary person should expect from magic, then work backwards to the people, institutions and capacity needed to support it. If magic should feel wondrous and disruptive, limit routine public exposure even if aptitude is widespread. If healing, sending and wards should be ordinary services, provide enough practitioners or infrastructure to deliver them. Magical literacy among non-casters, service terms and spatial distribution all shift when you move a dial. A city where anyone can seek a street charm but only guild members can ward a house lives differently from a hamlet where one inherited healer serves three valleys. Name the dials, then set them one by one.",
      ],
    },
    {
      kind: "list",
      heading: "Trace the path from aptitude to everyday exposure",
      intro:
        "These stages can overlap in different ways; they are questions to answer, not mutually exclusive bands. Set them for each capability that matters to play:",
      items: [
        {
          term: "Aptitude",
          text: "Who could learn or perform this magic in principle: anyone with study, a gifted minority, a particular lineage, or those chosen by a patron or place? State how that potential is recognised, if at all.",
        },
        {
          term: "Practical training access",
          text: "Who can reach teachers, books, sites, reagents or patrons, and afford the time and cost of training? Open aptitude can still lead to few trained users when those routes are scarce.",
        },
        {
          term: "Legal access",
          text: "Who is permitted or licensed to practise, and who sets those rules? People may learn in secret or practise through custom even when the law restricts professional use.",
        },
        {
          term: "Competence and practitioner prevalence",
          text: "How many trained people become reliable at the work, and how many are practising in a place? A large pool of learners can still produce a tiny competent profession; a small group can serve a much wider region.",
        },
        {
          term: "Service capacity and everyday exposure",
          text: "Count capacity, not just practitioners: how many people can one healer treat in a day, how long does a ward last, and can routine work be delegated or stockpiled? Then ask how often people encounter the service or effect, including through infrastructure, tools and lasting rituals.",
        },
        {
          term: "Origin and source of ability",
          text: "Hereditary gifts can entrench families; learned magic rewards investment; granted power ties a caster to a patron; accidental or site-bound magic makes particular places matter. These sources shape the routes into practice without deciding prevalence by themselves.",
        },
        {
          term: "Magical literacy among non-casters",
          text: "Even where few people cast, many may recognise signs, know a ward when they see one, or know which request requires a licensed reader and which belongs to a hedge charmer. Literacy shapes behaviour: queues at the right door, correct payment, and proper caution. Decide what an ordinary adult, a village elder and a city clerk each know without themselves casting.",
        },
      ],
    },
    {
      kind: "list",
      heading:
        "Seven questions that set prevalence before you place a single mage",
      intro:
        "Use these as your framework. Keep aptitude, practical training access and legal permission distinct. Answer briefly and concretely for your own world, then carry those answers into streets, prices and laws:",
      items: [
        {
          term: "Who has the aptitude for magic?",
          text: "Name who could learn or perform each kind of magic in principle: anyone, a gifted minority, a particular lineage, or people chosen by a patron or place. Give a rough share in a settlement of a thousand, whether that potential is recognised or hidden, and what evidence reveals it. Do not use access to a teacher or permission to practise as a measure of aptitude.",
        },
        {
          term: "Who can get practical training?",
          text: "Decide who can reach teachers, books, sites, reagents or patrons, and afford the time and cost of instruction. Open aptitude can still produce few trained users when schools, apprenticeship places or travel are scarce. Note who controls these routes and any service owed after training.",
        },
        {
          term: "Who may legally practise?",
          text: "Set who may cast in public or offer services, who issues licences or credentials, and what happens to those who practise without them. Someone may have the aptitude and receive training yet still be barred by law; others may practise through custom or in secret.",
        },
        {
          term: "How many become competent practitioners?",
          text: "Set the time and effort needed to become reliable, then estimate how many trained people reach that level and continue practising. A patient teacher may bring competence in weeks, while a selective order may take a decade to produce a few experts. If competence is rare, expect debt, patronage and regional shortages.",
        },
        {
          term: "How powerful is ordinary magic",
          text: "Describe what a capable but unremarkable caster can reliably do: mend a tool, ease a fever, hold a door, carry a message, nudge weather for a field but not a county. Reserve stronger effects for exceptional practitioners, costly rites or dangerous sites. This tells you whether magic replaces labour and arms or merely supports them.",
        },
        {
          term: "How expensive or risky is its use",
          text: "Price each casting in coin, time, fatigue, attention, or harm. Cheap and safe magic is used casually and regulated for nuisance and fraud. Costly or risky magic is saved for need, creates repair economies around it, and invites illicit cheaper alternatives. Note what a household pays for the common service and what goes wrong when a caster cuts corners.",
        },
        {
          term: "How visible is magic in everyday life",
          text: "Even potent magic can be discreet, and modest magic can be highly visible. Visible practice produces street signs, uniforms, market stalls, and clear expectations about who to ask. Invisible practice produces rumour, proof problems, and fear of hidden influence. Decide what bystanders see and hear, what trace remains, and how a watch or court would prove that magic was used.",
        },
      ],
    },
    {
      kind: "table",
      heading:
        "Illustrative patterns from rare to ubiquitous magic, not predictions",
      headers: [
        "Prevalence",
        "Everyday access",
        "Institutions and economy",
        "Warfare and civic life",
      ],
      rows: [
        [
          "Sparse exposure",
          "Services by appointment; most people never buy a spell; items are relics rather than stock",
          "Patronage, private households and secrecy; knowledge kept in families or single orders",
          "Mages as named assets and deniable specialists; courts, roads and markets work without them",
        ],
        [
          "Local or occasional services",
          "Licensed readers in market towns; rural hamlets rely on travelling or hedge practitioners",
          "Guilds, examinations and per-casting fees; urban wards and rural hedge alternatives side by side",
          "Small corps inside guard and council; counter charms issued where threat is known",
        ],
        [
          "Routine public services",
          "Municipal desks for healing, warding and sending; apprentices visible on the street",
          "Civic colleges, inspected practice and price lists; reagents traded like other commodities",
          "Ward infrastructure, precinct casters and routine counters; doctrine assumes magical support",
        ],
        [
          "Woven into daily life",
          "Household charms for mending, lighting and keeping; market stalls for minor reagents",
          "Standards, liability and curriculum; regulation focuses on misuse rather than permission",
          "Public codes for magical conduct; warfare and building assume counters are standard",
        ],
      ],
    },
    {
      kind: "list",
      heading: "Spatial distribution: where do the prerequisites cluster?",
      intro:
        "Ask where teachers, reagents, sacred sites, ley lines, patrons, clients or other prerequisites cluster, and why. Cities and countryside offer one useful contrast, but magic might instead gather around monasteries, mines, ruins, forests, islands, nomadic routes or military garrisons:",
      items: [
        {
          term: "City concentration",
          text: "In one plausible pattern, teachers, libraries, reagents and clients collect in towns, so licensed practice clusters there. Price lists are posted, apprentices are visible, and officials can inspect. Cities may display magic more openly even when aptitude is evenly spread.",
        },
        {
          term: "Rural and remote patterns",
          text: "Where qualified casters or required materials are distant, hamlets may have longer gaps between visits. Hedge readers, travelling charmers and inherited charms can fill the need when licensed services are hard to reach. These alternatives may be slower, cheaper or legally ambiguous, depending on the place.",
        },
        {
          term: "Availability of services and items",
          text: "Ask on what terms an ordinary household can reliably obtain each service: retail payment, public funding, temple or employer provision, communal support, guild membership, patronage, rationing, barter or custom. For items, note whether charms are made to order, stocked, shared or limited to relics. A setting where healing is public but warding is rationed feels very different from the reverse.",
        },
        {
          term: "How to make the contrast playable",
          text: "Give each place a visible surface: a guild board with posted fees in the market city, a hedge circle that meets by the mill at dusk in the valley. When the party travels, the procedure changes with the place, and players can see which institution or workaround their request will meet.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the same border dale at two different levels",
      paragraphs: [
        "A border dale of twelve hamlets needs the same three things everywhere: a fever eased before harvest, a ward that keeps stores from spoiling, and a reliable way to send word to the garrison. The magic available is modest, but the prevalence decision changes what the party finds on the road.",
      ],
      items: [
        {
          term: "The uncommon version",
          text: "The dale has two licensed readers: one in the market town five miles off, one who rides a fortnightly circuit for a per-casting fee. Two hamlets keep hedge charmers who learned from a grandmother's book and charge in barter; the reeve treats them as tolerated but unlicensed. The town clerk holds the only reliable sending, and a message costs three days' wages and requires the recipient's sigil. The garrison's ward is a single licensed rite renewed each season, paid from the dale levy. When a child falls feverish and the rider is a week away, the family must choose between the hedge charmer, a costly rush to town, or waiting. The party is asked to carry a sigil, verify a disputed ward renewal, or escort the rider after a hedge charm is reported as fraud.",
        },
        {
          term: "The common version",
          text: "Each hamlet has a trained reader who completed a municipal course and keeps a posted price list: fever easing at half a day's wage, store warding by season, sending twice a week via a relay post that shares the road with the post rider. Charms for mending and lighting are sold at market from small stalls, and the town college inspects readers annually for competence and mischarging. Grant-bound healers serve the temple district at no direct charge but keep a public queue ordered by need, with a lay clerk recording position. When stores threaten to spoil early, the problem is not absence but priority: whose warding is renewed first, whether the temple queue can be jumped for coin, and whether the college will certify a cheaper hedge alternative the hamlets prefer.",
        },
        {
          term: "Why it works",
          text: "The two versions answered the same seven questions, then followed those answers into visible places and prices. The uncommon dale produced scarcity, travel, per-casting cost and legal ambiguity. The common dale produced posted fees, queues, inspection and rivalry between guild standard and hedge price. In both cases the party's choices touched coin, law, waiting lists or locked storerooms rather than a vague sense that magic was everywhere or nowhere.",
        },
      ],
    },
    {
      kind: "checklist",
      heading:
        "Prevalence checklist: lock your setting before you place encounters",
      intro:
        "Choose the everyday expectations first, then work backwards through this chain for each kind of magic that matters to play: aptitude → training access → legal access → competence → service capacity → everyday exposure. Layer cost, risk, visibility and geography over it, then place casters, services and institutions to match:",
      items: [
        "For each capability, state who has the aptitude, who can practically get trained, who may legally practise, and how many become competent practitioners.",
        "Pick one source mix (hereditary, learned, granted, accidental or place-bound) and note which families, schools or sites it empowers.",
        "Answer the seven framework questions in concrete terms: aptitude, practical training access, legal permission, competence, ordinary power, price and risk per use, and visible trace.",
        "For the services your table will meet most often, note the terms on which a household can reliably obtain them and the capacity available: who provides them, how many can be served, and how often.",
        "Map spatial distribution: what clusters around the market town, and what instead gathers at sacred sites, resource sources, borderlands or other places? Keep city and hamlet availability distinct where it matters.",
        "Decide what an ordinary non-caster knows: how they recognise a ward, which door to queue at, and what a lawful charm looks like versus a hedge one.",
        "Test the result with one everyday scene: a sick child, a spoiled store, or a message to a distant authority, and confirm that terms, capacity, law and waiting are clear. Revisit the answers when schools, resources, war or political reform change the system.",
      ],
    },
  ],
  codexConnection: {
    heading: "Place magical prevalence in Codex Cryptica",
    paragraphs: [
      "Record prevalence, access conditions and service availability on linked settlement, faction and location entities so regional differences remain visible in the campaign graph. Note which families, guilds, colleges, sites or routes shape each capability, and how ordinary people encounter its effects.",
      "Keep the terms of access, ordinary power, capacity and visible traces with the relevant records. When the table tests a different prevalence, those linked details help you follow how the change affects places and institutions.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Place market readers, relay posts, temple wards and hedge quarters inside towns and hamlets.",
      href: "/generators/settlement",
    },
    {
      title: "Faction generator",
      description:
        "Build guilds, colleges, patron houses and travelling circuits with goals and rivalries.",
      href: "/generators/faction",
    },
    {
      title: "NPC generator",
      description:
        "Create licensed readers, hedge charmers, clerks and sponsors with distinct motives.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Fantasy Worldbuilding",
      description:
        "Shape economies, faiths and settlements that give magic a social home.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-magic-system",
    "how-does-magic-create-social-classes-and-inequality",
    "how-does-magic-affect-politics-and-government",
    "how-should-magic-have-been-discovered-in-my-world",
    "how-do-i-build-a-believable-economy-for-a-fantasy-world",
    "how-do-you-create-a-fantasy-faction",
    "how-does-magic-change-society-in-a-fantasy-world",
  ],
  discovery: {
    id: "answer-how-common-should-magic-be-in-a-fantasy-world",
    parentCluster: "worldbuilding",
    clusters: ["worldbuilding"],
    primaryIntent: "how common should magic be in a fantasy world",
    intentAliases: [
      "how rare should magic be in fantasy worldbuilding",
      "low magic vs high magic prevalence guide",
      "who can use magic in a fantasy setting",
      "urban vs rural magic access in worldbuilding",
      "magical prevalence framework for ttrpgs",
    ],
    userJob: "understand",
    uniqueValue:
      "A capability-first prevalence framework that follows aptitude through training, legal access, competence, service capacity and everyday exposure, with five practical questions and spatial-distribution guidance.",
    relatedIntents: [
      "answer-create-magic-system",
      "answer-magic-creates-social-classes-and-inequality",
      "answer-magic-affects-politics-and-government",
      "answer-magic-discovery-origin",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-create-magic-system",
        reason:
          "The magic-system answer designs magical rules, costs and limits; this answer assumes a system exists and guides how widely its use is distributed across population, training and daily life.",
      },
      {
        with: "answer-magic-creates-social-classes-and-inequality",
        reason:
          "The social-classes answer traces how aptitude, schooling and licensing produce stratification among households; this answer follows prevalence from potential ability through training, practice and everyday exposure.",
      },
      {
        with: "answer-magic-affects-politics-and-government",
        reason:
          "The politics answer follows magic through courts, law and state offices; this answer sets everyday prevalence and service availability, which then determines what political institutions must regulate or counter.",
      },
    ],
  },
  seo: {
    title: "How common should magic be in a fantasy world? | Codex Cryptica",
    description:
      "Choose how aptitude, training, permission and service capacity shape everyday magic, with capability-specific prevalence and spatial distribution examples.",
    image:
      "https://assets.codexcryptica.com/og/how-common-should-magic-be-in-a-fantasy-world.jpg",
    imageAlt:
      "A twilight fantasy market where a licensed apothecary stall with warded charms faces a quiet hedge table across the square",
  },
};
