import { OracleGenerator } from "./oracle-generator";
import { DraftingEngine, draftingEngine } from "./drafting-engine";
import { DiceExecutor } from "./executors/dice-executor";
import { MetaExecutor } from "./executors/meta-executor";
import { CreateExecutor } from "./executors/create-executor";
import { ConnectExecutor } from "./executors/connect-executor";
import { MergeExecutor } from "./executors/merge-executor";
import { PlotExecutor } from "./executors/plot-executor";
import { VisualizationExecutor } from "./executors/visualization-executor";
import { RegenerateExecutor } from "./executors/regenerate-executor";
import { ChatExecutor } from "./executors/chat-executor";
import type { OracleIntent, OracleExecutionContext } from "./types";

/**
 * Main dispatcher for Oracle actions.
 * Follows the Command Pattern by delegating execution to specialized handlers.
 * Leverages Dependency Injection for all sub-executors.
 */
export class OracleActionExecutor {
  private generator: OracleGenerator;
  private draftingEngine: DraftingEngine;

  // Sub-Executors
  private diceExecutor = new DiceExecutor();
  private metaExecutor = new MetaExecutor();
  private createExecutor = new CreateExecutor();
  private connectExecutor = new ConnectExecutor();
  private mergeExecutor = new MergeExecutor();
  private plotExecutor: PlotExecutor;
  private visualizationExecutor: VisualizationExecutor;
  private regenerateExecutor: RegenerateExecutor;
  private chatExecutor: ChatExecutor;

  constructor(generator?: OracleGenerator, engine?: DraftingEngine) {
    this.generator = generator ?? new OracleGenerator();
    this.draftingEngine = engine ?? draftingEngine;

    // Inject dependencies into handlers
    this.plotExecutor = new PlotExecutor(this.generator);
    this.visualizationExecutor = new VisualizationExecutor(this.generator);
    this.regenerateExecutor = new RegenerateExecutor(this.generator);
    this.chatExecutor = new ChatExecutor(this.generator, this.draftingEngine);
  }

  /**
   * Routes an intent to the appropriate specialized executor.
   */
  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    switch (intent.type) {
      case "help":
      case "clear":
        await this.metaExecutor.execute(intent, context);
        break;
      case "regenerate":
        await this.regenerateExecutor.execute(
          intent,
          context,
          onPartialResponse,
        );
        break;
      case "roll":
        await this.diceExecutor.execute(intent, context);
        break;
      case "create":
        await this.createExecutor.execute(intent, context);
        break;
      case "connect":
      case "connect-ai":
        await this.connectExecutor.execute(intent, context);
        break;
      case "merge":
      case "merge-ai":
        await this.mergeExecutor.execute(intent, context);
        break;
      case "plot":
        await this.plotExecutor.execute(intent, context);
        break;
      case "draw":
        await this.visualizationExecutor.execute(intent, context);
        break;
      case "chat":
        await this.chatExecutor.execute(intent, context, onPartialResponse);
        break;
      case "error":
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "system",
          content: intent.message?.startsWith("❌")
            ? intent.message
            : `❌ ${intent.message}`,
        });
        break;
    }
  }

  /**
   * Public API for direct entity visualization.
   */
  async drawEntity(entityId: string, context: OracleExecutionContext) {
    await this.visualizationExecutor.drawEntity(entityId, context);
  }

  async prepareEntityPrompt(
    entityId: string,
    context: OracleExecutionContext,
    options: { ignoreSavedArtDirection?: boolean } = {},
  ) {
    return this.visualizationExecutor.prepareEntityPrompt(
      entityId,
      context,
      options,
    );
  }

  async generateEntityFromPrompt(
    entityId: string,
    prompt: string,
    context: OracleExecutionContext,
  ) {
    await this.visualizationExecutor.generateEntityFromPrompt(
      entityId,
      prompt,
      context,
    );
  }

  /**
   * Public API for direct message visualization.
   */
  async drawMessage(messageId: string, context: OracleExecutionContext) {
    await this.visualizationExecutor.drawMessage(messageId, context);
  }

  async prepareMessagePrompt(
    messageId: string,
    context: OracleExecutionContext,
  ) {
    return this.visualizationExecutor.prepareMessagePrompt(messageId, context);
  }

  async generateMessageFromPrompt(
    messageId: string,
    prompt: string,
    context: OracleExecutionContext,
  ) {
    await this.visualizationExecutor.generateMessageFromPrompt(
      messageId,
      prompt,
      context,
    );
  }

  /**
   * Public API for direct entity regeneration.
   */
  async regenerateEntity(
    entityId: string,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ) {
    try {
      await this.regenerateExecutor.execute(
        { type: "regenerate", entityId },
        context,
        onPartialResponse,
      );
    } catch (err: any) {
      // execute() usually catches errors, but we wrap for safety and parity
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ Regeneration failed: ${err.message}`,
      });
    }
  }
}
