import type { AnswerConfigInput } from "../schema";

export const howDoIRunCommonCharacterRolesInAFantasyRpg: AnswerConfigInput = {
  slug: "how-do-i-run-common-character-roles-in-a-fantasy-rpg",
  category: "running-the-game",
  labels: ["fantasy"],
  publishedAt: "2026-09-28",
  question: "How do I run common character roles in a fantasy RPG?",
  kind: "framework",
  shortAnswer:
    "Give each fantasy role a clear way to change the shared scene rather than a private mini-game, then keep the rest of the party in the result. Let the warrior decide what holds, the rogue make infiltration a team operation, the mage open an option without settling the problem, the priest bring institutional and moral weight, and the ranger, bard, envoy, sage and summoner each create a choice or cost the group must handle together. Tie every specialist action to a pressure the whole table can see and act on, so spotlight stays shared even when expertise is uneven.",
  sections: [
    {
      kind: "prose",
      heading: "Why fantasy parties split the table",
      paragraphs: [
        "A fantasy party often assembles specialists who look natural together on a character sheet: a warrior to hold the line, a rogue to work ahead unseen, a mage who knows what the sigil means, a priest who speaks for a temple, a ranger who reads the road, a bard who talks the party past the gate. That shorthand is useful for who does what, but it can become a set of separate games where one player rolls while the rest wait for their turn to matter.",
        "These are broad archetypes rather than required classes, and your game may give them different names or combine several into one character. The guidance below works whether you run Dungeons and Dragons, Pathfinder, Dragonbane, Shadowdark, Forbidden Lands, or another fantasy game that supports a mixed company. Avoid treating the list as a class roster to fill. Instead, ask for each role what it changes about scene design, how you keep the whole table in the conversation, and what pressure follows when the specialist succeeds, fails, or is absent.",
        "A consistent pattern from the specialist spotlight framework helps: specialist acts, situation changes, others respond, party decides, return to specialist. Keep the specialist competent, make the result change something the whole party can see and act on, and cut back to the shared scene whenever time, access, or risk changes for someone else.",
      ],
    },
    {
      kind: "list",
      heading: "What each role changes and how to run it",
      intro:
        "Treat each entry as a flexible function rather than a fixed assignment. For each role, note what it changes, a technique that keeps play shared, a pressure that keeps the decision interesting, a common failure mode, and where to read more:",
      items: [
        {
          term: "Warrior, Champion or Bodyguard",
          text: "Changes: what the group can hold, protect, endure or force through when violence or physical risk is present. Technique: give martial competence work outside repetitive combat. Let the warrior choose what to defend, what to hold long enough for others to act, who carries responsibility for a ward, or what endurance costs in time and resources. Frame fights around an objective the warrior secures, such as keeping a door open, shielding a ritual, or covering a withdrawal, so other roles have a reason to act inside the same scene. Pressure: a position that can be held but not without cost, a ward whose safety depends on staying close, a command decision that protects one group while exposing another, or fatigue and injury that will matter after the fight. Failure mode: every problem becomes another combat encounter where only damage matters, or the warrior has nothing to do when swords stay sheathed. Keep at least one martial choice visible in exploration, travel, or court scenes.",
        },
        {
          term: "Rogue, Scout or Infiltrator",
          text: "Changes: access, timing, and awareness of risk before the group commits. Technique: make stealth and scouting a team-supported operation rather than a solo mini-session. Resolve the approach in short beats and cut back whenever a door opens, a guard shifts, or an alarm changes what the group must do. Give the rest of the party ways to affect the infiltration by creating distraction, cover, or an extraction plan, and let their outcomes change the rogue's options. Pressure: a patrol that returns on a schedule, a disguise that requires someone else to vouch for it, or a find that forces a choice now rather than a report later. Failure mode: a long sequence of private checks where one player sneaks while everyone else waits to hear what was found. Deep dive: how to run spies and infiltrators in an RPG. Future deep dive: scouts and wilderness infiltrators where terrain and tracking add distinct pressures.",
        },
        {
          term: "Mage or Arcane scholar",
          text: "Changes: what the group knows an effect could do, and which otherwise impossible options exist. Technique: let magical expertise open options without making every mystery a spell check. Give the mage better questions, limits, and costs rather than a single answer that settles the scene. A reading might confirm a ward is old imperial work but not who maintains it, or a ritual could buy time at a price the party must decide to pay. Keep preparation, components, noise, or attention as visible costs the group can help with or plan around. Pressure: a spell that solves one problem while creating a new obligation, a source that degrades, or knowledge that conflicts with what a witness claims. Failure mode: magic bypasses the adventure so the rest of the party has no decision left, or every puzzle waits for the mage to roll. Separate observation from interpretation so the party still debates what to do. Future deep dive: mages whose magic bypasses adventure problems.",
        },
        {
          term: "Priest or Holy character",
          text: "Changes: which institutions, taboos, oaths, and sources of moral authority will answer, judge, or demand something from the group. Technique: make faith, doctrine, and standing consequential without scripting belief. Note what temple, order, or congregation the priest answers to, what they can claim in its name, and what they cannot compel. Let the priest's standing open doors and create obligations the group must weigh, such as sanctuary that requires a promise, or a rite that needs the party to protect a custom they may not share. Pressure: a superior who expects a report, a taboo the party must break to succeed, a community that will remember how the priest acted, or a rival interpretation of the same doctrine. Failure mode: faith becomes only flavour, or the priest is forced into a single moral position the player did not choose. Keep obligations and legitimacy visible so the group can decide together. Future deep dive: priests and holy characters where faith and institutions carry lasting consequences.",
        },
        {
          term: "Noble, Courtier or Envoy",
          text: "Changes: which audiences, terms, and commitments are available to the group. Technique: build negotiation around interests and commitments rather than a single persuasion roll. Note what each side actually needs, what they can offer, what they cannot concede, and what a promise will cost later. Let the envoy lead the exchange while other characters bring evidence the sage verified, security the scout arranged, or leverage the rogue uncovered. Pressure: a counterpart who answers to someone else, a protocol that makes a direct demand costly, or a deal that requires the party to stake reputation or hostages. Failure mode: one roll settles the whole exchange while the rest of the party watches, and success becomes an automatic agreement rather than an improved position. Deep dive: how to make a diplomat, noble or courtier useful without relying on one social roll.",
        },
        {
          term: "Ranger, Hunter or Guide",
          text: "Changes: what the group knows about the route, the quarry, and the terrain before it commits. Technique: make travel, tracking and terrain shape choices rather than bypassing wilderness play. Let the guide compare routes or camps by time, exposure, resources and what remains unseen, then bring that assessment back as an option the group must select. Treat forage, weather, and hazard as trade-offs to decide, not only rolls to clear. Pressure: a safe path that misses a narrow window, a rich site that requires splitting the party, or a track that suggests danger without confirming it. Failure mode: expertise negates the journey so the road adds nothing to decisions, or the guide scouts alone and reports back only after the important choice has passed. Future deep dive: scouts, rangers and wilderness specialists where travel and tracking carry distinct preparation.",
        },
        {
          term: "Bard, Face or Herald",
          text: "Changes: which version of events, reputation, or audience the group can reach. Technique: make social influence create leverage and consequences rather than reducing scenes to one roll. Give the bard an immediate stake such as a crowd already forming, a patron waiting to hear the tale, or a rival performer who will answer the same audience later. Let success improve position, create a new choice, or earn a specific commitment rather than mind control. Other characters can help by securing proof, handling the room, or deciding what promise the bard is authorised to make. Pressure: a reputation that travels ahead of the party, a performance that draws wanted attention, or a patron who will repeat what the bard said in front of a different court. Failure mode: one persuasion check replaces the whole social scene, and the rest of the party has no way to affect the outcome or its cost.",
        },
        {
          term: "Investigator, Sage or Lorekeeper",
          text: "Changes: how much uncertainty the group must carry into its next decision. Technique: reward expertise without making one character the sole gateway to clues or setting knowledge. Give the sage faster, safer, or more precise routes to essential information while leaving other routes open. Let the sage reduce uncertainty, clarify contradiction, or recall a precedent, then let the party decide what the finding means for its next move. Pressure: a source that conflicts with another, a text that is incomplete or contested, or a conclusion that requires someone to vouch for it publicly. Failure mode: only the sage can learn anything useful, so everyone else waits for the expert to explain the plot. Keep interpretation separate from discovery. Deep dive: how to run an investigator or detective without making other characters irrelevant. That guidance transfers directly to fantasy lore and clue scenes.",
        },
        {
          term: "Summoner, Necromancer or Pet-master",
          text: "Changes: how many bodies, actions, and responsibilities the group brings into a scene. Technique: manage extra bodies, spotlight and action economy without slowing every scene. Define what a bound creature or companion can do on its own, what requires the summoner's attention, and what cost continues after the scene such as upkeep, control, fear, or legitimacy. Resolve companion actions quickly and keep their fictional effect tied to what the rest of the party is doing right now. Give other characters reasons to help, such as protecting the summoner while they maintain control, or handling witnesses who saw the dead walk. Pressure: a summon that draws attention, a binding that weakens, a cost the community will notice, or a creature whose presence limits where the party can go next. Failure mode: each summoned extra becomes a full character that doubles one player's turn and leaves everyone else waiting through several sequential actions. Future deep dive: summoners and pet-heavy characters with practical action economy at the table.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep fantasy expertise distinct without splitting the party",
      paragraphs: [
        "Several characters may be able to answer the same practical question, but they do not need to do the same job. The mage might confirm a relic is ensorcelled while the priest recognises the rite that consecrated it, and the envoy knows which house would claim it. Let those contributions change the same audience, crossing, or delve rather than building a separate scene for each role.",
        "Cut between actions when new information, a cost, or a choice changes what someone else can do. If one character negotiates alone, keep the scene as long as it holds a decision or discovery, then return with information the group can act on. Brief private actions work when they end with a shared choice. Check with players about how they want secrets between characters, faith, command, and spotlight handled before using hidden knowledge or contested authority.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the sealed barrow on the Grey Moor",
      paragraphs: [
        "A company is hired to recover a charter sealed in a barrow on the Grey Moor before rival claimants close the road for winter. The moor is wet, the barrow is in disputed ground, a local temple claims jurisdiction over the dead, and a steward in the nearby market town will hear any claim the party brings back.",
      ],
      items: [
        {
          term: "The fragmented version",
          text: "The ranger scouts the moor alone for a long sequence while the rest wait for the road to be declared clear. The rogue then infiltrates the barrow by themselves while the party holds outside with no way to affect the delve. The mage alone reads the ward and resolves the seal as a spell check that settles the charter. The priest's temple standing never matters, the envoy waits for the town to begin any negotiation, the bard has no audience because reputation never crosses between moor and town, the sage learns everything only after the party has left the barrow, and the summoner's extra body adds a full extra turn to every exchange inside. Each specialist is competent, but their actions happen in sequence and do not change what anyone else is doing.",
        },
        {
          term: "The shared company version",
          text: "The ranger compares two approaches: the old causeway is fast but exposed to a patrol the rival claimants hired, while a peat track avoids the patrol but adds a night on the moor the charter may not allow. The rogue tests the barrow mouth, then needs the warrior to hold a lintel long enough for the mage to read the seal without being buried, which is where the mage clarifies the ward is old imperial work that can be quieted for a short window at a cost the group must name. The priest can claim sanctuary for the dead under local custom, but must promise the temple a report and accept that the binding they offer will be heard by the town steward as a commitment. The bard prepares how the claim will be told in the market so the envoy has something to stake in a meeting where the steward answers to the rival house, not only to protocol. The sage confirms the charter's wording conflicts with a writ the steward already holds, so the party must decide which to press. The summoner's bound guardian can brace the lintel, but its presence in town will draw the very attention the rogue was trying to avoid. The group chooses together, and the steward records what was promised.",
        },
        {
          term: "Why it works",
          text: "No role settles the barrow alone. The ranger frames the route, the rogue and warrior change what the mage can attempt, the mage and priest create options at a price, the sage, bard and envoy turn a charter into a claim an audience must judge, and the summoner's extra body creates a trade-off between safety now and legitimacy later. Each specialist changes the same crossing, delve, and hearing the whole table faces.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Prep checklist for a fantasy company session",
      intro:
        "Before play, check that each specialist present has a reason to be in the same scene as the rest of the company:",
      items: [
        "Every role that is present has one concrete way its success changes what the other players can do next, not only a separate encounter to clear.",
        "At least one martial, exploratory, or social outcome leaves a visible limit the group must plan around, such as a hold that cannot last, a route that costs the party a night on the moor, or a promise that will be heard again in town.",
        "Magical and scholarly knowledge reduces uncertainty but still leaves an interpretation or cost the party must debate.",
        "Negotiation or faith creates a commitment, record, or observer who will return to judge what was promised, ordained, or claimed.",
        "Travel, tracking, or delve work shapes the route and timing the group must choose, rather than just revealing map.",
        "Any summoned or bound extra has a clear upkeep, audience cost, or control need the party can see, and its actions resolve quickly without adding a full separate turn.",
        "You know what a failure or absence changes: cost, timing, exposure, certainty, or who now owes whom, rather than only whether a specialist succeeds.",
        "If a specialist must act alone, you have a clear purpose for the solo beat and a way to return with a decision the group can use while there is still time to act.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep oaths, routes, wards and claims connected",
    paragraphs: [
      "A fantasy company produces a web of patrons, temples, claims, roads and bindings that outlasts any single barrow or audience. That makes it useful to record who promised what to the steward, which ward the mage quieted and at what price, which moor track the ranger still leaves uncertain, and which guardian the summoner is responsible for, so you can see at a glance which roles contributed and what remains at risk next session.",
      "Codex Cryptica lets you keep those links in one place, from the barrow's seal state to the charter obligation the envoy staked, then bring them back to the table when the consequence arrives rather than relying on memory alone.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Roll a steward, rival claimant, or temple warden with a want and a relationship hook the envoy or priest can act on.",
      href: "/generators/npc",
    },
    {
      title: "Settlement generator",
      description:
        "Build a market town, barrow village, or court with trade, authority, and pressure already sketched in.",
      href: "/generators/settlement",
    },
    {
      title: "Faction generator",
      description:
        "Create the house, order, or guild whose charter terms, patrols, or inspections shape what each role can claim.",
      href: "/generators/faction",
    },
    {
      title: "Dungeon generator",
      description:
        "Turn the sealed barrow into a short delve with wards, hazards, and a find every role can contribute to.",
      href: "/generators/dungeon-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Fantasy Worldbuilding",
      description:
        "Organise courts, temples, roads, and delves in one connected workspace for a fantasy campaign.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "Codex Cryptica for Dungeons & Dragons",
      description:
        "Track parties, NPCs, and promises across a connected fantasy world with room for any system.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-i-give-specialist-characters-spotlight",
    "how-do-i-run-spies-and-infiltrators-in-an-rpg",
    "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
    "how-do-i-run-an-investigator-without-sidelining-the-party",
    "how-do-i-run-a-rogue-or-scout-without-splitting-the-party",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
    "how-do-you-create-a-magic-system",
    "how-do-you-create-a-believable-fictional-religion",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-i-run-character-roles-in-a-political-intrigue-rpg",
    "how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
    "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
  ],
  discovery: {
    id: "answer-fantasy-character-roles",
    parentCluster: "specialist-roles",
    clusters: ["specialist-roles", "fantasy-roles"],
    primaryIntent: "how to run common character roles in a fantasy rpg",
    intentAliases: [
      "fantasy rpg character roles",
      "how to gm fantasy characters",
      "fantasy rpg archetypes gm tips",
      "how to run different roles in dnd",
      "how to make each class useful in an rpg",
      "gm tips for rogues wizards clerics fighters",
      "how to give fantasy characters spotlight",
      "how to run fighter wizard rogue cleric dnd",
      "fantasy party roles guide for gms",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A genre-entry framework for nine fantasy archetypes that gives each one a scene-design change, a shared-play technique, a pressure, a failure mode, and deep-dive links, with a worked moor and barrow arrival and a company prep checklist.",
    relatedIntents: [
      "answer-specialist-character-spotlight",
      "answer-run-spies-infiltrators-rpg",
      "answer-run-diplomats-nobles-courtiers",
      "answer-run-investigator-without-sidelining-party",
      "answer-run-rogue-scout-without-splitting-party",
      "answer-travel-interesting",
      "answer-living-fantasy-city",
      "answer-create-magic-system",
      "answer-fictional-religion",
      "answer-run-factions-sandbox",
      "answer-run-character-roles-political-intrigue",
      "answer-sci-fi-character-roles",
      "answer-cyberpunk-party-roles",
      "for-fantasy-worldbuilding",
      "for-dungeons-and-dragons",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-specialist-character-spotlight",
        reason:
          "The spotlight answer gives reusable scene structures for any specialist across genres; this answer applies those structures to nine fantasy archetypes with genre-specific pressures and a company-level barrow and audience.",
      },
      {
        with: "answer-run-spies-infiltrators-rpg",
        reason:
          "This company answer summarises what a rogue or infiltrator contributes inside a shared fantasy scene; the spy answer is the focused procedure for running infiltration without leaving the rest of the party idle.",
      },
      {
        with: "answer-run-diplomats-nobles-courtiers",
        reason:
          "This company answer summarises what a noble, courtier or envoy contributes to fantasy commitments; the diplomat answer is the focused procedure for building negotiations around interests and trade-offs.",
      },
      {
        with: "answer-run-investigator-without-sidelining-party",
        reason:
          "The investigator answer focuses on clue access, interpretation, and shared decisions around a detective character; this page applies shared-scene techniques across a fantasy company's mage, sage, priest, ranger, envoy, rogue and summoner roles.",
      },
      {
        with: "answer-run-rogue-scout-without-splitting-party",
        reason:
          "The rogue or scout answer is the detailed method for team-supported infiltration and scouting; this company answer places that method inside a wider set of fantasy roles and pressures.",
      },
      {
        with: "answer-sci-fi-character-roles",
        reason:
          "The sci-fi crew answer situates specialists inside starship operations, travel, and station-scale commitments; this answer situates specialists inside fantasy travel, delve, court, temple and wilderness play.",
      },
      {
        with: "answer-cyberpunk-party-roles",
        reason:
          "The cyberpunk roles page situates specialists inside a shared physical job in a street-level crew; this answer situates specialists inside fantasy courts, roads, barrows and faction obligations.",
      },
      {
        with: "answer-run-character-roles-political-intrigue",
        reason:
          "The political roles page covers overlapping archetypes such as envoy and courtier inside faction play; this page covers the same roles as they function inside fantasy travel, dungeon, and temple scenes as well.",
      },
    ],
  },
  seo: {
    title: "How do I run fantasy character roles? GM guide | Codex Cryptica",
    description:
      "GM guidance for nine fantasy roles: warrior, rogue, mage, priest, noble, ranger, bard, sage and summoner, with shared-scene techniques and a worked barrow example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-common-character-roles-in-a-fantasy-rpg.jpg",
    imageAlt:
      "A fantasy adventuring company of warrior, rogue, mage, priest, ranger and bard gathered at the sealed entrance of a misty moorland barrow",
  },
};
