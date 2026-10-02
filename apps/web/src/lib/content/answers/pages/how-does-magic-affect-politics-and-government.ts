import type { AnswerConfigInput } from "../schema";

export const howDoesMagicAffectPoliticsAndGovernment: AnswerConfigInput = {
  slug: "how-does-magic-affect-politics-and-government",
  category: "worldbuilding",
  publishedAt: "2026-10-02",
  question: "How does magic affect politics and government?",
  kind: "framework",
  shortAnswer:
    "Magic does not automatically create a magocracy. It forces every government to answer who may use each capability, who fears it enough to pay for a counter, and what public institution makes that answer visible and enforceable. A single truth reader reshapes trials, a guild that can teleport reshapes taxation and troop movement, and a handful of charmers reshapes succession and policing, so build politics around control, fear and counters rather than raw power alone.",
  sections: [
    {
      kind: "prose",
      heading: "Why mages do not automatically rule",
      paragraphs: [
        "Treating magic as a personal power level produces a dull political answer: whoever casts the biggest spell governs. Real institutions rarely work like that, because a capability is only as politically useful as it is reliable, legible and controllable. A court where one mage can read minds but nobody can verify the reading will trust that mage less, not more.",
        "A more useful approach is to treat each magical effect as a technology with owners, costs and traces. Teleportation matters differently from charm, which matters differently from healing or weather control. Ask for each effect how it is learned, how it is detected, how it is stopped, and who profits when it is restricted. The answers to those questions generate advisers, licences, courts, taxes, police powers and resistance movements without any need to declare that wizards sit on every throne.",
      ],
    },
    {
      kind: "list",
      heading: "Six pressure points where magic touches government",
      intro:
        "Map your magic onto the places where states actually exercise power. For each point, note who controls the capability, who fears it, and what institution arises to mediate it:",
      items: [
        {
          term: "Advisers, court mages and offices of state",
          text: "A ruler who depends on a single mage for scrying or healing has a dependency, not an asset. Stable states formalise the role: a chartered Office of Thaumaturgy, a sworn court mage with oaths and hostages, or a rotating advisory council. Ask whether the mage serves at pleasure, holds office by law, or controls access to a resource the crown cannot replace.",
        },
        {
          term: "Mage councils, theocracies and legitimised rule",
          text: "Legitimacy can derive from magic directly: a theocracy where priesthood alone can perform rites that confirm an heir, or a council that alone can maintain wards keeping a city habitable. Such bodies claim authority from function, not force. Decide whether their sanction is ceremonial, legal or existential, and what happens to a ruler who loses it.",
        },
        {
          term: "Licensing, registration and regulation",
          text: "States regulate what they cannot reliably suppress. Licensing answers practical questions: who may teach, who may carry reagents, where casting is forbidden, and what marks or ledgers make a practitioner legible to authority. Rare, expensive or dangerous magic tends toward guild charters and state examinations; cheap, concealable magic tends toward sumptuary laws, mandatory disclosure or outright prohibition.",
        },
        {
          term: "Policing, investigation and surveillance",
          text: "Truth reading, scrying and speaking with the dead remake justice. If evidence can be extracted by spell, courts need rules for consent, corroboration and admissibility, and suspects need protections against compelled disclosure. Surveillance magic creates the same tension again: a watch that can scry without warrant invites both public demand for safety and private demand for privacy, and the law settles where the line falls.",
        },
        {
          term: "Succession, impersonation and mind-affecting magic",
          text: "Charm, illusion and suggestion threaten the identity of the ruler more than the walls of the palace. Where such effects exist, succession law, ceremony and security adapt: witnessed rites, known counters, anti-illusion protocols, and rules that void acts done under enchantment. Assassinations become harder to prove and easier to allege, which suits conspiracies whether they use magic or only claim that their rivals did.",
        },
        {
          term: "Logistics, communication and governing at distance",
          text: "Sending, teleportation and bound messengers compress distance. A realm that can move orders and officials instantly can centralise tax, justice and command, but it also concentrates risk: the circle, tower or relay becomes a target, and the people who operate it become gatekeepers. If the effect is rare or costly, expect trunk routes between capitals with mundane roads covering the last miles, and a visible hierarchy of places that are on the network and places that are not.",
        },
      ],
    },
    {
      kind: "list",
      heading: "War, deterrence and anti-magic answers",
      intro:
        "Military and institutional counters deserve the same attention as the powers they check. A state that cannot answer a hostile mage on the battlefield will find another answer off it:",
      items: [
        {
          term: "Magical warfare and deterrence",
          text: "Large-scale effects raise the classic problems of range, cost, accuracy and consequence. A fire storm that ruins farmland for years is less a battlefield tactic than a deterrent, much like siege artillery. Consider doctrines for signalling, restraint and retaliation, and who is authorised to release such effects. Smaller, reliable effects such as wards, counterspells or weather calls shape fortification, campaign seasons and naval movement instead.",
        },
        {
          term: "Anti-magic institutions",
          text: "Where magic is potent, counter institutions appear: null wards in courts and prisons, inquisitorial offices, witchfinders, sanctioned mage hunters, and civic militias trained to snuff catalysts. The politics lies in who controls them, how easily they are abused against the unmagical, and whether their authority is judicial, military or religious. A counter that can silence lawful as well as hostile magic is itself a concentration of power.",
        },
        {
          term: "Magical organisations and secular governments",
          text: "Academies, covens, temples and orders that train practitioners bargain with states for charter, land, tax privilege or monopoly. Their leverage is control of supply; the state's leverage is law, coin and legitimacy. Relations tend toward one of three settlements: incorporation into the civil service, autonomous charter under oath and inspection, or uneasy rivalry where each keeps the other visible but not subordinate. Decide which settlement each order has, and what would push it toward another.",
        },
      ],
    },
    {
      kind: "table",
      heading: "How scarcity changes political adaptation",
      headers: [
        "Condition",
        "Rare magic (few practitioners)",
        "Common magic (widely taught)",
      ],
      rows: [
        [
          "Legitimacy",
          "Bloodline, divine favour or single relic; succession rites centre on access to the few",
          "Examinations, guild ranks and civic oaths; legitimacy from competence and record",
        ],
        [
          "Law",
          "Personal licences and patronage; exemptions for the favoured",
          "Codes, standards and inspected practice; mundane courts handle magical torts",
        ],
        [
          "Policing",
          "Small elite corps, reliant on informants and reagents",
          "Ward infrastructure, precinct mages and routine counters",
        ],
        [
          "Administration",
          "Trunk routes between capitals, prestige projects and chokepoints",
          "Distributed relays, postal integration and municipal services",
        ],
        [
          "Military",
          "Bespoke assets, bodyguards and deniable specialists",
          "Formations, doctrine and logistics built around magical arms",
        ],
        [
          "Resistance",
          "Conspiracy and mimicry, since few can verify claims",
          "Union, licensing disputes and regulation capture",
        ],
      ],
    },
    {
      kind: "example",
      heading:
        "Worked example: the same kingdom with and without institutional answers",
      paragraphs: [
        "A coastal monarchy faces a single question: who may speak for the dead king when a disputed succession follows a sudden death? The magic in the setting allows brief communion with the recently dead and subtle thought nudging.",
      ],
      items: [
        {
          term: "The thin version",
          text: "The queen keeps a powerful mage at court. At the succession council the mage reports that the dead king favoured the younger prince. The council accepts the claim, because the mage is powerful. Players asked to defend the elder prince have little to work with except disputing power with more power.",
        },
        {
          term: "The institutional version",
          text: "The queen retains a chartered Office of Rites. Its three officiants are sworn, housed separately, and cannot sit together without a secular clerk recording. Speaking with the dead requires cathedral incense held under lock, a second officiant to corroborate, and a lay witness to confirm identity. Charm effects are a capital offence in council, and every participant wears a plain copper circlet that dulls subtle nudging but leaves ordinary persuasion untouched. When the officiants disagree about what the dead king meant, the succession turns on interpretation of a cryptic phrase, custody of the incense stores, and whether the younger prince removed a witness.",
        },
        {
          term: "Why it works",
          text: "The second version gave the players institutions to engage with rather than a single spell to accept or contest. Control (who holds the incense), fear (charm in council), counters (circlet and corroboration rule) and visible procedure produced plot surfaces: a locked storeroom, a clerk's ledger, a disputed rite, and a public choice about how much truth magic the law should trust.",
        },
      ],
    },
    {
      kind: "checklist",
      heading:
        "Practical framing: turn each capability into political questions",
      intro:
        "For every magical capability in the setting, run through these questions before placing it in play:",
      items: [
        "Who is allowed to learn or perform it, and what licence, oath, charter or prohibition makes that legible to authority?",
        "Who fears it enough to fund a counter, and who profits from selling or withholding that counter?",
        "What trace does it leave, and how does a court or watch prove it was used without relying on the caster's word?",
        "What does it cost to do routinely, and therefore which places can afford to rely on it for roads, post, courts or wards?",
        "How does impersonation or mind influence alter succession, treaty oaths or trial procedure, and what ceremony or rule restores trust?",
        "Where is casting forbidden or inspected, and who staffs and oversees the inspection?",
        "Does a magical organisation control supply, and is its settlement with the state incorporation, chartered autonomy or rivalry?",
        "If the magic is rare, which families or orders become kingmakers; if common, which guild or ministry captures its regulation?",
      ],
    },
  ],
  codexConnection: {
    heading: "Track magical politics in Codex Cryptica",
    paragraphs: [
      "Record each magical capability as a linked entity alongside the offices, orders and laws that govern it. Graph views make dependencies visible: which court relies on which office, which guild controls which reagent, and which counter holds at which location.",
      "Use faction and settlement records to note licences, charters and inspection rights, so the table can see at a glance who can act, who can block, and what visible procedure a dispute will follow.",
    ],
    linkText: "Try the faction generator",
    href: "/generators/faction",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Build mage councils, inquisitorial offices and chartered orders with goals and leverage.",
      href: "/generators/faction",
    },
    {
      title: "Settlement generator",
      description:
        "Place warded courts, relay towers and licensed quarters inside towns and cities.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Create court mages, clerks, witchfinders and guild registrars with distinct motives.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Conspiracy",
      description:
        "Keep factions, courts and power struggles organised and interlinked.",
      href: "/for/conspiracy",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-magic-system",
    "how-do-i-run-political-intrigue-and-faction-play",
    "how-do-you-create-a-fantasy-faction",
    "how-do-i-build-a-believable-constitutional-crisis-or-coup",
    "how-do-you-create-a-believable-fictional-religion",
    "how-do-you-create-a-secret-society-for-an-rpg-campaign",
    "how-do-fantasy-cities-defend-against-flying-creatures-and-teleportation",
    "how-do-you-create-a-pantheon",
  ],
  discovery: {
    id: "answer-magic-affects-politics-and-government",
    parentCluster: "worldbuilding",
    clusters: ["worldbuilding"],
    primaryIntent: "how does magic affect politics and government",
    intentAliases: [
      "how magic shapes politics in fantasy",
      "magic and government in worldbuilding",
      "magical politics and court mages guide",
      "how magic changes governance in dnd",
      "fantasy politics with teleportation and mind magic",
    ],
    userJob: "understand",
    uniqueValue:
      "A GM-facing framework that turns each magical capability into control, fear and counters, covering courts, licensing, policing, succession, logistics, warfare and anti-magic institutions.",
    relatedIntents: [
      "answer-create-magic-system",
      "answer-fantasy-city-defence-flight-teleportation",
      "answer-fantasy-faction",
      "answer-constitutional-crisis-or-coup",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-fantasy-city-defence-flight-teleportation",
        reason:
          "The city-defence answer designs physical and magical countermeasures to aerial and teleport threats; this answer examines how those capabilities reshape political power and institutions.",
      },
      {
        with: "answer-constitutional-crisis-or-coup",
        reason:
          "The crisis answer structures a single struggle over constitutional legitimacy; this answer explains the wider effects of magic on government, succession and public institutions.",
      },
      {
        with: "resource-castle-floorplans",
        reason:
          "The resource page curates castle layout references; this answer helps GMs reason about magical power and political institutions across a setting.",
      },
    ],
  },
  seo: {
    title: "How does magic affect politics and government? | Codex Cryptica",
    description:
      "Turn magical capabilities into political consequences: courts, licences, policing, succession, logistics, warfare and counters, for rare and common magic.",
    image:
      "https://assets.codexcryptica.com/og/how-does-magic-affect-politics-and-government.jpg",
    imageAlt:
      "A council chamber where robed advisers confer beside a central arcane circle while officials record proceedings at a long table",
  },
};
