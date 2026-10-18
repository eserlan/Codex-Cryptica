import type { HelpTurn } from "../prompt/build";
import { tokenize } from "./text";

const ANAPHORA_PATTERN =
  /\b(them|they|their|theirs|it|its|that|these|those|one|ones|there|another|else|same)\b/i;

const CONTINUATION_PATTERN =
  /^(and|also|what about|how about|or|can you|could you|is that|is there|are there)\b/i;

function findSubstantiveUserTurn(
  history: readonly HelpTurn[],
): HelpTurn | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role !== "user") continue;
    const terms = tokenize(turn.text);
    // A sentence can name its topic and still contain a demonstrative, e.g.
    // "What does Generate Related do from this sidebar?" Treat that as a
    // useful anchor. Skip turns whose subject depends on an earlier answer,
    // such as "Does it link back?" or "Can I discard that?".
    const dependsOnPriorTurn =
      /\b(they|them|their|theirs|it|its|that|these|those|one|ones|there)\b/i.test(
        turn.text,
      ) || terms.length < 2;
    if (!dependsOnPriorTurn) {
      return turn;
    }
  }
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i];
  }
  return null;
}

/**
 * Resolves conversational follow-up questions (e.g. "how to make them?",
 * "where is it?", "can I delete that?") by augmenting the search query
 * with the substantive topic from earlier conversation turns.
 *
 * Self-contained queries with specific domain terms are preserved as-is.
 */
export function contextualizeQuery(
  question: string,
  history?: readonly HelpTurn[],
): string {
  if (!history || history.length === 0) return question;

  const currentTerms = tokenize(question);
  const isAnaphoric = ANAPHORA_PATTERN.test(question);
  const isContinuation = CONTINUATION_PATTERN.test(question);
  const isUnderspecified = currentTerms.length <= 1;

  // A question can contain a pronoun while still naming its topic: "What does
  // Generate Related do from this sidebar?" Carry history only when the
  // current wording is too thin to retrieve on its own or clearly continues
  // the previous turn. Otherwise old topics can swamp a new, explicit one.
  if (!isAnaphoric && !isContinuation && !isUnderspecified) {
    return question;
  }

  const userTurn = findSubstantiveUserTurn(history);
  if (userTurn && userTurn.text.trim()) {
    const userTerms = tokenize(userTurn.text);
    if (userTerms.length > 0) {
      return `${question} (${userTurn.text.trim()})`;
    }
  }

  const lastAssistantTurn = [...history]
    .reverse()
    .find((t) => t.role === "assistant");
  if (lastAssistantTurn && lastAssistantTurn.text.trim()) {
    const snippet = lastAssistantTurn.text
      .split(/[.?!]\n|[.?!]\s/)[0]
      ?.slice(0, 100)
      ?.trim();
    if (snippet && tokenize(snippet).length > 0) {
      return `${question} (${snippet})`;
    }
  }

  return question;
}
