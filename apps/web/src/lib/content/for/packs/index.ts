import type { LandingPageConfig } from "../schema";
import { vampireTheMasquerade } from "./vampire-the-masquerade";
import { fantasyWorldbuilding } from "./fantasy-worldbuilding";
import { dungeonsAndDragons } from "./dungeons-and-dragons";
import { pathfinder2e } from "./pathfinder-2e";
import { callOfCthulhu } from "./call-of-cthulhu";
import { gothicHorror } from "./gothic-horror";
import { cyberpunkRed } from "./cyberpunk-red";
import { dystopianSciFi } from "./dystopian-sci-fi";
import { spaceOpera } from "./space-opera";
import { traveller } from "./traveller";
import { cosmicHorror } from "./cosmic-horror";
import { conspiracy } from "./conspiracy";
import { deltaGreen } from "./delta-green";
import { scumAndVillainy } from "./scum-and-villainy";
import { spaceWestern } from "./space-western";
import { soloWorldbuilding } from "./solo-worldbuilding";
import { westMarches } from "./west-marches";
import { sandboxCampaigns } from "./sandbox-campaigns";

export const packs: Record<string, LandingPageConfig> = {
  "vampire-the-masquerade": vampireTheMasquerade,
  "fantasy-worldbuilding": fantasyWorldbuilding,
  "dungeons-and-dragons": dungeonsAndDragons,
  "pathfinder-2e": pathfinder2e,
  "call-of-cthulhu": callOfCthulhu,
  "gothic-horror": gothicHorror,
  "cosmic-horror": cosmicHorror,
  "delta-green": deltaGreen,
  "cyberpunk-red": cyberpunkRed,
  "dystopian-sci-fi": dystopianSciFi,
  "space-opera": spaceOpera,
  "scum-and-villainy": scumAndVillainy,
  "space-western": spaceWestern,
  "solo-worldbuilding": soloWorldbuilding,
  "west-marches": westMarches,
  "sandbox-campaigns": sandboxCampaigns,
  traveller,
  conspiracy,
};
