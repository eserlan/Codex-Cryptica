import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

export class DiceExecutor
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

      const formula = intent.formula;
      if (!formula) {
        const error = "❌ Please specify a roll formula (e.g. /roll 1d20).";
        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "system",
          content: error,
        });
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_FAILED,
          payload: { intent, error },
        });
        return;
      }

      try {
        const command = context.diceParser.parse(formula);
        const result = context.diceEngine.execute(command);
        await context.diceHistory.addResult(result, "chat");

        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "system",
          content: "",
          type: "roll",
          rollResult: result,
        });

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent, result },
        });
      } catch (err: any) {
        const error = err.message || "Unknown roll error";
        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "system",
          content: `❌ Roll failed: ${error}`,
        });
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_FAILED,
          payload: { intent, error },
        });
      }
    });
  }
}
