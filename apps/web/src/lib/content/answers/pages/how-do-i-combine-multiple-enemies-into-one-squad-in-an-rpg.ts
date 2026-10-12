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
      "To combine similar enemies into one squad, decide what to abstract and what to keep visible: its footprint, a casualty track, one activation whose attack reflects its remaining strength, and clear rules for targeting, area effects and morale. Show members falling and the squad changing as it takes losses, rather than turning it into a single giant creature with extra hit points.",
    sections: [
      {
        kind: "prose",
        heading: "What you are actually building",
        paragraphs: [
          "Five separate orcs give you five turns, positions, health pools and chances to act. You can speed up their handling without combining them: let them share initiative and batch routine rolls while keeping their positions, health and targets distinct, as described in the related answer on making combat faster without making it less exciting. If you want them to act as one squad instead, choose what kind of consolidation you mean; the three common approaches behave differently at the table.",
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
          "This page covers the middle row: a handful of ordinary opponents that you treat as a single encounter unit so a normal combat moves faster whilst still feeling like a group. If the player characters are soldiers inside a larger field battle, with fronts, reserves and orders that outlive one encounter, use the army-scale method instead. That method keeps the wider war as a changing environment around player-scale scenes, not as a bigger squad stat block. For the distinction and army procedure, see the related answer on running a large battle with the player characters inside an army.",
          "Pathfinder Second Edition's NPC Core has published troop rules; see the system note below. To compare games with published squad or mass-battle subsystems, see the related answer on tabletop RPGs with squad and mass-battle rules. The recipe here is a separate, system-neutral method, not an official rule set.",
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
            text: "Resolve the squad once with a combined attack or a pool of attacks that shrinks as it loses members. Consolidation changes burst damage, target choice and opponents' chances to intervene; expected damage can stay similar, but is not the only measure of threat. Choose output that suits your system and encounter, rather than treating GM handling time as a balancing resource or assuming damage must always fall.",
          },
          {
            term: "Movement, surrounding and area effects",
            text: "Decide how the unit moves, how much space it controls, and whether an area effect hits all or only some of it. Say how area and single-target effects change the casualty track; for example, area damage might affect several members while a single-target attack can name one member only when the attacker can reach or see them. Write the ruling down before it matters.",
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
          "Whatever you choose, check the output against your system's action economy and encounter maths. A squad changes burst damage, targeting and chances for players to intervene; run a short mock combat with the party's actual abilities, including area damage and conditions, then adjust for the kind of threat you intend.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: five orcs become one squad",
        paragraphs: [
          "Five orcs block a 10-foot-wide corridor leading to a guard post, and the rogue has reached their exposed flank. This compact toy model is illustrative only: it is not balanced or official for any game, and it is separate from Pathfinder's segment-based troop rules. It uses a 10-foot-square footprint; each orc represents 6 points on a shared 30-point track, and every 6 damage removes one orc. Damage beyond a threshold carries over. Unless a player has reached or exposed a named member, casualties remove ordinary orcs from the rear first; a reachable named target is removed when a threshold is crossed. The sergeant is one of the five and grants +1 to the squad's attack while alive. For the example, PC attacks are d20 + 5 vs AC 13 and deal 6 damage on a hit; the wizard's area spell hits the whole footprint and deals one rolled total to the shared track. A control effect that can legally cover the footprint gets one squad save, d20 + 2 vs DC 13; on a failure, its listed effect applies to the whole squad, while a single-target effect applies only to its named target. The squad attacks once: at five or four orcs, d20 + 5 for 1d8 + 3 damage; at three or two, d20 + 4 for 1d6 + 2; at one, d20 + 3 for 1d4 + 1. The sergeant adds +1 to each attack roll. Check morale when the third orc falls and again if the sergeant later falls: d20 + 2 vs DC 12; on a failure, the survivors flee as individuals.",
        ],
        items: [
          {
            term: "Before: five individuals",
            text: "The GM can keep all five orcs distinct, each with a position, health total and target, while putting them on one initiative count and batching routine attack rolls. That saves handling time without changing them into a squad or removing player choices about which orc to engage.",
          },
          {
            term: "Round one: the squad thins",
            text: "The fighter rolls 11 + 5 = 16 against AC 13 and deals 6 damage, taking the track from 30 to 24 and removing one orc. The wizard's area spell catches the whole footprint; its 4d6 roll is 12, taking the track to 12 and removing two more ordinary orcs. The third casualty triggers morale: the orcs roll 14 + 2 = 16 against DC 12 and hold. The sergeant remains, so two orcs are left and its attack bonus is +5 (+4 for its strength, +1 for the sergeant). It rolls 9 + 5 = 14 against the fighter's AC 14 and hits; 1d6 + 2 comes up 3 + 2, dealing 5 damage.",
          },
          {
            term: "Round two: a targeted leader falls and morale breaks",
            text: "The rogue names the sergeant at the exposed flank as the target. The attack roll is 10 + 5 = 15 against AC 13, dealing 6 damage; the track falls from 12 to 6, leaving one ordinary orc and removing the sergeant's +1. Because the sergeant has fallen, the survivors check morale: 8 + 2 = 10, below DC 12, so the last orc flees and the squad ends.",
          },
          {
            term: "Why it works",
            text: "The visible track shows exactly when orcs fall, the squad's attack weakens with its numbers, and the sergeant's loss changes both its attack and the survivors' morale. The group acts as one unit without hiding the consequences of each casualty.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Squad prep checklist",
        intro: "Set these rulings before initiative:",
        items: [
          "Confirm the enemies are similar enough to act as one unit, and note how many creatures it represents.",
          "Choose the squad's footprint and decide how it handles doors, cover and difficult terrain.",
          "Set a visible casualty or strength track, including the thresholds where members fall and capabilities change.",
          "Write one attack for each strength threshold and resolve the squad only once per activation.",
          "Decide how area effects and single-target attacks affect the track, including when a named member can be targeted.",
          "Choose a morale trigger and what the survivors do if they fail: retreat, scatter, surrender or rout.",
          "Check the rules against the party's actual attacks and control effects, then adjust the threat before play.",
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
          "Judge a hero's effect on the formation by the genre, the system's actual abilities and the established fiction. In grounded play, support, position or terrain may be needed to overcome a formed line; in heroic play, a character's abilities may themselves provide that leverage. Honour what a legal ability can do, and let a collapsed gate, a turned leader or timely aid matter when the fiction supports it. Do not add restrictions simply to preserve the squad's threat.",
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
            term: "Turning a group into an inexplicable giant",
            text: "A squad should not mysteriously gain reach, movement or durability that none of its members had alone. Size, speed and resilience should stay close to what a tight group of ordinary creatures could achieve together, with any extra capability explained by formation or equipment rather than by scaling numbers into a brute.",
          },
          {
            term: "More bookkeeping than the individuals would have needed",
            text: "If the track, conditions and exceptions for the squad cost more time than five health bars, retire the shortcut. A good squad reduces what the GM tracks to position, current strength and morale state, with at most one extra condition from a leader or specialist.",
          },
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "Pathfinder 2e",
        rationale:
          "Pathfinder Second Edition's NPC Core includes Running Troops rules that use four footprint segments, shared hit points and coordinated actions as the troop thins. Area-related weaknesses depend on the individual troop stat block; they are not a rule for every troop.",
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
      "which-tabletop-rpgs-have-squad-and-mass-battle-rules",
      "how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army",
      "which-tabletop-rpgs-have-squad-and-mass-battle-rules",
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
