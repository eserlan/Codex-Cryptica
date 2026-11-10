import type { AnswerConfigInput } from "../schema";

export const howMuchLootAndHowManyMagicItemsShouldIGiveMyPlayers: AnswerConfigInput =
  {
    slug: "how-much-loot-and-how-many-magic-items-should-i-give-my-players",
    category: "running-the-game",
    publishedAt: "2026-11-10",
    question:
      "How much loot and how many magic items should I give my players?",
    kind: "how-to",
    shortAnswer:
      "Give treasure where it makes sense in the fiction and pace magic items at campaign level rather than per fight. A thorough search can honestly find nothing: say so plainly and let the party move on. Reward curiosity, not compulsive searching.",
    sections: [
      {
        kind: "prose",
        heading: "Does every room or enemy need loot?",
        paragraphs: [
          "No. A guardroom can hold bunks, a dice cup and patched cloaks, and a fallen sentry can carry a serviceable spear and a few coins, or nothing worth taking at all. Treasure follows who lived or worked in a place, what they valued and what they could carry. A warren of beasts, an undead crypt guard and a hastily abandoned camp all have honest reasons to hold no coins, however hard the fight to clear them was.",
          "Trouble starts when every search pays out. If checking each corpse and cupboard reliably produces coins or a useful item, thorough searching stops being a choice and becomes the correct routine after every encounter. Sessions slow down, and an empty result starts to read as the Game Master (GM) withholding something rather than as information about the place. Give a conclusive answer instead: once the party has searched properly, say that the room has been turned out and there is nothing else hidden there. A firm empty result lets the group move on with confidence, which is itself a reward for searching well.",
          "Keep one distinction in view throughout this answer. Advice about placing rewards where the fiction supports them is system-neutral judgement. Advice labelled Dungeons and Dragons (D&D) 5e, 2014 or 2024 below comes from those books and applies only there. Campaign pacing choices in between are suggestions for your table, not rules as written.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the guardroom with nothing to find",
        paragraphs: [
          "A party has just fought the guards of a toll fort and wants to search the guardroom and the fallen sergeant before moving on. There is no cache in this room, the sergeant carries no coins and no magic item, and nothing hidden waits under the floor. The search still needs a clear result.",
        ],
        items: [
          {
            term: "What the players do",
            text: "The rogue checks the sergeant while the fighter turns out the bunks and lifts a loose flagstone. They have time, light and no immediate pressure, so you do not call for a roll: a methodical search will find whatever is there, and there is nothing concealed to miss. Uncertainty, not habit, is what makes a check worth asking for.",
          },
          {
            term: "What is actually there",
            text: "The sergeant has a serviceable spear and an empty belt pouch. The bunks hold patched cloaks and a dice cup. The flagstone lifts to packed earth. No coins, no hidden compartment and no magic item, and you do not add one to make the search feel worthwhile.",
          },
          {
            term: "What you say",
            text: '"That takes about ten minutes. You have turned the room out: the sergeant carried nothing worth taking, the bunks and cupboard hold only bedding, cloaks and a dice cup, and there is nothing under the flagstone but packed earth. You have searched it thoroughly." No further discovery follows from searching the same room again.',
          },
          {
            term: "If time were short",
            text: "Suppose instead that the party wants the same certainty in two minutes, before leaving a doorway they cannot watch. The uncertain task is now speed with completeness, so call for a Wisdom (Perception) check against Difficulty Class (DC) 12 in D&D 5e terms: a twenty-sided die (d20) result of 7 plus a Perception modifier of +5 gives 7 + 5 = 12, which meets the DC and finishes in two minutes. On a total below 12, they must choose: leave at two minutes with the room only partly searched, or stay for the full ten minutes and accept whatever arrives or changes in that time. The check decides how fast they can be certain, never whether treasure appears.",
          },
          {
            term: "Why this works",
            text: "The party gets a conclusive answer it can trust, so nobody rolls again on the same cupboards, and the empty result needs no compensating clue or payout. The next room can still hold a real hoard, and it will mean more because this one did not.",
          },
        ],
      },
      {
        kind: "list",
        heading: "How much treasure should I award?",
        intro:
          "Start from the campaign, not from the last encounter. Ask what money is for in this game: what the party can [buy and sell in a settlement](/answers/what-can-players-actually-buy-and-sell-in-a-fantasy-settlement), what travel, lodging, spell components, repairs, bribes or a base will cost them, and whether wealth is meant to stay tight or grow grand. Then place treasure in four broad kinds, which keeps routine finds separate from milestones:",
        items: [
          {
            term: "Routine possessions",
            text: "What a person or creature plausibly has on them or in their quarters: a worn weapon, tools of a trade, a few coins, rations, a keepsake. Most routine possessions are not worth counting coin by coin. Name anything usable or telling, summarise the rest, and let much of it be too battered, too ordinary or too bulky to be worth carrying away.",
          },
          {
            term: "Individual treasure",
            text: "The pocket-level valuables one creature carries: a purse, a ring, a folded note of credit, a small gem. This is the right scale for a single foe or traveller. In D&D 5e this is the individual treasure idea in both the 2014 and 2024 Dungeon Master's Guide (DMG): small coin amounts set by Challenge Rating (CR), meaning how dangerous a creature is meant to be. It is pocket change, not a payday, and many creatures honestly carry none.",
          },
          {
            term: "Hoards",
            text: "Accumulated wealth gathered by a group, organisation or single powerful hoarder over time: a bandit strongbox, a dragon's bed, a temple treasury, a smuggling cache. A hoard belongs where accumulation makes sense and usually marks the end of an adventure, a lair cleared or a faction defeated. It is the natural home for larger coin, gems, art objects and most magic items.",
          },
          {
            term: "Major adventure rewards",
            text: "Payment and patronage agreed in the fiction: a lord's fee, a guild contract, land, a title, a ship, a favour owed by someone powerful. These can outweigh any hoard and can be the main reward of an arc, which frees a dungeon to be poor without the adventure feeling unrewarding.",
          },
        ],
        outro:
          "Do not equate treasure with encounter difficulty. A deadly ooze has no pockets, a rich merchant's vault may be guarded by one ageing clerk, and the hardest fight in a tomb may protect a warning rather than gold. Difficulty decides danger. Ownership, habits and history decide treasure. If the party needs paying for hard work, use a patron, a bounty or a known cache, and let them learn where pay actually comes from in this campaign.",
      },
      {
        kind: "prose",
        heading: "When should I use random loot tables?",
        paragraphs: [
          "Use a published table when you want a result you did not choose: stocking a lair in preparation, answering an unexpected search, or keeping your own habits from making every reward look the same. Roll in preparation where you can, so a strange result can be placed, explained or swapped before it reaches the table. A table is a tool for generating candidates, not an obligation to hand over whatever it produces, and treasure already placed by a published adventure or your own preparation takes precedence over a fresh roll.",
          "Choose the result instead when the item needs to fit a specific character, faction or problem, when the fiction has already established what is stored somewhere, or when a random item would duplicate something the party cannot use. Adapt the result when it is close: keep the rarity and general kind, then change the form, history, charges or wielder so it belongs in this place. Rolling, choosing and adapting are all ordinary GM work. None of them needs an apology at the table.",
          "The two 5e editions organise this differently, so do not mix their procedures. In the 2014 DMG, separate d100 tables by CR band give individual treasure as coins, while the treasure hoard tables by CR band give coins, gems or art objects and then direct you to roll on magic item tables A to I a stated number of times. Tables A to E lean towards consumables and smaller items, and tables F to I towards permanent, character-defining items. In the 2024 DMG there is one Random Individual Treasure table by CR with average values in brackets, which you can roll once and multiply for a group of similar creatures, and one Random Treasure Hoard table by CR that gives monetary treasure and a number of magic items. Rarity for each of those items is then rolled using the party's level band, and its kind comes from a treasure theme: Arcana, Armaments, Implements or Relics, with the 2025 Monster Manual noting which theme a creature favours. The 2024 Adventure Rewards guidance also offers a rough benchmark of rolling on the hoard table about once per session. That is a pacing benchmark for that edition, not a promise that every session or fight must contain a hoard.",
        ],
      },
      {
        kind: "prose",
        heading: "How often should players find magic items?",
        paragraphs: [
          "At the pace your campaign agreed, which depends on the game, the edition, the tone you pitched, what the characters need and how fast they are progressing. State the expectation early, ideally when you agree the shape of the campaign: in a low-magic game a permanent item is a landmark the party may plan an expedition around, while in a high-magic game shops, patrons and rivals treat uncommon items as serious but ordinary goods. Neither pace is wrong. Disappointment usually comes from a mismatch, where the GM runs a low-magic pace inside a campaign the players thought would equip them like heroes of legend, or the reverse. If the setting itself is undecided, settle [how common magic should be in the world](/answers/how-common-should-magic-be-in-a-fantasy-world) first, then set the party's reward pace to match it.",
          "There is no sound universal rate per combat, per session or per level that survives a change of system, party size or campaign length, and no combat creates an entitlement to a magic item. Most fights should produce no magic item at all. Consumables can arrive fairly often because they leave play when used. Permanent items, and especially items a character will use every round, deserve a slower, deliberate pace tied to milestones: a hoard found, a patron's gift, a crafted commission finished, a famous foe's gear taken up. Track what the party has actually received over the last few levels rather than judging one session at a time, and spread finds across characters and roles so one player does not collect every signature item.",
          "D&D 5e gives benchmarks, provided you keep the editions apart. The 2024 DMG states plainly that characters and monsters are built to face each other without magic items, so items are prizes rather than requirements, and its [Magic Items Awarded by Level guidance](https://www.dndbeyond.com/sources/dnd/br-2024/magic-items) describes a party typically gaining one hundred items across a full campaign to 20th level, with the largest shares at common and uncommon rarity: a party-wide description of typical gains, not a quota to fill by a date. The 2014-era equivalent in Xanathar's Guide to Everything reaches the same total but counts them differently, as eighty minor items, mostly consumables and smaller finds, and twenty major, permanent items. Use whichever count matches the books on your table and do not add the two together.",
        ],
      },
      {
        kind: "table",
        heading: "Which magic items are appropriate at each level in D&D 5e?",
        headers: [
          "Level band",
          "Rarity focus",
          "Illustrative finds",
          "Place sparingly",
        ],
        rows: [
          [
            "1 to 4",
            "Common consumables, then uncommon permanent items",
            "Potion of healing, a low-level spell scroll, a +1 weapon, a bag of holding",
            "Anything that grants repeatable flight, invisibility or teleportation, even though some such items are only uncommon",
          ],
          [
            "5 to 10",
            "Uncommon as routine finds, rare as signature items",
            "A +2 weapon, a ring of protection, a staff of healing, a cloak of protection carried from earlier levels",
            "A single very rare item as the closing reward of the whole band, not as a routine drop",
          ],
          [
            "11 to 16",
            "Rare as routine finds, very rare as signature items",
            "A +3 weapon, a staff of power, armour that resists a damage type",
            "Legendary items, which belong to major hoards and arc climaxes in this band",
          ],
          [
            "17 to 20",
            "Very rare as routine finds, legendary as signature items",
            "A legendary weapon with a name and history, a robe of the archmagi, a luck blade used with care",
            "Artefacts, which the 2024 guidance treats as plot devices rather than ordinary rewards",
          ],
        ],
      },
      {
        kind: "prose",
        heading: "Reading the bands, and a level 10 party",
        paragraphs: [
          "Treat the table as orientation, not as a schedule. It draws on two separate 5e sources that point the same way: the 2014 DMG rarity guidance, which suggests a character usually first finds rare items from about 5th level, very rare from about 11th and legendary from about 17th, and the 2024 Awarded by Level table, which distributes party gains by rarity across the same four bands. Rarity runs common, uncommon, rare, very rare and legendary, with artefacts beyond that scale. It is a rough measure of relative power and scarcity, not a guarantee of balance, as the next section shows. A common or uncommon consumable that solves one problem once is a different reward from an uncommon permanent item used in every fight, and the bands assume most finds are the smaller sort.",
          "Consider a party of four at level 10, at the end of the 5 to 10 band. On the 2024 table, a party that has played from 1st level has typically gained forty-five items in total across the first two bands, and on the Xanathar count the same forty-five, of which eight were major, permanent items. Many of the forty-five were potions, scrolls and small finds already used, sold or lost. A plausible picture today is therefore modest: each character relies on one or two permanent items, such as a magic weapon, a piece of protective gear or an attunement item that suits their role, the party shares a bag of holding and a small stock of consumables, and one character may carry the single very rare item the whole band produced.",
          "The next meaningful reward for that party is one deliberate step, not a shower. A rare item that opens a choice is a good default: a weapon with a property the fighter must position to use, a staff that gives the healer a new decision, or a cloak that trades protection for an attunement slot someone must free. Contrast two candidate finds at the same moment. A potion of water breathing, an uncommon consumable, lets one character breathe underwater for one hour: enough to swim a flooded passage, reach a drowned vault and return by the same route, and then it is gone. A wand of fireballs, a rare item that requires attunement by a spellcaster, holds charges that return each dawn and can put a fireball into fight after fight until the campaign ends. The rarities differ, but repeatability is the decisive difference: the potion solves one specific problem once, while the wand adds a recurring combat option you must design around.",
        ],
      },
      {
        kind: "list",
        heading: "What if a magic item seems overpowered?",
        intro:
          "Judge the item by what it does in your encounters over several sessions, not by its rarity label. Rarity cannot tell you these things, so check them directly:",
        items: [
          {
            term: "Repeatable or single use",
            text: "A consumable spends itself and leaves play. A permanent item with charges that return each dawn, or with no limit at all, will shape every future encounter. This is the largest single difference between two items of the same rarity.",
          },
          {
            term: "Action economy",
            text: "Count what the item lets its owner do with an action, a bonus action or a reaction, and whether it grants extra actions, movement or spells in a round. Either kind can be the stronger find: compare a new option with the character's existing best action, its activation cost and how often it can be used, and set that against the size and frequency of any improvement to an action they already rely on every round.",
          },
          {
            term: "Bounded accuracy",
            text: "D&D 5e keeps attack bonuses, Armour Class (AC), saving throw bonuses and Difficulty Classes (DCs) inside a fairly narrow range, a design idea often called bounded accuracy. A permanent bonus to any of them therefore lands harder than the small number suggests, and bonuses from several items that stack in the same place land harder still.",
          },
          {
            term: "Attunement",
            text: "A character can be attuned to at most three items at once, in both 5e editions. An item that requires attunement competes for one of those slots, which is a real cost. An equally strong item that does not require attunement bypasses that cost entirely, so compare attunement before you compare rarity.",
          },
          {
            term: "Stacking and combination",
            text: "Check the item alongside what the owner already has. Flight plus ranged attacks, high AC plus effects that punish a miss, or two sources of the same bonus can produce a result neither item creates alone.",
          },
          {
            term: "Bypassing whole obstacles",
            text: "Ask which kinds of problem the item simply removes: locked doors, darkness, water, walls, a need for rest, a whole category of monster defence. An item that retires a class of obstacle changes adventure design, not just combat numbers, and deserves the most care before you place it.",
          },
        ],
        outro:
          "If an item is already in play and proving stronger than you expected, do not take it away, quietly rewrite it or arrange for it to be stolen. Earned equipment is the player's property at the table, and removing it punishes the player for your placement decision. Let the item have its moments, widen the variety of problems so no single strength settles everything, and adjust what comes next: favour consumables, utility and attunement items for a while, slow the next permanent combat item, and note the observed effect so the next hoard is stocked with this party in mind. If the item is genuinely breaking the group's fun, say so honestly and agree a change with the player, such as a trade for something they would enjoy as much. A negotiated swap is a table agreement, not a confiscation.",
      },
      {
        kind: "list",
        heading: "How do I reward players who search everything?",
        intro:
          "Keep curiosity profitable without making it compulsory. Rotate the kind of return so a thorough search can produce any of these, and sometimes simply a fast, conclusive empty result:",
        items: [
          {
            term: "Mundane valuables",
            text: "Trade goods, saleable kit in good condition, a craftsman's tools, spice, cloth or a purse of small coins. Worth having, easy to price later, and no threat to encounter balance.",
          },
          {
            term: "Clues and secrets",
            text: "A roster, a letter, a map margin note, evidence of who was here and what they feared. Information is often the most useful thing a search can find where the fiction has actually placed it.",
          },
          {
            term: "Useful ordinary equipment",
            text: "Rope, oil, a pry bar, spare ammunition, a healer's kit, cold-weather gear the previous occupants left behind. The party leaves better prepared rather than richer.",
          },
          {
            term: "Environmental detail that changes a choice",
            text: "A draught that betrays a hidden passage, a weak floor, a stores list that shows the garrison is short of food. Detail the players can act on, rather than decoration they must interrogate.",
          },
          {
            term: "Contacts and goodwill",
            text: "A prisoner freed, a servant treated decently, a grave properly covered. People remember, and a name the party can call on later is a durable reward.",
          },
          {
            term: "Shortcuts and position",
            text: "A service stair, a roof route, a boat left tied below the wall. Searching well can buy a better approach to the next problem instead of a payout for the last one.",
          },
          {
            term: "Consequences, when the fiction calls for them",
            text: "Noise, time passing, a patrol arriving, dust and disease in a sealed tomb. Consequences keep searching a decision with a price, and they should follow from the place rather than punish the habit itself.",
          },
        ],
        outro:
          "Resolve routine searches at the speed they deserve. One check for the room, or none where there is time, light and no pressure, then a summary of what was found and a clear statement that the area has been thoroughly searched. Reserve detailed, object-by-object play for places where the players suspect something specific or the stakes are high. The same habit that stops a room becoming a payout machine also [stops players investigating every detail](/answers/stop-players-investigating-every-detail) at length: answer at the scale the search earns, and let interest, risk or resources promote a detail into a full scene.",
      },
      {
        kind: "checklist",
        heading: "Quick decision framework before you place a reward",
        intro:
          "Run through these questions in preparation, and again before you improvise a find at the table:",
        items: [
          "Who owned this, and does the amount and kind of treasure follow from their habits, wealth and reason for being here, rather than from how hard they were to fight?",
          "Which kind is this: routine possessions, individual pocket treasure, a hoard, or a major adventure reward such as payment, land or a favour?",
          "If you are using a table, are you rolling, choosing or adapting, and have you kept to one edition's procedure instead of mixing 2014 and 2024 guidance?",
          "Does this session need a magic item at all, and if so, should it be a consumable that leaves play or a permanent item the campaign will feel for months?",
          "If this is D&D 5e, does the item's rarity fit the party's level band, and have you checked repeatability, action economy, attunement, stacking and obstacle bypass rather than trusting the rarity label?",
          "Whose character does this serve, and does the spread of finds across the party still look fair over the last few levels?",
          "If the party searches and finds nothing, can you say so conclusively without inventing a compensating clue or payout, and state any time the search took?",
          "When the party tries to spend or sell this later, do you know which settlement, buyer or patron could actually handle it?",
        ],
      },
    ],
    relatedTools: [
      {
        title: "Magic item generator",
        description:
          "Draft a candidate item with rarity, properties and history once you have decided the pace and band a hoard should serve.",
        href: "/generators/magic-item",
      },
      {
        title: "Minor magic item and trinket generator",
        description:
          "Stock the consumable end of a hoard: charms, potions and limited-use finds that reward a search without reshaping the campaign.",
        href: "/generators/minor-magic-item",
      },
      {
        title: "RPG item and loot generator",
        description:
          "Generate ordinary loot and equipment for routine possessions and mundane valuables, with rarity and backstory where you want them.",
        href: "/generators/item",
      },
    ],
    relatedAnswers: [
      "stop-players-investigating-every-detail",
      "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
      "how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
      "how-common-should-magic-be-in-a-fantasy-world",
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
    ],
    discovery: {
      id: "answer-loot-and-magic-item-rewards",
      parentCluster: "rewards-and-treasure",
      clusters: ["rewards-and-treasure", "running-the-game"],
      primaryIntent:
        "how much loot and how many magic items should i give my players",
      intentAliases: [
        "how much treasure should i give my players",
        "how many magic items per level dnd",
        "dnd loot per session how much",
        "treasure hoard vs individual treasure",
        "how often should players find magic items",
        "does every enemy need loot rpg",
      ],
      uniqueValue:
        "Separates routine possessions, individual treasure, hoards and major adventure rewards, then paces magic items at campaign level with a D&D 5e level-band table, a level 10 party illustration, a rarity-versus-impact check and a worked example of a thorough search that finds no treasure.",
      userJob: "adopt-workflow",
      relatedIntents: [
        "answer-stop-players-investigating-every-detail",
        "answer-settlement-market-buy-sell",
        "answer-upgrade-weapon-without-replacing",
        "answer-how-common-should-magic-be-in-a-fantasy-world",
        "generator-magic-item",
        "generator-item",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-stop-players-investigating-every-detail",
          reason:
            "That answer covers how description makes background detail look like a hook and how to scale an investigation. This answer covers what the investigation should find: reward categories, treasure pacing and magic item frequency.",
        },
        {
          with: "answer-settlement-market-buy-sell",
          reason:
            "That answer rules what a party can buy, commission or sell once it has treasure. This answer rules the earlier step of how much treasure and how many magic items enter play in the first place.",
        },
        {
          with: "answer-how-common-should-magic-be-in-a-fantasy-world",
          reason:
            "That answer sets how prevalent magic is in a setting as a whole. This answer sets the narrower reward pace for one adventuring party inside such a setting.",
        },
      ],
    },
    seo: {
      title: "How Much Loot and Magic Items to Give Players | Codex Cryptica",
      description:
        "Give treasure where it makes sense, pace magic items to your campaign, and reward exploration without turning every corpse into a prize.",
      image:
        "https://assets.codexcryptica.com/og/how-much-loot-and-how-many-magic-items-should-i-give-my-players.jpg",
      imageAlt:
        "Adventurers opening a stone coffer of coins and a jewelled cup in a torchlit dungeon vault while a companion inspects an empty alcove beside them",
    },
  };
