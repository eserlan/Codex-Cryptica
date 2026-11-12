import { aiClientManager as defaultAiClientManager } from "./client-manager";
import {
  MAX_STORY_SO_FAR_CHARS,
  type StorySummaryRequest,
  type StorySummaryResult,
} from "@codex/adventure-engine";
import type { AdventureAIClient } from "./adventure-turn-generation.service";

/** Asked for well under the stored limit, so a slightly long answer still fits. */
const TARGET_CHARS = 1_200;

const SYSTEM_INSTRUCTION = [
  "You keep the story-so-far notes for a solo tabletop adventure.",
  "Update the previous notes (if any) with the new turns, and return the whole updated notes.",
  "Keep what a game master needs to stay consistent: where the player is and has been, who they met and what those people want, promises, debts and decisions with their consequences, open leads, and anything the player was told or found out.",
  "Drop scene dressing, small talk and repetition. Merge older details into shorter lines as the notes grow.",
  "Use only what the turns say. Never add facts, motives or events that are not stated, and never guess at hidden causes.",
  `Write plain past-tense prose with no headings, lists or markdown, at most ${TARGET_CHARS} characters.`,
  "Return only the updated notes.",
].join(" ");

/** Remove a code fence the model may have wrapped around plain text. */
function plainNotes(text: string): string {
  return text
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/** Cut an over-long answer at a sentence end rather than failing the whole summary. */
function fitNotes(notes: string): string {
  if (notes.length <= MAX_STORY_SO_FAR_CHARS) return notes;
  const head = notes.slice(0, MAX_STORY_SO_FAR_CHARS);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf(".\n"));
  return end > MAX_STORY_SO_FAR_CHARS / 2 ? head.slice(0, end + 1) : head;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

function throwIfOffline(): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("offline");
  }
}

/** Only the old notes and the new turns: nothing the player has not seen. */
function userInput(request: StorySummaryRequest) {
  return {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              previousNotes: request.previous ?? null,
              newTurns: request.turns,
            }),
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: "text/plain" },
  };
}

/**
 * One-shot call that folds finished turns into the rolling story notes. It is
 * stateless on purpose: no provider conversation is created or retained, and a
 * failure never touches the adventure.
 */
export class AdventureSummaryService {
  constructor(
    private readonly aiClient: AdventureAIClient = defaultAiClientManager,
  ) {}

  async summarize(
    request: StorySummaryRequest,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal } = {},
  ): Promise<StorySummaryResult> {
    throwIfOffline();
    const { signal } = options;
    throwIfCancelled(signal);
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      SYSTEM_INSTRUCTION,
    );
    const result = await model.generateContent(userInput(request), { signal });
    const raw = result.response.text();
    throwIfCancelled(signal);
    const notes = fitNotes(plainNotes(raw));
    if (!notes) throw new Error("empty-story-summary");
    return { text: notes, throughSequence: request.throughSequence };
  }
}

export const adventureSummaryService = new AdventureSummaryService();
