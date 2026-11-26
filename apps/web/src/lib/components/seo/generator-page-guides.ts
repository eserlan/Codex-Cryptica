import type { ValidSlug } from "./generator-types";

export interface GeneratorGuide {
  summary: string;
  tips: { title: string; detail: string }[];
  links?: { href: string; label: string }[];
}

export const SLUG_GUIDES: Partial<Record<ValidSlug, GeneratorGuide>> = {
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
      "A tabletop conlang only needs enough phonology, naming patterns, and 8–12 everyday words to make place names, inscriptions, and NPC titles sound cohesive at the table.",
    tips: [
      {
        title: "Match sound to culture",
        detail:
          "Pair clipped consonants with military or bureaucratic tongues and vowel-rich structures with coastal, liturgical, or courtly speech.",
      },
      {
        title: "Reuse roots across the map",
        detail:
          "Take two or three generated root words for river, gate, or stone and combine them into local landmarks so players can decode names by ear.",
      },
      {
        title: "Keep idioms playable",
        detail:
          "Drop one untranslated greeting or oath into NPC dialogue rather than full sentences—players remember a single recurring phrase.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
        label: "Building distinct cultures",
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
      "Memorable RPG characters come from a visible habit, a private pressure, and one contradiction—not a two-page monologue.",
    tips: [
      {
        title: "Lead with one physical tell",
        detail:
          "Pick a single posture, vocal cadence, or prop from the draft so you can drop straight into character without acting.",
      },
      {
        title: "Play the want against the fear",
        detail:
          "When players push an NPC, decide whether they protect their public reputation or chase their secret goal.",
      },
      {
        title: "Save keepers to your vault",
        detail:
          "Use Save to Codex to keep recurring contacts linked to the locations and factions where players met them.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
        label: "Roleplaying NPCs without acting",
      },
    ],
  },
  npc: {
    summary:
      "Every table-ready NPC needs three things: a clear role in the scene, a faction or personal stake, and one secret that changes how the party negotiates with them.",
    tips: [
      {
        title: "Give them an immediate agenda",
        detail:
          "Decide what the NPC wants in the next ten minutes before the party even speaks to them.",
      },
      {
        title: "Connect them to a place or faction",
        detail:
          "Link the NPC to an existing settlement or guild so their alliances and enemies ripple through the campaign.",
      },
      {
        title: "Leave the secret discoverable",
        detail:
          "Plant one visible clue in their gear, companions, or ledger that rewards curious players.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-improvise-npcs-in-dnd",
        label: "How to improvise NPCs",
      },
      {
        href: "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
        label: "Roleplaying without acting",
      },
    ],
  },
  settlement: {
    summary:
      "A believable settlement exists for a reason—a ford, mine, shrine, or relay—and stays interesting because two local groups disagree on how to run it.",
    tips: [
      {
        title: "Anchor the economy to one export",
        detail:
          "Build the market, guards, and visitor traffic around the town's main trade good or strategic choke point.",
      },
      {
        title: "Put the tension on main street",
        detail:
          "Show the local conflict in the first scene—a closed gate, a tax dispute, or a ration queue—rather than burying it in lore.",
      },
      {
        title: "Seed three recurring faces",
        detail:
          "Pair the settlement with an official, a broker, and a local troublemaker so players have immediate contacts.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-design-a-geographically-realistic-town-or-village",
        label: "Designing realistic settlements",
      },
      {
        href: "/answers/how-do-i-decide-what-a-settlement-produces-imports-and-exports",
        label: "Settlement trade and exports",
      },
    ],
  },
  "adventure-generator": {
    summary:
      "Use an adventure outline as a situation with pressure, not a rigid script: set a ticking clock, two competing NPCs, and clues that point forward even when plans go sideways.",
    tips: [
      {
        title: "Start near the inciting pressure",
        detail:
          "Open with the witness, contract, or crisis already knocking on the party's door so session one has momentum.",
      },
      {
        title: "Convert to an Adventure Canvas",
        detail:
          "Click Open Adventure Canvas on the output to turn locations, factions, and clues into a movable relationship map.",
      },
      {
        title: "Keep outcomes open",
        detail:
          "Let player choices determine which faction wins—track only what each side will do if the party ignores them.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-prepare-an-rpg-session-step-by-step",
        label: "Preparing a session step by step",
      },
      {
        href: "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
        label: "Planning campaign story arcs",
      },
    ],
  },
  "point-crawl": {
    summary:
      "Point crawls replace empty hex-counting with meaningful travel decisions: every node is a landmark or hazard, and every route has a cost, risk, or secret shortcut.",
    tips: [
      {
        title: "Make junctions ask a question",
        detail:
          "Give each fork a clear trade-off—fast and exposed versus slow and hidden—so players can make informed choices.",
      },
      {
        title: "Use loops, not straight lines",
        detail:
          "At least one alternate loop or secret path prevents dead ends and rewards scouting.",
      },
      {
        title: "Keep node prep to three lines",
        detail:
          "What is visible on arrival, what hazard or inhabitant waits here, and what clue points to neighbouring nodes.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
        label: "Building a point crawl",
      },
      {
        href: "/answers/point-crawl-vs-hex-crawl",
        label: "Point crawl vs hex crawl",
      },
    ],
  },
  rumour: {
    summary:
      "Great rumours give players actionable leads without spoiling the truth: mix reliable gossip, distorted exaggerations, and dangerous misconceptions.",
    tips: [
      {
        title: "Always name a pursuable lead",
        detail:
          "A rumour should mention a specific NPC, dock, ruin, or faction the party can visit right away.",
      },
      {
        title: "Separate player gossip from GM truth",
        detail:
          "Read only the rumour bullets aloud; keep the Reality and If Investigated notes behind the screen.",
      },
      {
        title: "Drop two rumours per tavern stop",
        detail:
          "Giving players a choice between competing leads turns downtime into player-driven exploration.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-get-a-stalled-rpg-investigation-moving-again",
        label: "Keeping investigations moving",
      },
    ],
  },
  "bbeg-generator": {
    summary:
      "A compelling main villain believes they are solving a real problem—and uses lieutenants, leverage, and a ticking clock so the party feels their reach before meeting them.",
    tips: [
      {
        title: "Define what happens if the party does nothing",
        detail:
          "Give the villain three concrete milestones so their scheme advances visibly between sessions.",
      },
      {
        title: "Put lieutenants in the spotlight early",
        detail:
          "Let players clash with the villain's agents and policies long before the final confrontation.",
      },
      {
        title: "Offer a moral or tactical flaw",
        detail:
          "A blind spot—pride, an oath, or an old ally—gives clever players a way to disrupt the plan without brute force.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
        label: "Making threats feel urgent",
      },
    ],
  },
  creature: {
    summary:
      "Memorable monsters behave like living creatures (or focused hazards) with a habitat, a tell before they strike, and an instinct that tells you when they flee or bargain.",
    tips: [
      {
        title: "Telegraph their signature threat",
        detail:
          "Show tracks, scorched masonry, or prey behaviour before initiative starts so players can prepare tactics.",
      },
      {
        title: "Give every creature a non-combat motive",
        detail:
          "Territorial defence, hunger, or protecting a nest creates opportunities for stealth, bribery, or retreat.",
      },
      {
        title: "Pair with terrain",
        detail:
          "Drop the creature into an environment that favours its movement or senses rather than a flat room.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
        label: "Balancing combat encounters",
      },
    ],
  },
  "god-generator": {
    summary:
      "Deities feel real in a campaign when you see how ordinary people bargain with them—shrines, taboos, rival priesthoods, and small daily prayers.",
    tips: [
      {
        title: "Focus on worship, not cosmic stats",
        detail:
          "Define one visible shrine custom and one taboo that players notice when entering a temple town.",
      },
      {
        title: "Give domains human friction",
        detail:
          "Two sects of the same god often disagree harder than rival pantheons.",
      },
    ],
    links: [
      {
        href: "/answers/can-multiple-gods-share-a-domain",
        label: "Sharing divine domains",
      },
    ],
  },
  quest: {
    summary:
      "Each result is a quest with a hook, a location, a key NPC, a threat, a complication, a twist and a reward. The vibe sets the hook, the complication and the names, and the GM notes hold the scope and any campaign context.",
    tips: [
      {
        title: "Pick the vibe first",
        detail:
          "Choose a vibe changes the Tone, Scope, Location Type, Main Threat, Twist and Reward options, so each vibe offers its own choices. It also sets the hook, the complication and the key NPC's name.",
      },
      {
        title: "Read the scope in the GM notes",
        detail:
          "Scope appears as a Core Field in the GM notes, drawn from the labels of the vibe you chose, such as City-wide for Cyberpunk or Territory-scale (frontier) for Western.",
      },
      {
        title: "Give the campaign context a situation",
        detail:
          "Optional Campaign Context is preserved in a dedicated GM-note section, separate from the hook and threat. Write a situation the GM can connect to the quest.",
      },
    ],
  },
  "faction-roster": {
    summary:
      "An offline draft is a note listing 3 to 6 members of one faction, each with a duty, motive, stance, immediate want, leverage point and connection to another member. The AI draft is prompted for the selected number and these details, though its returned structure can vary. Any people already named in the faction you paste in take the first places.",
    tips: [
      {
        title: "Paste in the named people",
        detail:
          "In The faction field, paste a generated faction with its Notable NPCs list. Each named person keeps their name and description and takes a place before any new members are added.",
      },
      {
        title: "Set the roster emphasis",
        detail:
          "In Roster emphasis, Public face puts the authority figure and the true believer on the roster, and Internal dissent puts the conflicted member and the internal problem there. Field operators and New blood each bring the recent recruit in.",
      },
      {
        title: "Let the vibe name the new members",
        detail:
          "The Choose a vibe field sets the names of members the faction does not already name, so a Cyberpunk roster gets names such as Mira and Kade. Text in Add campaign context (optional) goes into the GM notes under Campaign Context, not into the member text.",
      },
    ],
  },
  "artifact-generator": {
    summary:
      "Each result is a named relic with dormant, awakened and ascendant powers, an attunement ritual, a cost, factions that want it, adventure hooks and a way to destroy it. GM notes retain your campaign setting, while its vibe shapes the factions, rumours and hooks.",
    tips: [
      {
        title: "Set the curse to set the cost",
        detail:
          "In the offline draft, Curse / Cost / Drawback sets the Cost, Curse, Corruption, or Taboo paragraph. Choose None (Pure Burden of Custody) for a relic that is heavy to keep but has no supernatural price.",
      },
      {
        title: "Let the status open the adventure",
        detail:
          "In the offline draft, Current Status puts one matching hook first. A relic Sealed in Royal / High-Security Vault opens with a vault break, while one Lost in Ruined Sanctuary opens with getting into the sanctuary.",
      },
      {
        title: "Use the tier to set how far it reaches",
        detail:
          "Power Tier / Scope changes only the Ascendant / Zenith Powers line. Heroic Wonder and Regional Masterpiece give it a smaller reach than Cataclysmic Power, and the dormant and awakened powers stay the same at every tier.",
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
  "dark-fantasy-faction": {
    summary:
      "Each result is a named dark fantasy faction shaped by the mode, type, scope and moral posture you pick. You get what it wants, what is tearing it apart, named NPCs, a rival and a hook. Use it when the table needs a power whose cruelty or compromise still makes sense from the inside, such as a plague cult or a corpse guild.",
    tips: [
      {
        title: "Let the mode set the pressure",
        detail:
          "Dark fantasy mode is the disaster the faction is built on. The draft says they stand on it in What they control and names it as the place they operate through in the summary, so pick the mode that matches your campaign's crisis.",
      },
      {
        title: "Match the moral posture to the danger",
        detail:
          "Moral posture drives the Why they are dangerous section. Openly cruel shows a faction that no longer hides its methods, while Fallen idealists describes a group that once meant well, which gives the party someone to negotiate with.",
      },
      {
        title: "Use the scope and campaign context for place",
        detail:
          "Operating scope sets the area named in What they control, so a single plague-stricken village and an entire doomed barony put very different pressure on the party. In the offline draft, anything typed into Add campaign context is added to the end of How to use them at the table as Campaign context.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
        label: "Running faction play",
      },
    ],
  },
  "minor-magic-item": {
    summary:
      "Each result gives you a small item with a description, a quick reference, an effect, a quirk and a suggested use. The usage limit and the way the item is activated decide how it plays, so settle those before you read the effect.",
    tips: [
      {
        title: "Set the usage limit before the effect",
        detail:
          "The usage limit tells players how often the item can help them. A single-use item suits one dramatic moment, while fragile charges give a few uses before it breaks.",
      },
      {
        title: "Use the quirk as a cost",
        detail:
          "The quirk can be a sensory or environmental side effect, such as chalky residue or a sudden draft. Treat it as a giveaway or cost only when the generated detail fits, and set Quirk or Side Effect to 'None' when it should be clean.",
      },
      {
        title: "Match the effect to the scene, not the vibe",
        detail:
          "The same effect can appear under different vibes, sometimes with only the heading changed. Read the effect against what the party is doing right now before you decide what it means.",
      },
    ],
  },
  kingdom: {
    summary:
      "Each draft names a realm, its ruler and capital, two rival factions and the hidden problem its rulers would rather nobody found. In an offline draft the Immediate Hook, two of the rumours and the last entity seed all lead back to that problem; the examples below come from the offline draft, and the AI draft works from the same choices in its own words.",
    tips: [
      {
        title: "Pick Government style for the person the party petitions",
        detail:
          "Government style sets how the ruler holds power and the note beside their name, from an heir without a trusted successor under Hereditary dynasty to a general who never stood down under Military dictatorship. Choose it for the kind of audience the party will have to win.",
      },
      {
        title: "Let Geography decide the capital and the prize",
        detail:
          "Geography places the capital, such as an oasis city with guarded wells in Arid desert, and decides what the first faction controls, such as the mines and the mountain passes in Mountain range. That faction is the easiest employer for a party looking for work, and Geography also adds one rumour.",
      },
      {
        title: "Use Conflict level to set the opposition's next move",
        detail:
          "Conflict level writes the Society & Culture section and the second faction's agenda: during Total war it is talking to the enemy in secret, and after Post-war recovery it wants a reckoning. Magic level adds its own line under Government & Power, and an offline draft files Campaign context (optional) under its own heading in the GM notes.",
      },
    ],
  },
  tavern: {
    summary:
      "Each result is a named tavern with an owner, a few regulars, a hidden problem, an opening hook and a short list of rumours in the GM notes. Read the Hidden Problem line first: in an offline draft, the Immediate Hook and two of the rumours lead the party towards it.",
    tips: [
      {
        title: "Let Wealth level set the table",
        detail:
          "Wealth level changes the signature drink or dish and the line about the room, from thin barley beer on a dirt floor to brandy poured from a locked cabinet. Pick it for what the party can afford tonight, not for the size of the town.",
      },
      {
        title: "Choose Primary clientele for the contact you need",
        detail:
          "Primary clientele decides who the two notable patrons are, such as a one-handed sergeant for Soldiers and mercenaries or a fence at the corner table for Criminals and fence-seekers. Pick the crowd that holds the witness or ally your next scene needs.",
      },
      {
        title: "Use Settlement type to point outside",
        detail:
          "In an offline draft the last rumour comes from the Settlement type, such as a ship that has not unloaded in a Coastal port. Use it to send the party back out once the tavern's own trouble is known; anything typed in Campaign context (optional) stays in the GM notes.",
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
      "Even mundane gear or signature keepsakes carry story weight when you add a maker's mark, a quirk of wear, and a previous owner who might want it back.",
    tips: [
      {
        title: "Attach one story hook to loot",
        detail:
          "A scratched crest, serial number, or courier seal turns found equipment into an instant lead.",
      },
      {
        title: "Balance power with a clear cost",
        detail:
          "Noticeable side effects or maintenance needs make special gear memorable without breaking encounter balance.",
      },
    ],
    links: [
      {
        href: "/answers/how-common-should-magic-be-in-a-fantasy-world",
        label: "Calibrating magic rarity",
      },
    ],
  },
  business: {
    summary:
      "Player-run or NPC businesses shine when they generate leads, debts, and rival pressures—not just bookkeeping spreadsheets.",
    tips: [
      {
        title: "Tie suppliers to adventure hooks",
        detail:
          "A delayed shipment or rival guild tariff gives the party a personal reason to investigate.",
      },
      {
        title: "Name two staff members",
        detail:
          "A loyal clerk and an ambitious apprentice keep the business alive while the party is out of town.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-run-a-campaign-where-the-players-own-a-business",
        label: "Running player-owned businesses",
      },
    ],
  },
  heist: {
    summary:
      "A great RPG heist gives players a clear target, layered security they can scout in advance, and a complication that forces improvisation once they are inside.",
    tips: [
      {
        title: "Reward reconnaissance",
        detail:
          "Let every guard shift, delivery schedule, or blueprint detail be discoverable before the job begins.",
      },
      {
        title: "Keep the exit harder than the entry",
        detail:
          "Triggering an alarm or rival crew during extraction creates tension without stalling the opening.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-run-a-stealth-mission-in-a-tabletop-rpg",
        label: "Running stealth & heist missions",
      },
    ],
  },
  "mystery-investigation": {
    summary:
      "Keep tabletop mysteries moving with three independent clues per revelation so a single failed skill check never stalls the session.",
    tips: [
      {
        title: "Anchor clues to people and places",
        detail:
          "Every node in the mystery graph should point to at least one witness, physical trace, or ledger.",
      },
      {
        title: "Escalate when the trail cools",
        detail:
          "If players hesitate, have the culprit try to cover their tracks—leaving a fresh lead behind.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-i-get-a-stalled-rpg-investigation-moving-again",
        label: "Unsticking stalled investigations",
      },
    ],
  },
  puzzle: {
    summary:
      "Each draft puts an obstacle between the party and the Puzzle purpose you choose, then gives you clues, spotlight prompts, alternate solutions and what a failed attempt does. The intended solution and the escalating hints sit in the GM notes, so you can read the setup aloud and keep the answer back.",
    tips: [
      {
        title: "Let Puzzle style pick the obstacle",
        detail:
          "Offline drafts choose the obstacle from the Puzzle style: Social gives a suspicious gatekeeper or two guards who disagree, Mechanical a locked mechanism or a panel of gears. A style you type yourself gets a plain obstacle, so describe it in your own words.",
      },
      {
        title: "Use Complexity to set the solution length",
        detail:
          "In offline drafts, Complexity sets how many linked actions the GM-only solution needs: two for Simple, three for Moderate and four for Elaborate. Pair a long chain with Failure pressure set to None if you want players to experiment without cost.",
      },
      {
        title: "Name what your party can actually do",
        detail:
          "Abilities listed in PC capabilities to make matter are treated as openings, never requirements: an offline draft names them in the spotlight section, and the AI draft is told to make them useful. Participation style then says whether one character, two or three, or the whole party leads the solve.",
      },
    ],
    links: [
      {
        href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
        label: "Designing puzzles that do not stall",
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
