/**
 * MonsterLabs' `prompt` query parameter appears to truncate or reject
 * submissions past roughly 1000 characters on its own end (observed in
 * practice, not documented) — well under Codex's own generous URL-length
 * guard. Rather than silently sending a payload MonsterLabs itself cuts off
 * mid-sentence, a description that would exceed the budget is compressed
 * with the Oracle first, preserving the concrete details a stat-block
 * generator needs and dropping the rest.
 */
import { GeneratorAITransport } from "./generator-ai-transport";
import { classifyApiError } from "@codex/ai-engine";

export const MONSTERLABS_PROMPT_CHAR_LIMIT = 1000;

const SYSTEM_INSTRUCTION =
  "You compress tabletop RPG character, creature, and item descriptions for a partner tool that turns fiction into Dungeons & Dragons 5th edition game mechanics. Keep the concrete, mechanically relevant details: appearance, notable abilities or powers, personality, and history. Drop repetition and flourish. Output plain prose only — no headings, no markdown, no preamble, no explanation of what you did.";

function buildUserPrompt(description: string, limit: number): string {
  return `Rewrite the following description so it fits within ${limit} characters while staying useful for a D&D stat block generator. Output only the rewritten description, nothing else.\n\n${description}`;
}

/** Cuts at the nearest earlier word boundary rather than mid-word. Reserves one character for the trailing ellipsis so the result never exceeds `limit`. A `limit` of 0 leaves no room for even the ellipsis, so it returns an empty string. */
function hardTruncate(text: string, limit: number): string {
  if (limit <= 0) return "";
  if (text.length <= limit) return text;
  const budget = Math.max(0, limit - 1);
  const cut = text.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

const transport = new GeneratorAITransport();
const defaultRunModel = (system: string, user: string) =>
  transport.runModel(system, user);

/**
 * Compresses a description to fit within `limit` characters using the
 * Oracle. Descriptions already within the limit are returned unchanged. On
 * any AI failure (offline, rate-limited, unparseable) this falls back to a
 * hard truncation at a word boundary rather than failing the send outright
 * — a shortened description is still more useful to MonsterLabs than none.
 *
 * `runModel` is injectable (defaults to the shared Oracle transport) so
 * tests can supply a stub instead of exercising the real AI client.
 *
 * `allowAi` lets a caller skip the Oracle entirely (e.g. when the user has
 * disabled AI) and fall straight through to hard truncation.
 */
export async function compressMonsterLabsDescription(
  description: string,
  limit: number = MONSTERLABS_PROMPT_CHAR_LIMIT,
  runModel: (system: string, user: string) => Promise<string> = defaultRunModel,
  allowAi: boolean = true,
): Promise<string> {
  if (limit <= 0) return "";
  if (description.length <= limit) return description;
  if (!allowAi) return hardTruncate(description, limit);

  try {
    const compressed = (
      await runModel(SYSTEM_INSTRUCTION, buildUserPrompt(description, limit))
    ).trim();
    if (compressed && compressed.length <= limit) return compressed;
    // The model returned nothing usable, or ignored the limit — fall back
    // rather than sending an empty or still-oversized prompt.
    return hardTruncate(compressed || description, limit);
  } catch (err) {
    const { type } = classifyApiError(err);
    if (type === "unknown") {
      console.error(
        "[monsterlabs] AI description compression failed unexpectedly, falling back to a hard truncation:",
        err,
      );
    } else {
      console.warn(
        `[monsterlabs] AI description compression unavailable (${type}), falling back to a hard truncation.`,
      );
    }
    return hardTruncate(description, limit);
  }
}
