import { ExampleConfigSchema, type ExampleConfig } from "./schema";
import { examples } from "./pages";

/** A single parsed example, or undefined when no example owns the slug. */
export function getExample(
  slug: string,
  registry: Record<string, ExampleConfig> = examples,
): ExampleConfig | undefined {
  const config = registry[slug];
  return config ? ExampleConfigSchema.parse(config) : undefined;
}

/**
 * Every example, in registration order.
 *
 * Hand-curated. An example is added because it was deliberately selected for
 * publication — never because a generation happened to look good in a log.
 */
export function getAllExamples(
  registry: Record<string, ExampleConfig> = examples,
): ExampleConfig[] {
  return Object.values(registry).map((config) =>
    ExampleConfigSchema.parse(config),
  );
}

/** All slugs, for `entries()` prerendering and the sitemap. */
export function getAllExampleSlugs(
  registry: Record<string, ExampleConfig> = examples,
): string[] {
  return Object.keys(registry);
}

/**
 * Resolves `relatedExamples` slugs, dropping any that no longer exist so a
 * removed example cannot break the pages that linked to it. The registry test
 * asserts no dangling slug is ever committed.
 */
export function getRelatedExamples(
  example: ExampleConfig,
  registry: Record<string, ExampleConfig> = examples,
): ExampleConfig[] {
  return example.relatedExamples
    .map((slug) => registry[slug])
    .filter((related): related is ExampleConfig => Boolean(related))
    .map((related) => ExampleConfigSchema.parse(related));
}

/** The other half of a connected pair, when one is declared. */
export function getConnectedExample(
  example: ExampleConfig,
  registry: Record<string, ExampleConfig> = examples,
): ExampleConfig | undefined {
  if (!example.connectedTo) return undefined;
  const connected = registry[example.connectedTo.slug];
  return connected ? ExampleConfigSchema.parse(connected) : undefined;
}

/** The canonical URL path for an example. */
export function examplePath(example: ExampleConfig): string {
  return example.seo.canonical ?? `/examples/${example.slug}`;
}

/** Examples grouped by artefact kind, for the index. */
export function groupExamplesByKind(
  registry: Record<string, ExampleConfig> = examples,
): Map<string, ExampleConfig[]> {
  const groups = new Map<string, ExampleConfig[]>();
  for (const example of getAllExamples(registry)) {
    groups.set(example.kind, [...(groups.get(example.kind) ?? []), example]);
  }
  return groups;
}
