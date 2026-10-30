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
      "Compare effective actions per round, not Challenge Rating (CR) or level alone. A single powerful enemy concentrates its threat in one body, so the party can focus damage and disabling effects on it. Weaker enemies spread the same threat across more turns and positions. Start from your system's own encounter-building rules for the edition you run, then compare what each side can actually do from its starting positions, likely damage against the targets it can reach, and how its output changes as bodies fall or effects land.",
    sections: [
      {
        kind: "prose",
        heading: "What action economy counts",
        paragraphs: [
          "Action economy is the number of useful things each side can do in a round. Keep three levels separate. A turn is one combatant's slot in the initiative order. An action is one choice made in that turn, such as attacking, casting or dashing. An attack is a single roll resolved inside an action, so an action that grants several attacks can partly fail and still partly succeed.",
          "When judging a disabling effect, read its own wording rather than assuming it removes a whole turn. Note exactly which attacks or other actions it prevents, whether it also stops movement, bonus actions, reactions or off-turn abilities, and when it ends. Count an action as effective only if it can change the fight from the positions on the table: reach a target, impose a condition, protect an objective, or force the other side to spend an action in reply. Ten attacks that cannot reach anyone are not ten effective actions.",
        ],
      },
      {
        kind: "list",
        heading: "One powerful enemy against the party",
        intro:
          "A solo enemy concentrates its threat in one body. That shape has a clear strength and a predictable weakness:",
        items: [
          {
            term: "One activation carries the whole threat",
            text: "Against three player characters (PCs), the enemy has one activation while the party has three. The worked example below shows what happens in the round a stipulated effect prevents both of its attacks, and what the party paid to impose it.",
          },
          {
            term: "Focus fire and control land on one target",
            text: "Every PC can aim at the same creature, and there is nowhere for damage or conditions to spread. High hit points (HP) keep it in the fight longer, but they do not restore an activation in which it could not attack.",
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
          "The same enemy group is a different encounter against three PCs than against five. Three characters bring fewer actions per round, fewer spells and abilities in reserve, and less cover when one character is down, controlled or out of position. One PC unable to act removes about a third of the party's round. Against five PCs it removes about a fifth, and another character is more likely to have the healing, control or movement needed to answer the problem.",
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
            "Concentrated damage and control land on a single body, so one prevented activation can leave a round with no enemy attacks",
            "Check a round in which an effect prevents its attacks; add support, a second objective, or off-turn actions only where the rules provide them",
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
          "A Game Master (GM) runs three level 6 player characters in Dungeons and Dragons (D&D): a fighter who can hold a doorway, a wizard with one area spell and one disabling effect prepared, and a cleric who can heal. Each option has about 102 HP in total. That matched total, and the damage figures for named attackers against a named target, are opening-round baselines chosen to isolate composition. They are not a prediction that the three fights last the same number of rounds, and they do not establish equal experience point (XP) budgets. The stat blocks are invented to make the arithmetic visible. For an official budget, use the encounter-building rules for the edition on your table: the 2014 Dungeon Master's Guide builds from per-character XP thresholds with a multiplier for monster numbers, whilst the 2024 rules use a per-character XP budget with Low, Moderate and High difficulty bands and no number multiplier. The two methods are not interchangeable, so do not carry a total from one into the other.",
          "Party figures used throughout: fighter 52 HP, Armour Class (AC) 18, attack bonus +7, two attacks per Attack action for 1d8 + 4 each (average 8.5 per hit). Cleric 45 HP, AC 16, attack bonus +6, one attack for 1d8 + 3 (average 7.5). Wizard 32 HP, AC 13, attack bonus +7, one bolt for 2d10 (average 11). Expected damage here means hit chance multiplied by average damage on a hit. These quick estimates ignore the extra dice on a critical hit and any riders, so use them to compare shapes, not as complete damage formulae. Against AC 14 the party's expected damage is about 24.5 per round if all three attack the same target: fighter 11.9, cleric 4.9, wizard 7.7. Against AC 15 it is about 22.7, and against AC 13 about 26.3. Dividing one body's HP by damage aimed at that body gives only a rough, uninterrupted single-target estimate, for example how long one creature might stand if the party keeps hitting it and nothing intervenes.",
        ],
        items: [
          {
            term: "Option A: one strong enemy alone (HP 102, AC 14)",
            text: "The enemy has two attacks at +7 for 2d8 + 4 each (average 13 per hit). Against the fighter at AC 18 it needs 11 or more on the die, a 50 per cent chance per attack, so its baseline is 2 x 0.5 x 13 = 13 expected damage per round. Now run one round. The wizard spends their action on a stipulated disabling effect which, on a failed save, prevents this enemy from making attacks on its next activation. This example assumes nothing wider: it does not say the effect stops movement, bonus actions, reactions or any off-turn ability, because the actual effect would have to say so. The fighter and cleric attack for 11.9 + 4.9 = 16.8 expected damage. The wizard deals no bolt damage that round, because the casting was their action. The enemy then makes neither attack, so its attack output for that activation is 0 rather than the baseline 13. The party traded the wizard's 7.7 expected bolt damage for that change. Had the enemy merely missed one attack instead, the other would still have resolved for about 6.5 expected damage.",
          },
          {
            term: "Option B: an elite with two supporting creatures (HP 60 + 21 + 21, AC 15 and 13)",
            text: "The elite stands in the doorway with one support creature beside it. The second support creature is across the yard at a winch that will close the gate behind the party. It cannot reach the fighter in the opening round. The elite makes two attacks at +6 for 1d10 + 4 each (average 9.5), needs 12 or more against the fighter, a 45 per cent chance, for 8.6 expected damage. Each support creature makes one attack at +5 for 1d6 + 3 (average 6.5), needs 13 or more against the fighter, a 40 per cent chance, for 2.6. If all three could reach the fighter, the hypothetical total would be about 13.8 per round. That is not the opening-round output from these positions. In the opening sequence, the fighter and cleric attack the elite for 11.1 + 4.5 = 15.6 expected damage, whilst the wizard spends their action on the same stipulated effect as option A and prevents the elite's two attacks for one activation. The doorway support creature attacks the fighter for 2.6. The winch support creature spends its action turning the winch instead of attacking: that first activation leaves the gate half closed, and a second on its next activation will shut the party's exit unless someone reaches the winch, stops the operator, or spends an action holding the gate. Enemy attack output that round is therefore 2.6, plus visible progress towards closing the exit. Stopping the winch has a price too, because whoever goes there is not attacking the elite.",
          },
          {
            term: "Option C: eight weaker enemies (HP 13 each, AC 13)",
            text: "Each enemy makes one attack at +4 for 1d6 + 2 (average 5.5). Only four can reach the cleric at AC 16 in round one. Each needs 12 or more, a 45 per cent chance, for about 2.5 expected damage, so the four who can attack deal about 9.9 together. Do not add the other four to that round: they start too far away to attack the cleric. These are eight separate 13 HP pools, not one 104 HP pool. Damage that drops one enemy does not spill into the next, so the party works through bodies one at a time with single-target attacks. Each fallen enemy that could have attacked the cleric that round removes about 2.5 from the group's expected damage against the cleric; the other four contribute no opening-round damage until they can reach a target. The wizard's area spell changes several pools at once. At an average of 28 damage, or 14 on a successful save, either result exceeds 13 HP, so every enemy it catches is likely to fall. Catching three reduces eight enemy turns to five at once. Set a morale point before initiative, such as a check when four are down, and spread the starting positions so one area spell cannot catch all eight.",
          },
          {
            term: "What the comparison shows",
            text: "The matched HP total did not make the fights equivalent. In option A, one stipulated effect changed enemy attack output from a baseline of 13 to 0 for one activation, at the cost of the wizard's attacking action. In option B, the same effect on the elite left the doorway attack and the winch progress in play, so the party had to choose between the doorway and its exit. In option C, output arrived through whichever enemies could reach a target and fell body by body, except where one area spell struck several pools together. Choose the composition by which of those changes you want the party to be able to cause, then check that choice against your edition's budget before you run it.",
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
          "Estimate rounds to drop each body the party is likely to focus on, using damage against that body's defences. Re-check after the first likely casualty, area effect or diverted attack, rather than treating a group's combined HP as one pool.",
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
            text: "A higher CR usually raises damage and defences on the same single activation. It does not add another body or activation when that enemy is prevented from attacking. Fix the composition or the situation before you fix the statistics.",
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
