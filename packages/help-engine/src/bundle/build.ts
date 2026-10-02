import { GENERATORS } from "../registry/generators.generated";
import type { FeatureEntry } from "../registry/schema";
import { filterByChannel, validateRegistry } from "../registry/schema";
import { chunkMarkdown, contentHash } from "./chunk";
import { embeddingFingerprint, isValidEmbeddingVector } from "./embeddings";
import type { HelpArticleSource, HelpChunk, KnowledgeBundle } from "./types";

export interface BuildBundleInput {
  features: readonly FeatureEntry[];
  articles: readonly HelpArticleSource[];
  commit: string;
  builtAt: string;
  channel: "production" | "staging";
  /** Precomputed embeddings keyed by chunk ID. */
  embeddings?: Record<string, { hash: string; vector: number[] }>;
  /** The generators to describe; defaults to the generated list. */
  generators?: readonly {
    id: string;
    label: string;
    description: string;
  }[];
}

/** The registry feature that owns the generator chunks. */
const GENERATORS_FEATURE_ID = "campaign-generator";

/** One chunk per generator, so a plain request ("make a quest") finds its generator. */
function generatorChunks(
  generators: NonNullable<BuildBundleInput["generators"]>,
  articleTitles: ReadonlyMap<string, string>,
): HelpChunk[] {
  const generatorHelpId = articleTitles.has("in-app-generators")
    ? "in-app-generators"
    : null;
  return generators.map((generator) => {
    // Deliberately without the word "generator": every one of these chunks
    // would repeat it, and a question like "where are the generators" would
    // then match 29 near-identical chunks instead of the overview. They match
    // on what each one makes (its label and description) instead.
    const heading = "Creates";
    const text = `${generator.label}: ${generator.description}`;
    return {
      id: `generator:${generator.id}#0`,
      sourceId: `generator:${generator.id}`,
      kind: "registry",
      featureId: GENERATORS_FEATURE_ID,
      helpId: generatorHelpId,
      title: generator.label,
      citationTitle: generatorHelpId
        ? articleTitles.get(generatorHelpId)
        : undefined,
      heading,
      text,
      hash: contentHash(`${heading}\n${text}`),
    };
  });
}

function registryChunks(
  feature: FeatureEntry,
  articleTitles: ReadonlyMap<string, string>,
): HelpChunk[] {
  const where = [
    feature.routes.join(", "),
    feature.tabs.length ? `tabs: ${feature.tabs.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  const overview = `${feature.summary}\nWhere: ${where}.`;
  const primaryHelpId = feature.helpIds.length > 0 ? feature.helpIds[0] : null;

  const make = (index: number, heading: string, text: string): HelpChunk => ({
    id: `registry:${feature.id}#${index}`,
    sourceId: `registry:${feature.id}`,
    kind: "registry",
    featureId: feature.id,
    helpId: primaryHelpId,
    title: feature.title,
    citationTitle: primaryHelpId ? articleTitles.get(primaryHelpId) : undefined,
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
// fallow-ignore-next-line complexity
export function buildBundle(input: BuildBundleInput): KnowledgeBundle {
  const helpIds = new Set(input.articles.map((a) => a.id));
  const errors = validateRegistry(input.features, { helpIds });
  if (errors.length > 0) {
    throw new Error(`Invalid help registry:\n${errors.join("\n")}`);
  }

  const features = filterByChannel(input.features, input.channel);
  const articleTitles = new Map<string, string>();
  for (const article of input.articles) {
    articleTitles.set(article.id, article.title);
  }
  const featureByHelpId = new Map<string, string>();
  for (const feature of features) {
    for (const helpId of feature.helpIds) {
      if (!featureByHelpId.has(helpId)) featureByHelpId.set(helpId, feature.id);
    }
  }

  const chunks: HelpChunk[] = [];
  for (const feature of features) {
    chunks.push(...registryChunks(feature, articleTitles));
  }
  chunks.push(
    ...generatorChunks(input.generators ?? GENERATORS, articleTitles),
  );
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

  if (input.embeddings) {
    for (const chunk of chunks) {
      const entry = input.embeddings[chunk.id];
      if (
        entry &&
        entry.hash === embeddingFingerprint(chunk) &&
        isValidEmbeddingVector(entry.vector)
      ) {
        chunk.embedding = entry.vector;
      }
    }
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
