import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
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
    // Share markdown combines the original content and lore without a reliable
    // delimiter. BBEG restoration must not guess which text is player-safe.
    const isVillain = options.targetPath === "/generators/bbeg-generator";
    return {
      draft: {
        type: isVillain ? "character" : "note",
        title: shared.title,
        summary: isVillain ? "" : parsed.summary,
        content: isVillain ? "" : parsed.content,
        lore: isVillain
          ? [parsed.summary ? `*${parsed.summary}*` : "", parsed.content]
              .filter(Boolean)
              .join("\n\n")
          : "",
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

/** Coordinate successive route loads without allowing an older request to win. */
export function createGeneratorRemixLoader(dependencies: {
  getShared: GeneratorRemixLoaderOptions["getShared"];
  onReset: () => void;
  onLoaded: (result: GeneratorRemixResult) => void;
}) {
  let loadVersion = 0;
  return async (remixId: string | null, targetPath: string | undefined) => {
    const version = ++loadVersion;
    dependencies.onReset();
    if (!remixId) return;
    const result = await loadGeneratorRemixDraft({
      remixId,
      targetPath,
      loadVersion: version,
      getCurrentLoadVersion: () => loadVersion,
      getShared: dependencies.getShared,
    });
    if (result) dependencies.onLoaded(result);
  };
}
