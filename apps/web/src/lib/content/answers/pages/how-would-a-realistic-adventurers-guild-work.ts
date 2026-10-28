import type { AnswerConfigInput } from "../schema";

export const howWouldARealisticAdventurersGuildWork: AnswerConfigInput = {
  slug: "how-would-a-realistic-adventurers-guild-work",
  category: "worldbuilding",
  publishedAt: "2026-10-28",
  question: "How Would a Realistic Adventurers' Guild Work?",
  kind: "framework",
  shortAnswer:
    "Yes. An apprentice, journeyman and master ladder is a sound starting point for a fantasy monster hunters' guild, because historic craft guilds did train people in stages, judge competence and speak for a trade. Treat the finished guild as a chartered professional body that licenses practitioners, sets standards and bargains with rulers, rather than a universal employer or a noticeboard that hands work to anyone who walks in. Whether it also posts bounties, pays wages or fields its own teams depends on the charter you give it, and monster work then adds hazard, liability and emergency duties that ordinary crafts rarely faced.",
  sections: [
    {
      kind: "prose",
      heading: "A guild is a licensed trade, not a quest board",
      paragraphs: [
        "The familiar fantasy image is a hall, a cork board and a line of armed strangers reading bounties. Historic guilds looked different. In much of late medieval and early modern Europe, a craft or merchant guild was a self-governing association recognised by a town or ruler. It spoke for one trade in one place, controlled who could practise that trade locally, and answered for its members in return. Practice varied a great deal by town, period and trade, so there was no single European guild system to copy. Use the pattern as a set of working parts, then decide which parts your settlement actually has.",
        "That distinction changes the story at once. A guild that only pins notes to a board has no reason to train anyone, refuse anyone or pay for anyone's mistakes. A guild that holds a licence to practise has all three reasons, because its charter, its income and its reputation depend on them. Masters who negotiate with nobles, journeymen who do the daily work and apprentices who learn under supervision fit the second picture. So does a guild that lobbies a council, defends a price or disciplines a member who cheats a client. What does not follow automatically is a central employer who assigns every job. Many historic masters ran their own workshops and took their own commissions. The guild set the rules of the market; it did not always own the work.",
      ],
    },
    {
      kind: "list",
      heading: "What the guild actually does all week",
      intro:
        "Strip away the trophies on the wall and a working guild spends most of its time on administration. These are the jobs that make it feel like an institution when the players look closely:",
      items: [
        {
          term: "Controls entry",
          text: "It decides who may train, who may practise and who may use its name and mark. Entry can require sponsorship by a master, a fee, proof of good character, citizenship or freedom of the town, and sometimes a minimum age or a family connection. Closing the door is the point: a restricted trade protects prices and gives the guild something valuable to withhold.",
        },
        {
          term: "Trains and certifies",
          text: "It sets what an apprentice must learn, inspects finished work, and records who has passed. For hunters that certificate might cover tracking, first aid, creature lore, rope and pit work, and the local law on weapons inside the walls. A traveller arriving from another town still has to prove competence before local masters trust the seal.",
        },
        {
          term: "Sets standards and prices",
          text: "It publishes rate cards or customary fees, defines what counts as a finished job, and inspects workmanship. A rate for clearing rats from a cellar, escorting a wagon or removing a nesting creature stops each master undercutting the next into ruin, although enforcement is always patchier than the rulebook claims.",
        },
        {
          term: "Guards knowledge",
          text: "It keeps bestiaries, venom recipes, trap patterns and safe routes as shared assets for members. Access rises with rank. Secrecy protects income and lives, and it gives senior members something real to offer juniors beyond orders.",
        },
        {
          term: "Protects and disciplines members",
          text: "It provides burial money, support for widows and injured members, legal help and a hall to meet in. In return it can fine, suspend or expel members who take unlicensed work, falsify a kill, abandon a contract or bring the guild into disrepute.",
        },
        {
          term: "Bargains and settles disputes",
          text: "It negotiates taxes, tolls and military obligations with the council or lord, and it arbitrates quarrels between members, clients and the town watch. A client who refuses to pay meets the guild, not one tired hunter with a sword.",
        },
      ],
      outro:
        "If your guild does none of this, call it something else: a tavern noticeboard, a hiring fair or a captain's company. The name guild earns its keep only when the institution can say no and make the refusal stick.",
    },
    {
      kind: "list",
      heading: "Apprentice, journeyman, master",
      intro:
        "The three ranks describe legal standing as much as skill. A brave apprentice is still an apprentice until the guild says otherwise:",
      items: [
        {
          term: "Apprentice",
          text: "Bound to one master, usually by a written indenture, for a fixed term. The master owes food, lodging, training and discipline; the apprentice owes labour and obedience and normally cannot take paid work alone, marry without permission or leave before the term ends. In a hunting guild, apprentices carry gear, tend horses and hounds, maintain traps, copy bestiary pages and join hunts only in supervised roles. Advancement needs the master's release, a fee and evidence of competence, not simply surviving long enough.",
        },
        {
          term: "Journeyman",
          text: "Qualified to practise and to be hired by the day or by the contract, but not yet licensed to run an independent practice, train apprentices or vote on every guild matter. Historic journeymen often travelled between towns to learn varied work, which suits hunters well: a journeyman may spend a season with marsh specialists, then a winter with hill trackers. Journeymen do much of the dangerous field work, serve in mixed teams under a master, and build the record that supports a later application for mastery.",
        },
        {
          term: "Master",
          text: "Licensed to practise independently, sign contracts in their own name, employ journeymen, train apprentices and hold office. Mastership usually costs money and proof: an examination, a practical test, sponsorship, an entry fine and sometimes a set piece of work judged by existing masters. In craft guilds this could be the celebrated masterpiece; for hunters use an equivalent that can actually be judged, such as planning and leading a supervised hunt, presenting a verified trophy with witnesses, or demonstrating the identification and safe handling of three dangerous creatures. Not every master votes on every question. Many guilds limited full voting to masters who held citizenship, paid their dues and ran an established practice, while poorer or newly admitted masters had a narrower voice. Say which rule yours uses.",
        },
        {
          term: "Widows, deputies and the edge of the system",
          text: "Guilds often allowed a master's widow to keep a workshop running for a time, sometimes with a journeyman doing the licensed work. That is a business concession; any right to sit in assembly or vote is a separate rule. Decide whether a spouse, adult child or named deputy may finish existing contracts or run the premises, and for how long.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Charter, officers and the power to discipline",
      paragraphs: [
        "The charter turns the association's claims into recognised rights and obligations. Granted or confirmed by a king, lord, bishop or town council, it names the trade it covers, the territory where its licence applies, its right to inspect and fine, and what it owes in return: taxes, a yearly payment, watch duty, militia service or expert help in an emergency. Bylaws fill in the daily detail: dues, meeting times, quality rules, funeral obligations and penalties. Losing or failing to renew that charter is an existential threat, which gives rulers a hold over the guild and gives the guild a reason to stay useful and stay polite.",
        "Governance was rarely democratic in the modern sense. Common officers include a master or warden who chairs meetings and represents the guild, a treasurer who holds the chest and ledger, a clerk who keeps contracts and membership rolls, and inspectors (often called searchers) who check work and equipment. Some guilds elected officers each year from among the masters; others rotated office among senior families or let a small council co-opt its successors. Both patterns are plausible. What matters for play is naming who can spend guild money, who can sign a binding contract, who can expel a member, and how a decision can be challenged. Succession needs the same clarity. A deceased master's vote does not pass automatically to a son, brother or apprentice unless your bylaws say so. More defensible rules are that the seat lapses until a successor is admitted as a master, that a widow may appoint a qualified deputy for business matters without gaining a vote, or that a named proxy may vote once on a stated question. Pick one and let an inheritance dispute test it.",
        "Keep the treasury visible. Dues, entry fines, contract fees and rents fund the hall, the chest, inspectors, legal costs, charity and reserves for a bad season. A guild with no money is a dining club with opinions. A guild with a full chest attracts thieves, ambitious officers and rulers looking for a forced loan, which is useful pressure rather than a problem to solve.",
      ],
    },
    {
      kind: "prose",
      heading: "Contracts, bounties and proof that the work is done",
      paragraphs: [
        "Posting work needs a rule for who may post it. A believable guild accepts requests from the council, landowners, villages, merchants, temples and private householders, but it does not treat every request the same. A householder pays directly for a cellar clearance. A village may need the council or lord to guarantee payment. A noble may try to command service as a feudal duty rather than offer a price, and the charter decides whether the guild can refuse. The guild can also decline work: too dangerous for the grade offered, outside its territory, illegal under local law, or likely to start a war with a neighbouring power. A refusal with reasons recorded protects the guild when the disappointed client complains to the council.",
        "Separate two kinds of agreement. A guild contract uses the guild seal, its rate card and its discipline, so the guild can replace a sick team, arbitrate a dispute and blacklist a defaulting client. An individual contract is a private bargain between a master and a client; the guild may still regulate it if the master used guild certification, guild apprentices or guild knowledge, and it may forbid members from undercutting guild rates on the side. Bounties sit alongside both: an open reward invites anyone, including unlicensed hunters, which is fast in an emergency and messy afterwards. A chartered guild usually prefers closed contracts for graded work and tolerates open bounties only for vermin, wartime or a creature the authorities want dead at any price.",
        "Price the risk, not just the creature. A written contract should state the target and location, what counts as completion, the fee and who pays expenses, a deposit before departure, hazard pay for specified dangers, payment for scouting if the report proves the rumour false, who supplies boats, bait, mounts, siege gear or magical support, compensation for injury and death, liability for fire, flood, poison or damage to crops and buildings, and the proof required on return. Proof might be a head, pelt, claw, eggs destroyed under witness, a signed statement from the village reeve, or inspection of the lair by a guild searcher. Carcasses create disputes of their own: valuable venom, hides, horns and alchemical parts need an owner named in advance, or the payment scene becomes an argument over the most portable part of the monster. How the collected coin is then split among guild, team and common fund is covered in [How should a fantasy adventuring guild handle wages, dues, and shared expenses?](/answers/how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses). Use that answer for wages and dues; use this page for who may sign, who is liable and who judges the result.",
      ],
    },
    {
      kind: "prose",
      heading: "Between the guild hall and the throne",
      paragraphs: [
        "No guild floats above politics. A royal or municipal charter gives legal protection, and protection has a price. Expect taxation, compulsory loans in wartime, requirements to maintain a stretch of wall or bridge, service as firefighters or night watch, and obligations to muster trained members when the town is threatened. A monster hunters' guild is unusually useful to a ruler and unusually dangerous to annoy: it holds weapons, local knowledge and a membership that knows which roads, mines and granaries are vulnerable. Sensible rulers therefore bind it closely, seat its warden on a council, or split its licence so no single hall controls every armed specialist in the region.",
        "Friction follows from the licence itself. Nobles may resent common hunters who can refuse a summons, charge a great house the full rate or testify that a lord's neglect caused the infestation. Town councils may want lower prices and faster response while also wanting the guild to absorb the cost of rural patrols. Rival guilds compete at the edges: trappers against hunters, alchemists against both over carcass rights, engineers over siege work for a dragon, clergy over undead. Unlicensed hunters undercut prices and take risks the guild forbids, until one of them succeeds heroically or fails in a way that burns a village and strengthens the guild's case for monopoly. Give your guild one ally it must protect, one rival it cannot simply crush and one obligation it resents. Those three ties will generate more play than a full organisational chart.",
        "Monopoly should be treated as a local and limited fact, not a law of nature. A guild may control licensed work inside the walls and the market towns while villages two valleys away rely on a retired soldier, a temple or whoever is brave that week. Travel breaks certification too: a master's seal honoured at home may count for little abroad without a letter of introduction, reciprocal agreement or fresh examination. That gap is where travelling player characters fit naturally, as contractors, probationary journeymen or licensed outsiders hired for one named job.",
      ],
    },
    {
      kind: "prose",
      heading: "Why monsters strain the craft model",
      paragraphs: [
        "Monster work is difficult to supervise: threats move beyond the guild's territory, reports may misidentify a creature, and field conditions can turn a sound plan dangerous. High attrition changes every guild rule. Training takes longer because mistakes are lethal, so the guild needs supervised progression, team roles and a bar on apprentices taking solo contracts. Certification has to test judgement as well as courage: identifying a creature correctly, knowing when to withdraw, protecting bystanders and refusing bait that endangers a village. Magical creatures add examiners who may not be guild members at all, such as temple healers who certify undead work or licensed mages who judge whether a hunter can safely approach a warded lair. Decide who certifies the certifiers, or every difficult verdict becomes a faction fight.",
        "Liability is the second strain. Ordinary guilds argue about shoddy goods; hunting guilds argue about collateral damage. If a team collapses a mine, poisons a well, fires a thatch roof or drives a creature through a market, the contract must say who pays and who investigates. A mature guild keeps a damage fund, requires a deposit or bond for high-risk work, sends a searcher to inspect the site, and can suspend a master whose teams repeatedly leave bills behind. Emergencies strain the model further. A dragon, plague beast or undead outbreak cannot wait for the next quarterly assembly. Give the warden emergency powers with limits: authority to commandeer guild members and stores for a stated period, a duty to report afterwards, and compensation for members and householders whose property was taken or destroyed. Without those limits, emergency power becomes the route by which a guild turns into an armed government.",
        "Coverage is the third strain. Monsters do not respect market towns, and rural clients are often the least able to pay. Options include circuit masters who ride a set route each season, village retainers funded by a lord or council tax, temple subsidies for undead and disease work, and a guild levy on profitable urban contracts to fund unprofitable rural ones. Each option creates a different politics. A dragon is the limiting case, and dragon capabilities vary considerably between settings. Where a dragon exceeds the local guild's resources, treat the hunt as a temporary coalition under a special contract, calling in siege engineers, soldiers, mages or neighbouring guilds as needed, with command, shares of the hoard and liability agreed before anyone leaves town. Where dragons regularly exceed a hall's capacity, give it a standing agreement with neighbouring specialists or the ruler. Whether that remains a guild or becomes a state service depends on who controls membership, funding and command.",
      ],
    },
    {
      kind: "table",
      heading: "Institutions that get called a guild",
      headers: ["Form", "Fits when", "Watch out for"],
      rows: [
        [
          "Craft guild of hunters",
          "A settled region needs licensed, repeatable monster control and trained specialists.",
          "Slow decisions, closed entry and prices that exclude poor villages.",
        ],
        [
          "Mercenary company",
          "Work is mobile, military and hired by the campaign or season under a captain.",
          "Loyalty follows the contract. Training and welfare depend on how permanent the company is and what its contracts provide; accountability to a client may not extend to local residents.",
        ],
        [
          "Religious order",
          "Undead, demons, curses or sacred sites make the threat a matter of doctrine.",
          "Theological tests for membership and conflict with secular rulers over authority.",
        ],
        [
          "Chartered hunting lodge",
          "Nobles or wealthy patrons fund elite hunts and prestige trophies.",
          "Excellent access and gear, weak interest in rats, roads and poor clients.",
        ],
        [
          "Bounty exchange",
          "Clients want open rewards and independent claimants to cover a frontier or answer an urgent threat.",
          "Proof, duplicate claims and trophy ownership need clear rules; contractors' injury and damage liability must be assigned.",
        ],
        [
          "State hunting service",
          "The ruler wants a publicly funded force that employs or commands hunters directly.",
          "Public budgets, official priorities and jurisdiction shape coverage; the service answers for its employees' welfare and casualties.",
        ],
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the mill race at Millow",
      paragraphs: [
        "Millow is a grain village of 300 people, two days from the guild town of Brantford. Something has taken two mill dogs and dragged a carter from the mill race at dusk. The village reeve rides in with a thumbprint petition and 18 silver raised from the miller, the innkeeper and a grain levy. The Brantford Hunters' Guild must turn that frightened report into a lawful, priced and checkable job.",
      ],
      items: [
        {
          term: "Intake",
          text: "The clerk records who is asking, who guarantees payment and what has actually been seen. The reeve can describe tracks and losses but cannot name the creature. The guild accepts the request as ungraded because the payer is a village collective, the site is outside the walls and the evidence is thin. The warden refuses to post it as an open bounty: an ungraded water predator beside a mill race is exactly the job that gets an unlicensed volunteer killed and the village blamed.",
        },
        {
          term: "Risk classification",
          text: "A journeyman scout is paid a fixed scouting fee from the deposit to inspect the race, sketch the tracks and question the mill household. She finds slide marks, a broken eel trap and scales consistent with a large river predator, then reports a graded water hazard: dangerous to a small team, manageable with nets, spears and control of the sluice. Classification sets the minimum team, the rate card band and the rule that no apprentice enters the water.",
        },
        {
          term: "Contract",
          text: "The contract names the mill race and both banks for 200 paces, defines completion as the creature killed or driven off and the race inspected clear by a guild searcher, and sets a fee of 60 silver plus expenses. The 18 silver the reeve brought is the deposit. Because the mill grinds grain for three villages, the town council guarantees the balance: on the searcher's report it pays the guild the remaining 42 silver plus agreed expenses and recovers Millow's contribution from the village levy itself. Hazard pay applies to night work in the water. The guild supplies nets and a boat; the village supplies labour to drain the race at dawn and food for the team. Carcass parts belong to the guild for examination. The miller's insurer accepts the searcher's sealed clearance report as proof, with the head supplied only if the creature is killed. Damage to the sluice caused by the agreed draining is a village cost; negligent fire or poison damage is a guild cost from its damage fund.",
        },
        {
          term: "Team assignment",
          text: "A master with river work on her record leads and signs the contract. Two journeymen handle nets and spears. One apprentice tends the boat, lamps and spare rope from the bank, in line with the grading rule. A temple healer is retained for half a day because the scout reported leeches, deep cuts and possible venom. The assignment is recorded in the guild roll, so if the master falls ill the warden can substitute another qualified master without renegotiating the whole bargain.",
        },
        {
          term: "Completion and verification",
          text: "The drained race exposes the lair under the mill timbers. The team kills the creature at dawn with one journeyman cut badly enough to need the healer. The searcher inspects the lair, counts the eggs and orders them destroyed under witness, then seals a claw sample and the search report. The reeve signs that the race is clear and the mill wheel turns. Verification rests on three things together: physical evidence, site inspection and the client's signed receipt. A head alone would not have proved the eggs were gone.",
        },
        {
          term: "Payment",
          text: "On receipt of the searcher's report, the council pays the remaining 42 silver and the agreed expenses. From the fee the guild pays the healer, replaces a torn net, pays the scout's fee if not already settled, compensates the injured journeyman from the common fund under guild rules and divides the team payment under the hall's existing finance rule. The point for the campaign is not the arithmetic; it is that every payment has a named trigger, so nobody has to argue from memory at the inn.",
        },
        {
          term: "Dispute",
          text: "The miller claims the draining cracked a sluice board and withholds his share of the levy the council is recovering. The team's pay is already settled, so the argument is between the miller and the council over that share. The contract assigns agreed draining damage to the village, but the searcher's report notes the board was rotten before the work. The guild arbitrates the sluice question only: the board is routine mill maintenance, the guild waives a small expense item as goodwill, and the miller keeps his right to post future work. If he still refuses the levy, the council enforces it; the guild does not chase him for the fee. The dispute ends with a rule clarified for the next contract: pre-existing damage to mill works must be noted at intake.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Worldbuilder checklist: make the institution hold together",
      intro:
        "Answer these before the guild appears in play. Short answers are enough; contradictions are plot.",
      items: [
        "Who granted the charter, what territory and trade does it cover, and what does the guild owe the grantor each year?",
        "Who may join, who sponsors them, what does entry cost, and who is excluded on purpose?",
        "What must an apprentice learn, how is a journeyman judged, and what test, fee or set piece makes a master?",
        "Which masters may vote, hold office or sign for the guild, and what happens to a seat, business and vote when a master dies?",
        "Who can post work, who guarantees payment, and when may the guild refuse a request?",
        "How are jobs graded, priced and assigned, and what deposit, hazard pay and expense rules apply before departure?",
        "What proof completes a contract, who inspects it, who owns the carcass and valuable parts, and who pays for collateral damage?",
        "What taxes, militia duties, emergency powers and rural obligations come with the licence, and where does the guild's authority stop at the border?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping the guild connected to the town around it",
    paragraphs: [
      "A guild becomes believable in play when its charter, officers, clients, rivals and debts stay linked to the settlement that granted its licence. A council guarantee, a rival trapper and an injured journeyman should surface next to the hall and the mill that hired it, not in separate notes you have to reconcile from memory.",
      "Codex Cryptica keeps factions, settlements, NPCs and notes as connected entities, so the guild hall, its warden, the town council and the villages on its circuit can sit in one graph. The faction generator is a useful starting point for the guild's goal and obstacle; the charter and contract rules remain your decision.",
    ],
    linkText: "Try the faction generator",
    href: "/generators/faction",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Sketch the guild's goal, obstacle and rivals, then add the charter and officers yourself.",
      href: "/generators/faction",
    },
    {
      title: "Settlement generator",
      description:
        "Place the guild hall in a town with a council, market and villages that need its circuit.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Keep factions, settlements and institutions connected across a campaign.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "TTRPG Economy & Trade",
      description:
        "Build believable prices, trade, scarcity and wealth without simulating a whole economy.",
      href: "/for/economy-trade",
    },
  ],
  relatedAnswers: [
    "how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses",
    "how-do-you-create-a-fantasy-faction",
    "how-do-i-build-a-believable-economy-for-a-fantasy-world",
    "how-do-i-run-political-intrigue-and-faction-play",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-i-run-a-campaign-where-the-players-own-a-business",
    "how-do-fantasy-cities-defend-against-flying-creatures-and-teleportation",
  ],
  labels: ["fantasy"],
  discovery: {
    parentCluster: "worldbuilding",
    clusters: ["worldbuilding", "faction-creation", "economy-trade"],
    primaryIntent: "how would a realistic adventurers guild work",
    intentAliases: [
      "how does a realistic adventurers guild work",
      "how would a monster hunters guild work",
      "fantasy guild structure apprentice journeyman master",
      "realistic adventuring guild charter and ranks",
      "how do fantasy guilds organise monster hunting",
    ],
    uniqueValue:
      "Institutional design for a realistic adventurers' guild: charter and governance, apprentice to master advancement with succession rules, closed contracts versus open bounties, monster-specific liability and emergency powers, a comparison of guild forms, and a full contract lifecycle from intake to dispute.",
    userJob: "understand",
    relatedIntents: [
      "answer-how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses",
      "answer-fantasy-faction",
      "answer-believable-fantasy-economy",
      "generator-faction",
      "generator-settlement",
      "for-economy-trade",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses",
        reason:
          "That page sets wages, dues and shared expenses. This page covers charter, ranks, governance, contracts and accountability, and links to the finance page instead of repeating its rates.",
      },
    ],
  },
  seo: {
    title: "How Would a Realistic Adventurers' Guild Work? | Codex Cryptica",
    description:
      "Build a believable adventurers' guild: charter, ranks, contracts, bounties and monster liability, plus a worked contract from intake to payment.",
    image:
      "https://assets.codexcryptica.com/og/how-would-a-realistic-adventurers-guild-work.jpg",
    imageAlt:
      "Master hunters negotiating a sealed contract with town elders around a guild hall table with maps and a monster claw",
  },
};
