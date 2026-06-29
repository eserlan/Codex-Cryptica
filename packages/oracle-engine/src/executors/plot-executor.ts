import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";
import type { OracleGenerator } from "../oracle-generator";
import type { Clock } from "../runtime";

export class PlotExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  constructor(
    private generator?: OracleGenerator,
    clock?: Clock,
  ) {
    super(clock);
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
        if (context.uiStore.aiDisabled) {
          throw new Error(
            "The /plot command is powered by AI and is disabled. Enable AI in settings to use story tension analysis.",
          );
        }

        const subject = intent.query || intent.entityName;
        if (!subject) {
          throw new Error(
            "Please specify an entity. Usage: `/plot [entity name]` or `/plot threats around [entity name]`",
          );
        }

        const results = await context.searchService.search(subject, {
          limit: 1,
        });
        if (!results[0]) throw new Error(`Could not find entity: "${subject}"`);

        const entityId = results[0].id;
        const entity = context.vault.entities[entityId];
        if (!entity) throw new Error(`Entity not found in vault: "${subject}"`);

        const uniqueConnectedIds = new Set<string>();
        const connectedEntities: any[] = [];

        // Outbound connections
        for (const conn of entity.connections || []) {
          if (!uniqueConnectedIds.has(conn.target)) {
            const connEntity = context.vault.entities[conn.target];
            if (connEntity) {
              uniqueConnectedIds.add(conn.target);
              connectedEntities.push({
                entity: connEntity,
                connectionType: conn.type,
                label: conn.label,
                direction: "outbound",
              });
            }
          }
        }

        // Inbound connections
        const inbound = context.vault.inboundConnections?.[entityId] || [];
        for (const { sourceId, connection } of inbound) {
          if (!uniqueConnectedIds.has(sourceId)) {
            const connEntity = context.vault.entities[sourceId];
            if (connEntity) {
              uniqueConnectedIds.add(sourceId);
              connectedEntities.push({
                entity: connEntity,
                connectionType: connection.type,
                label: connection.label,
                direction: "inbound",
              });
            }
          }
        }

        const apiKey = context.effectiveApiKey || "";
        const analysis = await context.textGeneration.generatePlotAnalysis(
          apiKey,
          context.modelName,
          entity,
          connectedEntities,
          `/plot ${subject}`,
        );

        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: analysis,
          entityId,
          sources: [entityId, ...connectedEntities.map((c) => c.entity.id)],
        });

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      } catch (err: any) {
        const error = err.message || "Plot analysis failed";
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
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
}
