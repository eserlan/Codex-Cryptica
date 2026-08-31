import { ExampleConfigSchema, type ExampleConfig } from "../schema";
import { gullsRoost } from "./gulls-roost-coastal-smuggling-town";
import { theLowTideRust } from "./the-low-tide-rust-dock-syndicate";
import { arcHub } from "./arc-hub-augmentation-slum";
import { theVentingHelix } from "./the-venting-helix-derelict-hazard";
import { fvCoyote } from "./fv-coyote-space-western-ship";

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
  [gullsRoost, theLowTideRust, arcHub, theVentingHelix, fvCoyote]
    .map((example) => ExampleConfigSchema.parse(example))
    .map((example) => [example.slug, example]),
);
