import { ExampleConfigSchema, type ExampleConfig } from "../schema";
import { gullsRoost } from "./gulls-roost-coastal-smuggling-town";
import { theLowTideRust } from "./the-low-tide-rust-dock-syndicate";
import { arcHub } from "./arc-hub-augmentation-slum";
import { theVentingHelix } from "./the-venting-helix-derelict-hazard";
import { theCinderWren } from "./the-cinder-wren-space-western-ship";
import { vaelgrasp } from "./vaelgrasp-the-regents-ruin-artifact";
import { voidSiphon } from "./void-siphon-cosmic-horror-creature";
import { ladyVivienneMorvath } from "./lady-vivienne-morvath-gothic-horror-villain";
import { theWitheredHand } from "./the-withered-hand-grimdark-faction";
import { lettersOfMarqueExpired } from "./letters-of-marque-expired-pirate-adventure";
import { siloZeroSeven } from "./silo-zero-seven-fallout-repository";
import { nkiruOkafor } from "./nkiru-okafor-cyberpunk-npc-table-card";
import { theBreakwaterVault } from "./the-breakwater-vault-space-western-heist";
import { lowmereSixWordsRumourTable } from "./lowmere-six-words-rumour-table";
import { theEelWyrm } from "./the-eel-wyrm-classic-fantasy-constellation";
import { theDawnheartDiadem } from "./the-dawnheart-diadem-fantasy-heist";
import { theQuellExtraction } from "./the-quell-extraction-cyberpunk-heist";

/**
 * The published example library.
 *
 * Curated, never automatic. An example is added because it was deliberately
 * selected for publication — strong output, a capability worth showing, safe to
 * publish, and materially different from what is already here. Arbitrary
 * generations are never indexed; see the curation rules in #2565.
 *
 * Parsing here means an invalid example fails at module load, and therefore at
 * build time, since these pages prerender.
 */
export const examples: Record<string, ExampleConfig> = Object.fromEntries(
  [
    gullsRoost,
    theLowTideRust,
    arcHub,
    theVentingHelix,
    theCinderWren,
    vaelgrasp,
    voidSiphon,
    ladyVivienneMorvath,
    theWitheredHand,
    lettersOfMarqueExpired,
    siloZeroSeven,
    nkiruOkafor,
    theBreakwaterVault,
    lowmereSixWordsRumourTable,
    theEelWyrm,
    theDawnheartDiadem,
    theQuellExtraction,
  ]
    .map((example) => ExampleConfigSchema.parse(example))
    .map((example) => [example.slug, example]),
);
