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
      "Compare effective actions per round, not Challenge Rating (CR) or level alone. A turn is not the same as the attacks and abilities resolved inside it: a creature with several attacks can miss one and still threaten the party in the same turn, whilst a creature that loses its whole turn loses everything it would have done that round. A single powerful enemy can be controlled or focus-fired before it acts often enough; a group of weaker enemies gets more turns and more chances to concentrate on one character. Start from your system's own encounter-building rules for the edition you run, then compare effective actions, likely damage per round and how many rounds each side is likely to remain in the fight.",
    sections: [
      {
        kind: "prose",
        heading: "What action economy counts",
        paragraphs: [
          "Action economy is the number of useful things each side can do in a round. Keep three levels separate. A turn is one combatant's slot in the initiative order. An action is one of the choices made in that turn, such as attacking, casting or dashing, plus a bonus action or reaction where the rules allow them. An attack is a single roll resolved inside an action: an action that grants several attacks can partly fail and still partly succeed. Losing one attack reduces that turn's output. Losing an action removes one choice but may leave movement, a bonus action or a reaction. Losing a turn removes all of them for that round.",
          "That distinction changes how you judge both sides. Several attacks, an area ability, a reaction and any off-turn or legendary actions a creature's rules grant can raise its output and make it more reliable without giving it another turn. They do not help if the creature never gets to act, and an off-turn ability that triggers rarely is worth less than its best case suggests. Count an action as effective only if it can change the fight in the positions on the table: reach a target, impose a condition, protect an objective, or force the other side to spend an action in reply. Ten attacks that cannot hit or cannot reach anyone are not ten effective actions.",
        ],
      },
      {
        kind: "list",
        heading: "One powerful enemy against the party",
        intro:
          "A solo enemy concentrates its threat in one body. That shape has a clear strength and a predictable weakness:",
        items: [
          {
            term: "What a lost turn costs it",
            text: "Against three player characters (PCs), the enemy acts once while the party acts three times. If control removes its turn, the party gets a full extra round against it and it deals no damage that round. A missed attack inside a multiattack turn is a smaller loss: the other attacks in that turn still resolve.",
          },
          {
            term: "Focus fire and control land on one target",
            text: "Every PC can aim at the same creature, and there is nowhere for damage or conditions to spread. High hit points (HP) extend how long it can stay in the fight, but they do not replace a turn it never takes.",
          },
          {
            term: "How its damage is packaged matters",
            text: "One design gives the solo enemy a single heavy hit. That version is swingy: a miss does nothing and a critical hit can drop a character at once. A different design spreads similar total damage across several smaller attacks or an area ability. That version is steadier, can threaten more than one character, and keeps some output when one attack misses. Neither follows automatically from being a solo enemy, so judge the stat block you have, not the label.",
          },
          {
            term: "Initiative and the first round matter more",
            text: "If the party acts first and can deal heavy damage or land control before the enemy moves, the encounter may be decided early. Note where the enemy starts, whether it can be reached or targeted in round one, and what it can still do if it begins the fight restrained, prone or out of position.",
          },
          {
            term: "Ways to give a solo enemy a fair share of the fight",
            text: "Use only what your system actually allows: support creatures that draw fire and act on their own turns, a second objective the party must attend to, terrain that stops the whole party reaching the enemy at once, or defensive features and extra off-turn actions written into that creature's rules. Adding support changes this into the elite and support composition below, which is often the honest fix.",
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
            text: "Eight weak enemies get eight turns. Several can aim at the same PC, surround a character to cut off retreat, or keep acting after one or two of them fall. Losing one member costs the group one turn out of eight, so its threat degrades gradually rather than vanishing in one round.",
          },
          {
            term: "Concentrated attacks add up",
            text: "Judge the group by a round of its attacks against one target, not by one attack in isolation. The worked example below does that sum for a specific character, because a foe that looks harmless alone may not be harmless as the fourth attacker.",
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
          "Composition matters as much as headcount. A party of three with an area spell, strong healing and a character who can hold a doorway handles a group differently from three single-target strikers with no healing. List what this party can actually do before you adjust any numbers: who can hit several enemies at once, who can stop an enemy acting, who can restore HP or remove a condition, and who is in trouble if several enemies choose them at once. For the wider question of signalling danger and avoiding a total party kill (TPK), see the related answer on balancing encounters without a TPK.",
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
            "One lost turn removes all of its output for that round; concentrated damage and control land on a single body",
            "Check what happens if it loses its first turn; add support, a second objective, or off-turn actions only where the rules provide them",
          ],
          [
            "Elite enemy with supporting creatures",
            "In the worked example below, three enemy turns face three party turns and the party must split attention between the doorway and the gate",
            "The party may ignore the support and focus on the elite, or the support may overwhelm a small party while the elite acts",
            "Give each support creature a job the party cannot ignore, such as holding a route or working the gate; keep each one simple to run",
          ],
          [
            "Group of weaker enemies",
            "Many turns and positions; threat falls gradually as members are removed; morale gives a natural end point",
            "Attacks concentrated on one character can drop them quickly; many turns can slow play; one area effect can remove much of the group",
            "Spread starting positions, set a morale point, group initiative for similar foes, and check the combined damage against one PC",
          ],
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: three level 6 characters, three ways to build the fight",
        paragraphs: [
          "A Game Master (GM) runs three level 6 player characters in Dungeons and Dragons (D&D): a fighter who can hold a doorway, a wizard with one area spell prepared, and a cleric who can heal. The comparison below holds the enemy side roughly constant so the composition is what changes: each option has about 102 HP in total and, if every enemy attacks the fighter, about 13 to 14 expected damage per round before the party interferes. Expected damage means hit chance multiplied by average damage on a hit. The stat blocks are invented to make the arithmetic visible. They are not an official encounter calculation and they do not establish that the three options have equal XP budgets. For an official budget, use the encounter-building rules for the edition on your table: the 2014 Dungeon Master's Guide builds from per-character experience point (XP) thresholds with a multiplier for monster numbers, whilst the 2024 rules use a per-character XP budget with Low, Moderate and High difficulty bands and no number multiplier. The two methods are not interchangeable, so do not carry a total from one into the other.",
          "Party figures used throughout: fighter 52 HP, Armour Class (AC) 18, attack bonus +7, two attacks per Attack action for 1d8 + 4 each (average 8.5 per hit). Cleric 45 HP, AC 16, attack bonus +6, one attack for 1d8 + 3 (average 7.5). Wizard 32 HP, AC 13, attack bonus +7, one bolt for 2d10 (average 11). Against AC 14 the party's expected damage is about 24.5 per round if all three attack the same target: fighter 11.9, cleric 4.9, wizard 7.7. Against AC 15 it is about 22.7, and against AC 13 about 26.3. At 24.5 per round, a 102 HP pool lasts about four rounds (102 divided by 24.5 is 4.2) if the party can keep attacking it.",
        ],
        items: [
          {
            term: "Option A: one strong enemy alone (HP 102, AC 14)",
            text: "The enemy has one turn with two attacks at +7 for 2d8 + 4 each (average 13 per hit). Against the fighter at AC 18 it needs 11 or more on the die, a 50 per cent chance per attack, so its expected damage is 2 x 0.5 x 13 = 13 per round. At that rate it needs about four rounds of hitting the fighter to drop them (52 divided by 13), which is roughly as long as the party needs to drop it. The fight is therefore a race between two similar clocks, decided by who loses time. If a control effect that can legally affect this creature in your edition succeeds and costs it a turn, it does not lose one of its two attacks: it loses both, plus its movement, and takes another 24.5 expected damage before it can reply. Its remaining HP falls to about 77 and it now has roughly three turns left instead of four, whilst the party has taken no damage in that round. If instead it merely misses one attack, it still resolves the other and deals about 6.5 expected damage that turn. Check both cases before you run a solo enemy, and rebuild it as option B if losing one turn makes the whole encounter collapse.",
          },
          {
            term: "Option B: an elite with two supporting creatures (HP 60 + 21 + 21, AC 15 and 13)",
            text: "The enemy side now has three turns. The elite stands in the doorway with one support creature beside it. The second support creature works a winch at the gate the party needs to open, far enough away that it is not standing with the doorway pair. The elite makes two attacks at +6 for 1d10 + 4 each (average 9.5). Against the fighter it needs 12 or more, a 45 per cent chance, for 2 x 0.45 x 9.5 = 8.6 expected damage. Each support creature makes one attack at +5 for 1d6 + 3 (average 6.5), needs 13 or more against the fighter, a 40 per cent chance, for 2.6 expected damage. If all three could reach the fighter they would deal about 13.8 per round, close to option A, but they start split between the doorway and the gate, so the party chooses who to engage first. If the party focuses on the elite at AC 15, it deals about 22.7 per round and drops the elite's 60 HP in about three rounds, during which the gate support creature keeps working unless someone spends actions to stop it. If the same control effect used in option A lands on the elite and costs it a turn, the enemy side still acts: the two support creatures can deal about 5.2 expected damage between them, and the gate still gets worked. Losing the elite hurts this composition badly, but it does not reduce its round to zero.",
          },
          {
            term: "Option C: eight weaker enemies (HP 13 each, AC 13)",
            text: "The enemy side has eight turns. Each enemy makes one attack at +4 for 1d6 + 2 (average 5.5). Four of them can reach the cleric at AC 16 in round one, where each needs 12 or more, a 45 per cent chance, for 2.5 expected damage. Together that is about 9.9 expected damage, so the cleric's 45 HP falls to about 35 after one focused round and to about 15 after three if nobody heals, moves them or removes attackers. No single hit is dramatic. The total is the threat, and it arrives even if one or two enemies miss. Casualties degrade it gradually: each enemy the party drops removes one turn and about 2.5 of that expected damage against the cleric. The wizard's area spell cuts the other way. If it deals an average of 28 damage, or 14 on a successful save, either result exceeds 13 HP, so every enemy it catches is likely to fall and its turn goes with it. Catching three enemies reduces eight enemy turns to five at once, which no single-target attack in this party can do. Set a morale point before initiative, such as a check when four enemies are down, and spread the starting positions so the area spell cannot catch all eight at once.",
          },
          {
            term: "What the comparison shows",
            text: "All three options start with similar HP and similar damage if left alone, and all three last about four rounds against this party's focused damage. They differ in how they lose output. Option A loses everything for a round when it loses its turn and nothing else when it misses one attack. Option B loses about three fifths of its damage when the elite loses a turn (8.6 out of 13.8) and keeps the rest, plus a separate objective at the gate. Option C loses about an eighth of its turns each time one member falls, but can lose several turns to one area effect. Pick the shape whose way of failing produces the fight you want, then check that pick against your edition's budget before you run it.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Encounter-design checklist",
        intro: "Work through these before initiative:",
        items: [
          "Start from the encounter-building rules for your system and edition, and note which method you used if you write the encounter down for later.",
          "List turns per round for each side, then list the attacks, area abilities, reactions and off-turn actions inside those turns, and note what each one can reach.",
          "For the target each enemy is likely to choose, multiply hit chance by average damage on a hit and add the round up. Do this for several weak enemies aiming at one character as well as for a single powerful enemy.",
          "Divide each side's HP by the other side's expected damage per round to estimate how many rounds it lasts. Repeat the estimate with one turn removed by control, one character down, and one group member removed, and note which composition changes most.",
          "List the party's area attacks, control effects, healing and ways to remove conditions, and check whether one composition removes the only copy of something the party needs.",
          "Note terrain, starting positions and any objective besides defeating every enemy. Set a morale point or another way for the fight to end, plus an escape route the party can use if it goes badly.",
        ],
      },
      {
        kind: "list",
        heading: "Common mistakes",
        items: [
          {
            term: "Raising CR until a solo enemy feels strong enough",
            text: "A higher CR usually raises damage and defences on the same single turn. It does not change how much of the encounter disappears when that turn is lost. Fix the turn count or the situation before you fix the statistics.",
          },
          {
            term: "Treating the budget as a guarantee",
            text: "An encounter budget estimates statistical weight for an average party in an average position. It does not know that your wizard has one area spell left, that the fighter starts the fight already hurt, or that the enemy begins surrounded. Use the budget to shortlist, then run the action, damage and survival checks in the checklist above. For memorable boss fights as campaign payoffs, rather than balance alone, see the related answer on making a boss fight memorable.",
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
