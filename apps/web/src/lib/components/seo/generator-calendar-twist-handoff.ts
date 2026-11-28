import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import {
  getGeneratorDocumentLayout,
  getGeneratorHandoffLayout,
} from "./generator-document-layout";

/** Calendar headings repeat by day; plot twist drafts are entirely GM preparation. */
export function getCalendarTwistHandoffLayout(
  data: GeneratorOutput,
  layout: { content: string; lore: string },
  generatorType?: string,
): { content: string; lore: string } {
  if (generatorType === "holiday") {
    return { content: data.content, lore: data.lore ?? "" };
  }
  if (generatorType === "plot-twist-generator") {
    return {
      content:
        "GM preparation: the planned reversal, clues and possible consequences are in GM notes.",
      lore: [data.summary, data.content, data.lore]
        .filter(Boolean)
        .join("\n\n"),
    };
  }
  return getGeneratorHandoffLayout(data, layout, generatorType);
}

export function getCalendarPreviewLayout(
  generatedData: GeneratorOutput | null,
) {
  // Each observance legitimately repeats its own headings.
  if (generatedData?.labels?.includes("holiday-generator")) {
    return { content: generatedData.content, lore: generatedData.lore ?? "" };
  }
  return getGeneratorDocumentLayout(generatedData);
}
