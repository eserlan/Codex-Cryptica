import type { LandingPageConfig } from "../schema";
import { vampireTheMasquerade } from "./vampire-the-masquerade";
import { fantasyWorldbuilding } from "./fantasy-worldbuilding";
import { dungeonsAndDragons } from "./dungeons-and-dragons";
import { pathfinder2e } from "./pathfinder-2e";
import { callOfCthulhu } from "./call-of-cthulhu";
import { gothicHorror } from "./gothic-horror";
import { cyberpunkRed } from "./cyberpunk-red";
import { dystopianSciFi } from "./dystopian-sci-fi";

export const packs: Record<string, LandingPageConfig> = {
  "vampire-the-masquerade": vampireTheMasquerade,
  "fantasy-worldbuilding": fantasyWorldbuilding,
  "dungeons-and-dragons": dungeonsAndDragons,
  "pathfinder-2e": pathfinder2e,
  "call-of-cthulhu": callOfCthulhu,
  "gothic-horror": gothicHorror,
  "cyberpunk-red": cyberpunkRed,
  "dystopian-sci-fi": dystopianSciFi,
};
