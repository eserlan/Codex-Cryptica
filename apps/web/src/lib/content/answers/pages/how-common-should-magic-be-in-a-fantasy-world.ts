import type { AnswerConfigInput } from "../schema";

export const howCommonShouldMagicBeInAFantasyWorld: AnswerConfigInput = {
  slug: "how-common-should-magic-be-in-a-fantasy-world",
  category: "worldbuilding",
  labels: ["fantasy"],
  publishedAt: "2026-10-02",
  question: "How common should magic be in a fantasy world?",
  kind: "framework",
  shortAnswer:
    "Set how many people can use magic, how hard it is to get good at it, and what ordinary spells can actually do, then price that access in coin, time, risk and visibility. A tiny elite with costly rites produces secrecy, patronage and fear of exposure; a common craft with cheap, visible charms reshapes work, trade, law and war, so choose the level that gives your table the institutions and everyday expectations you want to play with.",
  sections: [
    {
      kind: "prose",
      heading:
        "Why low magic and high magic are not useful settings on their own",
      paragraphs: [
        "Labelling a world low magic or high magic rarely helps at the table, because those terms bundle together too many different choices. One table means rare by talent but cheap to learn and openly used. Another means everyone could learn but almost nobody masters anything stronger than a hedge charm. Both get called low magic, yet they play completely differently, produce different economies, and invite different stories.",
        "A more practical approach is to separate two questions that are often confused. Access asks who is allowed or able to try magic at all: everyone with study, only the trained, only a gifted minority, or only a tiny elite. Talent asks how exceptional the best practitioners are compared with an ordinary trained caster. A setting can give wide access but keep true brilliance rare, or keep access narrow while treating every licensed caster as roughly equal inside that circle. When you state both plainly, labels stop doing the work and your world gains handles the players can actually grip.",
        "This separation matters because prevalence is not only about headcounts. Magical literacy among non-casters, the availability of services and items, the urban and rural difference, and the source of ability all shift when you move a dial. A city where anyone can pay a street reader for a charm but nobody outside the guild can ward a house lives differently from a hamlet where one inherited healer serves three valleys and every neighbour knows the cost. Name the dials, then set them one by one.",
      ],
    },
    {
      kind: "list",
      heading: "Who can use magic, and where does the ability come from",
      intro:
        "Start by fixing who is allowed to attempt magic and what kind of origin your table needs to explain. Pick the band that gives you the stories you want, then follow the consequences into training, family and law:",
      items: [
        {
          term: "Everyone with study",
          text: "If anyone who puts in the work can learn, magic behaves like literacy or a craft. Schools, apprenticeships, fees and examinations decide who actually gets good. Bloodline matters little, but access to teachers, books and time matters a great deal. Expect municipal classes, competing manuals, and disputes about standards.",
        },
        {
          term: "Trained users only",
          text: "Talent may be widespread, but lawful practice requires initiation, licence or induction. Folk without the mark can still learn in secret, yet their work is treated as unlawful, hedge or heretical. This model suits guilds, orders, temples and state colleges that turn a common aptitude into a controlled profession.",
        },
        {
          term: "Gifted minority",
          text: "A noticeable share of people carry the knack, perhaps one household in ten, but it takes testing to find and training to shape. Sponsors compete to identify children early, families treat a gifted child as a resource, and those passed over must live beside a power they cannot claim. Mobility and resentment both run high.",
        },
        {
          term: "Tiny elite",
          text: "True casters are few enough to name in a district, perhaps one in a generation per valley. Each one is a political fact. Rulers keep them close, rivals try to buy or remove them, and ordinary people may go years without seeing lawful magic done openly. Secrecy, patronage and fear of exposure dominate.",
        },
        {
          term: "Hereditary, learned, granted or accidental",
          text: "Hereditary gifts entrench families and dowries of lore. Learned magic rewards investment and favours cities where teachers collect. Granted power ties the caster to a patron, divine or otherwise, who can withdraw favour or demand service. Accidental or site-bound magic creates places that matter more than bloodlines, and traffic to those places becomes a geography the party can read.",
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
        "Five questions that set prevalence before you place a single mage",
      intro:
        "Use these as your framework. Answer briefly and concretely for your own world, then carry those answers into streets, prices and laws:",
      items: [
        {
          term: "Who can learn or use magic at all",
          text: "Name the pool plainly and how it is identified: open study, licensed instruction, tested gift, or rare inheritance. State the rough share in a settlement of a thousand who could attempt a simple rite if they chose, and who decides whether that attempt is lawful. This one line determines whether magic is a right, a credential or a birthright.",
        },
        {
          term: "How difficult is it to become competent",
          text: "Fix training time, cost and gatekeeping. Is competence a matter of weeks with a patient teacher, years of formal study, or a decade inside an order that selects few? Note fees, apprenticeship places, required travel, and any service owed after training. If competence is dear, expect debt, patronage and regional shortage.",
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
      heading: "What changes when magic moves from rare to ubiquitous",
      headers: [
        "Prevalence",
        "Everyday access",
        "Institutions and economy",
        "Warfare and civic life",
      ],
      rows: [
        [
          "Rare (tiny elite, few services)",
          "Services by appointment; most people never buy a spell; items are relics rather than stock",
          "Patronage, private households and secrecy; knowledge kept in families or single orders",
          "Mages as named assets and deniable specialists; courts, roads and markets work without them",
        ],
        [
          "Uncommon (gifted minority, licensed trade)",
          "Licensed readers in market towns; rural hamlets rely on travelling or hedge practitioners",
          "Guilds, examinations and per-casting fees; urban wards and rural hedge alternatives side by side",
          "Small corps inside guard and council; counter charms issued where threat is known",
        ],
        [
          "Common (teachable craft, municipal presence)",
          "Municipal desks for healing, warding and sending; apprentices visible on the street",
          "Civic colleges, inspected practice and price lists; reagents traded like other commodities",
          "Ward infrastructure, precinct casters and routine counters; doctrine assumes magical support",
        ],
        [
          "Ubiquitous (everyday literacy, household charms)",
          "Household charms for mending, lighting and keeping; market stalls for minor reagents",
          "Standards, liability and curriculum; regulation focuses on misuse rather than permission",
          "Public codes for magical conduct; warfare and building assume counters are standard",
        ],
      ],
    },
    {
      kind: "list",
      heading: "Urban and rural access rarely match",
      intro:
        "Prevalence looks different on the street than on the register. Where people live, who they know, and what they can pay shape whether magic feels close or distant:",
      items: [
        {
          term: "City concentration",
          text: "Teachers, libraries, reagents and clients collect in towns, so licensed practice clusters there. Price lists are posted, apprentices are visible, and officials can inspect. Cities therefore display magic more openly even when the underlying talent is evenly spread.",
        },
        {
          term: "Rural scarcity and hedge answers",
          text: "Hamlets see fewer qualified casters and longer gaps between visits. Hedge readers, travelling charmers and inherited charms fill the shortage where licensed rates are out of reach. Expect slower, cheaper and legally ambiguous alternatives rather than no magic at all.",
        },
        {
          term: "Availability of services and items",
          text: "Decide for each common need whether service is retail (pay per casting), subscription (ward by season), or rationed (temple healing on fixed days). For items, note whether charms are made to order, stocked by shops, or limited to relics held by families and orders. A setting where healing is retail but warding is rationed feels very different from the reverse.",
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
          text: "The two versions asked and answered the same five questions, then followed those answers into visible places and prices. The uncommon dale produced scarcity, travel, per-casting cost and legal ambiguity. The common dale produced posted fees, queues, inspection and rivalry between guild standard and hedge price. In both cases the party's choices touched coin, law, waiting lists or locked storerooms rather than a vague sense that magic was everywhere or nowhere.",
        },
      ],
    },
    {
      kind: "checklist",
      heading:
        "Prevalence checklist: lock your setting before you place encounters",
      intro:
        "Work through these briefly, then place casters, shops and offices to match the result:",
      items: [
        "Pick one band for access (everyone, trained users, gifted minority, tiny elite) and state how that access is identified or licensed.",
        "Pick one source mix (hereditary, learned, granted, accidental or place-bound) and note which families, schools or sites it empowers.",
        "Answer the five framework questions in concrete terms: pool, training time and cost, ordinary power, price and risk per use, and visible trace.",
        "Price the three services your table will meet most often, and note the per-casting cost or subscription for a common household.",
        "Set urban and rural availability separately: what the market town stocks openly and what the hamlets get through hedge or circuit riders.",
        "Decide what an ordinary non-caster knows: how they recognise a ward, which door to queue at, and what a lawful charm looks like versus a hedge one.",
        "Test the result with one everyday scene: a sick child, a spoiled store, or a message to a distant authority, and confirm that coin, law, and waiting are clear.",
      ],
    },
  ],
  codexConnection: {
    heading: "Place magical prevalence in Codex Cryptica",
    paragraphs: [
      "Record each magical capability with its access band, training time and cost, ordinary power, price per use and visible trace, then link it to the families, guilds, colleges and circuit routes that actually deliver it. Tag settlements and quarters for urban concentration versus rural scarcity so the graph shows where licensed practice, hedge answers and temple queues each appear.",
      "Link household and quarter records to the services they rely on, with posted fees or barter terms kept beside the entry. When the table tests a different prevalence, you can see which ledger, waiting list or storeroom their choice touches overnight.",
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
      "A prevalence framework that separates access from talent and answers five practical questions about competence, power, cost and visibility, with a four-level prevalence table and urban versus rural guidance.",
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
          "The social-classes answer traces how talent, schooling and licensing produce stratification among households; this answer sets the broader prevalence band that determines how large that talent pool is and where access concentrates.",
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
      "Choose who can use magic, how hard it is to learn and what everyday spells do, with urban versus rural access and a prevalence table for your table.",
    image:
      "https://assets.codexcryptica.com/og/how-common-should-magic-be-in-a-fantasy-world.jpg",
    imageAlt:
      "A twilight fantasy market where a licensed apothecary stall with warded charms faces a quiet hedge table across the square",
  },
};
