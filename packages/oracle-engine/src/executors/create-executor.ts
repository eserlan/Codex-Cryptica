import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

export class CreateExecutor
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
        const name = intent.entityName;
        const type = intent.entityType || "note";

        if (!name) {
          throw new Error("Entity name is required for creation.");
        }

        if (context.vault.isGuest) {
          throw new Error("Guest users cannot create nodes.");
        }

        const id = await context.vault.createEntity(type as any, name, {
          content: "",
          lore: "",
        });

        const analysisText = this.buildCreateConnectionContext(name, context);
        const connectionMode = this.getConnectionDiscoveryMode(context);
        const appliedConnections = await this.handleConnectionDiscovery(
          id,
          context,
          analysisText,
        );

        const connectionSuffix =
          connectionMode === "auto-apply" && appliedConnections > 0
            ? ` and added ${appliedConnections} connection${appliedConnections === 1 ? "" : "s"}`
            : connectionMode === "suggest"
              ? " and queued connection suggestions"
              : "";

        await context.chatHistory.addMessage({
          id: this.idGenerator.uuid(),
          role: "system",
          content: `✅ Created node: **${name}** (${type.toUpperCase()})${connectionSuffix}`,
        });

        context.vault.selectedEntityId = id;

        await this.emit(context, {
          type: ORACLE_EVENTS.ENTITY_CREATED,
          payload: { entityId: id, title: name },
        });

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent, result: { id } },
        });
      } catch (err: any) {
        const error = err.message || "Creation failed";
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
}
