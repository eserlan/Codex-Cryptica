import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import { parseGeneratorShareMarkdown } from "./generator-copy";
import { resolveGeneratorShareTheme } from "./generator-page-identity";

interface SharedGeneratorSnapshot {
  title: string;
  content: string;
  metadata: {
    generatorPath: string;
    labels?: string[];
    theme?: string;
  };
}

export interface GeneratorRemixLoaderOptions {
  remixId: string;
  targetPath: string | undefined;
  loadVersion: number;
  getCurrentLoadVersion: () => number;
  getShared: (remixId: string) => Promise<SharedGeneratorSnapshot | null>;
}

export interface GeneratorRemixResult {
  draft: GeneratorOutput;
  theme?: string;
}

/** Resolve a shared generator snapshot into the draft consumed by the page. */
export async function loadGeneratorRemixDraft(
  options: GeneratorRemixLoaderOptions,
): Promise<GeneratorRemixResult | null> {
  try {
    const shared = await options.getShared(options.remixId);
    if (
      options.loadVersion !== options.getCurrentLoadVersion() ||
      !shared ||
      shared.metadata.generatorPath !== options.targetPath
    ) {
      return null;
    }

    const parsed = parseGeneratorShareMarkdown(shared.content);
    return {
      draft: {
        type: "note",
        title: shared.title,
        summary: parsed.summary,
        content: parsed.content,
        lore: "",
        labels: shared.metadata.labels ?? [],
        status: "draft",
      },
      theme: resolveGeneratorShareTheme(shared.metadata.theme),
    };
  } catch {
    // A remix is an enhancement; the normal generator remains usable when
    // the shared snapshot cannot be reached.
    return null;
  }
}
