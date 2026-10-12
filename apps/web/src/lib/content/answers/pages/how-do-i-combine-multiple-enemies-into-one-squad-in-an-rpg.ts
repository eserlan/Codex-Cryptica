import type { AnswerConfigInput } from "../schema";

export const howDoICombineMultipleEnemiesIntoOneSquadInAnRpg: AnswerConfigInput =
  {
    slug: "how-do-i-combine-multiple-enemies-into-one-squad-in-an-rpg",
    category: "running-the-game",
    publishedAt: "2026-10-12",
    question:
      "How do I combine multiple enemies into one squad in a tabletop RPG?",
    kind: "framework",
    shortAnswer:
      "To combine several similar enemies into one squad, decide what you want to abstract and what must stay visible: one shared turn and position for speed, one shared health or strength track that shows casualties, one coherent attack per activation rather than five stacked attacks, and clear rules for movement, surrounding, area effects and morale. The unit should feel like a group that loses members and weakens as it takes losses, not a single giant creature that happens to have more hit points.",
    sections: [
      {
        kind: "prose",
        heading: "What you are actually building",
        paragraphs: [
          "Five separate orcs give you five turns, five positions, five health pools and five chances to act. That is precise but slow, and it often makes a group of ordinary foes feel less dangerous than one tough monster simply because the GM cannot run them sharply. Consolidating them saves time, but you need to be clear what kind of consolidation you mean, because the three common approaches behave differently at the table.",
          "Naming the abstraction up front prevents confusion later, especially if your group already uses terms like troop, mob or squad differently. Use the table below to match your table's need to the right tool, then build only that tool. Do not treat them as interchangeable dialects of the same idea.",
        ],
      },
      {
        kind: "table",
        heading: "Three encounter-scale options and how they differ",
        headers: ["Approach", "What it is", "When to use it"],
        rows: [
          [
            "Shared-resource group",
            "Individually placed figures that share one health or strength pool",
            "You want to keep positioning and flanking but remove separate hit point tracking",
          ],
          [
            "Single-token squad or troop",
            "One battlefield unit that stands for several creatures together",
            "You want one turn, one position and one stat block for a tight formation",
          ],
          [
            "Abstract army unit",
            "A higher-level formation handled by campaign or mass-combat rules",
            "The question has left the encounter and become a military operation",
          ],
        ],
      },
      {
        kind: "prose",
        heading: "How this differs from an army battle",
        paragraphs: [
          "This page covers the middle row: a handful of ordinary opponents that you treat as a single encounter unit so a normal combat moves faster whilst still feeling like a group. If the player characters are soldiers inside a larger field battle, with fronts, reserves and orders that outlive one encounter, use the army-scale method instead. That method keeps the wider war as a changing environment around player-scale scenes, not as a bigger squad stat block. For the distinction and the army procedure, see how to run a large battle when the player characters are part of an army.",
          "Pathfinder 2e's troop rules offer a published example of this kind of tool; see the system note below. This page gives you a system-neutral recipe you can use with any game, clearly marked as illustrative rather than official rules.",
        ],
      },
      {
        kind: "list",
        heading: "A system-neutral squad recipe",
        intro:
          "Use these six decisions in order. Each one answers a question your players will ask within a round or two, so settling them before initiative avoids mid-fight rulings.",
        items: [
          {
            term: "Size, footprint and whether they share a space",
            text: "Pick how many creatures the squad stands for, usually three to six for this technique, and what space the unit occupies. State whether the members genuinely share one battlefield position or stand shoulder to shoulder across a defined area. A single base works for a shield wall or a tight knot of goblins in a corridor; a small zone works for a loose skirmish line that can still be flanked. Note how the squad can be blocked, squeezed through a doorway, or split by terrain, so movement has a cost.",
          },
          {
            term: "Shared health, casualty thresholds or a strength track",
            text: "Give the squad one way of showing losses that the players can see. Options include a single hit point total, a set of thresholds where one member falls, or a strength track that degrades as damage accumulates. Record how many members that represents and what visibly changes when the count drops. The squad should become less capable as it takes casualties, not fight at full effect until it collapses.",
          },
          {
            term: "One coherent activation, not five stacked attacks",
            text: "Let the squad act once on its turn with one attack or one combined effect, then reduce that effect as the unit thins. Sensible choices include a formation strike that represents the best positioned members attacking, or a limited pool of attacks that shrinks when numbers fall. Do not let one activation produce the accuracy and damage of five independent creatures acting separately; that preserves the bookkeeping you were trying to remove whilst keeping the lethality of five turns.",
          },
          {
            term: "Movement, surrounding and area effects",
            text: "Decide how the unit moves, how much space it controls, and how it interacts with effects that hit an area. State whether the squad can surround a target, how it occupies a doorway or a narrow passage, and whether a fireball, a grenade or a burst spell hits the whole formation or a portion of it. A common ruling is that area effects apply their damage once to the shared pool but count strongly towards thresholds or morale, whilst single-target effects remove or weaken one member. Write your ruling down before it matters.",
          },
          {
            term: "Morale, suppression, breaking and surrender",
            text: "Groups of ordinary fighters rarely fight to the last member. Set a point where the squad checks, wavers or breaks: after serious losses, after its leader falls, after it is flanked or surprised, or after a round of heavy fire. Decide what failure looks like at your table. Options include falling back to cover, scattering into individuals, surrendering, or routing off the battlefield. Make the trigger visible to the players, such as a standard bearer falling or half the squad going down, so the shift feels earned rather than arbitrary.",
          },
          {
            term: "When players engage the whole unit versus a part of it",
            text: "State how a player can target the squad as a whole, pick out a specialist or officer inside it, or isolate one member. A melee fighter pressed against a shield wall plausibly engages the formation; an archer on a balcony may plausibly pick a single figure; a duellist who pushes through the line may force a one-to-one exchange whilst the rest of the squad turns. Clarify whether those choices require a check, extra movement, or simply being in the right fictional position. The same clarity helps when the party commands or fights alongside a friendly squad, as covered below.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Tuning the recipe for different groups",
        paragraphs: [
          "A tight melee formation that holds a doorway behaves differently from a scattered band of archers, even if both use the same track. For close-quarters squads, emphasise shared position, limited facing, and the ability to block or be flanked. For ranged squads, emphasise dispersed placement, cover, and how suppression or a charge can break their line. A mixed-quality group with a leader, a standard bearer and ordinary fighters needs a way to recognise the leader: perhaps losing the leader triggers morale earlier, or the specialist grants one distinct ability that is lost when that member falls. Elite units should not simply be ordinary squads with higher numbers; give them better thresholds, slower degradation, steadier morale, or a cleaner split into individuals rather than a rout when they are reduced.",
          "Whatever you choose, playtest the numbers against your own system's action economy and encounter maths. A squad is a shortcut through that economy, so run a short mock combat with the party's actual abilities, including area damage and conditions, and adjust the output until the squad is quicker to run without being more lethal than the five individuals it replaces.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: five orcs become one squad",
        paragraphs: [
          "Imagine a corridor where five ordinary orcs block the way to a guard post. The GM wants one clear opposition unit instead of five similar stat blocks. The numbers below are illustrative and not presented as balanced or official for any system. Any values that matter at your table should be set from your own game's maths after a brief playtest.",
        ],
        items: [
          {
            term: "Before: five individuals",
            text: "Five turns to track, five positions that need placing, five health totals, five separate attacks that each need a roll. The action economy favours the orcs through sheer number of chances, initiative takes longer to order, and any area spell or burst forces five identical saves. The GM spends most of the round managing the orcs rather than adjudicating player choices.",
          },
          {
            term: "After: one squad token with a casualty track",
            text: "One token that occupies the corridor width. One activation per round. One shared health pool divided into five illustrative thresholds: healthy (five orcs), four orcs, three orcs, two orcs, one orc. Each threshold represents a visible casualty and a step down in what the squad can do. The token's position, a note of its current strength, and its morale state are all the GM needs to track.",
          },
          {
            term: "One activation and sensible attack output",
            text: "On its turn the squad makes one formation attack rather than five separate rolls, representing the two or three orcs best placed to strike. At full strength it uses its listed formation attack. After each casualty the GM steps the output down in a way that is visible: perhaps one fewer damage die at three orcs, and a reduced ability to pin or surround at two. The activation stays single throughout, so the fight speeds up without quietly multiplying lethality.",
          },
          {
            term: "Two turns that show attrition in practice",
            text: "Round one: the fighter hits the formation and deals enough damage to cross the first threshold, so one orc falls and the squad is noted as four remaining. The wizard catches the tight formation in a burst. The GM rules that area effects apply their damage once to the shared pool but count heavily towards the next threshold, so the spell pushes the squad across a second step. The squad then activates at reduced strength with three orcs, making its single attack at visibly diminished effect rather than at the full opening value. Round two: the rogue singles out the orc sergeant at the table's agreed cost, removing the leader's extra ability but not the whole formation. The squad, now down to two orcs and without its leader, checks morale because it has lost more than half its members; it fails and breaks into two fleeing individuals rather than fighting as a perfect unit to the last body.",
          },
          {
            term: "How different PC actions interact",
            text: "Single-target attack: damages the shared pool and may also remove one member when a threshold is crossed, which the table sees as a body falling. Area attack: damages the shared pool once and advances the casualty track quickly because the tight formation counts against the defenders, rather than being treated as a single-target hit. Crowd control that slows, shoves or frightens: suppresses or repositions the whole formation on a success, or peels one member off to be dealt with individually, rather than locking down five independent fighters with one effect. In each case the fiction matches what the players can see: members falling, the line thinning, or the formation wobbling.",
          },
          {
            term: "Morale and the point where the squad stops being a unit",
            text: "After serious losses, here after dropping to two orcs plus the loss of a leader, the GM calls for a waver check using the table's normal procedure. On a poor result the squad no longer acts as one token: survivors scatter, surrender, or retreat, and any remaining pursuit is handled as individual opponents. This prevents a familiar pitfall where a nearly defeated group still attacks as if it were intact. The point where the squad dissolves should be visible before it happens, such as a standard or leader going down, so players can press or spare the survivors with intent.",
          },
          {
            term: "Why it works",
            text: "The table never tracked five identical health bars, yet every player action changed something visible: a threshold crossing, a reduced attack, a leader removed, an area effect that clearly mattered, and a morale break the party could see coming. The squad felt dangerous at full strength because it was coherent, and it felt demoralised later because the mechanics showed the losses. The same method ports to archers, town guards or mercenary companies by adjusting footprint, ranged output and morale quality rather than by inventing a new subsystem.",
          },
        ],
      },
      {
        kind: "prose",
        heading:
          "Player characters commanding, joining and fighting formations",
        paragraphs: [
          "A squad is not only something to place opposite the players. It is also something they may lead, stand beside, or be asked to break, and each role needs a slightly different ruling.",
          "When a player commands a friendly squad, treat their contribution as positioning, orders and plausible leverage rather than an extra set of attacks the squad gains for free. A character who can see the field, shout a clear order, or hold a position that anchors the formation may let the squad act more reliably or hold morale longer. A character who is hidden, silenced, separated by distance, or busy fighting for their own life cannot credibly steer the whole unit at once. Let a command take an action or invoke a check where your system expects one, so the squad's turn remains the fiction of the squad acting, not a silent extension of a single hero's activation.",
          "When the party fights alongside a squad, keep the squad's fictive role distinct: it holds ground, covers a flank, or fixes part of the enemy line whilst the player characters handle the decisive problem inside that context. Let players see the consequence of where the squad holds or breaks. If the allied line gives way, the party faces enemies from a new direction; if it holds, they keep a corridor to reach a leader or an objective. Avoid letting the squad quietly solve the encounter whilst the party watches, or vanish without consequence when it is convenient to do so.",
          "When a player singles out a leader, specialist or exposed member, let the fiction decide the cost. Reaching a figure in the middle of a tight formation should plausibly require getting through the formation first, whether that means movement, a check, or assistance from another character. An exposed skirmisher on the edge may be targetable directly. If the singled-out figure matters to the squad's capability, state so before the attack, and remove that capability when they fall rather than letting the squad fight as if nothing happened.",
          "Finally, do not let a single hero dominate a whole formation without leverage that matches the scale. A lone fighter who challenges a wall of spears head-on without surprise, terrain, magic or help should be treated as one body against many, however skilled the character is. Conversely, a hero who collapses a gate onto the formation, sets its supplies alight, turns its leader, or brings timely aid has changed the terms and should be rewarded accordingly. The test is always what a person in that position could credibly achieve, not what the character sheet says about a one-to-one duel.",
        ],
      },
      {
        kind: "list",
        heading: "When to keep enemies individual",
        intro:
          "A squad is a shortcut. It repays its cost only when individual distinctness matters less than the group's collective pressure. Keep ordinary combat individual when:",
        items: [
          {
            term: "The group is small and each member has a distinct job",
            text: "Two guards and a mage, a captain with two specialists and a hound, or any trio where each figure's ability would be lost if folded into one attack, deserve separate turns. Their variety is the puzzle.",
          },
          {
            term: "Positioning and distinct abilities create the challenge",
            text: "A fight built around flanking, isolated roles, a hostage surrounded by different foes, or a ritual that one specific enemy maintains loses its point when everything shares one position. Let the map do its work.",
          },
          {
            term: "Complex terrain or interiors make a single footprint dishonest",
            text: "A tangle of rooms, pillars, chokepoints and cover is often the most interesting part of the encounter. Forcing a single token into a kitchen, a cloister or a crowded market squeezes the fiction to fit the shortcut rather than letting it breathe.",
          },
          {
            term: "Your system already gives you a better-fitted tool",
            text: "Some games provide their own troop, mob or swarm rules with tested thresholds and weaknesses. If your table trusts that subsystem, use it for this encounter and keep this recipe for other games, rather than stacking two abstractions on top of one another.",
          },
          {
            term: "You need every foe to have individual stakes",
            text: "When surrender, capture, interrogation or mistaken identity matters for specific members, tracking them individually preserves those branches. A shared pool blurs which figure actually fell or was taken.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Common pitfalls to avoid",
        intro:
          "Groups that feel wrong usually fail in one of these ways. Each has a simple correction you can apply before the next round.",
        items: [
          {
            term: "Five attacks on one activation",
            text: "Letting a squad roll a full attack for every member it contains keeps the lethality of five creatures whilst removing the handling cost that balances those creatures. Use one coherent attack that weakens as the unit thins, and shorten the description as it degrades rather than lengthening the roll.",
          },
          {
            term: "Full strength until the last hit point",
            text: "A squad that fights at peak output whilst supposedly riddled with casualties breaks the fiction the abstraction was meant to support. Tie weakening to visible thresholds so the third and fourth loss change what the squad can attempt.",
          },
          {
            term: "Treating area effects as single-target hits",
            text: "A fireball that would catch four of five orcs should not be adjudicated as though it struck one. Apply its damage to the shared pool and let the formation's density move the casualty track accordingly, or let the spell's narrative effect, such as scattering, apply to the whole unit.",
          },
          {
            term: "Turning a group into an inexplicable giant",
            text: "A squad should not mysteriously gain reach, movement or durability that none of its members had alone. Size, speed and resilience should stay close to what a tight group of ordinary creatures could achieve together, with any extra capability explained by formation or equipment rather than by scaling numbers into a brute.",
          },
          {
            term: "More bookkeeping than the individuals would have needed",
            text: "If the track, conditions and exceptions for the squad cost more time than five health bars, retire the shortcut. A good squad reduces what the GM tracks to position, current strength and morale state, with at most one extra condition from a leader or specialist.",
          },
          {
            term: "No way out for a broken group",
            text: "Forgetting morale or surrender leaves ordinary fighters behaving like automatons. Set the waver point before the fight and honour it, so the encounter can end through flight or capture rather than grinding to zeros.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Squad prep checklist",
        intro:
          "Run through this before initiative when you plan to consolidate:",
        items: [
          "Confirm the squad is worth abstracting: similar foes whose individual abilities are not the puzzle.",
          "Note size, footprint and whether the token shares a space or covers a small area. Decide how doors, cover and difficult terrain affect it.",
          "Choose one casualty or strength track and write the thresholds where capability visibly steps down.",
          "Set one formation attack for a full squad and how it reduces at each threshold. Avoid multiplying attacks across the whole group.",
          "Record how movement, surrounding and area effects work for this unit, including the difference between area and single-target results.",
          "Set a morale trigger and the consequence when it fails: fallback, scatter into individuals, surrender or rout.",
          "Decide how players can engage the whole unit versus a leader or exposed member, and what position or cost each requires.",
          "Adjust for melee, ranged or mixed composition and for elite steadiness if any member is notably tougher or better led.",
          "Playtest the block against your system's encounter maths and action economy with the party's actual tools, including area damage and control.",
          "Prepare a way for the encounter to end early through flight, surrender or a changed objective once the squad breaks.",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "Pathfinder 2e",
        rationale:
          "Troop rules turn a formation of allied creatures into a single creature with shared hit points, weaknesses to area damage, and reduced effectiveness as it thins.",
        href: "https://2e.aonprd.com/Rules.aspx?ID=3365",
      },
    ],
    codexConnection: {
      heading: "Keep a squad linked to the encounter around it",
      paragraphs: [
        "A squad stat block is only one part of the encounter. The same fight also has its terrain, its objective, which faction fielded the unit and what breaks if the formation fails. In Codex Cryptica, keep the squad as a note or creature linked to the encounter, the location and the faction that sent it, so a morale break or a scattered remnant can update the next scene without fresh invention.",
        "Draft the surrounding encounter with the encounter generator to lay out participants, terrain and an objective, then replace the handful of similar foes with the squad block you prepared. When the token thins or routs, record the consequence on the linked pages, such as which road is now clear or which leader remains to be dealt with.",
      ],
      linkText: "Try the encounter generator",
      href: "/generators/encounter",
    },
    relatedTools: [
      {
        title: "Encounter generator",
        description:
          "Draft participants, terrain and an objective for the scene, then consolidate the repeated foes into the squad the encounter needs.",
        href: "/generators/encounter",
      },
      {
        title: "Faction generator",
        description:
          "Give the force behind the squad a motive and resources that explain why it holds, breaks or bargains.",
        href: "/generators/faction",
      },
      {
        title: "NPC generator",
        description:
          "Create the sergeant, standard bearer or specialist whose fall visibly changes what the squad can still do.",
        href: "/generators/npc",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for D&D",
        description:
          "How the same linked pages for encounters, factions and NPCs support a faster, legible table without new rules.",
        href: "/for/dungeons-and-dragons",
      },
    ],
    relatedAnswers: [
      "how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army",
      "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
      "how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
      "how-do-i-make-combat-faster-without-making-it-less-exciting",
      "how-do-i-keep-players-engaged-during-other-players-turns-in-combat",
      "what-rpg-should-i-use-for-tactical-combat",
      "how-do-you-run-dnd-for-a-large-group-of-players",
    ],
    discovery: {
      id: "answer-combine-enemies-into-squad",
      parentCluster: "encounter-design",
      clusters: ["encounter-design", "running-the-game"],
      primaryIntent:
        "how to combine multiple enemies into one squad in a tabletop rpg",
      intentAliases: [
        "group enemies into one token rpg",
        "run squads of enemies tabletop rpg",
        "five orcs as one monster squad rules",
        "troop or mob rules for multiple enemies",
        "single token for multiple creatures rpg",
        "combine goblins into a squad encounter",
        "how to run a squad of guards as one unit",
      ],
      uniqueValue:
        "A reusable encounter-scale recipe for consolidating ordinary foes into one tracked unit, with thresholds, one coherent activation, area and single-target rulings, morale and player-facing targeting, plus a two-round orc example that shows attrition.",
      userJob: "adopt-workflow",
      relatedIntents: [
        "answer-large-battle-pcs-in-army",
        "answer-encounter-balance",
        "answer-faster-exciting-combat",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-large-battle-pcs-in-army",
          reason:
            "That page handles army-scale battles as a changing environment around player-scale scenes; this page handles encounter-scale consolidation of ordinary foes into one tracked unit within a single combat.",
        },
        {
          with: "answer-encounter-balance",
          reason:
            "Encounter balance teaches how to size difficulty and avoid a total party kill; this page teaches how to reduce bookkeeping for many similar foes whilst keeping their collective threat and morale credible.",
        },
      ],
    },
    seo: {
      title: "How to combine enemies into one squad in an RPG | Codex Cryptica",
      description:
        "Combine multiple enemies into one squad with a shared track, one activation that weakens with losses, clear area and single-target rulings, and morale that breaks.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-combine-multiple-enemies-into-one-squad-in-an-rpg.jpg",
      imageAlt:
        "Five orc fighters in tight formation sharing a single squad base on a battle map, surrounded by player tokens under torchlight",
    },
  };
