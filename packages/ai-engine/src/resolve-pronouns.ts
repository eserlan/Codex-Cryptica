import type { ChatHistoryMessage } from "schema";

type Nlp = typeof import("compromise").default;

/**
 * The most likely subject named in one message: a bold name first, then a
 * proper noun run, a person, a place, and finally any non-pronoun noun
 * (the fallback for lowercase names like 'kardos').
 */
function findSubject(nlp: Nlp, text: string): string {
  const boldMatches = text.match(/\*\*(.*?)\*\*/g);
  if (boldMatches && boldMatches.length > 0) {
    const boldText = boldMatches[0].replace(/\*\*/g, "").trim();
    if (boldText.length > 1 && boldText.length < 50) return boldText;
  }

  const doc = nlp(text);
  // Whole proper-noun runs, so "Grand Archmage Elara Voss" is not cut to
  // "Grand"; verbs, pronouns etc. are excluded to avoid start-of-sentence
  // false positives.
  const properNoun = doc
    .match("#ProperNoun+")
    .not("#Verb")
    .not("#Pronoun")
    .not("#Preposition")
    .not("#Conjunction")
    .first()
    .text()
    .trim();
  return (
    properNoun ||
    doc.people().first().text().trim() ||
    doc.places().first().text().trim() ||
    doc.nouns().not("#Pronoun").first().text().trim()
  );
}

/** The subject of the most recent message that names one. */
function latestSubject(nlp: Nlp, messages: ChatHistoryMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i].content;
    if (!content || typeof content !== "string") continue;
    const subject = findSubject(nlp, content);
    if (subject) return subject;
  }
  return "";
}

export async function resolvePronounsLocally(
  query: string,
  history: ChatHistoryMessage[],
): Promise<string> {
  if (!history || history.length === 0) return query;

  // Dynamic import compromise.js only when needed to avoid code bloat in the main bundle
  const { default: nlp } = await import("compromise");

  // Bound the history context to the last 4 messages to save performance
  const boundedHistory = history.slice(-4);
  const queryLower = query.trim().toLowerCase();

  // Pass 1: the user's own earlier messages name the subject of interest,
  // ignoring the current query since it holds the unresolved pronoun.
  // Pass 2: fall back to every message, assistant replies included.
  const candidateSubject =
    latestSubject(
      nlp,
      boundedHistory.filter(
        (msg) =>
          msg.role === "user" &&
          typeof msg.content === "string" &&
          msg.content.trim().toLowerCase() !== queryLower,
      ),
    ) || latestSubject(nlp, boundedHistory);

  if (!candidateSubject) return query;

  const possessiveSuffix = candidateSubject.endsWith("s") ? "'" : "'s";
  const possessiveReplacement = `${candidateSubject}${possessiveSuffix}`;

  // Use robust native regex replacements to swap pronouns
  let textResult = query;
  // Exclude 'her' from possessive to avoid 'I saw her' -> 'I saw Sir Alden's'
  const possessiveRegex = /\b(his|its|their|theirs)\b/gi;
  const standardRegex =
    /\b(he|she|it|they|him|her|them|that place|this place|that person|this person|the entity)\b/gi;

  textResult = textResult.replace(possessiveRegex, possessiveReplacement);
  textResult = textResult.replace(standardRegex, candidateSubject);

  return textResult;
}
