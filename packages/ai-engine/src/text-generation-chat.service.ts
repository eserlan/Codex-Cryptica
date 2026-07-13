import {
  aiClientManager as defaultAiClientManager,
  InteractionExpiredError,
} from "./client-manager";
import { interactionSessions } from "./interaction-session";
import { buildInteractionInput, type LoreEntry } from "@codex/oracle-engine";
import { classifyApiError } from "./api-error-classifier";
import { u } from "./prompts/user-content";
import { buildSystemInstruction } from "./prompts/system-instructions";
import { safeSnapshot } from "./text-generation-context";

/** Streams a conversational chat turn, either via the plain chat API or the Interactions API delta flow. */
export class TextGenerationChatService {
  constructor(private aiClientManager = defaultAiClientManager) {}

  async generateResponse(
    apiKey: string,
    query: string,
    history: any[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void | Promise<void>,
    demoMode = false,
    categories?: string[],
    _options?: {
      requestId?: string;
      vaultId?: string;
      existingEntities?: any[];
      systemInstructionOverride?: string;
      loreEntries?: LoreEntry[];
      conversationId?: string;
      interactionsEnabled?: boolean;
      guestMode?: boolean;
    },
  ): Promise<void> {
    const cleanHistory = history ? safeSnapshot(history) : history;

    const systemInstruction =
      _options?.systemInstructionOverride ||
      buildSystemInstruction(demoMode, categories, _options?.guestMode);

    // Interactions API path (proxy only, flag-gated): send just the new/changed
    // lore and the new turn; prior turns + unchanged lore are retained
    // server-side via `previous_interaction_id`.
    if (
      _options?.interactionsEnabled &&
      !apiKey &&
      _options?.conversationId &&
      _options?.loreEntries
    ) {
      await this.generateViaInteraction(
        query,
        cleanHistory,
        modelName,
        systemInstruction,
        _options.conversationId,
        _options.loreEntries,
        onUpdate,
      );
      return;
    }

    const model = await this.aiClientManager.getModel(
      apiKey,
      modelName,
      systemInstruction,
    );

    const slidingWindowSize = 10;
    // 1. Sliding Window: Limit history to keep payload lean
    const slidingHistory = cleanHistory.slice(-slidingWindowSize);

    const sanitizedHistory: {
      role: "user" | "model";
      parts: { text: string }[];
    }[] = [];

    for (const m of slidingHistory) {
      if (m.role !== "user" && m.role !== "assistant") continue;

      const role = m.role === "assistant" ? "model" : "user";
      const rawContent = m.content?.trim() || "(empty message)";
      const content =
        rawContent.length > 4000
          ? rawContent.slice(0, 4000) + "\n\n... [truncated for length]"
          : rawContent;

      if (sanitizedHistory.length === 0) {
        if (role === "user") {
          sanitizedHistory.push({ role, parts: [{ text: content }] });
        }
      } else {
        const last = sanitizedHistory[sanitizedHistory.length - 1];
        if (last.role === role) {
          last.parts[0].text += "\n\n" + content;
        } else {
          sanitizedHistory.push({ role, parts: [{ text: content }] });
        }
      }
    }

    let prefixContext = "";
    if (
      sanitizedHistory.length > 0 &&
      sanitizedHistory[sanitizedHistory.length - 1].role === "user"
    ) {
      const lastUser = sanitizedHistory.pop();
      prefixContext = `[PREVIOUS UNANSWERED QUERY]:\n${lastUser!.parts[0].text}\n\n`;
    }

    const chat = (model as any).startChat
      ? model.startChat({
          history: sanitizedHistory,
        })
      : {
          sendMessageStream: async (q: string) => {
            console.error(
              "[TextGenerationService] model.startChat missing! Falling back to generateContent",
              model,
            );
            const res = await model.generateContent(q);
            return {
              stream: (async function* () {
                yield { text: () => res.response.text() };
              })(),
            };
          },
        };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("You appear to be offline. Generation is unavailable.");
    }

    try {
      // 2. Prefix Stability: Always place dynamic Lore Context AFTER history
      // but BEFORE the current query. This keeps the history prefix stable
      // for Gemini's implicit caching.
      const finalQuery = context
        ? `[VAULT LORE CONTEXT]\n${u(context.trim())}\n\n${prefixContext}[USER QUERY]\n${u(query)}`
        : `${prefixContext}${u(query)}`;

      const result = await chat.sendMessageStream(finalQuery);
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        await onUpdate(fullText);
      }
    } catch (err: unknown) {
      console.error("Gemini API Error:", err);
      const classified = classifyApiError(err);
      throw new Error(classified.message, { cause: err });
    }
  }

  /**
   * Drive one chat turn through the Gemini Interactions API. Sends only the
   * new/changed lore plus the user query, threading server-side conversation
   * state. On an expired interaction id, resets and replays full history + lore
   * once (see ADR 018, plan Phase 3.4).
   */
  private async generateViaInteraction(
    query: string,
    history: any[],
    modelName: string,
    systemInstruction: string,
    conversationId: string,
    loreEntries: LoreEntry[],
    onUpdate: (partial: string) => void | Promise<void>,
  ): Promise<void> {
    const session = interactionSessions.getSession(conversationId);

    const send = async (input: string, previousId: string | null) => {
      const result = await this.aiClientManager.sendInteraction({
        model: modelName,
        input,
        systemInstruction,
        previousInteractionId: previousId,
      });
      return result;
    };

    try {
      let partition = session.tracker.partition(loreEntries);
      const input = buildInteractionInput(query, partition);

      let result;
      try {
        result = await send(input, session.previousInteractionId);
      } catch (err) {
        if (!(err instanceof InteractionExpiredError)) throw err;
        // Retention window elapsed: drop server state and replay full history +
        // full lore in a single fresh interaction, then resume delta mode.
        interactionSessions.resetSession(conversationId);
        // After reset the tracker is empty, so partition.newOrChanged holds
        // every entry. buildInteractionInput will include the full lore context;
        // prepend the conversation transcript so the model can re-establish context.
        partition = session.tracker.partition(loreEntries);
        const replayInput =
          this.formatHistoryTranscript(history) +
          buildInteractionInput(query, partition);
        result = await send(replayInput, null);
      }

      session.previousInteractionId = result.id;
      session.tracker.commit(loreEntries);
      await onUpdate(result.text);

      // Rollout metric (plan 6.2): how much lore the delta flow kept off the
      // wire. Uses the partition actually sent (post-replay if it occurred).
      if (import.meta.env.DEV) {
        const total = loreEntries.length;
        const sent = total - partition.unchanged.length;
        console.log(
          `[Interactions] lore records sent ${sent}/${total} (${partition.unchanged.length} retained server-side)`,
        );
      }
    } catch (err: unknown) {
      console.error("Gemini Interactions Error:", err);
      const classified = classifyApiError(err);
      throw new Error(classified.message, { cause: err });
    }
  }

  /** Render prior chat turns as a plain-text transcript for replay. */
  private formatHistoryTranscript(history: any[]): string {
    if (!history?.length) return "";
    const lines = history
      .filter((m) => m?.role === "user" || m?.role === "assistant")
      .map((m) => {
        const who = m.role === "assistant" ? "Oracle" : "User";
        const content = (m.content || "").trim();
        return content ? `${who}: ${content}` : "";
      })
      .filter(Boolean);
    if (lines.length === 0) return "";
    return `[CONVERSATION SO FAR]\n${lines.join("\n")}\n\n`;
  }
}
