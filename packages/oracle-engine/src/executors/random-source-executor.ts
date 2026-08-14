import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

/**
 * `/table <name>` and `/deck <name> [count]` (#2247, FR-039).
 *
 * Deliberately mirrors `dice-executor.ts`: same lifecycle events, same
 * chat-message shape, same write-through to roll history. Like dice, this path
 * needs no network and no AI.
 *
 * The `randomSources` context member is the seam over the vault's tables and
 * decks, supplied by the app layer.
 */
export class RandomSourceExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  constructor(
    clock?: import("../runtime").Clock,
    idGenerator?: import("../runtime").IdGenerator,
  ) {
    super(clock, idGenerator);
  }

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
  ): Promise<void> {
    await this.executeWithStack(intent, context, async () => {
      await this.emit(context, {
        type: ORACLE_EVENTS.COMMAND_STARTED,
        payload: { intent },
      });

      const sources = context.randomSources;
      const name = intent.sourceName?.trim();

      if (!sources || !name) {
        await this.fail(
          context,
          intent,
          "❌ Tables and decks are not available right now.",
        );
        return;
      }

      const wantDeck = intent.type === "draw-deck";
      const source = sources.findByName?.(name);

      if (!source) {
        // A near miss mid-session is far more likely than a typo the user wants
        // to retype, so name the close matches rather than just failing.
        const suggestions: string[] = sources.suggestNames?.(name) ?? [];
        const hint =
          suggestions.length > 0
            ? ` Did you mean: ${suggestions.join(", ")}?`
            : "";
        await this.fail(
          context,
          intent,
          `❌ No ${wantDeck ? "deck" : "table"} called "${name}".${hint}`,
        );
        return;
      }

      if (wantDeck && source.kind !== "deck") {
        await this.fail(
          context,
          intent,
          `❌ "${source.name}" is a table. Use /table ${source.name} to roll it.`,
        );
        return;
      }
      if (!wantDeck && source.kind !== "table") {
        await this.fail(
          context,
          intent,
          `❌ "${source.name}" is a deck. Use /deck ${source.name} to draw from it.`,
        );
        return;
      }

      try {
        const result = wantDeck
          ? await sources.draw(source, intent.drawCount ?? 1)
          : await sources.roll(source);

        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "system",
          content: result.text,
          type: "roll",
          rollResult: result.record,
        });

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent, result },
        });
      } catch (err) {
        await this.fail(
          context,
          intent,
          `❌ Could not ${wantDeck ? "draw from" : "roll"} "${source.name}".`,
          err,
        );
      }
    });
  }

  private async fail(
    context: OracleExecutionContext,
    intent: OracleIntent,
    message: string,
    err?: unknown,
  ): Promise<void> {
    if (err) console.error("[RandomSourceExecutor]", err);
    await context.chatHistory.addMessage({
      id: this.idGenerator.uuid(),
      role: "system",
      content: message,
    });
    await this.emit(context, {
      type: ORACLE_EVENTS.COMMAND_FAILED,
      payload: { intent, error: message },
    });
  }
}
