import type { AnswerConfigInput } from "../schema";

export const howMuchRuleOfCoolShouldADmAllow: AnswerConfigInput = {
  slug: "how-much-rule-of-cool-should-a-dm-allow",
  category: "session-prep",
  question: "How much Rule of Cool should a DM allow?",
  kind: "framework",
  publishedAt: "2026-09-10",
  shortAnswer:
    "Use the Rule of Cool when a player attempts something creative that fits the fictional situation, but resolve it using existing game mechanics whenever possible. Let creativity change what a character can attempt within the narrative world, rather than automatically granting a numerically superior mechanical result. By separating narrative permission from mechanical resolution, Dungeon Masters reward clever thinking while preserving tactical balance and avoiding broken campaign precedents.",
  sections: [
    {
      kind: "prose",
      heading: "Fiction gives permission, mechanics determine effect",
      paragraphs: [
        "The Rule of Cool exists to prevent rigid rules from stifling player imagination. When a barbarian asks to slice a chandelier rope and ride the counterweight up to a balcony, or an illusionist asks to project smoke into a sentry's eyes, saying no simply because the core rulebook lacks a dedicated chapter for that specific stunt makes combat sterile. Tabletop roleplaying games thrive because players can declare actions outside a pre-programmed action menu.",
        "The risk arises when a Dungeon Master rewards a cool idea by inventing a new, strictly superior mechanical outcome on the fly. If swinging from a chandelier automatically deals triple damage and knocks an ogre prone without a saving throw, every player will spend subsequent encounters looking for chandeliers. The moment a creative improvisation outperforms specialised class abilities, spells, and magic items, tactical choice collapses. The fundamental guideline is simple: the narrative fiction determines what can be attempted, but existing game mechanics determine the outcome.",
        "This is why Rule of Cool is not a substitute for rules-as-written (RAW): it never overrides an existing mechanic, it only interprets or reskins one. Rule of Cool answers the question of what a character may attempt and how the fiction describes it, while RAW still answers the question of what actually happens once dice are rolled. A DM using Rule of Cool correctly is translating a creative pitch into the closest RAW mechanic, not writing a new rule that beats it.",
      ],
    },
    {
      kind: "list",
      heading: "The five-tier ruling framework",
      intro:
        "When a player pitches an unconventional, cinematic, or expressive action, categorise the request into one of five table responses:",
      items: [
        {
          term: "Yes",
          text: "The action is purely flavourful or fits established basic movement and interactions without altering the mechanical stakes. If a paladin wants to kick open a tavern door, describe the splinters flying and resolve initiative normally without demanding an athletic check.",
        },
        {
          term: "Yes, make a roll",
          text: "The stunt is plausible within the narrative environment, but success is genuinely uncertain and failure carries a real cost. Resolve the action using the closest existing skill check, attack roll, or saving throw difficulty class rather than inventing custom maths.",
        },
        {
          term: "Yes, but",
          text: "Allow the creative manoeuvre with an explicit operational trade-off. The character may achieve the intended effect, but must spend an existing resource: an extra action economy cost, reduced speed, consuming their reaction, or accepting a tactical hazard on a failed attempt.",
        },
        {
          term: "Not like that, but",
          text: "Redirect the proposal when it threatens to duplicate or undermine another player's class feature, spell slot, or party role. If a wizard attempts to use a zero-cost prestidigitation cantrip to blind an ancient dragon, clarify that cantrips cannot replicate a second-level blindness spell, but offer to use the cantrip to grant advantage to an ally's immediate distraction roll.",
        },
        {
          term: "No",
          text: "Deny the action when it breaks agreed campaign tone, bypasses major encounter stakes without risk, or asks the fiction to support the physically impossible within your system. Explain the physical contradiction calmly, maintain table trust, and ask the player for their character's next intent.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked rulings: Creative intent versus mechanical scope",
      paragraphs: [
        "Comparing how a Dungeon Master handles expressive, unconventional player pitches demonstrates how to preserve narrative excitement without breaking the rules engine:",
      ],
      items: [
        {
          term: "The stone spear pitch",
          text: "A spellcaster with earth manipulation cantrips asks to rip a stone flagstone from the floor, shape it into a barbed javelin, and hurl it at an oncoming hobgoblin warlord.",
        },
        {
          term: "The flawed ruling",
          text: "The DM grants 3d10 piercing damage and inflicts a bleeding condition because stone seems heavier than normal weapons. In the next encounter, the player ceases casting levelled spells and only throws stone spears, rendering the fighter's longbow obsolete.",
        },
        {
          term: "The framework ruling",
          text: "The DM allows the stone spear to exist in the narrative fiction, but resolves it mechanically using an existing ranged spell attack or improvised thrown weapon dealing standard 1d6 damage. The player receives the cinematic joy of earthen combat without distorting weapon balancing.",
        },
        {
          term: "Why it works",
          text: "The player's creative idea changes the sensory reality of the table, but the underlying encounter maths remain stable. No player at the table feels that their specialised gear or martial training has been cheapened.",
        },
        {
          term: "The heating construct armour pitch",
          text: "A fire-themed sorcerer asks to channel a fire cantrip through an animated construct's metal plating so the armour glows red-hot, hoping to sear anyone who grapples it.",
        },
        {
          term: "The flawed ruling",
          text: "The DM rules that anyone who touches the construct automatically takes ongoing fire damage every round with no save, effectively granting the construct a free legendary trait that no published statblock offers at this tier.",
        },
        {
          term: "The framework ruling",
          text: "The DM allows the armour to glow and narrates the heat, but resolves it as an existing reaction: the construct gains the reskinned effect of a known spell or feature, such as dealing the cantrip's normal damage only when a creature starts its turn grappling the construct, using the cantrip's existing damage and save DC.",
        },
        {
          term: "Why it works",
          text: "The visual and thematic payoff lands immediately, but the damage output still traces back to a mechanic already balanced against the sorcerer's level and spell slots, so the construct never outperforms an actual monster feature.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The one-time stunt agreement and campaign precedent",
      paragraphs: [
        "A major fear among Dungeon Masters is setting a dangerous precedent: if you allow an unconventional manoeuvre once, players may demand to repeat it in every subsequent session. The solution is explicit meta-communication during the ruling. If a player attempts a dramatic, high-stakes stunt during a campaign climax, frame the allowance as a unique, non-repeatable circumstance.",
        "Saying 'This works right now because the collapsing ceiling gives you leverage, but it will not work as a standard combat option' sets clear table boundaries. It honours the drama of the moment while protecting future sessions from exploitation. If a player wants an improvised stunt to become part of their character's permanent mechanical toolkit, invite them to invest in an official feat, multiclass option, or custom downtime training.",
      ],
    },
    {
      kind: "checklist",
      heading: "Quick ruling checklist at the table",
      intro:
        "Before approving an improvised player stunt, run through these four sanity checks:",
      items: [
        "Verify whether the proposed manoeuvre duplicates or invalidates another party member's spell, feat, or class feature.",
        "Map the resolution to an existing skill, attack roll, or improvised damage baseline instead of inventing bespoke mechanics.",
        "State any associated resource cost, action economy penalty, or risk before the player commits to rolling.",
        "Clarify explicitly whether the ruling is a one-time environmental stunt or an ongoing house rule for the campaign.",
      ],
    },
  ],
  codexConnection: {
    heading: "Recording custom rulings and table precedents in Codex Cryptica",
    paragraphs: [
      "Consistent rulings build table trust. When a Dungeon Master approves an improvised rule, custom environmental hazard, or agreed table interpretation, recording it prevents recurring arguments in later sessions.",
      "Codex Cryptica's campaign manager allows DMs to link custom house rules directly to character sheets, campaign style guides, and session prep logs. When an improvised stunt becomes an established campaign tradition, record it once and keep your entire table aligned.",
    ],
    linkText: "Explore Codex Cryptica Campaign Manager",
    href: "/solutions/campaign-manager",
  },
  systemsThatSupportThis: [
    {
      system: "Exalted",
      rationale:
        "Exalted's stunt system awards bonus dice based on how evocative and cinematically described an action is — a one-sentence visual earns one bonus die, a vivid environmental interaction earns two, and a genuinely memorable piece of narration earns three — making descriptive quality a direct mechanical input to every roll.",
      href: "https://www.drivethrurpg.com/product/162759/Exalted-3rd-Edition",
    },
    {
      system: "Wushu",
      rationale:
        "Wushu's core resolution rule is 'the more details you narrate, the more dice you roll': each descriptive detail a player adds to their action declaration grants one additional die, explicitly converting cinematic imagination into mechanical advantage on every action.",
      href: "https://www.drivethrurpg.com/product/17044/Wushu-Open",
    },
    {
      system: "Feng Shui 2",
      rationale:
        "Feng Shui 2 formalises stunts through its shot-cost system and explicit GM guidance: rolling 4 or more above difficulty earns a free cinematic benefit, and the rules instruct players to narrate 'awesome hijinx' rather than saying 'I hit him', making descriptive engagement structurally expected rather than optional.",
      href: "https://www.atlas-games.com/fengshui2/",
    },
  ],
  relatedTools: [
    {
      title: "Combat Encounter Generator",
      description:
        "Draft tactical encounters, terrain hazards, and environmental features for your sessions.",
      href: "/generators/encounter",
    },
    {
      title: "D&D 5e NPC Generator",
      description:
        "Create memorable characters with distinct motives, mannerisms, and combat profiles.",
      href: "/generators/dnd-npc",
    },
  ],
  relatedForPages: [
    {
      title: "Dungeons & Dragons Campaign Hub",
      description:
        "Session prep frameworks, encounter pacing, and campaign organisation for D&D DMs.",
      href: "/for/dungeons-and-dragons",
    },
    {
      title: "Pathfinder 2e Campaign Hub",
      description:
        "Three-action economy, encounter budgets, and tactical rulings for running Pathfinder.",
      href: "/for/pathfinder-2e",
    },
  ],
  relatedAnswers: [
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-i-run-a-successful-session-0",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
  ],
  discovery: {
    id: "answer-how-much-rule-of-cool-should-a-dm-allow",
    parentCluster: "gm-improvisation",
    primaryIntent: "how much rule of cool should a dm allow",
    intentAliases: [
      "rule of cool dnd",
      "does rule of cool override raw",
      "how to use rule of cool without breaking the game",
      "rule of cool examples for dms",
      "when to say no as a dm",
    ],
    uniqueValue:
      "A five-tier ruling framework for Dungeon Masters that separates fictional permission from mechanical effect, allowing creative player actions without breaking game balance or setting overpowered precedents.",
    relatedIntents: [
      "answer-players-going-off-script",
      "answer-session-zero",
      "answer-encounter-balance",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-players-going-off-script",
        reason:
          "The off-script page covers broad narrative direction and repositioning prep when players ignore hooks; this page focuses specifically on resolving tactical and mechanical stunts through the five-tier Rule of Cool framework without breaking game balance.",
      },
    ],
  },
  seo: {
    title: "How Much Rule of Cool Should a DM Allow? | Codex Cryptica",
    description:
      "Learn how to use the Rule of Cool in tabletop RPGs without breaking game balance. Use our 5-tier ruling framework to reward player creativity fairly.",
    image:
      "https://assets.codexcryptica.com/og/how-much-rule-of-cool-should-a-dm-allow.jpg",
    imageAlt:
      "A Dungeon Master making an expressive ruling at a candlelit tabletop covered in maps and dice",
  },
};
