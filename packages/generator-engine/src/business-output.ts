/**
 * The campaign output shape for a business. Kept apart from the generator
 * registry so the registry and the AI adapter can both use it.
 */

import type { BusinessDocument } from "./business-state";
import { renderBusinessContent } from "./business-state";
import type { GeneratorOutput } from "./campaign-generator-types";

export function businessGeneratorOutput(
  doc: BusinessDocument,
): GeneratorOutput {
  return {
    title: doc.identity.name,
    summary: doc.identity.description,
    content: renderBusinessContent(doc),
    lore: "",
    labels: [
      "business",
      "business-generator",
      doc.options.genre.toLowerCase().replace(/\s+/g, "-"),
    ],
    business: doc,
  };
}
