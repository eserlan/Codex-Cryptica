import type { AnswerConfigInput } from "../schema";

export const howDoIBalanceOnePowerfulEnemyAgainstManyWeakerEnemies: AnswerConfigInput =
  {
    slug: "how-do-i-balance-one-powerful-enemy-against-many-weaker-enemies",
    category: "adventure-design",
    publishedAt: "2026-10-30",
    question:
      "How do I balance one powerful enemy against many weaker enemies in a tabletop RPG?",
    kind: "comparison",
    shortAnswer:
      "Compare effective actions per round, not Challenge Rating (CR) or level alone. A single powerful enemy may have strong statistics but only one turn against three or more player character turns, so it can be controlled, surrounded or defeated before it acts enough times to matter. A group of weaker enemies gets many turns, more chances to concentrate attacks on one character, and more chances for one effect to land. Start from your system's own encounter-building rules for the edition you run, then compare how many meaningful actions each side gets, how much damage each side is likely to deal in a round, and how long each side is likely to stay in the fight.",
    sections: [
      {
        kind: "prose",
        heading: "What action economy counts",
        paragraphs: [
          "Action economy is the number of useful things each side can do in a round. In many games each combatant gets a turn with movement and one main action, plus smaller options such as a bonus action or a reaction where the rules allow them. Some powerful creatures also get off-turn or legendary actions. Those extra actions matter, but only count an action as effective if it can change the fight: deal damage to a reachable target, impose a condition, move an ally out of danger, protect an objective, or force the other side to spend its own action in reply.",
          "Ten weak attacks that cannot hit, cannot reach anyone, or all land after the fight is decided are not ten effective actions. One strong attack that a character can reliably resist, avoid or undo may be less threatening than its damage number suggests. Count what each side can actually do to the targets in front of it, in the positions on the table, with the resources it has left. That count, set against likely damage and staying power, explains most of the difference between a solo enemy and a group.",
        ],
      },
      {
        kind: "list",
        heading: "One powerful enemy against the party",
        intro:
          "A solo enemy concentrates its threat in one body and one turn. That shape has clear strengths and a predictable weakness:",
        items: [
          {
            term: "One turn against several",
            text: "Three player characters (PCs) get three turns for every one turn the enemy gets. If each PC can attack, cast, grapple, shove, hide or help, the party can try several different answers before the enemy acts again. A failed roll costs the party one of several attempts. A failed roll, a lost turn or a wasted action costs the solo enemy its whole round.",
          },
          {
            term: "Focus fire and control land on one target",
            text: "Every PC can aim at the same creature, and there is nowhere for damage or conditions to be spread. A single failed saving throw against a disabling effect can remove the enemy's next turn, and with it a large share of the encounter's threat. High hit points (HP) do not fix a lost turn.",
          },
          {
            term: "Damage arrives in swings",
            text: "To threaten several PCs with one turn, a solo enemy often needs high damage on each hit. That makes the fight swingy: a miss feels flat, a critical hit can drop a character before the party has had a chance to respond. The risk is sharper for a small party, where one character down removes a third of the party's actions.",
          },
          {
            term: "Initiative and the first round matter more",
            text: "If the party acts first and can deal heavy damage or land control before the enemy moves, the encounter may end as a contest. Note where the enemy starts, whether it can be reached or targeted in round one, and what it can still do if it begins the fight restrained, prone or out of position.",
          },
          {
            term: "Ways to give a solo enemy a fair share of the fight",
            text: "Use only what your system actually allows: support creatures that draw fire and act on their own turns, a second objective the party must attend to, terrain that stops the whole party reaching the enemy at once, or defensive features and extra off-turn actions written into that creature's rules. Adding a support creature changes the question from a pure solo fight to the elite and support composition below, which is often the honest fix.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Many weaker opponents against the party",
        intro:
          "A group spreads its threat across several bodies and turns. Individually weak enemies can still be dangerous together:",
        items: [
          {
            term: "Many turns, many chances",
            text: "Eight weak enemies get eight turns. Even if each attack is modest, several can aim at the same PC, surround a character to cut off retreat, or keep acting after one or two of them fall. Losing one member costs the group a fraction of its actions, not the whole round.",
          },
          {
            term: "Concentrated attacks add up",
            text: "Judge the group by what a round of its attacks does to one target, not by one attack in isolation. If four enemies can reach the same character, work out how many are likely to hit against that character's defence and what the combined damage does to their HP. A foe that looks harmless alone may not be harmless as the fourth attacker.",
          },
          {
            term: "Area attacks and control cut the other way",
            text: "Grouped enemies are exposed to area of effect (AoE) spells and abilities, sweeping attacks and effects that frighten or hold several targets at once. One good area roll can remove several enemy turns at once. Spread the group out, use cover, or accept that exposure as the price of numbers, and tell the players what they can see about the group's formation.",
          },
          {
            term: "Morale and objectives keep numbers honest",
            text: "Ordinary opponents rarely fight to the last member. Set a visible point where they check, fall back, surrender or flee: after their leader falls, after half of them are down, or when the thing they were guarding is gone. That gives the party a way to end the fight by changing the situation, not only by removing every HP pool.",
          },
          {
            term: "Bookkeeping is a real cost",
            text: "Every separate enemy adds initiative, movement, target choice and HP tracking. If the group is large, share an initiative count for similar enemies, use average damage where your system permits it, or combine similar foes into one squad, as described in the related answer on combining enemies into a squad. Simplification should keep each enemy's position and losses clear enough for player choices to matter.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Why party size matters",
        paragraphs: [
          "The same enemy group is a different encounter against three PCs than against five. Three characters bring fewer actions per round, fewer spells and abilities in reserve, and less cover when one character is down, controlled or out of position. Losing one PC's turn removes about a third of the party's round. Against five PCs it removes about a fifth, and another character is more likely to have the healing, control or movement needed to answer the problem.",
          "Composition matters as much as headcount. A party of three with an area spell, strong healing and a character who can hold a doorway handles a horde differently from three single-target strikers with no healing. Before you adjust any numbers, list what this party can actually do: who can hit several enemies at once, who can stop an enemy acting, who can restore HP or remove a condition, and who falls over if four enemies choose them at once. Balance for the party in front of you, using the general guidance on avoiding a total party kill (TPK) in the related answer on encounter balance.",
        ],
      },
      {
        kind: "table",
        heading: "Three compositions at a glance",
        headers: ["Composition", "Strengths", "Main risk", "GM adjustment"],
        rows: [
          [
            "One powerful enemy",
            "One clear threat the players can read and plan against; little bookkeeping",
            "Party gets several turns to one, so control or concentrated damage can end it early; single hits may need to be heavy and swingy",
            "Add support, a second objective, or off-turn actions only where the rules provide them; check what happens if it loses its first turn",
          ],
          [
            "Elite enemy with supporting creatures",
            "Enemy turns roughly match party turns; party must choose between the elite, its support and the objective",
            "Support can be ignored and the elite still focus-fired, or the support can overwhelm a small party while the elite acts",
            "Give support a job the party cannot ignore, such as guarding, healing or holding a route; keep each support creature simple to run",
          ],
          [
            "Group of weaker enemies",
            "Many turns and positions; threat degrades gradually as members fall; morale gives a natural end point",
            "Concentrated attacks can drop one character quickly; many turns can slow play; one area effect can remove much of the group",
            "Spread starting positions, set a morale point, group initiative for similar foes, and check the combined damage against one PC",
          ],
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: three level 6 characters, three ways to build the fight",
        paragraphs: [
          "A Game Master (GM) runs three level 6 player characters in Dungeons and Dragons (D&D) and wants a hard fight in a courtyard. The party has a fighter who can hold a doorway, a wizard with one area spell prepared, and a cleric who can heal. The numbers below are an illustrative reasoning exercise, not an official encounter calculation. For an official budget, use the encounter-building rules for the edition on your table: the 2014 Dungeon Master's Guide builds from per-character experience point (XP) thresholds with a multiplier for monster numbers, whilst the 2024 rules use a per-character XP budget with Low, Moderate and High difficulty bands and no number multiplier. The two methods are not interchangeable, so do not carry a total from one into the other.",
        ],
        items: [
          {
            term: "Count the party first",
            text: "The party gets three turns per round. If the fighter is dropped or the wizard is held, the party loses a third of its actions and possibly its only area spell or its only way to hold the doorway. Any composition that can remove one PC's turn early is more dangerous to this party than the same composition against five characters.",
          },
          {
            term: "Option A: one strong enemy alone",
            text: "The enemy gets one turn to the party's three. Suppose round one runs like this: the fighter rolls 14 + 7 = 21 against Armour Class (AC) 16 and hits for 11 damage; the cleric hits for 8; the wizard casts a disabling spell and the enemy fails its saving throw, so it loses its next turn. No rule has been broken and no roll was extreme, yet the enemy has taken 19 damage and a full round of party actions before it has acted once. Before using this composition, decide what the enemy can still do if it loses a turn, whether support or terrain stops all three PCs reaching it at once, and whether its single hit is so heavy that one lucky roll drops a level 6 character outright. If the honest answers are nothing, nothing, and yes, rebuild it as option B rather than adding more HP.",
          },
          {
            term: "Option B: an elite enemy with two supporting creatures",
            text: "The enemy side now gets three turns, matching the party. The elite threatens the fighter at the doorway, one support creature moves to cut off the wizard, and the second guards the gate the party needs to reach. The party must choose: concentrate on the elite and leave the wizard exposed, spend the wizard's area spell on support creatures bunched at the gate, or take the gate and accept the elite acting unchecked for a round. Each choice costs something the players can see. Keep the support creatures to one clear action each so three enemy turns do not become three long GM turns.",
          },
          {
            term: "Option C: eight weaker enemies",
            text: "The enemy side gets eight turns. Individually each enemy is a minor threat, but four of them can reach the cleric in round one. If two of those four hit for 6 damage each, the cleric takes 12 damage from enemies the budget treated as minor, and the party's healing is now under pressure from turn one. Set against that, the wizard's one area spell can catch several of them if they bunch up, and the GM sets a morale point in advance: the group checks when its leader falls or when four of them are down, and flees towards the gate on a failure. Spread their starting positions so the area spell is a good choice rather than an automatic answer, and run similar enemies on one initiative count to keep eight turns brief.",
          },
          {
            term: "What the comparison shows",
            text: "No option is correct by CR alone. Option A risks a short, swingy fight decided by one saving throw. Option B gives both sides a similar number of turns and forces a choice of targets. Option C pressures one character at a time and rewards area spells and morale, at the cost of more bookkeeping. Pick the shape that tests what this party is good at without removing the one ability it cannot do without, then check the choice against your edition's budget before you run it.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Encounter-design checklist",
        intro: "Work through these before initiative:",
        items: [
          "Start from the encounter-building rules for your system and edition, and note which method you used if you write the encounter down for later.",
          "Count effective actions per round on each side, including reactions and any off-turn actions the rules actually grant, and note what each action can reach.",
          "Estimate a typical round of damage from each side against the targets it is likely to choose, including several weak enemies concentrating on one character.",
          "Estimate how many rounds each side is likely to stay in the fight if the other side concentrates on it, and what changes if one character or enemy loses a turn.",
          "List the party's area attacks, control effects, healing and ways to remove conditions, and check whether one composition removes the only copy of something the party needs.",
          "Note terrain, starting positions and any objective besides defeating every enemy, and whether the party can retreat, negotiate or win another way.",
          "Set pressure you can adjust honestly during play: a morale point, conditional reinforcements, or an objective that ends the fight, plus an escape route if the fight goes badly.",
          "If the enemy count is slowing play, group initiative for similar enemies or combine them into a squad before you add more creatures.",
        ],
      },
      {
        kind: "list",
        heading: "Common mistakes",
        items: [
          {
            term: "Raising CR until a solo enemy feels strong enough",
            text: "A higher CR usually means heavier damage and tougher defences on the same one turn. It does not give the enemy more turns, and it can make the one hit it lands heavy enough to drop a character in a small party. Fix the action count or the situation before you fix the statistics.",
          },
          {
            term: "Treating each weak enemy as negligible",
            text: "One weak attack is minor. A round of weak attacks aimed at the same character, plus the movement to surround them and the turns that keep coming after the first enemy falls, is the actual threat. Add the round up before you dismiss it.",
          },
          {
            term: "Filling the field until turns drag",
            text: "A horde that takes longer to run than the party's own turns tests patience rather than judgement. Group initiative, average damage, simpler enemy actions or a squad abstraction keep the pressure without the wait, as covered in the related answer on making combat faster.",
          },
          {
            term: "Giving a boss extra attacks without checking the damage",
            text: "Extra actions answer the action count, but each added attack is also added damage aimed wherever you choose. Work out the new round of damage against one character before you add the attack, especially against a party of three.",
          },
          {
            term: "Treating the budget as a guarantee",
            text: "An encounter budget estimates statistical weight. It does not know that your wizard has one area spell left, that the fighter starts the fight already hurt, or that the enemy begins surrounded. Use the budget to shortlist, then run the action, damage and survival checks in the checklist above. For memorable boss fights as campaign payoffs, rather than balance alone, see the related answer on making a boss fight memorable.",
          },
        ],
      },
    ],
    codexConnection: {
      heading: "Keeping the encounter and its parts together",
      paragraphs: [
        "Codex Cryptica does not calculate CR, XP budgets or official encounter difficulty for any system, and it will not tell you whether one strong enemy balances against a group for three level 6 characters. What it does hold is the encounter as connected campaign material: the elite enemy, its supporting creatures, the location and the faction that sent them, each on its own page and linked to the others.",
        "That helps with the parts of this answer that happen away from the dice. Draft the participants with the encounter generator, give the elite a creature page with its motives and off-turn abilities where your system grants them, and record the morale point, objective and escape route alongside the encounter, so the reasoning you did in the checklist is still there when the fight reaches the table three sessions later.",
      ],
      linkText: "Try the encounter generator",
      href: "/generators/encounter",
    },
    relatedTools: [
      {
        title: "Encounter generator",
        description:
          "Draft the elite, its support and the objective for a scene, then apply your system's budget and the action count check yourself.",
        href: "/generators/encounter",
      },
      {
        title: "Creature generator",
        description:
          "Give the powerful enemy an identity, motive and weakness worth planning a fight around, rather than statistics alone.",
        href: "/generators/creature",
      },
    ],
    relatedAnswers: [
      "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
      "how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
      "how-do-i-combine-multiple-enemies-into-one-squad-in-an-rpg",
      "how-do-i-make-combat-faster-without-making-it-less-exciting",
      "how-do-i-track-monsters-initiative-and-hit-points-in-dnd-combat",
    ],
    discovery: {
      id: "answer-balance-one-powerful-vs-many-weaker",
      parentCluster: "encounter-balance",
      clusters: ["encounter-balance", "adventure-design"],
      primaryIntent:
        "how to balance one powerful enemy against many weaker enemies in a tabletop rpg",
      intentAliases: [
        "action economy rpg encounter balance",
        "solo boss vs party",
        "one strong monster vs many weak monsters",
        "how many enemies for a small dnd party",
        "balancing hordes in dnd",
        "one powerful enemy against many weaker enemies",
        "how to balance a solo enemy against a party",
      ],
      uniqueValue:
        "Compares one powerful enemy, an elite with support, and a group of weaker enemies by effective actions per round, concentrated damage, control, morale and survivability. Works the comparison for three level 6 D&D characters and separates system-neutral reasoning from the 2014 and 2024 D&D budget methods.",
      userJob: "evaluate",
      relatedIntents: [
        "answer-encounter-balance",
        "answer-how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
        "answer-combine-enemies-into-squad",
        "answer-faster-exciting-combat",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-encounter-balance",
          reason:
            "Encounter balance covers broad difficulty, fairness, signalling danger and avoiding a total party kill; this page covers the narrower choice between one powerful enemy, an elite with support, and many weaker enemies, using effective action economy as the comparison.",
        },
        {
          with: "answer-how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
          reason:
            "The boss fight answer covers dramatic payoff, campaign connections and phase changes; this page covers whether a single powerful enemy gets enough effective actions to function against a party at all.",
        },
        {
          with: "answer-combine-enemies-into-squad",
          reason:
            "The squad answer covers mechanically combining several similar enemies into one tracked unit; this page covers choosing between enemy compositions and only points to squads as one way to reduce bookkeeping for a large group.",
        },
      ],
    },
    seo: {
      title: "One powerful enemy vs many weaker enemies | Codex Cryptica",
      description:
        "Compare effective actions, not just CR: solo enemies, elite plus support and hordes for a small party, with a worked example for three level 6 characters.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-balance-one-powerful-enemy-against-many-weaker-enemies.jpg",
      imageAlt:
        "Three adventurers in a torchlit castle courtyard between one towering armoured giant and a group of smaller raiders closing in",
    },
  };
