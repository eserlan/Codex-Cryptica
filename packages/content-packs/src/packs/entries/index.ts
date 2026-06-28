import type { CreaturePackEntry } from "../../types.js";
import { beastEntries } from "./beast-entries.js";
import { undeadEntries } from "./undead-entries.js";
import { humanoidEntries } from "./humanoid-entries.js";
import { monstrosityEntries } from "./monstrosity-entries.js";
import { aberrationEntries } from "./aberration-entries.js";
import { fiendEntries } from "./fiend-entries.js";
import { dragonEntries } from "./dragon-entries.js";
import { feyEntries } from "./fey-entries.js";
import { elementalEntries } from "./elemental-entries.js";
import { constructEntries } from "./construct-entries.js";
import { giantEntries } from "./giant-entries.js";
import { oozeEntries } from "./ooze-entries.js";
import { plantEntries } from "./plant-entries.js";
import { celestialEntries } from "./celestial-entries.js";
import { goblinoidEntries } from "./goblinoid-entries.js";

export * from "./scifi-alien-entries.js";
export * from "./scifi-mech-entries.js";
export * from "./cyberpunk-cyborg-entries.js";
export * from "./cyberpunk-drone-entries.js";
export * from "./apocalyptic-mutant-entries.js";
export * from "./apocalyptic-raider-entries.js";
export * from "./horror-undead-entries.js";
export * from "./horror-eldritch-entries.js";
export * from "./steampunk-clockwork-entries.js";
export * from "./steampunk-frontier-entries.js";

export const allEntries: CreaturePackEntry[] = [
  ...beastEntries,
  ...undeadEntries,
  ...humanoidEntries,
  ...monstrosityEntries,
  ...aberrationEntries,
  ...fiendEntries,
  ...dragonEntries,
  ...feyEntries,
  ...elementalEntries,
  ...constructEntries,
  ...giantEntries,
  ...oozeEntries,
  ...plantEntries,
  ...celestialEntries,
  ...goblinoidEntries,
];
