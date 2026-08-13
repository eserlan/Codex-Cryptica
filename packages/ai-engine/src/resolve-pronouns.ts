import type { ChatHistoryMessage } from "schema";

export async function resolvePronounsLocally(
  query: string,
  history: ChatHistoryMessage[],
): Promise<string> {
  if (!history || history.length === 0) return query;

  // Bound the history context to the last 4 messages to save performance
  const boundedHistory = history.slice(-4);
  let candidateSubject = "";

  // Dynamic import compromise.js only when needed to avoid code bloat in the main bundle
  const { default: nlp } = await import("compromise");

  // Pass 1: Scan user messages in reverse chronological order to find the explicit subject of interest
  const userMessages = boundedHistory.filter((msg) => msg.role === "user");
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const msg = userMessages[i];
    if (!msg.content || typeof msg.content !== "string") continue;

    // Ignore the current query itself since it contains the unresolved pronoun we are trying to resolve
    if (msg.content.trim().toLowerCase() === query.trim().toLowerCase())
      continue;

    const text = msg.content;

    // Check for bold patterns first in the user's previous queries
    const boldMatches = text.match(/\*\*(.*?)\*\*/g);
    if (boldMatches && boldMatches.length > 0) {
      const boldText = boldMatches[0].replace(/\*\*/g, "").trim();
      if (boldText.length > 1 && boldText.length < 50) {
        candidateSubject = boldText;
        break;
      }
    }

    const doc = nlp(text);

    // Check for proper nouns in user's query (excluding verbs, pronouns, etc. to prevent start-of-sentence false positives)
    const properNoun = doc
      .match("#ProperNoun")
      .not("#Verb")
      .not("#Pronoun")
      .not("#Preposition")
      .not("#Conjunction")
      .first()
      .text()
      .trim();
    if (properNoun) {
      candidateSubject = properNoun;
      break;
    }

    // Check for people names in user's query
    const people = doc.people().first().text().trim();
    if (people) {
      candidateSubject = people;
      break;
    }

    // Check for places in user's query
    const places = doc.places().first().text().trim();
    if (places) {
      candidateSubject = places;
      break;
    }

    // Check for general nouns in user's query (critical fallback for lowercase names like 'kardos')
    const firstNoun = doc.nouns().first().text().trim();
    if (firstNoun) {
      candidateSubject = firstNoun;
      break;
    }
  }

  // Pass 2: Fallback to scanning all messages backwards (including assistant) if no user subject was matched
  if (!candidateSubject) {
    for (let i = boundedHistory.length - 1; i >= 0; i--) {
      const msg = boundedHistory[i];
      if (!msg.content || typeof msg.content !== "string") continue;

      const text = msg.content;

      // 1. Scan for Markdown bold patterns
      const boldMatches = text.match(/\*\*(.*?)\*\*/g);
      if (boldMatches && boldMatches.length > 0) {
        const boldText = boldMatches[0].replace(/\*\*/g, "").trim();
        if (boldText.length > 1 && boldText.length < 50) {
          candidateSubject = boldText;
          break;
        }
      }

      // Parse the message with compromise
      const doc = nlp(text);

      // 2. Scan for proper nouns (excluding verbs, pronouns, etc. to prevent start-of-sentence false positives)
      const properNoun = doc
        .match("#ProperNoun")
        .not("#Verb")
        .not("#Pronoun")
        .not("#Preposition")
        .not("#Conjunction")
        .first()
        .text()
        .trim();
      if (properNoun) {
        candidateSubject = properNoun;
        break;
      }

      // 3. Scan for people names
      const people = doc.people().first().text().trim();
      if (people) {
        candidateSubject = people;
        break;
      }

      // 4. Scan for places
      const places = doc.places().first().text().trim();
      if (places) {
        candidateSubject = places;
        break;
      }

      // 5. Scan for general nouns
      const firstNoun = doc.nouns().first().text().trim();
      if (firstNoun) {
        candidateSubject = firstNoun;
        break;
      }
    }
  }

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
