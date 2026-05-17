import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";

export class DiceExecutor implements OracleCommandExecutor {
  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
  ): Promise<void> {
    const formula = intent.formula;
    if (!formula) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: "❌ Please specify a roll formula (e.g. /roll 1d20).",
      });
      return;
    }

    try {
      const command = context.diceParser.parse(formula);
      const result = context.diceEngine.execute(command);
      await context.diceHistory.addResult(result, "chat");

      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: "",
        type: "roll",
        rollResult: result,
      });
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ Roll failed: ${err.message}`,
      });
    }
  }
}
