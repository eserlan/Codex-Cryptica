import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

export class ConnectExecutor
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

      try {
        if (intent.type === "connect-ai") {
          await this.executeConnectAI(intent.query!, context);
        } else {
          await this.executeConnect(
            intent.sourceName!,
            intent.label || "",
            intent.targetName!,
            context,
            intent.entityType, // intent.type is reused for connection type in some contexts
          );
        }

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      } catch (err: any) {
        const error = err.message || "Connection failed";
        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "system",
          content: `❌ ${error}`,
        });
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_FAILED,
          payload: { intent, error },
        });
      }
    });
  }

  private async executeConnect(
    sourceName: string,
    label: string,
    targetName: string,
    context: OracleExecutionContext,
    type?: string,
  ) {
    const sourceRes = await context.searchService.search(sourceName, {
      limit: 1,
    });
    const targetRes = await context.searchService.search(targetName, {
      limit: 1,
    });

    if (!sourceRes[0])
      throw new Error(`Could not find source entity: "${sourceName}"`);
    if (!targetRes[0])
      throw new Error(`Could not find target entity: "${targetName}"`);

    const sourceId = sourceRes[0].id;
    const targetId = targetRes[0].id;
    const source = context.vault.entities[sourceId];
    const target = context.vault.entities[targetId];

    if (source && target) {
      const typeToUse = type || "related_to";
      const success = await context.vault.addConnection(
        source.id,
        target.id,
        typeToUse,
        label,
      );

      if (success) {
        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "assistant",
          content: `✅ Connected **${source.title}** to **${target.title}** as *${label || typeToUse}*.`,
        });

        context.undoRedo?.pushUndoAction(
          `Connect ${source.title} to ${target.title}`,
          async () => {
            await context.vault.removeConnection(
              source.id,
              target.id,
              typeToUse,
            );
          },
          undefined,
          async () => {
            await context.vault.addConnection(
              source.id,
              target.id,
              typeToUse,
              label,
            );
          },
        );
      } else {
        throw new Error("Vault refused to create connection.");
      }
    } else {
      throw new Error(
        `Entity resolution failed for "${sourceName}" or "${targetName}".`,
      );
    }
  }

  private async executeConnectAI(
    query: string,
    context: OracleExecutionContext,
  ) {
    const apiKey = context.effectiveApiKey || "";

    const { ProposerService } = await import("@codex/proposer");
    const proposer = new ProposerService();
    const parsedIntent = await proposer.parseConnectionIntent(
      apiKey,
      context.modelName,
      query,
    );

    if (
      parsedIntent &&
      parsedIntent.sourceName?.trim() &&
      parsedIntent.targetName?.trim()
    ) {
      await this.executeConnect(
        parsedIntent.sourceName,
        parsedIntent.label || "",
        parsedIntent.targetName,
        context,
        parsedIntent.type,
      );
    } else {
      throw new Error(
        'AI could not understand connection names. Please use explicit format: `/connect "A" to "B"`.',
      );
    }
  }
}
