import type { FeatureEntry } from "../registry/schema";
import { filterByChannel, validateRegistry } from "../registry/schema";
import { chunkMarkdown, contentHash } from "./chunk";
import type { HelpArticleSource, HelpChunk, KnowledgeBundle } from "./types";

export interface BuildBundleInput {
  features: readonly FeatureEntry[];
  articles: readonly HelpArticleSource[];
  commit: string;
  builtAt: string;
  channel: "production" | "staging";
}

function registryChunks(feature: FeatureEntry): HelpChunk[] {
  const where = [
    feature.routes.join(", "),
    feature.tabs.length ? `tabs: ${feature.tabs.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  const overview = `${feature.summary}\nWhere: ${where}.`;
  const make = (index: number, heading: string, text: string): HelpChunk => ({
    id: `registry:${feature.id}#${index}`,
    sourceId: `registry:${feature.id}`,
    kind: "registry",
    featureId: feature.id,
    helpId: null,
    title: feature.title,
    heading,
    text,
    hash: contentHash(`${heading}\n${text}`),
  });
  return [
    make(0, "Overview", overview),
    ...feature.workflows.map((workflow, i) =>
      make(
        i + 1,
        workflow.title,
        `${workflow.title}\n${workflow.steps.map((s, n) => `${n + 1}. ${s}`).join("\n")}`,
      ),
    ),
  ];
}

/**
 * Builds the knowledge bundle shipped with the Worker. Throws on an
 * inconsistent registry, so a broken reference fails the build rather than
 * reaching users.
 */
export function buildBundle(input: BuildBundleInput): KnowledgeBundle {
  const helpIds = new Set(input.articles.map((a) => a.id));
  const errors = validateRegistry(input.features, { helpIds });
  if (errors.length > 0) {
    throw new Error(`Invalid help registry:\n${errors.join("\n")}`);
  }

  const features = filterByChannel(input.features, input.channel);
  const featureByHelpId = new Map<string, string>();
  for (const feature of features) {
    for (const helpId of feature.helpIds) {
      if (!featureByHelpId.has(helpId)) featureByHelpId.set(helpId, feature.id);
    }
  }

  const chunks: HelpChunk[] = [];
  for (const feature of features) chunks.push(...registryChunks(feature));
  for (const article of [...input.articles].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    chunks.push(
      ...chunkMarkdown({
        sourceId: article.id,
        title: article.title,
        markdown: article.content,
        kind: "help",
        featureId: featureByHelpId.get(article.id) ?? null,
        helpId: article.id,
      }),
    );
  }

  return {
    version: 1,
    commit: input.commit,
    builtAt: input.builtAt,
    channel: input.channel,
    chunks,
    features,
    helpIds: [...helpIds].sort(),
  };
}
