import type { LandingPageConfig } from "../schema";
import { vampireTheMasquerade } from "./vampire-the-masquerade";
import { fantasyWorldbuilding } from "./fantasy-worldbuilding";

export const packs: Record<string, LandingPageConfig> = {
  "vampire-the-masquerade": vampireTheMasquerade,
  "fantasy-worldbuilding": fantasyWorldbuilding,
};
