import { DiscoveryEntrySchema, type DiscoveryEntry } from "../schema";
import { forEntries } from "./for";
import { answerEntries } from "./answers";
import { productEntries } from "./product";
import { migrationEntries } from "./migration";
import { toolEntries } from "./tools";
import { generatorEntries } from "./generators";
import { blogEntries } from "./blog";

/**
 * The registry, parsed at module load so an invalid entry fails the build
 * rather than a page render.
 *
 * Order is by family, and families are separate modules so a PR that adds one
 * discovery page touches one file — which keeps the "did you check the
 * registry?" review question cheap to answer.
 */
export const entries: DiscoveryEntry[] = [
  ...forEntries,
  ...answerEntries,
  ...productEntries,
  ...migrationEntries,
  ...toolEntries,
  ...generatorEntries,
  ...blogEntries,
].map((entry) => DiscoveryEntrySchema.parse(entry));
