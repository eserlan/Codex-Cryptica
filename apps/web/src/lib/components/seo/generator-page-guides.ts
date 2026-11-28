import type { ValidSlug } from "./generator-types";

export interface GeneratorGuideLink {
  href: string;
  label: string;
  description?: string;
}

export interface GeneratorGuide {
  summary: string;
  tips: { title: string; detail: string }[];
  linksTitle?: string;
  links?: GeneratorGuideLink[];
}

const ADVENTURE_GUIDE: GeneratorGuide = {
  summary:
    "Build an adventure around something the characters can change, not a sequence of required scenes. Decide who is moving against them, what happens if they delay, and how more than one approach can change the outcome.",
  tips: [
    {
      title: "Choose a problem that can be tackled in several ways",
      detail:
        "Set Choose a vibe to Classic Fantasy, Adventure Type to Rescue & Recovery, Adventure Scale to Short Arc (2-3 Sessions), and Tone to Heroic & High Stakes. Use Primary Objective & Pressure to decide what must be secured before the city gate closes. Give the party a route through the gate and another via the river, each with a different cost.",
    },
    {
      title: "Give the clock and factions independent motives",
      detail:
        "In Starting Seed / Situation (optional), enter the witness, the ledger, and the 36-hour deadline. In World context (optional), name a magistrate who needs the evidence destroyed and dock workers who want their missing colleagues accounted for. Place clues in two different locations. Advance Complications & Escalating Pressures when the party spends time, not because they chose the wrong route.",
    },
    {
      title: "Keep the prep separate from what players know",
      detail:
        "Use Possible Outcomes to decide what each faction does if the witness escapes, disappears, or negotiates. Add to my Codex saves one Note with the scenario details in GM notes. Open Adventure Canvas is a separate action for arranging scenes, actors and clues. Tell players only the opening situation and facts they discover.",
    },
  ],
  linksTitle: "Turn an adventure premise into playable pressure",
  links: [
    {
      href: "/answers/how-do-i-turn-an-rpg-idea-into-an-adventure",
      label: "Build more than one route through a premise",
      description:
        "Turn a single situation into locations, opposition and evidence the party can approach in different orders.",
    },
    {
      href: "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
      label: "Keep the next session responsive to choices",
      description:
        "Use consequences and unresolved situations to carry a story arc forward without fixing its ending.",
    },
  ],
};

