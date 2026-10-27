import type { AnswerConfigInput } from "../schema";

export const howToKeepCharacterDeathMeaningfulWithResurrection: AnswerConfigInput =
  {
    slug: "how-to-keep-character-death-meaningful-with-resurrection",
    category: "running-the-game",
    publishedAt: "2026-10-27",
    question:
      "How do you keep character death meaningful when resurrection is possible?",
    kind: "framework",
    shortAnswer:
      "When resurrection is available in an RPG, character death stays meaningful through what the death and the return change, not through whether the character stays dead. Agree in advance how revival works in your campaign, what it costs, and who can obtain it, then let missed time, spent resources, a witnessed sacrifice, and changed relationships carry the weight. A return that follows the agreed rules honours the players' abilities; a surprise penalty added afterwards to manufacture grief does not.",
    sections: [
      {
        kind: "prose",
        heading: "Death can matter even when it can be reversed",
        paragraphs: [
          "A Game Master (GM) who allows revival often worries that a raised character proves the death never counted. That worry confuses two different things. Mechanical permanence is whether the character sheet leaves play. Narrative impact is what the death changed while it lasted and what the return changes next. A death can lack the first and still have plenty of the second.",
          "Consider what survives a successful revival. A companion who held a doorway so the others could escape still made that choice in front of witnesses, and those witnesses remember it. A negotiation missed while the party carried a body to a temple has still been missed. Enemies who saw a fighter fall have learned something about the party, and allies who spent a rare diamond to reverse the fall have one fewer diamond for the next emergency. None of that needs the character to stay dead in order to be true.",
          "The practical rule is to let the return restore the person without rewinding the scene. Bring the character back, then play the consequences that were already set in motion. Do not void a sacrifice by treating the revival as though the sacrifice never happened, and do not compensate for the revival by inventing a fresh loss that nobody agreed to.",
        ],
      },
      {
        kind: "list",
        heading: "Set the resurrection contract before anyone dies",
        intro:
          "The contract is the player-facing agreement about how return from death works at this table. State it in session zero, write it down where everyone can check it, and apply it the same way to player characters and to important non-player characters unless the group has agreed otherwise. Pick the version that fits your campaign, or combine two and say so plainly.",
        items: [
          {
            term: "Rules as written, openly available",
            text: "Revival works exactly as the rulebook describes it, for anyone who can pay the listed cost and find a caster. Best for heroic campaigns where death is a setback to recover from. The group accepts that wealthy or well-connected figures are hard to keep dead, and the GM builds stakes around time and objectives instead.",
          },
          {
            term: "Rules as written, scarce access",
            text: "The spells and rituals work as written, but casters, components, or consecrated places are rare in the setting. The scarcity must be visible before it matters: the party learns early that the nearest temple able to raise the dead is a week's travel away, or that suitable diamonds seldom reach the market. Scarcity invented at the moment of death feels like a veto, not a setting.",
          },
          {
            term: "Revival with a stated complication",
            text: "The group agrees in advance that a return carries a defined cost beyond the rulebook price, such as a debt to the temple that raised the character, a duty owed to a patron, or a change the character brings back with them. The complication is written into the contract, so a player choosing revival knows what they are accepting. It is never improvised after a successful casting to make the return feel earned.",
          },
          {
            term: "Revival as a quest",
            text: "Returning a character takes an adventure in its own right: recovering the body, persuading a keeper of the dead, or completing a task before a deadline. Best when the group enjoys playing absence and rescue. Agree who plays what while one character is dead, for example a temporary character or a companion, so the affected player is not left spectating for several sessions.",
          },
          {
            term: "No return",
            text: "Death is permanent in this campaign, by rulebook choice or by house rule. This is a legitimate contract when everyone chooses it knowingly, including players whose class or species abilities assume revival exists. Say which abilities that removes, and let players build with that knowledge rather than discovering it at the table.",
          },
        ],
        outro:
          "Whichever version you choose, separate the player-facing expectation from the in-world explanation. Players need to know the real terms before they rely on an ability. Characters can still argue about theology, prices, and temple politics inside the fiction, but that argument should not rewrite terms the players already accepted.",
      },
      {
        kind: "list",
        heading: "Use consequences that follow from the fiction",
        intro:
          "A consequence follows from something already true in play, so the players can see why it happened and could have chosen differently. A punishment arrives afterwards to make death hurt more. The test is simple: could the players have anticipated this cost from what they knew before the character died?",
        items: [
          {
            term: "Fiction: time passes and the world moves",
            text: "The party spends two days reaching a temple, so the caravan they were guarding leaves without them and the rival who wanted its cargo gets there first. The delay was visible when they chose to carry the body home. Nobody needed a new rule to understand it.",
          },
          {
            term: "Fiction: spent resources stay spent",
            text: "The diamond consumed by the revival is gone, the caster who owed the party a favour has now been repaid in kind, and the relic sold to pay the temple fee belongs to someone else. Scarcity the group can count creates caution without any penalty roll.",
          },
          {
            term: "Fiction: people respond to what they saw",
            text: "Recruits who watched a captain die and return may trust her judgement more, or may quietly ask what came back wearing her face. A family that held a funeral before the return has feelings to work through. Let relationships carry the strangeness instead of announcing that the character now feels less real.",
          },
          {
            term: "Punishment: surprise penalties after a legal return",
            text: "Forced exhaustion levels, a permanent scar table, a flat chance that revival fails, or a secret limit on how many times a soul can return, introduced only when a character is raised, teach players that their abilities work until the GM dislikes the outcome. If your group wants such costs, put them in the contract where they can be chosen with open eyes.",
          },
          {
            term: "Punishment: the gotcha restriction",
            text: "Telling the party at the graveside that the soul is unwilling, the god refuses, or the body is somehow insufficient, when none of that was established beforehand, makes the return depend on GM mood. A refusal can be powerful fiction when the contract allowed for it and the players can investigate or contest it. As an improvised block, it reads as confiscation.",
          },
        ],
      },
      {
        kind: "table",
        heading: "Compare the main approaches before you commit",
        headers: ["Approach", "Best when", "Watch for"],
        rows: [
          [
            "Open availability, rules as written",
            "The group wants heroic recovery and fast returns to play.",
            "Death loses force as a deterrent, so stakes must come from objectives, timing, and cost. Villains with the same access need the same treatment.",
          ],
          [
            "Scarce components or scarce casters",
            "You want revival to stay possible but feel like a major undertaking.",
            "Scarcity must be established early and applied consistently. If only the party ever struggles to find a diamond, the setting feels rigged.",
          ],
          [
            "Agreed complications on return",
            "The group likes lasting marks, debts, or duties and wants to choose them knowingly.",
            "Complications chosen under grief can sour quickly. Offer the terms before the casting, and let the player decline the return instead.",
          ],
          [
            "Revival as a quest",
            "Absence, rescue, and journeys to the dead suit your campaign's pace.",
            "One player may sit out for a long stretch. Provide a temporary character or another active role for them.",
          ],
          [
            "Permanent death",
            "The group wants loss to be final and has chosen that tone together.",
            "Players need the full picture before building characters around revival abilities. Replacement characters and inheritance need a fair, quick route back into play.",
          ],
        ],
      },
      {
        kind: "prose",
        heading: "Follow resurrection into the wider world",
        paragraphs: [
          "Once a setting admits that the dead can return, honest worldbuilding asks who else uses that fact. If a murdered ruler can be raised within days, succession law needs an answer for the heir who has already been crowned, and a murder investigation needs to explain why the victim was not simply asked who did it. The usual answers are costs, delays, damaged or missing bodies, unwilling souls, and institutions that control access. Pick yours deliberately, because players will test them the first time an important non-player character dies.",
          "Warfare changes too. An army that can raise its officers plans differently from one that cannot, and a temple that decides whose soldiers return holds political power whether it wants it or not. Religious institutions may treat revival as a sacrament, a licensed trade, or a theft from the gods, and each position creates work for the party: permits, prohibitions, smuggled components, or a queue of petitioners outside the temple doors.",
          "Inequality is the sharpest edge. If revival costs more than most families earn in a lifetime, death is permanent for the poor and negotiable for the rich, and your setting should show that people know it. That knowledge can power resentment, charity, temple lotteries, or grave insurance sold by a guild. You do not need to resolve the theme, but naming who has access, and why, stops resurrection feeling like a private convenience that switches on only for the party.",
        ],
      },
      {
        kind: "prose",
        heading: "What the rules actually say in three systems",
        paragraphs: [
          "The summaries that follow are rules as written, checked against the published text. They are starting points for a contract, not recommendations, and any change your group makes to them is a house rule to record as such. In Dungeons and Dragons, revival arrives as a ladder of spells with explicit windows and prices. Revivify is a 3rd-level spell that touches a creature dead for no more than a minute and returns it with 1 hit point; it consumes diamonds worth 300 gold pieces, cannot help a creature that died of old age, and does not restore missing body parts. Raise Dead allows ten days and a diamond worth 500 gold pieces, and the returned creature works under a penalty that fades across long rests. Both the 2014 and the 2024 rules keep that same ladder shape, the same one-minute window, and the same 300 gold piece cost for Revivify; the 2024 text describes the Raise Dead penalty as a penalty to D20 tests, while the 2014 text lists the affected rolls directly. Read your own edition for the exact wording before quoting a cost at the table.",
          "Tales of the Valiant, the Kobold Press game built for compatibility with fifth edition material, keeps the same family of revival magic, organised by spell rings rather than levels, so a group moving between the two games faces the same contract question with near-identical tools. Confirm the ring, components, and timing in your own copy, because printings and conversion choices differ, and do not assume a Dungeons and Dragons price list applies word for word. Dungeon World takes the opposite route and builds the stake into a single roll. Its Last Breath move triggers when a character is dying: the player rolls two six-sided dice with no modifier, cheating death on a total of 10 or higher, while a total of 7 to 9 means Death offers a bargain the player may accept or refuse, and a lower total seals the character's fate. There is no diamond to buy and no window to beat; the cost is whatever Death asks for, which is why the move needs a table willing to negotiate in the open.",
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: a battlefield revival that still costs the party",
        paragraphs: [
          "The contract is rules as written with openly available revival. The party knows the costs, carries the components, and has agreed that what happens while someone is down still happens. Watch where the weight comes from: not from a new penalty, but from time, a consumed diamond, and a goal that kept moving.",
        ],
        items: [
          {
            term: "The fall",
            text: "In round three of a fight at a toll bridge, the fighter drops and then fails her death saving throws while the rest of the party is still engaged. She is dead, not merely unconscious, so healing words will not help. The cleric is twenty feet away with a clear path, holding the party's only suitable diamond.",
          },
          {
            term: "The choice the players can see",
            text: "The cleric's player states the real options aloud: spend an action and the diamond to cast Revivify within its one-minute window, or finish the fight first and risk the window closing. The table can see the bridge toll bell the raiders are trying to reach. Choosing the revival means nobody stops the raider running for that bell this round.",
          },
          {
            term: "The result",
            text: "The cleric casts Revivify as the rules describe it. The diamond is consumed, the fighter returns with 1 hit point, and play continues without any extra roll or lingering penalty, because the contract never promised one. The raider reaches the bell, and the toll keeper's guards arrive two rounds later to find armed strangers on the bridge. The party wins the fight and loses the quiet crossing they wanted.",
          },
          {
            term: "What the GM does next",
            text: "Name the cost that already exists rather than adding another one. The guards saw the fighter die and stand up again, and they will describe it that way to their captain. The party is down one diamond for the return journey. Ask the fighter's player what she remembers and what she wants to say to the cleric, then move on. The death mattered because the crossing, the diamond, and the witnesses changed, not because the return was taxed.",
          },
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: a costly return after the adventure has moved on",
        paragraphs: [
          "The contract this time is scarce access: revival works as written, but the only temple within reach that can cast Raise Dead is four days away, and the party learned that in the second session, long before anyone died. The ranger dies defending a mill on the last night of a harvest festival.",
        ],
        items: [
          {
            term: "The absence",
            text: "The group chooses to carry the body to the temple. The ranger's player takes over a miller's son who guided the party earlier, so she keeps playing while the journey happens. On the road, the party misses the land court where their claim to the mill was due to be heard. Their rival attends, unopposed, and is granted the milling rights for the season.",
          },
          {
            term: "The agreed price",
            text: "At the temple, the terms are the ones the contract promised: a diamond worth 500 gold pieces, a casting that takes an hour, and a returned character who works under the fading penalty the spell describes. The party sells the ranger's spare horse and a captured banner to meet the fee. Nobody invents a further price at the altar, and the ranger's player confirms she wants the return on those terms before the casting begins.",
          },
          {
            term: "The return",
            text: "The ranger wakes in a town that has already held her funeral. Her sister has given away her winter cloak, the mill flies her rival's colours, and the garrison has reassigned her watch post. The group now has an adventure they chose: contesting the land court ruling, recovering standing at the mill, and deciding how to tell the town what actually happened. Raise Dead restored the character; it did not restore the week.",
          },
        ],
      },
      {
        kind: "checklist",
        heading:
          "Questions to settle in session zero and at the moment of death",
        intro:
          "The first four questions belong in session zero, before any character is at risk. The last two belong to the table when a death actually happens. Write the answers down and keep them with the campaign notes.",
        items: [
          "How does revival work in this campaign: rules as written and openly available, scarce access, an agreed complication, a quest, or no return at all? Which rulebook wording are we using?",
          "What does a return cost in money, components, time, and obligation, and who in the setting can provide it? Have the players seen that scarcity or abundance in play before it decides a character's fate?",
          "Does the same contract apply to important non-player characters, including rulers, witnesses, and villains? What does that imply for succession, investigations, and war in this setting?",
          "Are there any house rules on top of the rulebook, such as extra penalties, failure chances, or limits per soul? If so, are they written here where a player can choose with full knowledge, or have we agreed there are none?",
          "When a character dies: what has already changed while they were down, in time, objectives, resources, and witnesses? Play those changes instead of adding a new penalty.",
          "When a character returns: what do they remember, who needs to be told, and what does the group do next about the consequences already in motion? Give the returning player the first word on how it felt.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep the contract where the campaign can find it",
      paragraphs: [
        "A resurrection contract only holds if the table can check it months later, alongside what each death actually changed. In Codex Cryptica you can keep the agreed terms with your campaign notes, link the temple, patron, or keeper of the dead as entities, and record each death, return, and outstanding debt against the character it affected. When a ruler dies or a diamond is spent, the note is already there to update, so the cost stays visible instead of living in one person's memory.",
      ],
      linkText: "Manage your campaign knowledge in Codex Cryptica",
      href: "/solutions/campaign-manager",
    },
    systemsThatSupportThis: [
      {
        system: "D&D (2024 rules)",
        rationale:
          "The Revivify, Raise Dead, and Resurrection spells form a priced ladder with explicit time windows, consumed diamonds, and a fading penalty after the larger spells, giving a table concrete costs to adopt, restrict, or price into the setting.",
        href: "https://www.dndbeyond.com/srd",
      },
      {
        system: "Dungeon World",
        rationale:
          "The Last Breath move resolves dying as an open negotiation: a strong roll cheats death, a middling roll earns a bargain from Death that the player may refuse, and a miss seals the character's fate.",
        href: "https://www.dungeonworldsrd.com/moves/",
      },
      {
        system: "Tales of the Valiant",
        rationale:
          "Kobold Press organises the familiar fifth edition revival spells by rings, so groups retain timed, component-based returns and face the same access and cost questions when setting a campaign contract.",
        href: "https://koboldpress.com/",
      },
    ],
    relatedAnswers: [
      "how-do-you-handle-character-death-in-a-tabletop-rpg",
      "how-do-i-run-a-successful-session-0",
      "how-do-you-create-a-magic-system",
      "how-do-you-create-a-believable-fictional-religion",
    ],
    discovery: {
      id: "answer-keep-death-meaningful-resurrection",
      parentCluster: "campaign-style-guides",
      primaryIntent:
        "how to keep character death meaningful when resurrection is possible",
      intentAliases: [
        "does resurrection make death meaningless in an rpg",
        "how to handle revivify without cheapening death",
        "rpg resurrection house rules and campaign stakes",
        "keeping death meaningful when raise dead exists",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A resurrection contract framework that moves stakes from permanent loss to time, cost, witnesses, and changed relationships, with a comparison of revival policies and the worldbuilding access questions each one raises.",
      relatedIntents: [
        "answer-handle-character-death",
        "answer-session-zero",
        "answer-create-magic-system",
        "answer-fictional-religion",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-handle-character-death",
          reason:
            "That answer covers handling a death at the table and its immediate aftermath; this answer covers reversible death, revival policy, and long-term campaign stakes.",
        },
      ],
    },
    seo: {
      title: "How to Keep Death Meaningful With Resurrection | Codex Cryptica",
      description:
        "Keep character death meaningful when resurrection is possible in your RPG: agree a revival contract, use story consequences, and compare your options.",
      image:
        "https://assets.codexcryptica.com/og/how-to-keep-character-death-meaningful-with-resurrection.jpg",
      imageAlt:
        "Companions keep vigil in a stone temple infirmary at dawn as a returned adventurer sits up on a stone bed beside a folded burial cloth",
    },
  };
