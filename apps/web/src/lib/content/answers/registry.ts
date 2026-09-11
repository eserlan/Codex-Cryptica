import { AnswerConfigSchema, type AnswerConfig } from "./schema";
import { answers } from "./pages";

/**
 * Returns a single parsed answer matching the slug, or undefined when no
 * answer owns it.
 */
export function getAnswer(
  slug: string,
  registry: Record<string, AnswerConfig> = answers,
): AnswerConfig | undefined {
  const config = registry[slug];
  return config ? AnswerConfigSchema.parse(config) : undefined;
}

/**
 * Every answer, in registration order. The registry is hand-curated: answers
 * are added because a distinct question deserves one, never generated from a
 * keyword list.
 */
export function getAllAnswers(
  registry: Record<string, AnswerConfig> = answers,
): AnswerConfig[] {
  return Object.values(registry).map((config) =>
    AnswerConfigSchema.parse(config),
  );
}

/** All slugs, for `entries()` prerendering and the sitemap. */
export function getAllAnswerSlugs(
  registry: Record<string, AnswerConfig> = answers,
): string[] {
  return Object.keys(registry);
}

/**
 * Resolves `relatedAnswers` slugs to their configs, silently dropping any that
 * no longer exist so a removed answer cannot break the pages that linked to it.
 * The registry test asserts that no such dangling slug is ever committed.
 */
export function getRelatedAnswers(
  answer: AnswerConfig,
  registry: Record<string, AnswerConfig> = answers,
): AnswerConfig[] {
  return answer.relatedAnswers
    .map((slug) => registry[slug])
    .filter((related): related is AnswerConfig => Boolean(related))
    .map((related) => AnswerConfigSchema.parse(related));
}

/** The canonical URL path for an answer. */
export function answerPath(answer: AnswerConfig): string {
  return answer.seo.canonical ?? `/answers/${answer.slug}`;
}