export const SLUG_GUIDES: Partial<Record<ValidSlug, GeneratorGuide>> = {
  nation: {
    summary:
      "Draft a state with a seat of authority, competing power blocs and a pressure that can undermine its rule. Turn the political backdrop into places where laws are obeyed, disputed or ignored, and let the party affect who actually governs.",
    tips: [
      {
        title: "Draw the limits of state power",
        detail:
          "Choose Scale to decide which journeys cross a political boundary. A City-state (single settlement) can contest a bridge or harbour; a Continent-spanning dominion must delegate to distant governors. Mark a supply route or border where officials cannot immediately enforce the capital's orders.",
      },
      {
        title: "Separate lawful authority from practical power",
        detail:
          "Government style tells you who is supposed to rule. For a Corporate board, decide which director can withhold payroll or transport; for a Hereditary dynasty, choose who controls the soldiers. Give each of the Power Blocs a different means of blocking the ruler and an offer the party could accept.",
      },
      {
        title: "Make the hidden problem break into public life",
        detail:
          "Use Conflict level to choose how urgently the state needs help. Under Simmering tensions, a missing grain shipment may provoke a strike; during Total war, it may open a gap in the defences. Decide what evidence exposes the Hidden Problem, who benefits from suppressing it and when the next decision must be made.",
      },
    ],
    linksTitle: "Bring your nation to life",
    links: [
      {
        href: "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
        label: "Give civilisations distinct strengths and weaknesses",
        description:
          "Develop believable institutional advantages, dependencies and weaknesses for the generated nation.",
      },
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Run political intrigue and faction play",
        description:
          "Turn its competing power blocs into active rivalries and consequential player choices.",
      },
      {
        href: "/answers/how-do-i-build-a-believable-constitutional-crisis-or-coup",
        label: "Build a believable constitutional crisis or coup",
        description:
          "Develop its hidden problem into a political crisis with stakes and multiple outcomes.",
      },
    ],
  },
  "council-vote": {
    summary:
      "Generate a political vote with a named council, a deadline and a voting procedure, where each voter has a stance and a route the party can use to win them over before the decision is called.",
    tips: [
      {
        title: "Count the seats before the speeches",
        detail:
          "Council Size sets the seats, Voting Rule describes how the vote is decided or cast, and Deadline sets when the decision is called. Simple Majority, Supermajority and Unanimous define approval thresholds; Veto Power adds a blocking power, and Secret Ballot does not set a threshold. Check the governing body's rule before planning around Current Vote Estimate and each councillor's starting stance in Council Members.",
      },
      {
        title: "Pick the members the party can reach",
        detail:
          "Every council member line pairs an Initial stance with a persuasion route, such as a face-saving concession for a Beleaguered Ally or a contract for a Greedy Broker. Choose two or three voters the party can reach before the deadline, and leave the rest for the vote itself.",
      },
      {
        title: "Set the pressure with Antagonist Influence",
        detail:
          "Antagonist Influence ranges from None to Dominant, and at Subtle, Entrenched or Dominant a hostile hand is already on the council. Investigation Leads say where to start looking, since asking around the usual haunts of the body is the fastest way to find out who can be swayed.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Running political intrigue between sessions",
      },
      {
        href: "/answers/how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
        label: "Playing the nobles and courtiers who sway a vote",
      },
    ],
  },
  holiday: {
    summary:
      "Make a day on the calendar into a change in everyday life: who closes their shops, who owes a duty and what happens when someone breaks with tradition. Decide what the party witnesses before you decide whether they intervene.",
    tips: [
      {
        title: "Choose who keeps the day, not just its date",
        detail:
          "Set Observance scope to A local settlement for a harbour remembrance or A faction for a guild rite. In Culture or society and Climate, seasons, or calendar, name the people, their livelihood and a real seasonal pressure. Use Religion or cosmology and Tone to frame a solemn duty or a celebration. Ask which households cannot afford to stop work and how they keep the day differently.",
      },
      {
        title: "Make a calendar change the campaign schedule",
        detail:
          "Set Generate to one observance for the next session or choose a calendar of 6, 10 or 14 observances for recurring campaign dates. Read When and Observed by for each day, then mark two dates against upcoming travel: which ferry stops, market opens or authority becomes unavailable? Copy the dates into your existing campaign timeline yourself.",
      },
      {
        title: "Give a contested tradition a choice, not a mandatory quest",
        detail:
          "Tick Include a contested, secret, or suppressed observance and name a remembered event or rival account in Political or historical background. Use the AI option to ground it in your campaign. Read What people believe and the GM history separately. Offer two ways to participate, such as escorting a procession or protecting a dissenter, and decide what the community does if the party declines.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-create-a-believable-fictional-religion",
        label: "Build rituals around beliefs and obligations",
      },
      {
        href: "/answers/how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
        label: "Give different households and regions their own traditions",
      },
    ],
  },
  encounter: {
    summary:
      "Generate a playable encounter with a situation, participants, an environment, possible approaches, a complication and four outcomes, so the table has a scene to run rather than just a monster list.",
    tips: [
      {
        title: "Set Threat to decide what failure costs",
        detail:
          "Threat changes the Failure outcome: at Trivial / Low it is a small, easily recovered setback, while at Severe / Deadly it is a devastating loss that may be permanent. Set it first, so the outcomes match how much the party can afford to lose.",
      },
      {
        title: "Give players a way in besides the fight",
        detail:
          "Possible Approaches lists options that are not the obvious fight, such as a signal to call for help, a stash of supplies, a truce, or a way around the danger. Offer one or two before the Complication / Twist surfaces once the party commits to a course of action.",
      },
      {
        title: "Use Encounter Type and Environment to set the scene",
        detail:
          "Encounter Type shapes who is in the scene, from creatures and armed patrols to signs of a group that has just passed through. Environment names the Location and the Environment section, so pick both before Tone, which only colours the atmosphere wording.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
        label: "Balancing combat encounters so they stay fair",
      },
      {
        href: "/answers/how-do-i-save-my-party-from-an-overpowered-encounter",
        label: "Rescuing a party from an overpowered encounter",
      },
    ],
  },
  tome: {
    summary:
      "Generate an in-world book with its physical format, provenance, a deception, a reading hazard, and the ground truth the GM keeps, so a forbidden text can drive a scene rather than sit on a shelf.",
    tips: [
      {
        title: "Choose the Primary Reading Hazard first",
        detail:
          "Primary Reading Hazard sets the main risk in Risks & Costs of Study, and the same hazard appears in the Failure Condition and Safe Handling notes. Pick it before the other fields, since it decides what reading the book costs the party.",
      },
      {
        title: "Use Current Custodian to decide who wants the book",
        detail:
          "Current Custodian is the place or group that holds the book. It appears in the summary, the provenance, the Connected Entities list, and, in the offline draft, the first adventure hook, where either an agent of the custodian hires the party or a source hires them before the custodian purges access logs. Pick one that gives the party a reason to visit.",
      },
      {
        title: "Use Campaign Context with the AI draft",
        detail:
          "Optional Campaign Context is not used by the offline draft. It reaches the AI prompt, so use the AI draft when the book has to connect to your campaign's people or places.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-give-players-immersive-handouts-in-an-online-rpg",
        label: "Giving players immersive handouts and props",
      },
      {
        href: "/answers/how-to-write-an-in-world-newspaper-for-an-rpg",
        label: "Writing an in-world newspaper for an RPG",
      },
    ],
  },
  "alien-race": {
    summary:
      "Generate a non-human species whose biology, homeworld, senses and culture follow from one another, with a weakness, a relationship to outsiders and a split inside the species the party can use at the table.",
    tips: [
      {
        title: "Set Home Environment and Body Plan first",
        detail:
          "Home Environment and Body Plan do most of the work. Evolutionary Origin and Biology & Lifecycle take their constraints from them, and the Weaknesses & Constraints lore lists what those traits cost. Set Psychology after them, since it shapes temperament and worldview rather than the body.",
      },
      {
        title: "Use Relationship to Other Species as the first friction",
        detail:
          "A built-in Relationship to Other Species choice sets the Relations with Outsiders section and its friction line, such as a fight that stopped without either side giving up its point. A custom relationship appears in the section, but uses the first built-in friction line. Use that friction to write the party's first encounter with the species.",
      },
      {
        title: "Turn the internal split into a choice",
        detail:
          "Internal Factions & Conflicts always names two factions: one would trade the species' speciality openly for standing, the other fears that dependence means absorption. The third Adventure Hook in the lore has both factions recruit the party, each telling a partial truth about the other.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-make-an-alien-species-feel-believable",
        label: "Making an alien species feel believable",
      },
      {
        href: "/answers/what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
        label: "Choosing a ship for a sci-fi party",
      },
    ],
  },
  "secret-society": {
    summary:
      "Generate a secret society with a public face that neighbours defend, a hidden truth its inner circle fears, and a GM-only lore sheet covering its leader, taboo, recruitment and sacred object, so the party can meet it through the front first.",
    tips: [
      {
        title: "Choose the public face the party meets first",
        detail:
          "Public face is the front the party sees, from a Charity to an Academic society. The Public face section says neighbours defend it, so the first scene can be a favour the society offers in the open, long before anyone asks about its secret.",
      },
      {
        title: "Decide what the truth is worth",
        detail:
          "Relationship to truth appears in both What they believe and Secret truth. Whether the doctrine is Entirely fake, a Partial truth or Horrifyingly real changes what the inner circle fears, so settle it before you write the reveal.",
      },
      {
        title: "Use Danger level to set the clock",
        detail:
          "Danger level feeds the Current conflict line, where the society's agenda collides with a member who has learned too much. That member is the lever: the GM-only Recruitment and Taboo lines show how they were brought in and what they must never say.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-create-a-secret-society-for-an-rpg-campaign",
        label: "Building a secret society that fits your campaign",
      },
      {
        href: "/answers/how-do-you-run-factions-in-a-sandbox-campaign",
        label: "Running factions that act between sessions",
      },
    ],
  },
  constellation: {
    summary:
      "Generate a constellation with a star pattern, an origin myth, a practical use and an omen, so the night sky becomes something a culture in your world reads, relies on and fears.",
    tips: [
      {
        title: "Let Visual Impression carry the myth",
        detail:
          "In Single Constellation mode, Visual Impression sets the shape the culture sees in the stars, such as a Weapon, a Beast or a Crown or Regalia. The Origin Myth then explains why that shape is in the sky, so choose it first and the myth has something to explain (Full Night Sky mode chooses these automatically).",
      },
      {
        title: "Pair Practical Use with an omen",
        detail:
          "In Single Constellation mode, Practical Use names what people rely on the constellation for, such as Navigation or Planting and harvest timing. Read it with the Omens line in the GM-only lore, since a sign that appears while people depend on the stars turns a practical fact into a problem for the party.",
      },
      {
        title: "Open with the Adventure Hook",
        detail:
          "In Single Constellation mode, Cultural Meaning sets how the culture treats the constellation, as a deity, a warning or an ancestor. The Adventure Hook in the GM-only lore gives a ready scene that tests that meaning, such as someone insisting the constellation rose out of season.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-start-worldbuilding-from-scratch",
        label: "Starting a setting from a single idea",
      },
      {
        href: "/answers/where-do-worldbuilding-ideas-come-from",
        label: "Finding worldbuilding ideas at the table",
      },
    ],
  },
  world: {
    summary:
      "Generate a sci-fi planet, moon or artificial world built around one dominant feature, then use its two world tags and campaign pressure to find the settlements and disputes your party meets on arrival.",
    tips: [
      {
        title: "Pick two tags that disagree",
        detail:
          "World Tag 1 and World Tag 2 each bring friends, enemies and places into the draft. Choose two with clashing interests, such as Refugees and Megacorps, and the Settlements & Factions section will show the largest settlement and its rival network disagreeing about the future.",
      },
      {
        title: "Open the first session on one hook",
        detail:
          "The three Adventure Hooks each name an actor, a cost and a decision. Start with the hook whose helper asks the crew to act before a rival moves, then keep the other two for later arcs once the party understands who is pushing.",
      },
      {
        title: "Decide who survives where",
        detail:
          "Habitability shapes the How People Survive section and Civilisation shapes Settlements & Factions. A Hostile world with a Frontier civilisation makes protection the daily problem, so a supply run or rescue is a natural first scene. Type a Dominant feature (optional) to replace the generated one, and the Environment section builds on it.",
      },
    ],
    links: [
      {
        href: "/answers/how-to-create-a-sci-fi-star-system-for-an-rpg",
        label: "Building a sci-fi star system around this world",
      },
      {
        href: "/answers/how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
        label: "How scarcity drives conflict on a world",
      },
    ],
  },
  "star-system": {
    summary:
      "Treat a star system as a playable region map rather than an astronomy textbook: every orbit should exist because a faction, resource, or travel hazard gives the crew a reason to go there.",
    tips: [
      {
        title: "Start with the stakes, not every rock",
        detail:
          "Pick two or three bodies where rival factions or scarce resources collide, and leave the remaining orbits as landmarks or refueling stops.",
      },
      {
        title: "Use travel hazards to pace scenes",
        detail:
          "Radiation belts, debris fields, and sensor-blind Lagrange points create natural complications between stations without needing scripted ambushes.",
      },
      {
        title: "Expand key worlds on demand",
        detail:
          "Click Develop This World on any named body in the result to spin up a full planetary profile that inherits the system's tension.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
        label: "Running sci-fi party roles",
      },
      {
        href: "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
        label: "Differentiating sci-fi civilisations",
      },
    ],
  },
  "language-generator": {
    summary:
      "Build just enough of a fictional language to let players recognise repeated words, read a sign and distinguish one register of speech from another. Treat the glossary as a growing record of meanings your table can rely on, not a complete language you have to learn before play.",
    tips: [
      {
        title: "Decide who speaks it and when",
        detail:
          "Try Genre Classic Fantasy, Tone & Sounds Lyrical & Vowel-rich and Linguistic Role Common Speech. In World context (optional), name the trading towns and speakers that use it. Choose the sound pattern for ease of recognition, not as a shorthand for a people's personality or morality.",
      },
      {
        title: "Build an inscription players can decipher",
        detail:
          "Select Compound Words in Name Structure and check Common Vocabulary & Word Bank against Word Formation & Naming Conventions. In Iofielefana, aevi means city and liofi means water, so Aeviliofi can name a river city if the head word comes first. Repeat the same roots on a ferry sign and on a map; give the party a translation to discover through context.",
      },
      {
        title: "Keep meanings consistent across sessions",
        detail:
          "Pick a greeting from Sample Phrases and speak it the same way each time. Save one Note with the sound rules, glossary and phrases in main text, and the example names and At the Table cues in GM notes. Link it to the cultures and locations that use it, then add new terms only when you establish what they mean.",
      },
    ],
    linksTitle: "Build a vocabulary your table can remember",
    links: [
      {
        href: "/answers/how-do-you-create-a-fictional-language-for-an-rpg",
        label: "Make a small, consistent fictional language",
        description:
          "Choose reusable roots, a few grammar patterns and a practical vocabulary for scenes.",
      },
      {
        href: "/answers/how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
        label: "Give speakers varied cultures and identities",
        description:
          "Separate shared institutions and customs from the personality of an individual speaker.",
      },
    ],
  },
  "origin-generator": {
    summary:
      "Strong character origins explain why a hero or villain stepped into danger today—not just what happened to them years ago.",
    tips: [
      {
        title: "Tie the incident to an active faction",
        detail:
          "Swap generic disaster details for a named guild, lab, or bloodline already present in your campaign so the backstory creates immediate allies or rivals.",
      },
      {
        title: "Keep one unresolved cost",
        detail:
          "The best origin leaves behind a debt, a witness, or a physical tell that the GM can bring back mid-arc.",
      },
      {
        title: "Pair with a personality profile",
        detail:
          "Use the generated flaw or vow as the character's default reaction under pressure.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-improvise-npcs-in-dnd",
        label: "Improvising memorable characters",
      },
    ],
  },
  personality: {
    summary:
      "Keep a character recognisable across very different conversations. Choose a visible habit for their first appearance, then use their drives, virtue, flaw and contradiction to work out how their behaviour changes when the party puts them under pressure.",
    tips: [
      {
        title: "Give them someone to answer to",
        detail:
          "Use Role / Context and Optional Relationship Context to set a target for a tailored AI draft or to guide your own edits to a non-AI profile. A Contact / Informant who owes the party a favour still has a loyalty elsewhere: decide what they will tell a friend that they would never tell a stranger.",
      },
      {
        title: "Let a genuine strength cause a problem",
        detail:
          "Try Guarded in Social Style with Loyalty above all in Moral Outlook. Read Virtue and Flaw together and decide when protecting an ally turns into withholding information the party needs; the players can then appeal to the same loyalty instead of simply rolling against a hostile character.",
      },
      {
        title: "Know when the usual manner breaks",
        detail:
          "Choose Calm in Temperament and Reserved in Reserved / Expressive for a character who keeps control in ordinary conversation. Pick a cue from Mannerism / Tell, then consult Under Pressure and Boundary / Trigger to decide what changes if the party crosses a line.",
      },
    ],
    linksTitle: "Bring the personality to the table and back again",
    links: [
      {
        href: "/answers/how-do-you-make-npcs-memorable-without-lots-of-prep",
        label: "Reduce a profile to the cues players will notice",
        description:
          "Choose an immediate want, a recognisable habit and a contradiction, then add the relationship or sensory detail needed for the first scene.",
      },
      {
        href: "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
        label: "Portray a character without doing a voice",
        description:
          "Use a clear attitude, habitual behaviour and simple third-person narration to make the character identifiable as conversations shift.",
      },
      {
        href: "/answers/how-do-you-keep-track-of-npcs-in-a-long-campaign",
        label: "Remember what changed before they return",
        description:
          "Record the last meeting, current want and unresolved obligation so a recurring character remembers what the party did.",
      },
    ],
  },
  npc: {
    summary:
      "Give an unexpected contact something to ask of the party, not just a name to introduce. Use a Table Card for an encounter now or a Full Dossier for someone whose loyalties and price will matter in later scenes.",
    tips: [
      {
        title: "Choose the person who controls the next step",
        detail:
          "In Choose their role, a Classic Fantasy Guard can refuse passage while a Merchant can withhold supplies. Pick Common Good under Choose their moral stance if harm to innocent people should change their mind, or Mercenary Instinct if a better bargain should sway them.",
      },
      {
        title: "Give the first conversation a decision",
        detail:
          "Set Prep style to Table Card for a surprise encounter. Start with the sensory tag and immediate want, then reveal the contradiction only when the players challenge their first impression. For a recurring rival or contact, choose Full Dossier and decide what price they will demand next time.",
      },
      {
        title: "Make the witness useful without making them omniscient",
        detail:
          "Separate what they witnessed from what they merely suspect or conceal. Let an honest question uncover a genuine lead, then use the relationship hook or faction connection to point the party towards someone who can answer what this NPC cannot.",
      },
    ],
    linksTitle: "From first meeting to a recurring cast",
    links: [
      {
        href: "/answers/how-do-you-improvise-npcs-on-the-spot",
        label: "Introduce a contact without stopping play",
        description:
          "Use the five-beat introduction to establish their role, want and attitude before delivering backstory.",
      },
      {
        href: "/answers/how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
        label: "Handle broad questions without hiding essential clues",
        description:
          "Give the witness's useful account, distinguish evidence from hearsay and offer a lead the party can act on.",
      },
      {
        href: "/answers/how-do-you-organise-npc-relationships",
        label: "Turn a tentative connection into a changing relationship",
        description:
          "Record who owes whom, why, who knows and what could break the arrangement.",
      },
    ],
  },
  settlement: {
    summary:
      "Create an inhabited place the party can navigate and return to. Give it a reason to exist, a recognisable everyday routine and a tension that changes what visitors can do.",
    tips: [
      {
        title: "Choose the reason people settled here",
        detail:
          "Pair Environment with Primary Function: Forest edge and Trade hub gives you a market where guides and foresters meet merchants. Make the main route, resource or service visible on arrival, then decide what travellers must ask for and what locals can deny them.",
      },
      {
        title: "Set the size for the scene you need",
        detail:
          "Choose Scale as Village when the party should quickly learn who knows whom, or Town for distinct neighbourhoods and competing contacts. Use Points of Interest and Notable Inhabitants to prepare an official, a broker and a resident who offers a different perspective.",
      },
      {
        title: "Put the tension on the party's path",
        detail:
          "Pair Dominant Tension with Tone: a cosy town in Succession crisis can welcome visitors while its factions argue over who may collect tolls. Show that disagreement at the gate or market; give two NPCs different reasons for asking the party to act.",
      },
    ],
    linksTitle: "Build a place, then put it into play",
    links: [
      {
        href: "/answers/how-do-i-design-a-geographically-realistic-town-or-village",
        label: "Put the settlement where it makes sense",
        description:
          "Make terrain, roads and water explain why people live there.",
      },
      {
        href: "/answers/how-do-i-decide-what-a-settlement-produces-imports-and-exports",
        label: "Turn local trade into dependencies",
        description:
          "Choose what locals need and what they can offer visitors.",
      },
      {
        href: "/answers/what-should-an-rpg-settlement-contain",
        label: "Prepare the places and contacts players actually use",
        description:
          "Make the town ready for a session without detailing every house.",
      },
    ],
  },
  "adventure-generator": ADVENTURE_GUIDE,
  "point-crawl": {
    summary:
      "Prepare travel as a succession of choices rather than a journey along a fixed path. Use a small network of locations with different costs, then tell the party what they can see at each junction without revealing the whole map.",
    tips: [
      {
        title: "Match the route choices to your session",
        detail:
          "Set Genre / Theme to Classic Fantasy, Crawl Scale to Wilderness, Number of Points to 8 and Interconnection Density to Balanced branching for a coastal pilgrimage. In Free-Text Premise, say the tide will return before the party reaches the shrine. Use Danger Level to set the stakes, then give the exposed causeway and sheltered cave different travel times and risks.",
      },
      {
        title: "Make the hidden route discoverable",
        detail:
          "Set Secret Route Frequency to Standard (1-2 secret routes). Inspect the graph and follow the Signpost field at each junction. In the Receding Tide Road example, the causeway bells hold the sequence for the locked arch at the Lantern-Ruin Fork. Decide what the party can notice before committing to a route, and offer a second way to learn the sequence if they miss it.",
      },
      {
        title: "Save a network you can run from the vault",
        detail:
          "Inspect locations and use Include in Vault Save, Select All or Core Only before adding the crawl. Check that the starting point, goal and clues needed for locked routes are still selected. Add to my Codex opens the overview Note and creates one Location for each selected point, with routes between selected endpoints. Keep this full map and the overview for GM prep; share only discovered routes and sights with players.",
      },
    ],
    linksTitle: "Make every journey a meaningful choice",
    links: [
      {
        href: "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
        label: "Build a navigable network of landmarks",
        description:
          "Place junctions, route signposts, obstacles and clues so players can make informed travel choices.",
      },
      {
        href: "/answers/point-crawl-vs-hex-crawl",
        label: "Choose the right scale of exploration",
        description:
          "Decide whether travel between landmarks or exploration of unknown terrain is the interesting part of play.",
      },
      {
        href: "/examples/the-receding-tide-road-point-crawl",
        label: "Walk through the Receding Tide Road example",
        description:
          "See how the tidal causeway, hidden routes and the Lantern-Ruin gate make an eight-point coastal expedition playable.",
      },
    ],
  },
  rumour: {
    summary:
      "Offer gossip as a set of choices, not a disguised mission list. Give each claim a traceable source, somewhere to check it, and a consequence if the party believes the wrong person.",
    tips: [
      {
        title: "Make the leads fit the place",
        detail:
          "Set Genre to Classic Fantasy, Tone to Everyday, Danger Level to Low and Subject Focus to Balanced Mix for a busy market town. Replace a generic lead with a name, stall or shift the party can actually find. Read two or three rumours first and keep the others for later visits.",
      },
      {
        title: "Let wrong information reveal something useful",
        detail:
          "Check Reality and If Investigated under GM Reference. If the rumour about a poisoned well is false, let inspection reveal a broken sluice and a merchant profiting from panic instead. Give the party evidence before they make an irreversible accusation.",
      },
      {
        title: "Track what the characters have heard",
        detail:
          "Add to my Codex saves all six rumours in one Note. Keep the Rumour, Lead and Source entries in the main text and the truth in GM notes. Mark claims as heard, checked or disproved after each session, and link the Note to the settlement or people already in your vault.",
      },
    ],
    linksTitle: "Make local gossip worth following",
    links: [
      {
        href: "/answers/how-do-you-generate-useful-rpg-rumours",
        label: "Write rumours that give players something to do",
        description:
          "Give each rumour a concrete lead and make the truth discoverable even when the claim is mistaken.",
      },
      {
        href: "/answers/how-to-create-rumours-for-a-fantasy-town",
        label: "Tie gossip to local pressures",
        description:
          "Use the people, places and disagreements in a settlement to decide what its inhabitants talk about.",
      },
    ],
  },
  "bbeg-generator": {
    summary:
      "Build a campaign around an antagonist whose influence is felt before the party meets them. Use the first signs, the people carrying out the plan and the consequences of interference to make an evolving threat rather than a sequence of compulsory encounters.",
    tips: [
      {
        title: "Make the scale of the threat tangible",
        detail:
          "Choose a Threat Scale the party can see and affect: a Regional villain might close the only ferry between two towns, while a Local one could control a single market. Pick one First Signs clue the players can encounter in ordinary travel and give them at least two ways to investigate it.",
      },
      {
        title: "Decide what the villain will sacrifice",
        detail:
          "Combine Corrupt Ruler in Villain Archetype with Guardian in World Relation; someone protecting a city might sacrifice the surrounding villages to do it. Use Tragic in Tone and Understandable, Still Wrong in Degree of Sympathy / Redeemability, then give a loyal lieutenant a line they will not cross, so the party can expose that cost and win an ally.",
      },
      {
        title: "Let interference change the next move",
        detail:
          "Read The Villain's Plan and Escalation If Ignored as what the antagonist would attempt without opposition. If the party exposes a forged order, decide what resource or support was lost, change the next viable stage, and show the fallout at the table through a cancelled patrol, a public accusation or an offer to negotiate.",
      },
    ],
    linksTitle: "Build, run and update the campaign threat",
    links: [
      {
        href: "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
        label: "Turn an antagonist's agenda into playable arcs",
        description:
          "Separate the long-term stakes from the current problem and prep only the next session in detail.",
      },
      {
        href: "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
        label: "Show the threat advancing without forcing a path",
        description:
          "Use visible consequences, soft clocks and rival actors to create informed choices even when the party goes elsewhere.",
      },
      {
        href: "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
        label: "Resolve the villain's next move between sessions",
        description:
          "Give the organisation one targeted action, resolve its outcome and log a consequence that the party can notice next time.",
      },
    ],
  },
  creature: {
    summary:
      "Design an inhabitant of the world rather than a bag of hit points. Use its habitat, ecological role and observable behaviour to decide what it is doing when the party arrives, what warns them of danger and how they can interact without fighting.",
    tips: [
      {
        title: "Give the creature a reason to be in this place",
        detail:
          "Pair Ecological Role / Behaviour with Habitat / Environment. A Herbivore / Migratory Grazer crossing a wetland may leave a ruined footbridge and a new trail; a Territorial Guardian in caverns may block a passage to its nesting chamber. Choose what the party disturbs by taking the obvious route.",
      },
      {
        title: "Decide what the party can learn before danger",
        detail:
          "Use Threat Level to decide how urgent the warning should be, not as a numerical encounter rating. Turn one Observable Ability into a recognisable sign, such as scorched moss or a shed scale. Let players change their plan after finding that sign instead of learning the danger only when it strikes.",
      },
      {
        title: "Give every encounter an end other than death",
        detail:
          "Use Intelligence / Temperament to decide what changes the creature's behaviour. A Cunning / Pack Mind might retreat when its group is separated; a Fully Sapient / Cultured one may negotiate access to a feeding ground. Choose the boundary it will not cross and the consequence if the party honours it.",
      },
    ],
    linksTitle: "Turn a creature into a playable encounter",
    links: [
      {
        href: "/answers/what-makes-a-good-random-encounter",
        label: "Give the creature an activity and a reason to be here",
        description:
          "Create an encounter with an existing situation, non-combat choices and regional consequences.",
      },
      {
        href: "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
        label: "Telegraph threat and build a way out",
        description:
          "Assess action economy, objectives and retreat using the rules of your game.",
      },
    ],
  },
  "god-generator": {
    summary:
      "Give a god, saint or spirit a place in ordinary life before it appears in a myth. Use its domain, worshippers, rite and taboo to show who seeks its help, what the faith demands and where its clergy disagree.",
    tips: [
      {
        title: "Choose who calls on this power and why",
        detail:
          "Choose Single Deity / Spirit under Generate target, then set Divine Type and Primary Domain for the role the power plays. A Saint of Knowledge might attract apprentices seeking permission to read forbidden texts, while a God of War could be invoked by people hoping to keep a battle away from their homes.",
      },
      {
        title: "Turn the faith into a visible custom",
        detail:
          "Set Worshippers to Folk Devotion for rituals at ordinary thresholds, or State Religion for a rite enforced by officials. Read Rituals & Taboos and show one practice when the party enters a shrine or household. Decide what help someone offers when the party observes it, and who is excluded if they refuse.",
      },
      {
        title: "Make two interpretations create a decision",
        detail:
          "Set Tone to Dark / Grim for a promise with a troubling price, or Heroic when people look to the power for courage. Name an existing institution or community in Campaign context (optional), then turn the Secret or Immediate Hook into an observable omen two clergy factions interpret differently.",
      },
    ],
    linksTitle: "From a single power to a living faith",
    links: [
      {
        href: "/answers/how-do-you-create-a-believable-fictional-religion",
        label: "Make worship part of everyday life",
        description:
          "Give worshippers habits, institutions and disputes rather than only a list of gods.",
      },
      {
        href: "/answers/can-multiple-gods-share-a-domain",
        label: "Turn overlapping domains into competing claims",
        description: "Decide what each power promises that the others cannot.",
      },
      {
        href: "/answers/how-do-you-create-a-pantheon",
        label: "Connect the deity to a larger pantheon",
        description:
          "Give neighbouring gods alliances and rivalries with mortal consequences.",
      },
    ],
  },
  "pantheon-generator": {
    summary:
      "Build an interconnected divine assembly where every deity pulls against the others through a shared Conflict Theme, rival alliances, and a mortal following. Use the result when a region's temples, oaths, and calendar holidays need political weight rather than a flat list of isolated domains.",
    tips: [
      {
        title: "Use Pantheon Focus / Width to set how faiths clash",
        detail:
          "Pick Focused (Single Domain Focus) when rival priesthoods argue over who owns one vital sphere like War or Shadow, or Wide (Broad Mythic Pantheon) when towns juggle competing obligations across many gods. In your next session, have two local shrines demand incompatible offerings before the party can cross a border or claim sanctuary.",
      },
      {
        title: "Turn Conflict Theme and alliances into mortal politics",
        detail:
          "Pair Conflict Theme with the generated rivalries to decide which mortal orders refuse to share a roof, a treaty, or a succession vote. A Forgotten Pact or Succession War gives you an immediate reason for an abbey to hire the party against a rival sect without waiting for a god to appear in person.",
      },
      {
        title: "Aim Worshippers and Campaign context (optional) at one region",
        detail:
          "Match Worshippers to the social layer your players actually deal with, then name a threatened city, dynasty, or borderland inside Campaign context (optional). Treat the generated Hidden Problem and Rumours & Legends as the pressure driving next week's omen or secret priestly council.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-create-a-pantheon",
        label: "Design divine rivalries before filling out domains",
      },
      {
        href: "/answers/can-multiple-gods-share-a-domain",
        label: "Use overlapping domains to spark temple schisms",
      },
      {
        href: "/answers/how-do-you-create-a-believable-fictional-religion",
        label: "Turn pantheon myths into daily rites and taboos",
      },
    ],
  },
  quest: {
    summary:
      "Treat a quest as a situation that will evolve with or without the party. The hook is an invitation, not a sequence of required scenes. Prepare what the people involved want and what happens if nobody intervenes.",
    tips: [
      {
        title: "Set stakes the party can reach",
        detail:
          "Choose a vibe, then use Scope to decide how far the consequences spread. In Classic Fantasy, Local (village / district) could mean a mill that stops supplying flour; World-threatening needs signs of danger beyond the first location. Show the next consequence rather than explaining the entire crisis.",
      },
      {
        title: "Give the hook more than one entrance",
        detail:
          "Pair Location Type with Main Threat to decide what the party can discover before meeting the patron. At a Cursed Ruin threatened by a Corrupt Noble, a missing supply wagon, a frightened witness and a disputed deed could each lead to the same problem. The party can investigate without taking the offered job.",
      },
      {
        title: "Let the reversal change the bargain",
        detail:
          "Use Twist and Reward to decide what the players stand to gain or lose once they learn the hidden truth. If the patron hired them to recover a stolen deed, revealing that it was forged gives them a choice: collect the promised reward or earn the villagers' trust by exposing it.",
      },
      {
        title: "Anchor the quest to something already in play",
        detail:
          "In Optional Campaign Context, name a person, place or unresolved promise the party already knows. After drafting, choose one way the quest changes that relationship, even if the party leaves it unfinished.",
      },
    ],
    linksTitle: "Turn a quest hook into playable choices",
    links: [
      {
        href: "/answers/how-do-you-create-quest-hooks-without-railroading",
        label: "Present the hook without dictating the solution",
        description:
          "Give players clear reasons to investigate and room to choose a different approach.",
      },
      {
        href: "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
        label: "Make the threat matter without forcing the party's hand",
        description:
          "Use visible consequences and other actors' plans to build urgency without punishing every delay.",
      },
      {
        href: "/answers/how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
        label: "Keep unanswered hooks useful across sessions",
        description:
          "Record leads, their current state and when to bring them back into play.",
      },
    ],
  },
  "faction-roster": {
    summary:
      "Give a faction faces the party can bargain with, not a single voice that speaks for everyone. Use the roster's duties, personal wants and connections to decide who has the power to grant a favour, who needs something in return and who objects.",
    tips: [
      {
        title: "Choose who gets a seat in the scene",
        detail:
          "Paste the faction and its Notable NPCs list into The faction, then set Roster size to include the people the party already knows. Three members can carry a disputed contract, while five or six give a council hearing several competing votes and witnesses.",
      },
      {
        title: "Put authority in the right hands",
        detail:
          "Use How the faction is organised to work out what a member can actually promise. In a Council, a spokesperson may need another vote before granting passage; in a Cell network, a contact might offer local help without knowing what other cells are planning.",
      },
      {
        title: "Give a bargain two interested parties",
        detail:
          "Choose Internal dissent in Roster emphasis when the party needs to exploit an internal fault line, or Public face when it must deal with representatives and their promises. Pick two members whose immediate wants collide, then use their leverage and named connection to decide what each would concede and whose trust the party might lose.",
      },
      {
        title: "Let the next meeting change the roster",
        detail:
          "In Add campaign context (optional), note an approaching vote, missing delivery or debt the members cannot ignore. Use the roster's stance and current wants to decide who acts before the party returns, then record which obligation or alliance has changed.",
      },
    ],
    linksTitle: "Put the faction's members into play",
    links: [
      {
        href: "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
        label: "Give each member a recognisable voice at the table",
        description:
          "Combine a current want, an attitude and one observable habit to distinguish people without acting out the whole council meeting.",
      },
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Make competing loyalties drive negotiation",
        description:
          "Use rival agendas, obligations and visible consequences to present political choices the party can influence.",
      },
      {
        href: "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
        label: "Record who acted while the party was away",
        description:
          "Resolve one faction move, show what changed and update the member's commitments before the next session.",
      },
    ],
  },
  "artifact-generator": {
    summary:
      "Build a relic that changes a campaign because people pursue it and its wielder has difficult choices to make. Treat its powers, its price and the means of ending its influence as parts of the same story.",
    tips: [
      {
        title: "Choose who has to live with its power",
        detail:
          "Set Power Tier / Scope to Heroic Wonder for a relic that changes a skirmish, or Regional Masterpiece when whole towns have reason to claim it. Check each of the three power stages against that reach; give the party a reason to hold back rather than always use the strongest power.",
      },
      {
        title: "Start with a claim, not a free treasure",
        detail:
          "Choose Current Status as Lost in Ruined Sanctuary when several factions can race for the discovery, or Wielded by a Tyrant / Rival when the party must take it from someone. Give two pursuers incompatible demands and let the party decide whom to trust, bargain with or defy.",
      },
      {
        title: "Make awakening and the price visible",
        detail:
          "Match Curse / Cost / Drawback to a dilemma you want to play. With Strict Moral / Physical Taboo, show the vow in the relic's history before testing it; with None (Pure Burden of Custody), make its need for protection the real price. Reveal an achievable awakening requirement and a credible way to seal or destroy it.",
      },
    ],
    linksTitle: "Make the relic matter beyond its first discovery",
    links: [
      {
        href: "/answers/how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
        label: "Unlock meaningful powers through deeds",
        description:
          "Let a relic develop with its bearer rather than simply increasing numbers.",
      },
      {
        href: "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
        label: "Decide when a campaign-shaping reward belongs",
        description:
          "Pace major finds across the campaign and consider what happens if the party trades them.",
      },
    ],
  },
  faction: {
    summary:
      "Each result is a named faction with a type, a scale, a goal, an internal conflict, an immediate hook, two named NPCs and a rival faction. Campaign context goes into the GM notes, and the vibe changes the goal, conflict and hook.",
    tips: [
      {
        title: "Choose the type for the base and resources",
        detail:
          "In the offline draft, Choose what they are sets the Base and Resource lines in At a Glance. Changing the type changes both lines for most types, so the same vibe can produce a very different base.",
      },
      {
        title: "Use the scale to set their reach",
        detail:
          "In the offline draft, Choose their scale is repeated in What they control, so a single city and a kingdom-wide network read as different threats.",
      },
      {
        title: "Let the vibe set the goal and the trouble",
        detail:
          "In the offline draft, Choose a vibe decides the goal, the internal conflict and the immediate hook. With the type unchanged, a cyberpunk vibe and a cosmic horror vibe still get different goals and hooks.",
      },
    ],
  },
  "urban-fantasy-faction": {
    summary:
      "Each offline draft is a named city faction with a faction type, a mode, an operating scope, a moral posture, a goal, a base, a secret, two named NPCs, a rival and an immediate hook. AI results may vary the NPC count and phrase the secret and internal conflict independently. Use it when a hidden-world group needs a place in a modern city, then decide which parts the party can see.",
    tips: [
      {
        title: "Set the operating scope to size the threat",
        detail:
          "Operating scope appears in the summary and in What they control, as in across the neighbourhood or across the transit network. A neighbourhood faction suits one investigation, while a regional network fits a conflict that crosses several districts.",
      },
      {
        title: "Use campaign context for a place or problem",
        detail:
          "Text in Add campaign context becomes one sentence in What they control, starting The faction's choices are shaped by. Write a specific place or problem, such as a flooded tunnel, because the sentence uses your words as written and a mood reads less clearly.",
      },
      {
        title: "Check the conflict against the moral posture",
        detail:
          "In offline drafts, the Moral posture changes the wording of Why they are dangerous and Internal Conflict, but the conflict comes from a fixed list and the Secret line repeats it. AI results may phrase the secret and internal conflict differently, so decide which details the players learn or discover as clues.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Running faction play",
      },
      {
        href: "/generators/faction",
        label: "Classic fantasy faction generator",
      },
    ],
  },
  "dark-fantasy-faction": {
    summary:
      "Make your faction dangerous, necessary, and difficult to destroy. Each result is shaped by the mode, type, scope and moral posture you pick, giving you what it wants, what is tearing it apart, named NPCs, a rival and a hook.",
    tips: [
      {
        title: "Start with the price of survival",
        detail:
          "Combine Dark fantasy mode and Moral posture to produce a faction that solves a real crisis at a troubling price, such as a plague cult that genuinely contains disease. Openly cruel marks institutions that no longer hide their methods, while Fallen idealists leaves room to bargain.",
      },
      {
        title: "Make the players need them first",
        detail:
          "Use Operating scope to place a guarded road, cure, shelter or archive under their control before the hidden cost surfaces in Why they are dangerous. When the party relies on what the faction protects, opposing them carries immediate consequences.",
      },
      {
        title: "Give the faction a breaking point",
        detail:
          "Pair Internal Conflict, Rival Faction, Notable NPCs and Immediate Hook with Add campaign context so schemes and fractures keep advancing between sessions. In offline drafts, anything entered in Add campaign context appears at the end of How to use them at the table.",
      },
    ],
    linksTitle: "Make your faction matter at the table",
    links: [
      {
        href: "/answers/how-do-you-create-a-fantasy-faction",
        label: "How do you create a fantasy faction?",
        description: "Define its resources, weaknesses and relationships.",
      },
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "How do I run political intrigue and faction play?",
        description:
          "Turn rival groups into active decisions and consequences.",
      },
      {
        href: "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
        label: "How do you track faction turns between RPG sessions?",
        description: "Keep schemes moving when the party does not intervene.",
      },
    ],
  },
  "fantasy-names": {
    summary:
      "Each batch gives ten names of one type (person, place, faction or item). Built-in cultures shape offline names; custom culture labels use generic fantasy tables. AI results include a short style note for each name; offline results list names only. Use it to fill a cast list, a set of map labels or a shop board, then keep the names that suit your table and adapt the rest.",
    tips: [
      {
        title: "Choose the culture for the sound",
        detail:
          "Built-in Culture / Style options shape the sound of the whole batch. Dwarven gives stone and forge compounds such as Balrin Granitefist, while Norse / Viking gives person names ending in -son or -dottir. A custom culture or style label uses generic fantasy tables on the offline roll. Name Type changes the shape, so a Place adds endings such as Keep, Downs or Hollow, and a Faction often starts with The or uses of the.",
      },
      {
        title:
          "Set Gender / Presentation for full Norse and Celtic person names",
        detail:
          "On offline full person names, Gender / Presentation changes the surname only in Norse / Viking (-dottir for Feminine, -son for Masculine) and Celtic / Gaelic (Nic or Mac before the surname). It has no effect on first-name-only rolls or names in other cultures, so Any is fine for those.",
      },
      {
        title: "Add campaign context when AI is on",
        detail:
          "Add campaign context is sent to the AI path, which can tie names to the setting you describe, such as an Assyrian trading port. The offline roll does not read it, so the same batch comes back whatever you type there.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-improvise-npcs-in-dnd",
        label: "Improvising NPCs in D&D",
      },
    ],
  },
  "minor-magic-item": {
    summary:
      "Make a small find into a choice about when to spend it. Put a limited-use charm, draught or gadget in a place where it has a believable owner and gives the party an extra option, not an automatic answer.",
    tips: [
      {
        title: "Give the item a job the party can choose",
        detail:
          "Set Focus / Primary Utility to Exploration & Travel when a river crossing or climb is coming up, or Infiltration & Stealth when the party needs another way past a guard. Leave the ordinary approach viable so using the item is a decision rather than a requirement.",
      },
      {
        title: "Choose the moment they spend it",
        detail:
          "Set Usage Limit / Charges to Single Use for one important decision or Fragile Charges for a tool worth saving across several scenes. Match Activation Method to the Item Form and tell the players when the charge is spent and what it cannot do before they commit.",
      },
      {
        title: "Let the quirk be visible in play",
        detail:
          "Choose a Harmless Sensory Tell under Quirk or Side Effect if the item should be memorable rather than costly. A chime in a silent passage creates an observable risk; let players muffle it or choose a different approach instead of springing a hidden penalty on them.",
      },
    ],
    linksTitle: "Place the find, then make its effect fair",
    links: [
      {
        href: "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
        label: "Place small rewards without making every search pay",
        description:
          "Pace finds across the campaign and make treasure fit its owner.",
      },
      {
        href: "/answers/how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery",
        label: "Use detection items without solving the entire mystery",
        description:
          "Decide what information the item can reveal and what still needs investigation.",
      },
    ],
  },
  kingdom: {
    summary:
      "Build a realm whose ruler depends on powerful people, valuable places and fragile agreements. Use its factions and hidden problem to decide what the party can change, even when the kingdom itself is much larger than their adventure.",
    tips: [
      {
        title: "Decide whose permission the party needs",
        detail:
          "Set Government style to Hereditary dynasty if a noble's claim matters, or Military dictatorship if rank and orders matter. Pair this with Magic level to decide who can grant an exception or issue a warrant when the party needs access.",
      },
      {
        title: "Make the geography a source of leverage",
        detail:
          "Set Geography to Mountain range when the passes and mines are worth holding, or Arid desert when access to wells matters. Choose Scale for how far a ruler can respond and give one faction control over the route or resource the party needs.",
      },
      {
        title: "Let the next crisis change daily life",
        detail:
          "Set Conflict level to Total war when roads and supplies are contested, or Post-war recovery when former allies demand repayment. Name a borderland or noble family in Campaign context (optional), then make the hidden problem create an observable event and give rivals incompatible responses.",
      },
    ],
    linksTitle: "Turn the realm into choices and consequences",
    links: [
      {
        href: "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
        label: "Give the realm practical strengths and limits",
        description:
          "Make institutions, resources and vulnerabilities matter rather than relying on stereotypes.",
      },
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Turn competing claims into playable politics",
        description: "Give rivals goals and leverage the party can use.",
      },
    ],
  },
  tavern: {
    summary:
      "Prepare a meeting place that players want to return to. Use its owner, clientele, signature food or drink and hidden trouble to make an ordinary stop become a lead, a refuge or a difficult choice.",
    tips: [
      {
        title: "Make the room feel like their next stop",
        detail:
          "Pair Atmosphere with Wealth level to decide whom visitors will meet and what hospitality costs, from a cheap fire and bench to a private table. Give the regulars one recognisable routine so the party notices when something changes.",
      },
      {
        title: "Choose Primary clientele for the contact you need",
        detail:
          "Set Primary clientele to Soldiers and mercenaries for a witness to trouble on the road, or Criminals and fence-seekers for someone who can arrange an illicit trade. Let the owner introduce the contact, but give them a reason to ask for something in return.",
      },
      {
        title: "Give rumours somewhere to lead",
        detail:
          "Use Settlement type to choose a destination outside the tavern: a Coastal port can point to a ship that has not unloaded. Name an existing place or feud in Campaign context (optional), then decide which rumour reveals the hidden problem and which sends the party to a different scene.",
      },
    ],
    linksTitle: "From a memorable inn to an adventure lead",
    links: [
      {
        href: "/answers/what-should-an-rpg-settlement-contain",
        label: "Give the inn a job in the settlement",
        description:
          "Place the tavern among the everyday services and contacts the party needs.",
      },
      {
        href: "/answers/how-to-create-rumours-for-a-fantasy-town",
        label: "Make overheard rumours actionable",
        description:
          "Give each source a reason to speak and a next place to investigate.",
      },
    ],
  },
  "magic-item": {
    summary:
      "Pick an item type and a rarity, and the generator names the item, describes how it looks and feels, and writes GM notes with a magical property and a line of history. Treat the result as a first draft to tune for your table.",
    tips: [
      {
        title: "Match the effect to the rarity you picked",
        detail:
          "The rarity you pick does not decide the effect, so check that the two agree. A minor trick on a Legendary item, or a strong power on a Common one, means one of them should change.",
      },
      {
        title: "Treat the magical property as a clue first",
        detail:
          "Effects vary by genre: in a Classic Fantasy setting, a hum that points toward fresh water or a glow near the undead works best as a hint, then becomes a tool once the players trust it. Pick the effect that suits the scene you are running.",
      },
      {
        title: "Put the history on your own map",
        detail:
          "In a Classic Fantasy setting, the history line names a source such as a red dragon's hoard or a paladin who fell at the Siege of Shadowkeep. Swap those names for places in your world, or keep one as a rumour the players can chase.",
      },
    ],
    links: [
      {
        href: "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
        label: "How much loot and how many magic items to give players",
      },
    ],
  },
  item: {
    summary:
      "Make a found object worth deciding what to do with, rather than another line on a treasure list. Use the item's appearance, property and former owner to give the party reasons to keep it, return it, trade it or investigate where it came from.",
    tips: [
      {
        title: "Give the find a job in the next scene",
        detail:
          "Choose Item Type to suit the person or place holding the loot. A Ring on a magistrate might be recognised at a locked gate; a Potion in an apothecary's cabinet offers an expendable resource the party can spend when it matters.",
      },
      {
        title: "Decide who can afford the find",
        detail:
          "Use Rarity to set your intended place in the treasure supply. A Common object might find a buyer locally, while a Very Rare piece could require an introduction to a collector; review the actual property against your game's rules before deciding its value.",
      },
      {
        title: "Leave a trace of the former owner",
        detail:
          "Name the place of discovery or a known owner in Add campaign context. Use a visible detail from the description and a fact from Lore & History to plant a clue, then decide who would recognise the object and what they could tell the party.",
      },
      {
        title: "Reward a new use rather than a bigger number",
        detail:
          "If the party keeps the object, decide which specific situation its property makes easier and agree any limits before play. A ring that warns of damaged masonry can prompt a route choice without solving the entire crossing for them.",
      },
    ],
    linksTitle: "Put found equipment to work in your campaign",
    links: [
      {
        href: "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
        label: "Place treasure where it makes sense",
        description:
          "Separate routine possessions from substantial rewards and decide what belongs in the room or owner's pack before a search.",
      },
      {
        href: "/answers/how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
        label: "Let a favourite weapon grow with its wielder",
        description:
          "If the find is a weapon the party keeps, use its history and situational properties to plan meaningful upgrades instead of constant replacement.",
      },
      {
        href: "/answers/what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
        label: "Find a plausible buyer or specialist",
        description:
          "When players want to sell or commission equipment, use market scale, specialist availability and named buyers to make the next transaction a decision.",
      },
    ],
  },
  business: {
    summary:
      "Build an enterprise that matters because people depend on what it supplies, not because it has a long inventory. Turn its staff, dependencies and competitors into immediate costs and opportunities for the party, whether they are customers or owners.",
    tips: [
      {
        title: "Choose something the settlement cannot do without",
        detail:
          "Use Business type and Location (optional) to choose a service with local stakes: a blacksmith beside a ferry crossing could repair the last working winch. Read Suppliers and Dependencies and decide what stops working first if a delivery fails.",
      },
      {
        title: "Put the competitor's offer on the table",
        detail:
          "Use Legitimacy to decide whether resolving the Current Pressure means asking an inspector for a licence, bargaining with a criminal protector or exposing a rival. Give the party two ways to help the business survive, each benefiting a different named relationship.",
      },
      {
        title: "Make ownership a recurring decision",
        detail:
          "Select Players own this business if the party wants to build an enterprise. Use its manager's goal, Recurring obligations and Upgrade paths to offer a choice before their next expedition: hire another worker to protect a contract, or fund an expansion that creates a new obligation.",
      },
    ],
    linksTitle: "Turn trade into recurring adventure",
    links: [
      {
        href: "/answers/how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
        label: "Build an adventure from a broken dependency",
        description:
          "Trace the shortage to people, choices and consequences rather than a price list.",
      },
      {
        href: "/answers/how-do-i-run-a-campaign-where-the-players-own-a-business",
        label: "Run an owned business between adventures",
        description:
          "Use lightweight business turns, investment choices and recurring obligations.",
      },
    ],
  },
  heist: {
    summary:
      "Prepare a score whose objective, security and escalating response give the crew choices instead of a single intended plan. Use casing to establish what they know, the practical catch to shape how they act, and the getaway to reward or complicate those choices.",
    tips: [
      {
        title: "Make success mean more than reaching the target",
        detail:
          "Choose Heist Type according to what must change by the end of the score. Rescue means bringing someone out alive, while Information means getting knowledge the crew can use. In The Prize (optional), name an objective whose condition matters, such as a fragile royal seal or a witness who refuses to leave without their child.",
      },
      {
        title: "Make casing reveal a real alternative",
        detail:
          "Use Target and Target Scale to set how much of the location needs to be negotiated or infiltrated. For each Security Ring, choose one discoverable fact that makes an alternative plausible, such as a trusted escort instead of a risky crossing. Reveal useful intel before asking the players how they enter.",
      },
      {
        title: "Escalate when the fiction changes",
        detail:
          "Read the Alarm Track and The Getaway together. Decide what evidence would actually alert the defenders, when their response changes the exit options, and which alternative remains costly but possible. Offer a flashback when a player's idea needs a plausible prior preparation, not as a requirement.",
      },
    ],
    linksTitle: "Build and run the score",
    links: [
      {
        href: "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
        label: "Give the objective a practical catch and lasting stakes",
        description:
          "Choose why it matters, who keeps it and what makes getting it out difficult.",
      },
      {
        href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
        label: "Run casing, infiltration, escalation and escape",
        description:
          "Move through the four beats without forcing a plan or a fixed solution.",
      },
    ],
  },
  "mystery-investigation": {
    summary:
      "Start from a fixed answer, then give players several ways to establish it. Use the draft as a case file, not a sequence of scenes they have to visit in order. Scope, Clue density and Danger / pressure guide AI-generated cases; the offline fallback does not apply those settings.",
    tips: [
      {
        title: "Choose the question and the size of the cast",
        detail:
          "For AI-generated cases, set Mystery type to Theft, Disappearance or the event the players can actually investigate. Pair Scope set to One-shot case with Complexity / suspect count set to Lean (3 suspects) if you have one evening. Give every innocent suspect something to hide that the players can disprove.",
      },
      {
        title: "Make the essential inference independently testable",
        detail:
          "For AI-generated cases, use Clue density set to Generous for a group new to investigation. For each conclusion the players need, check that at least two leads come from different sources: for example, an altered ledger and a witness who saw a delivery. Give a plausible way to test each rather than requiring one successful roll.",
      },
      {
        title: "Advance the situation, not the solution",
        detail:
          "For AI-generated cases, Danger / pressure sets how urgently the case demands action. With Low, let the party follow a wrong lead without losing the case. With High, decide what changes at the next deadline and use the Next NPC Moves table in GM notes when the party stalls. Never change who did it to make a theory right.",
      },
      {
        title: "Give the discovery a consequence",
        detail:
          "In Optional Campaign Context, name someone who needs the case solved and what they stand to lose. After drafting, decide how a supported accusation, a partial answer or an unsolved case changes that person's relationship with the party.",
      },
    ],
    linksTitle: "From a fair clue trail to an unexpected conclusion",
    links: [
      {
        href: "/answers/how-do-you-run-a-mystery-without-railroading",
        label: "Run a case without prescribing the route",
        description:
          "Make essential information reachable from independent leads.",
      },
      {
        href: "/answers/how-do-i-get-a-stalled-rpg-investigation-moving-again",
        label: "Move a stalled investigation forward",
        description:
          "Change what the suspects do without handing out the solution.",
      },
      {
        href: "/answers/how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
        label: "Let the party test a plausible but wrong conclusion",
        description:
          "Give theories observable consequences while keeping the truth fixed.",
      },
    ],
  },
  puzzle: {
    summary:
      "Put an obstacle between the party and a goal, then use visible clues, distinct approaches and feedback to keep everyone involved. Prepare what the characters can learn and what a failed attempt changes instead of asking them to guess a single answer.",
    tips: [
      {
        title: "Make the obstacle answer a question the players can test",
        detail:
          "Choose Puzzle purpose and Puzzle style for the action the characters need to take. A Mechanical Sealed door might respond when they balance a counterweight; a Social Cross obstacle might require two disagreeing bridgekeepers to accept a compromise. Give a visible clue before the first check and show what changes after a partial success.",
      },
      {
        title: "Give abilities a spotlight, not a lock",
        detail:
          "In PC capabilities to make matter, name abilities the actual party enjoys using, such as a familiar or a smith's tools. Use Participation style to decide who gets a moment to contribute. For every specialist opening, leave another character a credible way to achieve the same step at a different cost.",
      },
      {
        title: "Choose what a wrong attempt changes",
        detail:
          "Pair Complexity with Failure pressure so the scene fits your session. None lets the party experiment safely; Time pressure can threaten the downstream objective while the mechanism remains solvable. Decide which alternate solution becomes attractive as the cost rises, and reveal another hint only once new attempts have stopped.",
      },
    ],
    linksTitle: "Make the puzzle fair and keep it moving",
    links: [
      {
        href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
        label: "Design alternate routes and meaningful feedback",
        description:
          "Replace a guessing gate with partial progress, useful information and a costlier way through.",
      },
      {
        href: "/answers/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
        label: "Deliver the next hint without solving it for the party",
        description:
          "Step from sensory reminder to changed component to immediate goal when play stalls.",
      },
    ],
  },
  "social-hub": {
    summary:
      "Use this when the party needs a place to meet people in any genre, from a Western saloon to a cyberpunk hacker café. Each draft names the venue, its operator and its regulars, then gives you one hidden problem with an opening hook and rumours to feed in over later visits.",
    tips: [
      {
        title: "Set Genre / Setting before anything else",
        detail:
          "The Venue type and Primary clientele lists change with Genre / Setting, so a Lancer table is offered a mech bay canteen and off-duty pilots rather than a mead hall. The genre also shapes the names and the signature drink or service.",
      },
      {
        title: "Use Atmosphere and Wealth level to dress the room",
        detail:
          "Atmosphere colours how the operator treats strangers, and Wealth level runs from watered drinks at Destitute to someone on the door turning people away at Wealthy. If none of the six choices fits, type your own and the draft keeps your wording.",
      },
      {
        title: "Hold the hidden problem back",
        detail:
          "Lead with the Immediate Hook and save the rumours for return visits, so the Hidden Problem, such as a debt coming due or a fugitive on the staff, surfaces slowly. In offline drafts, an Entity Seed names the person, faction or place behind it, and text from Campaign context (optional) gets its own GM notes section.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-generate-useful-rpg-rumours",
        label: "Writing useful rumours",
      },
      {
        href: "/answers/how-do-you-make-npcs-memorable-without-lots-of-prep",
        label: "Memorable NPCs with little prep",
      },
    ],
  },
  "nomad-clan": {
    summary:
      "Generate a road-based clan built for immediate highway friction: a convoy with a clear livelihood, an active route threat, a rival competing for the same stops, a hidden secret, and an immediate hook. Use them when the party needs passage across contested ground, a moving patron, or a dispute at the next fuel depot.",
    tips: [
      {
        title: "Turn Main conflict into a route dilemma",
        detail:
          "Use Main conflict to threaten the convoy's ability to move, not just their reputation. Give the party two routes: a dangerous backroad the clan can guide them through, or a safe corporate highway where they have to pay the toll or sell out the convoy.",
      },
      {
        title: "Pair Clan role and Primary territory for leverage",
        detail:
          "Match Clan role with Primary territory to decide what the convoy controls that the party cannot easily buy in a city. Ex-Corporate Refugees on borderland checkpoints trade forged transit papers and blind spots, while Tech Scavengers in orbital drop-points control salvage rights and spare parts.",
      },
      {
        title: "Anchor the clan with Add campaign context",
        detail:
          "Drop one named megacorp, fuel barony, or settlement into Add campaign context so the clan's survival stakes collide with a power your players already know. Then rename the generated Rival Faction to a group from your campaign if you want last session's fallout waiting at the next waystation.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-make-travel-interesting-in-a-tabletop-rpg",
        label: "Turn road travel into real route choices",
      },
      {
        href: "/answers/how-do-you-run-factions-in-a-sandbox-campaign",
        label: "Advance the clan and its rivals between sessions",
      },
      {
        href: "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
        label: "Map the clan's territory as a point crawl",
      },
    ],
  },
  "vampire-clan": {
    summary:
      "Each result is a vampire clan with a public front, a feeding habit that shows where its members hunt, and a weakness you can turn into a plot point. The GM Reference block holds the clan's dark agenda, its internal conflict, a rival and an adventure hook.",
    tips: [
      {
        title: "Choose how they feed first",
        detail:
          "Choose how they feed becomes the Feeding Habit line in the GM Reference block, which tells the table where the clan hunts. Pick the habit that puts them in scenes your party already visits.",
      },
      {
        title: "Turn the weakness into a lever",
        detail:
          "Choose their weakness appears as Clan Weakness in the GM Reference block. Pick one the party can realistically reach, then build the adventure hook around it.",
      },
      {
        title: "Ground the clan in your setting",
        detail:
          "In offline drafts, Add campaign context inserts a Campaign Fit section that reads Use [clan name] in [your text]. Name a real city, guild or threat there so the overview points the clan at your table.",
      },
    ],
  },
  names: {
    summary:
      "Start in Quick names when you need a name immediately: tap a name to copy it, pin favourites, or use Copy all for a plain list. With favourites pinned, Copy pinned copies just those names. Choose Generate names with notes for more context. Keep the names you can say aloud and give the people or places their own histories later.",
    tips: [
      {
        title: "Pick names for the situation rather than the whole world",
        detail:
          "Name Type sets the shape: Person for someone the party can address, Place for a landmark, Faction for a group or Item for a named possession. Choose three names from a Person batch, say them aloud and avoid similar opening syllables for people appearing in the same scene. Pin an unused pair before selecting New names so you can return to them.",
      },
      {
        title: "Give a region recognisable patterns",
        detail:
          "Choose a vibe before Culture / Style, then repeat a few name stems across related places or family names. Do not assign moral character by sound. On the offline roll, Cyberpunk / Corporate, Vampire / Gothic Noir, Sci-Fi / Space Opera, Modern Conspiracy and Post-Apocalyptic cultures without local tables use generic fantasy syllables; review the Usage Suggestions and any Offline Tables notice.",
      },
      {
        title: "Copy the shortlist into the right campaign records",
        detail:
          "Use Ask AI for a quick tailored list, or Add campaign context with AI enabled in Generate names with notes. Offline results ignore that context, including after an AI failure; retry if AI is already enabled. Paste a chosen name into the Character, Location, Faction or Item you intend to use; no batch import creates records for you.",
      },
    ],
    linksTitle: "Turn a name into something players can remember",
    links: [
      {
        href: "/answers/how-do-you-improvise-npcs-on-the-spot",
        label: "Give an improvised NPC a name and a motive",
        description:
          "Prepare a small pool of names and establish what each person wants when they first appear.",
      },
      {
        href: "/answers/how-do-you-create-a-fictional-language-for-an-rpg",
        label: "Use a shared pattern for the names of a region",
        description:
          "Build a handful of consistent roots and reuse them in people, places and titles.",
      },
    ],
  },
  "dnd-npc": {
    summary:
      "Build a fantasy NPC with a quick Class / Archetype and Table Rating benchmark, faction tie, and either a six-element Table Card for immediate dialogue or a Full Dossier for recurring campaign play.",
    tips: [
      {
        title: "Match Prep style to the scene",
        detail:
          "Leave Prep style on Table Card (6-Element 60-Second Prep) when you need an Immediate Want, Sharp Contradiction, Sensory Tag, and Table Delivery on the spot. Switch to Full Dossier (Detailed Background) for recurring contacts who need Faction Stance & Biases, Leverage & Price, and a deeper Secret.",
      },
      {
        title: "Use role and morality to set stakes",
        detail:
          "Choose their role sets the Class / Archetype and Table Rating at the top of At a Glance, from CR 1/2 merchants to CR 3 mages and priests, or Level 3 and CR 1 for custom entries. Pair that with Choose their ancestry and Choose their morality to anchor how they negotiate or push back.",
      },
      {
        title: "Name a dungeon in campaign context",
        detail:
          "Adding a dungeon or delve to Add campaign context unlocks lair-specific fields, including Delve Sector / Lair, Tie to Central Secret, and a three-stage Alert & Lair Response. Otherwise, name a local guild, town, or rival so Faction Connection and hooks land in your active arc.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-improvise-npcs-in-dnd",
        label: "Improvise an NPC on the spot",
      },
      {
        href: "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
        label: "Run them at the table without acting",
      },
      {
        href: "/answers/how-do-you-keep-track-of-npcs-in-a-long-campaign",
        label: "Track recurring NPCs across sessions",
      },
    ],
  },
  "news-sheet-generator": {
    summary:
      "Draft an in-world publication with a player-safe front page, classifieds and street rumours on one side and the editor's slant, hidden truths and adventure hooks on the GM side.",
    tips: [
      {
        title: "Set voice, bias and redaction first",
        detail:
          "Pair Genre / Setting and Publication type with Editorial tone, Ownership / bias and Censor level so the sheet's omissions and spin tell players who controls the press before they read the fine print.",
      },
      {
        title: "Anchor the issue to last session",
        detail:
          "Fill in Settlement, region, or publication name (optional) and Current crisis or headline event (optional) with a recent party disruption, then use Campaign context (optional) to add relevant details to the lead story.",
      },
      {
        title: "Split the handout from the truth",
        detail:
          "Use Hook density to set how many leads sit in the GM section, hand players the front page, notices and rumours as written, and hold The Truth Behind the Stories back until they question a witness.",
      },
    ],
    links: [
      {
        href: "/answers/how-to-write-an-in-world-newspaper-for-an-rpg",
        label: "Structuring a playable in-world newspaper",
      },
      {
        href: "/answers/how-do-you-generate-useful-rpg-rumours",
        label: "Turning street rumours into leads",
      },
      {
        href: "/answers/how-do-you-run-a-conspiracy-campaign",
        label: "Tracking truth behind the headlines",
      },
    ],
  },
  "ship-generator": {
    summary:
      "Build a vessel that acts as a mobile location, a factional pressure cooker and an adventure hook in one draft, then put its crew, key zones and hidden trouble straight onto the table.",
    tips: [
      {
        title: "Match hull, crew and decay to the arc",
        detail:
          "Choose Genre, Ship Role and Scale to set how many hands run the decks, then use Condition and Tone to signal whether the vessel is a proud flagship or a patched wreck one bad jump from failure.",
      },
      {
        title: "Run the officer roster as competing loyalties",
        detail:
          "Treat the named captain, three officers and crew culture as live scene partners: pick one officer's secret agenda to clash with the captain's orders before the party even reaches the cargo hold.",
      },
      {
        title: "Aim the complication at an active thread",
        detail:
          "Use Campaign context (optional) to name a port, syndicate or debt so the Complication, Secret and three Adventure Hooks pull the party toward people and places they already care about.",
      },
    ],
    links: [
      {
        href: "/answers/what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
        label: "Giving a party ship useful flaws and debts",
      },
      {
        href: "/answers/how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
        label: "Running ship-to-ship combat for the whole party",
      },
      {
        href: "/answers/how-do-i-make-a-player-base-matter-in-an-rpg-campaign",
        label: "Making a ship matter as a player base",
      },
    ],
  },
  "dungeon-generator": {
    summary:
      "Generate a multi-sector delve with an original purpose, two rival factions fighting over specific rooms, and a GM reference split between layout, traps, treasures and a central secret.",
    tips: [
      {
        title: "Contrast purpose against current state",
        detail:
          "Use Choose a vibe, Original Purpose and Current State & Function to build tension between what the builders intended and who occupies the halls now, then pick Complex Scale to set the number of connected sectors.",
      },
      {
        title: "Play the two factions against their obstacles",
        detail:
          "Check each faction's Territory, Goal and Obstacle in Faction Situation before the party arrives: offer a shortcut, bargain or rival secret so players can exploit the standoff instead of clearing every room.",
      },
      {
        title: "Seed local threats before opening the map",
        detail:
          "Add a nearby settlement, patron or border conflict in World context (optional) so Adventure Hooks & Rumours tie straight into your campaign, then use Build Delve Canvas when you want an editable room map.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
        label: "Keeping obstacles moving without stalling",
      },
      {
        href: "/answers/how-do-i-run-exploration-in-a-huge-ruined-city",
        label: "Running layered sector-to-sector delves",
      },
      {
        href: "/answers/what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
        label: "Matching delve lethality and pacing to a system",
      },
    ],
  },
  "adventure-idea-generator": ADVENTURE_GUIDE,
  "one-shot-adventure-generator": {
    summary:
      "Build a timed single-session adventure with a GM briefing, three to six essential or optional scenes, multi-route clues, multiple endings and a one-page cheat sheet ready to run tonight.",
    tips: [
      {
        title: "Budget scenes to your real table clock",
        detail:
          "Set Genre, Session length, Players and Adventure emphasis to allocate scene minutes plus a buffer, then keep the essential-only total in the GM Cheat Sheet as your fallback if arrivals run long.",
      },
      {
        title: "Shape structure and boundaries upfront",
        detail:
          "Open Advanced options to pick Structure, System and Level or tier, paste a hook into Starting premise, and list limits in Content boundaries or Optional campaign context before generating.",
      },
      {
        title: "Swap one weak piece without losing the thread",
        detail:
          "Use the scene or NPC regeneration controls to reroll a single room or cast member while keeping Central truth, clues and timelines intact, and drop optional scenes first if the clock tightens.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-write-a-one-shot-adventure",
        label: "Structuring a four-beat one-shot",
      },
      {
        href: "/answers/how-do-i-pace-an-rpg-one-shot",
        label: "Cutting optional scenes when running late",
      },
      {
        href: "/answers/how-do-i-run-a-one-shot-rpg-session",
        label: "Opening in the situation and sharing spotlight",
      },
    ],
  },
  "comic-book-event-generator": {
    summary:
      "Create a crossover-scale superhero crisis with a public response, four escalation beats, a hidden cause and lasting consequences that reshape your campaign rather than resetting after the finale.",
    tips: [
      {
        title: "Match event type and reach to the arc",
        detail:
          "Set Event Type, Scale and Tone to calibrate the crisis from National infrastructure up to Cosmic or Multiversal stakes, leaving street-level threats for single-villain prep.",
      },
      {
        title: "Anchor fallout to your own setting",
        detail:
          "Name a city, hero team or recent law in Optional Campaign Context so The Event, True Cause and Lasting Consequences land on institutions and allies your players already recognise.",
      },
      {
        title: "Let players interrupt the escalation track",
        detail:
          "Show Stage 1 and Stage 2 in play from How It Unfolds, hold True Cause back in GM Reference, and commit to Lasting Consequences so victories and compromises permanently alter the status quo.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
        label: "Advancing the crisis without railroading",
      },
      {
        href: "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
        label: "Building the next arc from lasting consequences",
      },
    ],
  },
  "plot-twist-generator": {
    summary:
      "Reframe an active problem without undoing the party's earlier discoveries. Prepare a reversal that remains true whether the players spot it early, accept it as presented, or pursue a third course.",
    tips: [
      {
        title: "Separate established facts from the party's assumptions",
        detail:
          "In Current situation / premise, name what the party witnessed and what they inferred, for example, the ferries stopped and the council blamed smugglers. Put the witnessed facts in Avoid / constraints (optional), and existing loyalties in World context (optional). Read Why It Makes Sense against those facts before accepting the reveal.",
      },
      {
        title: "Choose a reversal proportional to the stakes",
        detail:
          "Choose a vibe that fits the campaign. For a local hidden motive, set Twist Type to Hidden motive, Impact to Significant and When It Hits to Midpoint. Choose Foreshadowable in Fairness / Foreshadowing, or Already hinted if the players have relevant evidence. Use the AI draft for your premise and constraints; treat an offline draft as a starting point to adapt.",
      },
      {
        title: "Turn clues and consequences into decisions",
        detail:
          "Assign two Foreshadowing clues to different sources, such as a harbour ledger and a ferryman. When the players investigate either, give them the evidence honestly. Choose one Immediate Consequence that follows even if they leave, and keep at least two New Choices open. If they discover the reveal early, let them act on it instead of withholding it until the planned scene.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
        label: "Keep fixed facts steady when players theorise",
      },
      {
        href: "/answers/how-do-you-run-a-conspiracy-campaign",
        label: "Reveal conspiracies through independent evidence",
      },
      {
        href: "/answers/how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
        label: "Track the consequences of choices and delayed leads",
      },
    ],
  },
  "villain-scheme-generator": {
    summary:
      "Build an escalating superhero plot with public rumours, four to six discoverable scheme stages, minions and consequences if ignored, ready to attach to any existing or newly minted villain.",
    tips: [
      {
        title: "Dial reach, method and mastermind",
        detail:
          "Choose Power Scale, Tone, Scheme Type and Villain Profile to size the plot from a Street turf grab up to a Multiversal crisis, then swap the named archetype for your own antagonist.",
      },
      {
        title: "Tether the front to your city",
        detail:
          "When generating with AI, use Optional Campaign Context to name a syndicate, hero team or district so Public Activity, Rumours & Signs and Adventure Hook point straight at places your table watches.",
      },
      {
        title: "Advance stages only when heroes delay",
        detail:
          "Let players disrupt Scheme Stages out of order via Resources & Minions, tick Escalation If Ignored when they chase other leads, or click Generate Plot Twist to reframe the endgame.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
        label: "Advancing scheme stages when heroes look away",
      },
      {
        href: "/answers/how-do-you-run-a-conspiracy-campaign",
        label: "Leaking discoverable clues at each stage",
      },
      {
        href: "/answers/how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
        label: "Tracking the plot between sessions",
      },
    ],
  },
};

export function defaultGuideForSlug(
  _slug: ValidSlug,
  introTitle: string,
): GeneratorGuide {
  return {
    summary: `Use the ${introTitle} to draft a structured, system-agnostic starting point you can drop straight into prep or live play—then refine the details to match your campaign's factions and tone.`,
    tips: [
      {
        title: "Customize genre and tone first",
        detail:
          "Set the genre or tone controls before generating so names, stakes, and vocabulary fit your table's setting.",
      },
      {
        title: "Keep only what sparks play",
        detail:
          "Treat the first draft as clay: swap one proper noun or complication to tie it directly to an active thread in your campaign.",
      },
      {
        title: "Save straight to your local vault",
        detail:
          "Use Save to Codex to store drafts in your browser-local workspace without creating an account, then link them in your lore graph.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-prepare-an-rpg-session-step-by-step",
        label: "Preparing an RPG session",
      },
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Running faction play",
      },
    ],
  };
}

export function getGeneratorGuide(
  slug: ValidSlug,
  introTitle: string,
): GeneratorGuide {
  return SLUG_GUIDES[slug] ?? defaultGuideForSlug(slug, introTitle);
}
