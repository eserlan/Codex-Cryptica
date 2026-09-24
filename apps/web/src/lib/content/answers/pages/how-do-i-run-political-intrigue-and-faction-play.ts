import type { AnswerConfigInput } from "../schema";

export const howDoIRunPoliticalIntrigueAndFactionPlay: AnswerConfigInput = {
  slug: "how-do-i-run-political-intrigue-and-faction-play",
  category: "session-prep",
  publishedAt: "2026-09-21",
  question: "How do I run political intrigue and faction play in an RPG?",
  kind: "how-to",
  shortAnswer:
    "Start with three to five factions that want incompatible things. Give each one a goal, a pressure forcing it to act now, something it can offer, something it fears, and a next move it will make if nobody interferes. Put the player characters where those interests overlap, let factions keep acting when the party does nothing, and treat information, obligations and leverage as seriously as combat power.",
  sections: [
    {
      kind: "prose",
      heading: "Start with conflicts, not lore",
      paragraphs: [
        "The minimum useful faction is not a page of history. It is a short record of what the faction wants right now, why it cannot wait, what it is afraid of, what it controls that others need, where it is vulnerable, what it claims in public, what it actually needs in private, and what it will do next if nobody interferes. Eight lines like that produce more playable politics than a thousand years of fictional kings.",
        "Three to five such factions are enough for a whole campaign. Fewer, and the players have nobody to play off against each other; more, and nobody at the table can remember who wants what. Put the party where those interests overlap: owing one faction, needed by another, and standing in the way of a third. A faction the party never meets, owes nothing to, and blocks nobody is scenery, however detailed its backstory.",
      ],
    },
    {
      kind: "list",
      heading: "Pressures that force factions to act",
      intro:
        "A faction with no reason to move now will wait politely until the plot needs it, and players notice. Attach at least one pressure to every active faction:",
      items: [
        {
          term: "Time",
          text: "A succession vote in seven days, an expiring treaty, an approaching army, a scheduled trial or council meeting, a festival or diplomatic visit that cannot be postponed. Deadlines turn dithering into decisions.",
        },
        {
          term: "Resources",
          text: "Food shortages, debts coming due, disputed land, a magical source running dry, too few troops, blocked trade access, or dwindling legitimacy. Want what another faction holds and the negotiation has stakes.",
        },
        {
          term: "Relationships",
          text: "A fraying alliance, a marriage proposal with strings, a hostage, a personal rivalry, a divided family, a patron losing confidence. People the faction cares about make threats personal.",
        },
        {
          term: "Reputation",
          text: "A scandal, a spreading rumour, public unrest, a religious challenge, a disputed claim, a visible failure. Standing that can fall makes leaders act rashly.",
        },
        {
          term: "Outside threats",
          text: "War, monsters, plague, a foreign power, a rebellion, a criminal syndicate, something unnatural stirring. A shared danger forces rivals to bargain with each other, which is where intrigue lives.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Give every faction something to trade",
      paragraphs: [
        "A faction that only hands out quests or sends assassins gives the players a binary choice: obey or fight. Bargaining starts when each significant faction holds at least one thing the party might genuinely want. Access to closed places, protection, legitimacy, money, troops, information, introductions, sanctuary, secrets, rare expertise, political cover: any of these will do, and different factions should offer different ones so the party must choose who to court.",
        "Leverage works the same way in reverse. Evidence, debts, favours owed, hostages, secrets, proof of betrayal, legal rights, control of a resource, a personal bond, the threat of exposure, or simply the ability to solve someone's problem: all of these change what a faction can afford to refuse. The distinction that matters is that leverage creates choices, not obedience. A secret should alter someone's options or raise their costs; it should never automatically force an NPC to comply, or intrigue collapses into collecting keys for people-shaped locks.",
      ],
    },
    {
      kind: "prose",
      heading: "Keep information uneven, but never scarce",
      paragraphs: [
        "Not everyone should know the same truth. For any important secret, decide what everyone believes, what one faction knows, what another merely suspects, what is deliberately false, and what nobody has noticed yet. Rumours should vary in reliability: some true, some half true, some planted. Players who can weigh sources make deductions; players who are lied to constantly stop trying.",
        "Sophistication is not the same as obscurity. The table needs enough understandable information to choose between real options, so reveal politics through play rather than hoarding it: meetings and audiences, rumours, intercepted messages, witnesses, visible consequences, faction representatives, public announcements, and NPCs whose behaviour quietly changes. If the players cannot describe two factions' goals from memory, the answer is more legibility, not more secrets.",
      ],
    },
    {
      kind: "list",
      heading: "Let factions move without the party",
      intro:
        "Political play dies when every faction freezes until visited. Give each active faction a next move and advance it between sessions, visibly. The mechanism matters less than the principle, so use whatever fits the table: fronts, clocks, faction turns, event timelines, or plain dated notes. A harbour vote in seven days might look like this:",
      items: [
        {
          term: "House Vey → control the harbour vote",
          text: "Pressure: a trade debt falls due in six days. Current move: bribing guild delegates with forgiven loans. If unopposed, it secures a voting bloc and names the regent.",
        },
        {
          term: "Dock Union → stop privatisation",
          text: "Pressure: layoffs begin the moment the vote passes. Current move: organising a strike that closes the harbour. If unopposed, ships sit idle and food prices double within a week.",
        },
        {
          term: "Temple → preserve public order",
          text: "Pressure: unrest rising in the lower town. Current move: endorsing a compromise candidate acceptable to both sides. If unopposed, the temple crowns the winner and banks influence over whoever loses.",
        },
        {
          term: "Why it works",
          text: "Each entry names a goal, a pressure, one current move, and the price of ignoring it. When the party chases one thread, the other two still advance, and next session opens with their consequences.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Consequences that are not combat",
      intro:
        "Political failure should rarely produce a fight, and violence should create political fallout rather than resetting the board. Draw on consequences like these:",
      items: [
        {
          term: "Standing shifts",
          text: "An ally withdraws support, a rival gains status, a neutral group finally chooses a side, or public opinion turns after a visible failure.",
        },
        {
          term: "Doors open and close",
          text: "Access is granted or revoked, a law changes against the party, a district becomes hostile territory, or sanctuary is offered at a price.",
        },
        {
          term: "Debts move",
          text: "A loan falls due early, a witness disappears before testifying, somebody demands repayment of an old favour, or a rumour the party planted comes back altered.",
        },
        {
          term: "The map changes",
          text: "A faction seizes territory, a trade route closes, patrols double on the roads the party uses, or prices spike for what the party needs most.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep the web legible",
      paragraphs: [
        "Political campaigns confuse players faster than any dungeon. Hold the active faction count to what the table can track, give important NPCs unmistakable roles rather than similar names and titles, and repeat goals and relationships naturally through play instead of assuming they were remembered. Show consequences where the party can see them: a closed gate, a missing contact, a changed patrol, a new price.",
        "Open sessions with a short recap of changed alliances, keep some faction intentions openly obvious so the party can plan around them, and separate what is known, what is rumoured, and what is merely player theory. Let the players keep their own relationship map if they enjoy it; a sketch the group maintains together is worth more than a perfect diagram only the GM understands.",
      ],
    },
    {
      kind: "prose",
      heading: "Put the characters inside the web",
      paragraphs: [
        "The fastest way to kill intrigue is to stage clever NPC politics the party merely watches. Give the group relationships with several factions at once, obligations that conflict, personal stakes in the outcome, incompatible promises, and something factions genuinely need: authority, access, information, or a capability nobody else has. A party that every faction wants something from is a party with choices; a party nobody needs is an audience.",
        "Frame those choices as questions with no clean answer. Who do you disappoint? What are you willing to owe? Which compromise can you live with? Which truth do you reveal, and to whom? Whose support do you need badly enough to pay their price? What happens if you refuse to choose? The players should be able to change the political situation, not just uncover the arrangement the GM prepared.",
      ],
    },
    {
      kind: "list",
      heading: "Build scenes around decisions",
      intro:
        "A political scene needs more than talking to an NPC until exposition appears. Useful structures include negotiations, council votes, public hearings, private bargains, accusations, mediations, exchanges of favours, hunts for leverage, recruitment pitches, contested ceremonies, summits and funerals, and moments that force a choice between incompatible allies. Whatever the structure, every scene should contain:",
      items: [
        {
          term: "Somebody's objective",
          text: "One participant wants a concrete outcome from this scene, stated or obvious, so the conversation has direction.",
        },
        {
          term: "Somebody else's objection",
          text: "Another participant wants something incompatible, so agreement costs at least one side something real.",
        },
        {
          term: "A price for delay",
          text: "Stalling or walking away carries its own consequence, so the party cannot simply wait for a better offer.",
        },
        {
          term: "Leverage in play",
          text: "Information, an obligation, or a threat present in the scene can change what the participants will accept.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Failure modes to avoid",
      intro:
        "Most stalled political campaigns are stalled by one of these habits. Check prep against them:",
      items: [
        {
          term: "Too many factions",
          text: "Twelve organisations introduced at once means the players care about none of them. Start with three to five and let the web grow.",
        },
        {
          term: "Everyone lies constantly",
          text: "If every statement might be false, deduction is impossible and players stop listening. Mix truth, half truth and planted lies.",
        },
        {
          term: "One correct solution",
          text: "A hidden right answer turns intrigue into a puzzle with one path. Offer several viable allies and several routes that cost different things.",
        },
        {
          term: "Cosmetic consequences",
          text: "If alliances and betrayals change nothing visible, choices are decoration. Move standing, access, debts or territory after every major turn.",
        },
        {
          term: "Mastermind fiat",
          text: "An NPC who predicted everything makes player planning pointless. Let villains be surprised, misinformed and wrong about the party.",
        },
        {
          term: "Violence resets the board",
          text: "If killing solves political problems cleanly, nobody schemes. Assassinations should create succession crises, martyrs and investigations.",
        },
        {
          term: "Lore before conflict",
          text: "Opening with centuries of history buries the choices. Start with who wants what now, and reveal history when it explains a motive.",
        },
        {
          term: "Players without leverage",
          text: "A party with nothing to trade and nothing to threaten can only watch. Give them assets factions need from the first session.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A regent vote in seven days",
      paragraphs: [
        "The ruler has died without an accepted heir, and in seven days the council votes on an interim regent. Three factions want incompatible outcomes. Each entry below is the whole prep: goal, pressure, leverage, fear, public line, private need, and next move.",
      ],
      items: [
        {
          term: "House Vey",
          text: "Goal: put its cousin on the regency council with a controlling vote. Pressure: a trade debt falls due the day before the vote. Leverage: forgiven loans owed by two guild delegates. Fear: exposure of the smuggling fleet that pays for everything. Public line: stability and lawful succession. Private need: six more days of cash flow. Next move: buy a third delegate tonight.",
        },
        {
          term: "The Dock Union",
          text: "Goal: block privatisation of the harbour. Pressure: layoff notices are already written. Leverage: a strike that closes the docks three days before the vote. Fear: replacement crews brought in under guard. Public line: bread and work for the lower town. Private need: a council patron who owes them, not pities them. Next move: march on the granary to force the council's attention.",
        },
        {
          term: "The Temple",
          text: "Goal: crown whoever keeps the peace, then collect the debt of gratitude. Pressure: unrest rising after two nights of brawls. Leverage: public endorsement, which sways undecided delegates. Fear: being seen to bless a tyrant. Public line: unity above faction. Private need: guaranteed grain for its charities through winter. Next move: announce a peace vigil on the eve of the vote, daring anyone to break it.",
        },
        {
          term: "If the party does nothing",
          text: "House Vey buys its third delegate, the union marches and the vigil holds, and the temple crowns the compromise candidate while Vey quietly controls the harbour purse. The party returns to higher prices, new patrols, and a union that remembers who stayed home.",
        },
        {
          term: "Discoverable leverage",
          text: "The Vey smuggling ledger hidden in a harbourside counting house; a union organiser willing to name the delegate Vey already bought, if the party protects her family; the temple's empty granary, which makes its call for unity a plea for grain the party could supply or spoil.",
        },
        {
          term: "Two rumours",
          text: "True: Vey ships have been unloading after curfew all month. Misleading: the union march is a cover for looting the granary, a story Vey agents planted to turn the temple against the strike.",
        },
        {
          term: "The council scene",
          text: "The session builds to the temple vigil, where all three factions appear in public with incompatible demands: Vey wants the vote held early, the union wants privatisation struck from the agenda, the temple wants a sworn peace first. The party holds the ledger, the organiser's testimony, or the grain, and whatever they reveal or withhold decides which demand collapses.",
        },
        {
          term: "Two possible consequences",
          text: "If the ledger surfaces, Vey loses its delegates and the union names its price for peace: a party member owes the union a dangerous favour. If the party stays silent, Vey takes the harbour, doubles docking fees on the party's ship, and the organiser faces charges the party could have prevented.",
        },
        {
          term: "Why it works",
          text: "Every element answers a worksheet question: incompatible goals, pressures with dates, leverage that changes options without forcing hands, uneven information, next moves that advance regardless, and consequences the party will trip over next session.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Political situation worksheet",
      intro:
        "Answer these before play. Short notes beat long histories; revisit them whenever the situation changes:",
      items: [
        "What does each active faction want, and why must it act now?",
        "What does each faction fear, and what can it offer the party?",
        "What leverage does each faction hold, and what leverage exists against it?",
        "What does each faction claim in public, and what does it actually need?",
        "What is each faction's next move if nobody interferes?",
        "What happens if the party does nothing at all?",
        "Which goals are fundamentally incompatible, and which two factions could still cooperate?",
        "What is public, what is hidden, and which rumours are circulating?",
        "What meaningful choice can the party make this session?",
        "How will the political landscape visibly change afterwards?",
      ],
    },
  ],
  codexConnection: {
    heading: "Let Codex Cryptica hold the web while you run it",
    paragraphs: [
      "Codex Cryptica does not run the rules of political play for any system. What it holds is everything those rules act upon: factions with goals and pressures, the NPCs who speak for them, the council vote that forces a decision, and the rumours and secrets that travel between sessions.",
      "Build the factions first and note their goals and next moves, create the rumours and secrets around them, then put one decision with a deadline in front of the players. The worksheet above becomes the prep; the linked material becomes what the table actually touches.",
    ],
    linkText: "Generate the factions",
    href: "/generators/faction",
  },
  relatedTools: [
    {
      title: "Faction Generator",
      description:
        "Groups with goals, resources and rivalries to serve as the situation's actors.",
      href: "/generators/faction",
    },
    {
      title: "Council Vote Generator",
      description:
        "Formal votes, factions and hidden agendas for succession and court scenes.",
      href: "/generators/council-vote",
    },
    {
      title: "Rumour Generator",
      description:
        "True, half-true and planted rumours with sources worth investigating.",
      href: "/generators/rumour",
    },
    {
      title: "Secret Society Generator",
      description:
        "Hidden organisations with motives, methods and ranks pulling strings.",
      href: "/generators/secret-society",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Conspiracy",
      description:
        "Material for hidden agendas, rival schemes and campaigns of secrets.",
      href: "/for/conspiracy",
    },
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Keep factions active and tracked while the party roams freely.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "what-rpg-works-for-political-intrigue-and-faction-play",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-track-faction-turns-between-rpg-sessions",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-create-a-secret-society-for-an-rpg-campaign",
    "how-do-i-run-spies-and-infiltrators-in-an-rpg",
    "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
    "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
    "how-do-i-run-character-roles-in-a-political-intrigue-rpg",
    "how-do-i-build-a-believable-constitutional-crisis-or-coup",
  ],
  discovery: {
    id: "answer-run-political-intrigue",
    parentCluster: "faction-creation",
    clusters: ["faction-creation"],
    primaryIntent:
      "how to run political intrigue and faction play in a tabletop rpg",
    intentAliases: [
      "how to run political intrigue in dnd",
      "how to make faction play interesting",
      "how to run court intrigue",
      "how to create political tension in a campaign",
      "how to make rpg politics feel dynamic",
      "how to create intrigue without confusing players",
    ],
    uniqueValue:
      "A system-neutral table workflow for political campaigns: incompatible factions with pressures, leverage that creates choices, uneven information, factions that act without the party, and a reusable prep worksheet.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-political-intrigue-system-selection",
      "answer-fantasy-faction",
      "answer-run-factions-sandbox",
      "answer-track-faction-turns-between-sessions",
      "answer-conspiracy-campaign",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-constitutional-crisis-or-coup",
        reason:
          "That page is setting-facing and designs the institutional fault lines behind a political crisis; this one is table-facing and covers running factions, leverage and scenes in play.",
      },
      {
        with: "answer-run-factions-sandbox",
        reason:
          "That page runs factions as sandbox pressure with goals, resources and rivals; this one covers intrigue-specific craft such as leverage, uneven information, decision scenes and keeping the web legible.",
      },
      {
        with: "answer-track-faction-turns-between-sessions",
        reason:
          "That page gives the between-session turn procedure; this one builds the whole political situation the turns resolve, from pressures to consequences.",
      },
      {
        with: "answer-political-intrigue-system-selection",
        reason:
          "That page helps groups choose a system with political mechanics; this one teaches the table workflow inside any system, including D&D.",
      },
      {
        with: "answer-run-character-roles-political-intrigue",
        reason:
          "This answer structures campaign-level faction conflicts and political pressure; the roles page explains how different PCs contribute inside those situations without duplicating the campaign framework.",
      },
    ],
  },
  seo: {
    title: "How do I run political intrigue and faction play? | Codex Cryptica",
    description:
      "A system-neutral workflow for political campaigns: incompatible factions, pressures, leverage, uneven information, and a reusable prep worksheet.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-political-intrigue-and-faction-play.jpg",
    imageAlt:
      "A game master map table showing faction tokens, sealed letters and connecting strings around a council chamber sketch",
  },
};
