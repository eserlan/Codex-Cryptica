import type { AnswerConfigInput } from "../schema";

export const howDoIRunADiplomatNobleOrCourtierInAnRpg: AnswerConfigInput = {
  slug: "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
  category: "session-prep",
  labels: ["fantasy", "sci-fi"],
  publishedAt: "2026-09-24",
  question:
    "How do I make a diplomat, noble or courtier useful in an RPG without relying on one social roll?",
  kind: "framework",
  shortAnswer:
    "Make status change who will hear the character, what they can request, and what commitments they can make, not what everyone must obey. Build negotiations around each side's interests, limits, leverage and costs; let the diplomat lead the exchange while other characters bring evidence, protect people, win support or change the available deal. Record promises and favours as campaign state, then show what they change after the scene.",
  sections: [
    {
      kind: "prose",
      heading: "Status opens doors; it does not decide what is behind them",
      paragraphs: [
        "A noble's title, an envoy's credentials or a courtier's relationships can get the party an audience, establish protocol, and let the character speak for a constituency. None of those things should automatically make an opposing ruler agree. A baron may have to receive a royal envoy and still refuse the proposal; a station commander may honour a treaty while demanding a price the delegation cannot accept. Treat rank as a real fictional capability with scope and obligations, not as either universal authority or decorative backstory.",
        "The same principle works in a fantasy court, an interstellar summit, or a modern political campaign. Ask what this character is authorised to offer, promise or concede, who they answer to, and what their title cannot compel. Use the game's social rules for uncertain actions. The scene structure here creates meaningful stakes around those rolls; it is not a replacement persuasion subsystem.",
      ],
    },
    {
      kind: "list",
      heading: "Prepare a negotiation, not a persuasion target",
      intro:
        "Before the meeting, write a few lines for each principal. Their interests make the conversation playable even if the characters surprise you:",
      items: [
        {
          term: "Interest",
          text: "What outcome does this person actually need, beyond the position they state in public? A minister may demand a border post but privately need a safe trade route before winter.",
        },
        {
          term: "Red line",
          text: "What cost or outcome will they not accept, and why? Make the limit arise from their responsibilities, danger, law or constituency rather than arbitrary GM resistance.",
        },
        {
          term: "Leverage and alternatives",
          text: "What can each side offer, withhold or change? A safe passage, grain shipment, public endorsement, evidence, military support or a rival's cooperation can change the available deal. Leverage creates options and prices; it does not compel agreement.",
        },
        {
          term: "Constituency and obligation",
          text: "Who will judge the negotiator afterwards? A councillor may have to defend the settlement to a guild, a fleet or a population who bears its cost. Success can create obligations as well as access.",
        },
        {
          term: "Deadline and consequence",
          text: "What changes if the parties delay, walk away or reach only partial agreement? A vote, a convoy departure, a rival faction's move or a public ceremony can give the scene urgency without forcing a single outcome.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Let the diplomat lead without monopolising the scene",
      paragraphs: [
        "Give the diplomat the central role in establishing terms, reading protocol, deciding what their office can promise, and making or refusing the final commitment. Do not make every other character roll a substitute Persuasion check. Instead, let their actions change the facts the diplomat negotiates with: an investigator verifies a treaty clause, a scout finds the supply route is unsafe, a guard protects a threatened witness, a medic treats someone the court needs alive, or a bard shapes how the public understands the offer.",
        "Ask players what their characters contribute before or during the audience. Their actions might strengthen evidence, create an alternative, reveal a hidden cost, secure a constituency's support, or make a concession possible. The diplomat remains the person who conducts the negotiation and chooses what to commit; the party's contributions alter the options, not take the decision away. If only one character is allowed to speak by protocol, others can still work the waiting room, protect the delegation, assess a draft, or approach people whose interests intersect with the talks.",
        "Resolve uncertain moments using the system's procedures. A strong social roll can win a concession, improve terms or secure a hearing, while the underlying interests determine what is at stake and what success can reasonably achieve. On a miss, preserve forward movement: the offer may cost more, a deadline may tighten, or a faction may demand proof. Avoid both extremes: one roll that ends a layered negotiation, and endless rolls that let no one accept or refuse anything.",
      ],
    },
    {
      kind: "list",
      heading: "Make status, promises and protocol persist",
      items: [
        {
          term: "Define the reach of an office",
          text: "Clarify what the character can decide alone, what requires a sovereign or council's approval, and what they may only recommend. If a PC technically outranks an NPC, honour that authority within its actual jurisdiction; give the NPC meaningful choices about compliance, delay, resignation, appeal or the consequences of carrying out the order.",
        },
        {
          term: "Treat protocol as leverage with a price",
          text: "An invitation may guarantee a hearing but require a public appearance; a formal title can protect the envoy while limiting who may answer; a breach of etiquette might insult a constituency or expose an urgent weakness. Explain customs before they become a trap, and allow characters to challenge or adapt them.",
        },
        {
          term: "Record commitments",
          text: "Write down who promised what, to whom, by when, and what happens if it is not delivered. Include favours, public statements, private assurances, hostages or guarantees only where they fit the table's tone and player consent. A deal should be available for everyone to revisit, not hidden in the GM's memory.",
        },
        {
          term: "Show the consequence",
          text: "An agreement might open a route, bind the party to a future vote, anger a rival, or give a vulnerable group time to prepare. A broken promise should affect trust or standing in a way the players can see and respond to, not trigger arbitrary punishment.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the winter grain accord",
      paragraphs: [
        "A royal envoy must secure grain from the river duchy before the mountain roads close. The duchess can spare one convoy, but the northern villages also depend on it. She wants the crown to repair a flood-damaged bridge; the crown's treasury has already pledged that money to the border garrison.",
      ],
      items: [
        {
          term: "The single-roll version",
          text: "The envoy rolls Persuasion. On a success, the duchess sends all the grain. On a failure, she refuses and the audience ends. Her needs, the villages, the bridge and the other characters' knowledge never affect the result, so the diplomat's defining skill becomes a pass-or-stop button.",
        },
        {
          term: "The negotiated version",
          text: "The envoy opens the audience under the authority of the crown, then learns the duchess will not leave the villages short. The party's quartermaster confirms that a smaller convoy can reach the garrison if it travels by river; the engineer finds a temporary bridge repair that costs less than a full rebuild; and the courtier discovers the duchess needs public assurance that the repair will begin before thaw. The envoy can offer the repair, negotiate a smaller first shipment, or ask the garrison commander to release escort boats. Each contribution changes the feasible terms. The envoy decides which commitment to make, and a social roll resolves whether the duchess accepts the proposed arrangement under the game's rules.",
        },
        {
          term: "The accord that follows them",
          text: "The duchess agrees to send half the grain now and the remainder after the bridge crew arrives. The envoy signs for the crown; the engineer's repair plan becomes a public commitment, and the garrison commander lends two boats until the thaw. The villages receive supplies, but the garrison has fewer patrols on the river. Next session, the party sees the agreement working and the new vulnerability it created.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Diplomacy and court scene prep checklist",
      items: [
        "What can the diplomat's status actually grant, and where does its authority end?",
        "What does each side need, refuse, fear, and have the power to offer?",
        "Who does each negotiator represent, and what must they answer for afterwards?",
        "What evidence, relationship or practical action can change the available terms?",
        "What can other party members do without replacing the diplomat's central role?",
        "What does a partial agreement, delay, refusal or walk-away change?",
        "What commitments will be written down, and who is responsible for carrying them out?",
        "If a PC outranks an NPC, what choices remain within the NPC's actual authority and obligations?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep agreements attached to the people who made them",
    paragraphs: [
      "Linking a courtier to their constituency, a rival envoy to their ruler, and an accord to its obligations makes political consequences easier to remember. Record the promise and its deadline alongside the people and factions who can fulfil or challenge it, then bring that state back when the party returns to court.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Council vote generator",
      description:
        "Create a council's competing positions and hidden interests for the next political scene.",
      href: "/generators/council-vote",
    },
    {
      title: "Faction generator",
      description:
        "Build the groups a diplomat represents, negotiates with, or risks alienating.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-political-intrigue-and-faction-play",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-i-give-specialist-characters-spotlight",
    "what-rpg-works-for-political-intrigue-and-faction-play",
    "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
    "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
    "how-do-i-run-spies-and-infiltrators-in-an-rpg",
  ],
  discovery: {
    id: "answer-run-diplomats-nobles-courtiers",
    parentCluster: "specialist-roles",
    primaryIntent:
      "how to run diplomats nobles and courtiers in an rpg without one social roll deciding everything",
    intentAliases: [
      "how do i make a diplomat useful in an rpg",
      "how to run a noble character in a tabletop rpg",
      "how to make courtier characters matter in a campaign",
      "how to run political negotiations in an rpg",
      "how to make a face character useful without one persuasion roll",
      "how to run a diplomat in a space opera rpg",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A system- and genre-neutral framework for making status, negotiation, and formal authority consequential without letting one social roll end the scene, while giving the whole party ways to change the available deal and tracking promises as campaign state.",
    relatedIntents: [
      "answer-run-political-intrigue",
      "answer-run-factions-sandbox",
      "answer-specialist-character-spotlight",
      "answer-political-intrigue-system-selection",
      "answer-cyberpunk-party-roles",
      "answer-journalist-media-character-rpg",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-run-political-intrigue",
        reason:
          "The political intrigue answer structures a campaign's factions and ongoing pressures; this answer focuses on the diplomat's negotiation scene, status, authority, party contributions, and durable commitments.",
      },
      {
        with: "answer-run-factions-sandbox",
        reason:
          "The sandbox answer tracks faction goals and turns between sessions; this answer handles a character negotiating among those interests in a live scene.",
      },
      {
        with: "answer-specialist-character-spotlight",
        reason:
          "The spotlight answer gives reusable ways to involve the party around any specialist; this answer makes the diplomat central to negotiation while specifying distinct supporting contributions and authority boundaries.",
      },
      {
        with: "answer-political-intrigue-system-selection",
        reason:
          "The system-selection answer helps choose a game for political play; this answer is a GM procedure that works within the chosen system's existing social rules.",
      },
      {
        with: "answer-cyberpunk-party-roles",
        reason:
          "The cyberpunk roles answer briefly identifies what a fixer contributes to a cyberpunk crew; this page focuses on diplomats, nobles, and courtiers across courtly, political, and space-opera campaigns.",
      },
      {
        with: "answer-journalist-media-character-rpg",
        reason:
          "The journalist answer makes public reporting a specialist source of influence; this answer covers negotiated agreements, formal authority, and court or diplomatic access.",
      },
    ],
  },
  seo: {
    title:
      "How to run diplomats, nobles and courtiers in an RPG | Codex Cryptica",
    description:
      "Make RPG diplomats and courtiers matter through status, leverage, party contributions, and lasting agreements, without letting one social roll end a negotiation.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg.jpg",
    imageAlt:
      "An envoy negotiates with a duchess as companions bring evidence and practical proposals to the council table",
  },
};
