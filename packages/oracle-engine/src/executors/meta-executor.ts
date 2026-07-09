import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

export class MetaExecutor
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
        switch (intent.type) {
          case "help":
            await this.executeHelp(context);
            break;
          case "clear":
            await context.chatHistory.clearMessages();
            break;
          default:
            throw new Error(
              `Unsupported intent type in MetaExecutor: ${intent.type}`,
            );
        }

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      } catch (err: any) {
        const error = err.message || "Unknown meta execution error";
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_FAILED,
          payload: { intent, error },
        });
        throw err;
      }
    });
  }

  private async executeHelp(context: OracleExecutionContext) {
    const isAIDisabled = context.uiStore.aiDisabled;

    const msg: ChatMessage = {
      id: this.idGenerator.uuid(),
      role: "system",
      content: isAIDisabled
        ? `### Restricted Mode Active
AI features are disabled. The Oracle is restricted to functional utility commands only. Natural language processing is disabled.

**Available Commands:**
- \`/roll [formula]\`: Roll dice (e.g. \`/roll 2d20kh1 + 5\`).
- \`/create "Name" [as "Type"]\`: Create a new record.
- \`/connect "Entity A" label "Entity B"\`: Create a connection.
- \`/merge "Source" into "Target"\`: Merge two entities.
- \`/clear\`: Clear chat history.
- \`/help\`: Show this message.

**Keyboard Shortcuts:**
- \`Cmd/Ctrl + Z\`: Undo (Regret)
- \`Cmd/Ctrl + Y\`: Redo (Reregret)
- \`Cmd/Ctrl + K\`: Search.\``
        : `### Oracle Command Guide
The Lore Oracle supports several slash commands to help you manage your vault:

**AI Powered:**
- \`/draw [subject]\`: Visualize an entity or scene.
- \`/revise\`: Revise the selected entity's Chronicle and Lore.
- \`/create [description]\`: Automatically create a new entity from a text description.
- \`/plot [entity name]\`: Analyse story tensions around an entity (rivals, risks, secrets). E.g. \`/plot threats around Count Dukoo\`.
- \`/connect oracle\`: Start the guided connection wizard.
- \`/merge oracle\`: Start the guided merge wizard.

**Utility:**
- \`/roll [formula]\`: Interactive dice roller (e.g. \`/roll 4d6!\`).
- \`/create "Name" [as "Type"]\`: Quick deterministic creation.
- \`/connect "Entity A" label "Entity B"\`: Quick deterministic connection.
- \`/merge "Source" into "Target"\`: Quick deterministic merge.
- \`/clear\`: Clear conversation history.
- \`/help\`: Show this guide.

**Keyboard Shortcuts:**
- \`Cmd/Ctrl + Z\`: Undo (Regret) last action.
- \`Cmd/Ctrl + Y\` or \`Cmd + Shift + Z\`: Redo (Reregret).
- \`Cmd/Ctrl + K\`: Search.\``,
    };
    await context.chatHistory.addMessage(msg);
  }
}
