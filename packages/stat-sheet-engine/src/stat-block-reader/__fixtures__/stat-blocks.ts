/**
 * Reference stat blocks for the reader tests and the accuracy eval script.
 * Every creature here is written for this repository. None is copied from a
 * commercial book (FR-024). Each id is matched by ai-responses.ts.
 */
export type StatBlockFixtureKind =
  "creature" | "npc" | "no-stat-block" | "several" | "character" | "5e";

export interface StatBlockFixture {
  id: string;
  kind: StatBlockFixtureKind;
  /** Plain text, or a JSON string for the Foundry export. */
  source: string;
}

export const STAT_BLOCK_FIXTURES: StatBlockFixture[] = [
  {
    id: "clean-hill-brute",
    kind: "creature",
    source: `Hill Brute
Large giant, chaotic evil
Armor Class 13 (hide armor)
Hit Points 45 (6d10+12)
Speed 30 ft.
STR 18 (+4) DEX 8 (-1) CON 14 (+2) INT 6 (-2) WIS 9 (-1) CHA 7 (-2)
Saving Throws STR +6, CON +4
Skills Athletics +6
Senses passive Perception 9
Languages Giant
Challenge 3 (Doom 2)
Traits
Brute Rage. Once per rest, the brute can fly into a rage.
Actions
Greatclub. Melee Attack: +6 to hit, 1d10+4 bludgeoning damage.`,
  },
  {
    id: "clean-frost-wolf",
    kind: "creature",
    source: `Frost Wolf
Medium beast, unaligned
Armor Class 13 (natural armor)
Hit Points 37 (5d8+15)
Speed 40 ft.
STR 14 (+2) DEX 15 (+2) CON 16 (+3) INT 3 (-4) WIS 12 (+1) CHA 6 (-2)
Skills Perception +3, Stealth +4
Senses passive Perception 13
Languages —
Challenge 2
Traits
Pack Tactics. The wolf has advantage on attack rolls when an ally is within 5 feet of the target.
Actions
Icy Bite. Melee Attack: +4 to hit, 2d6+2 cold damage.`,
  },
  {
    id: "clean-bog-horror",
    kind: "creature",
    source: `Bog Horror
Huge aberration, neutral
Armor Class 15 (thick hide)
Hit Points 84 (8d12+24)
Speed 20 ft., swim 30 ft.
STR 20 (+5) DEX 9 (-1) CON 17 (+3) INT 2 (-4) WIS 10 (+0) CHA 5 (-3)
Saving Throws CON +6
Damage Resistances acid
Damage Immunities poison
Condition Immunities poisoned
Senses darkvision 60 ft., passive Perception 10
Languages —
Challenge 5 (Doom 3)
Actions
Crushing Grasp. Melee Attack: +8 to hit, 2d8+5 bludgeoning damage.`,
  },
  {
    id: "clean-cave-warden",
    kind: "creature",
    source: `Cave Warden
Large construct, lawful neutral
Armor Class 17 (stone plating)
Hit Points 110 (13d10+39)
Speed 30 ft.
STR 19 (+4) DEX 8 (-1) CON 16 (+3) INT 7 (-2) WIS 11 (+0) CHA 3 (-4)
Saving Throws STR +7, WIS +3
Damage Immunities poison, psychic
Senses blindsight 30 ft., passive Perception 10
Languages understands Common but cannot speak
Challenge 7 (Doom 4)
Actions
Stone Fist. Melee Attack: +7 to hit, 2d10+4 bludgeoning damage.
Legendary Actions
Stomp. The warden moves up to half its speed without provoking opportunity attacks. Cost 1.`,
  },
  {
    id: "clean-cave-imp",
    kind: "creature",
    source: `Cave Imp
Tiny fiend, lawful evil
Armor Class 14
Hit Points 13 (3d4+6)
Speed 20 ft., fly 40 ft.
STR 6 (-2) DEX 17 (+3) CON 14 (+2) INT 11 (+0) WIS 12 (+1) CHA 14 (+2)
Skills Stealth +5
Senses darkvision 120 ft., passive Perception 11
Languages Infernal
Challenge 1/2
Actions
Claw. Melee Attack: +5 to hit, 1d4+3 slashing damage.`,
  },
  {
    id: "clean-bandit-captain",
    kind: "npc",
    source: `Bandit Captain
Medium humanoid, any non-good alignment
Armor Class 15 (chain shirt)
Hit Points 65 (10d8+20)
Speed 30 ft.
STR 15 (+2) DEX 16 (+3) CON 14 (+2) INT 14 (+2) WIS 11 (+0) CHA 14 (+2)
Challenge 2
Scimitar. Melee Attack: +5 to hit, 1d8+3 slashing damage.
Key Saves: DEX, WIS
Key Skills: Athletics, Intimidation`,
  },
  {
    id: "clean-cult-priest",
    kind: "npc",
    source: `Cult Priest
Medium humanoid (human), neutral evil
Armor Class 13 (leather armor)
Hit Points 27 (6d8)
Speed 30 ft.
STR 10 (+0) DEX 11 (+0) CON 12 (+1) INT 13 (+1) WIS 16 (+3) CHA 11 (+0)
Challenge 1
Mace. Melee Attack: +2 to hit, 1d6 bludgeoning damage.
Key Saves: WIS
Key Skills: Religion`,
  },
  {
    id: "pdf-dire-stalker",
    kind: "creature",
    source: `Dire Stalker
Large beast, unaligned
Armor Class 14 (natural
armor)
Hit Points 52 (7d10+14)
Speed 50 ft.
STR 16 (+3) DEX 14 (+2) CON 14 (+2)
INT 3 (-4) WIS 12 (+1) CHA 8 (-1)
Skills Perception +3
Senses passive Perception 13
Languages —
Challenge 4
Traits
ﬁerce Pursuit. The stalker has advantage on attack rolls against a creature that is hurt.
Actions
Bite. Melee Attack: +5 to hit, 2d6 +
3 piercing damage.`,
  },
  {
    id: "pdf-smuggler-boss",
    kind: "npc",
    source: `Smuggler Boss
Medium humanoid, neutral
Armor Class 14 (leather)
Hit Points 39 (6d8+12)
Speed 30 ft.
STR 13 (+1) DEX 15 (+2) CON 14 (+2) INT 10 (+0) WIS 9 (-1) CHA 12 (+1)
Challenge 1
Dagger. Melee Attack: +4 to hit, 1d4 +
2 piercing damage.
Key Saves: DEX`,
  },
  {
    id: "foundry-hill-brute",
    kind: "creature",
    source: JSON.stringify({
      name: "Hill Brute",
      type: "npc",
      _stats: { coreVersion: "12.0", systemVersion: "1.0" },
      img: "icons/svg/mystery-man.svg",
      prototypeToken: { name: "Hill Brute" },
      effects: [{ name: "Rage", icon: "icons/svg/fire.svg" }],
      system: {
        details: {
          cr: 3,
          alignment: "chaotic evil",
          type: { value: "giant" },
          source: "Black Flag",
        },
        attributes: {
          ac: { value: 13, flat: 13 },
          hp: { value: 45, max: 45, formula: "6d10+12" },
        },
        abilities: {
          str: { value: 18 },
          dex: { value: 8 },
          con: { value: 14 },
          int: { value: 6 },
          wis: { value: 9 },
          cha: { value: 7 },
        },
      },
    }),
  },
  {
    id: "no-stat-block-lore",
    kind: "no-stat-block",
    source: `The Ashen Marsh has lain quiet since the old king's fall. Travellers speak of lights over the water, and of a bell that rings beneath the reeds on moonless nights. Few return to say more.`,
  },
  {
    id: "several-goblins",
    kind: "several",
    source: `Goblin Scout
Small humanoid (goblinoid), neutral evil
Armor Class 13 (leather armor)
Hit Points 7 (2d6)
Speed 30 ft.
STR 8 (-1) DEX 14 (+2) CON 10 (+0) INT 10 (+0) WIS 8 (-1) CHA 8 (-1)
Challenge 1/4
Short Sword. Melee Attack: +4 to hit, 1d6+2 piercing damage.

Goblin Chief
Small humanoid (goblinoid), neutral evil
Armor Class 15
Hit Points 21 (6d6)
Speed 30 ft.
Challenge 1`,
  },
  {
    id: "character-sheet-fighter",
    kind: "character",
    source: `Brenna Ashford
Level 5 Human Fighter (Cosmopolitan Heritage, Outlander Background)
Armor Class 17
Hit Points 44
Talents: Brawny, Sharpshooter`,
  },
  {
    id: "5e-goblin-boss",
    kind: "5e",
    source: `Goblin Boss
Small humanoid (goblinoid), neutral evil
Armor Class 17 (chain shirt, shield)
Hit Points 21 (6d6)
Speed 30 ft.
STR 10 (+0) DEX 15 (+2) CON 10 (+0) INT 10 (+0) WIS 8 (-1) CHA 10 (+0)
Skills Stealth +6
Senses darkvision 60 ft., passive Perception 9
Languages Common, Goblin
Challenge 1 (200 XP)
Nimble Escape. The goblin can take the Disengage or Hide action as a bonus action on each of its turns.
Actions
Scimitar. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) slashing damage.`,
  },
];

export function fixtureById(id: string): StatBlockFixture {
  const fixture = STAT_BLOCK_FIXTURES.find((f) => f.id === id);
  if (!fixture) throw new Error(`Unknown stat block fixture: ${id}`);
  return fixture;
}
