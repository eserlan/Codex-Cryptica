import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

export class MergeExecutor
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
        if (intent.type === "merge-ai") {
          await this.executeMergeAI(intent.query!, context);
        } else {
          await this.executeMerge(
            intent.sourceName!,
            intent.targetName!,
            context,
          );
        }

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      } catch (err: any) {
        const error = err.message || "Merge failed";
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

  private async executeMerge(
    sourceName: string,
    targetName: string,
    context: OracleExecutionContext,
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

    if (sourceId === targetId)
      throw new Error("Cannot merge an entity into itself.");

    const sourceEntity = context.vault.entities[sourceId];
    const targetEntity = context.vault.entities[targetId];

    if (sourceEntity && targetEntity) {
      const proposal = await context.nodeMergeService.proposeMerge({
        sourceNodeIds: [sourceId, targetId],
        targetNodeId: targetId,
        strategy: "concat",
      });

      const beforeTarget = JSON.parse(
        JSON.stringify(context.vault.entities[targetId]),
      );
      const beforeSource = JSON.parse(
        JSON.stringify(context.vault.entities[sourceId]),
      );

      await context.nodeMergeService.executeMerge(proposal, [
        sourceId,
        targetId,
      ]);

      await context.chatHistory.addMessage({
        id: this.idGenerator.uuid(),
        role: "assistant",
        content: `✅ Merged **${sourceEntity.title}** into **${targetEntity.title}**.`,
      });

      context.undoRedo?.pushUndoAction(
        `Merge ${sourceEntity.title} into ${targetEntity.title}`,
        async () => {
          await context.vault.createEntity(
            beforeSource.type,
            beforeSource.title,
            { ...beforeSource },
          );
          context.vault.updateEntity(targetId, beforeTarget);
        },
        undefined,
        async () => {
          await context.nodeMergeService.executeMerge(proposal, [
            sourceId,
            targetId,
          ]);
        },
      );
    } else {
      throw new Error(
        `Entity resolution failed for "${sourceName}" or "${targetName}".`,
      );
    }
  }

  private async executeMergeAI(query: string, context: OracleExecutionContext) {
    const apiKey = context.effectiveApiKey || "";

    const { ProposerService } = await import("@codex/proposer");
    const proposer = new ProposerService();
    const parsedIntent = await proposer.parseMergeIntent(
      apiKey,
      context.modelName,
      query,
    );

    if (
      parsedIntent &&
      parsedIntent.sourceName?.trim() &&
      parsedIntent.targetName?.trim()
    ) {
      await this.executeMerge(
        parsedIntent.sourceName,
        parsedIntent.targetName,
        context,
      );
    } else {
      throw new Error(
        'AI could not understand merge names. Please use explicit format: `/merge "Source" into "Target"`.',
      );
    }
  }
}
