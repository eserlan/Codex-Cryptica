import type {
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
} from "./types";
import { OracleCommandParser } from "./oracle-parser";
import { OracleGenerator } from "./oracle-generator";

export class OracleActionExecutor {
  private generator = new OracleGenerator();

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    switch (intent.type) {
      case "help":
        await this.executeHelp(context);
        break;
      case "clear":
        await context.chatHistory.clearMessages();
        break;
      case "roll":
        await this.executeRoll(intent.formula, context);
        break;
      case "create":
        await this.executeCreate(intent.entityName, intent.entityType, context);
        break;
      case "connect":
        await this.executeConnect(
          intent.sourceName,
          intent.label,
          intent.targetName,
          context,
        );
        break;
      case "merge":
        await this.executeMerge(intent.sourceName, intent.targetName, context);
        break;
      case "connect-ai":
        await this.executeConnectAI(intent.query, context);
        break;
      case "merge-ai":
        await this.executeMergeAI(intent.query, context);
        break;
      case "plot":
        await this.executePlot(intent.query, context);
        break;
      case "chat":
        await this.executeChat(
          intent.query,
          intent.isAIIntent,
          context,
          onPartialResponse,
        );
        break;
      case "error":
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "system",
          content: intent.message.startsWith("❌")
            ? intent.message
            : `❌ ${intent.message}`,
        });
        break;
    }
  }

  private async executeHelp(context: OracleExecutionContext) {
    const isLite = context.uiStore.liteMode;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "system",
      content: isLite
        ? `### Restricted Mode Active
In Lite Mode, the Oracle is restricted to functional utility commands only. Natural language processing is disabled.

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

  private async executeRoll(formula: string, context: OracleExecutionContext) {
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

  private async executeCreate(
    name: string,
    type: string,
    context: OracleExecutionContext,
  ) {
    try {
      if (context.vault.isGuest)
        throw new Error("Guest users cannot create nodes.");

      const id = await context.vault.createEntity(type as any, name, {
        content: "",
        lore: "",
      });

      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `✅ Created node: **${name}** (${type.toUpperCase()})`,
      });

      context.vault.selectedEntityId = id;
      context.graph.requestFit();
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ ${err.message}`,
      });
    }
  }

  private async executeConnect(
    sourceName: string,
    label: string,
    targetName: string,
    context: OracleExecutionContext,
    type?: string,
  ) {
    try {
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
            id: crypto.randomUUID(),
            role: "assistant",
            content: `✅ Connected **${source.title}** to **${target.title}** as *${label || typeToUse}*.`,
          });

          context.undoRedo.pushUndoAction(
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
          `Entity "${!source ? sourceName : targetName}" was found in search but is missing from the active vault.`,
        );
      }
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ ${err.message}`,
      });
    }
  }

  private async executeMerge(
    sourceName: string,
    targetName: string,
    context: OracleExecutionContext,
  ) {
    try {
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
          id: crypto.randomUUID(),
          role: "assistant",
          content: `✅ Merged **${sourceEntity.title}** into **${targetEntity.title}**.`,
        });

        context.undoRedo.pushUndoAction(
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
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ ${err.message}`,
      });
    }
  }

  private async executeConnectAI(
    query: string,
    context: OracleExecutionContext,
  ) {
    const apiKey = context.effectiveApiKey;
    if (!apiKey) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "⚠️ The /connect command requires an AI API key. Please configure one in Settings.",
      });
      return;
    }

    try {
      const { ProposerService } = await import("@codex/proposer");
      const proposer = new ProposerService();
      const intent = await proposer.parseConnectionIntent(
        apiKey,
        context.modelName,
        query,
      );

      if (intent && intent.sourceName?.trim() && intent.targetName?.trim()) {
        await this.executeConnect(
          intent.sourceName,
          intent.label || "",
          intent.targetName,
          context,
          intent.type,
        );
      } else {
        throw new Error(
          'AI could not understand connection names. Please use explicit format: `/connect "A" to "B"`.',
        );
      }
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ ${err.message}`,
      });
    }
  }

  private async executeMergeAI(query: string, context: OracleExecutionContext) {
    const apiKey = context.effectiveApiKey;
    if (!apiKey) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "⚠️ The /merge command requires an AI API key. Please configure one in Settings.",
      });
      return;
    }

    try {
      const { ProposerService } = await import("@codex/proposer");
      const proposer = new ProposerService();
      const intent = await proposer.parseMergeIntent(
        apiKey,
        context.modelName,
        query,
      );

      if (intent && intent.sourceName?.trim() && intent.targetName?.trim()) {
        await this.executeMerge(intent.sourceName, intent.targetName, context);
      } else {
        throw new Error(
          'AI could not understand merge names. Please use explicit format: `/merge "Source" into "Target"`.',
        );
      }
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ ${err.message}`,
      });
    }
  }

  private async executePlot(subject: string, context: OracleExecutionContext) {
    if (context.uiStore.liteMode) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "❌ The /plot command is powered by AI and is disabled in Lite Mode. Disable Lite Mode in settings to use story tension analysis.",
      });
      return;
    }

    const apiKey = context.effectiveApiKey;
    if (!apiKey) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "⚠️ The /plot command requires an AI API key. Please configure one in Settings.",
      });
      return;
    }

    try {
      if (!subject) {
        throw new Error(
          "Please specify an entity. Usage: `/plot [entity name]` or `/plot threats around [entity name]`",
        );
      }

      const results = await context.searchService.search(subject, { limit: 1 });
      if (!results[0]) throw new Error(`Could not find entity: "${subject}"`);

      const entityId = results[0].id;
      const entity = context.vault.entities[entityId];
      if (!entity) throw new Error(`Entity not found in vault: "${subject}"`);

      const uniqueConnectedIds = new Set<string>();
      const connectedEntities: any[] = [];

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

      const inbound = context.vault.inboundConnections[entityId] || [];
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
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ ${err.message}`,
      });
    }
  }

  private async executeChat(
    query: string,
    isAIIntent: boolean,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ) {
    if (!query.trim()) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: query,
      });
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "The Oracle is currently offline. Conversational expansion and AI generation are suspended.",
      });
      return;
    }

    await context.chatHistory.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    });

    if (!isAIIntent) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "AI features are disabled in Lite Mode. Only utility slash commands are supported. Type /help for a list of available commands.",
      });
      return;
    }

    const isLongResponse = OracleCommandParser.isExpandRequest(query);
    const responseLength = isLongResponse ? "detailed" : "balanced";
    const isImageRequest = OracleCommandParser.detectImageIntent(query);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      type: isImageRequest ? "image" : "text",
      isLongResponse,
      responseLength,
    };
    await context.chatHistory.addMessage(assistantMsg);

    try {
      if (isImageRequest) {
        // We first run a chat response cycle to identify the primary entity and gather context.
        // This is much faster/cheaper than full image generation and avoids clobbering.
        const { primaryEntityId } = await this.generator.generateChatResponse(
          query,
          context,
          () => {},
        );

        assistantMsg.content = query;
        assistantMsg.entityId = primaryEntityId;

        const blob = await this.generator.generateMessageVisualization(
          assistantMsg,
          context,
        );
        const imageUrl = URL.createObjectURL(blob);

        const finalMsgs = [...context.chatHistory.messages];
        const last = finalMsgs[finalMsgs.length - 1];
        last.imageUrl = imageUrl;
        last.imageBlob = blob;
        last.content = `Generated visualization for: "${query}"`;
        last.entityId = primaryEntityId;
        context.chatHistory.setMessages(finalMsgs);

        // Auto-attach to entity if possible
        if (primaryEntityId && !context.isDemoMode) {
          const { image, thumbnail } = await context.vault.saveImageToVault(
            blob,
            primaryEntityId,
          );
          await context.vault.updateEntity(primaryEntityId, {
            image,
            thumbnail,
          });
        }
      } else {
        const { primaryEntityId, sourceIds } =
          await this.generator.generateChatResponse(
            query,
            context,
            onPartialResponse || (() => {}),
          );

        // Final update with entity context
        const finalMsgs = [...context.chatHistory.messages];
        const userMsgIndex = finalMsgs.length - 2;
        const assistantMsgIndex = finalMsgs.length - 1;

        finalMsgs[userMsgIndex].entityId = primaryEntityId;
        finalMsgs[assistantMsgIndex].entityId = primaryEntityId;
        finalMsgs[assistantMsgIndex].sources = sourceIds;
        finalMsgs[assistantMsgIndex].hasDrawAction =
          context.tier === "advanced";

        context.chatHistory.setMessages(finalMsgs);
      }
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: err.message || "Error generating response.",
      });
    }
  }

  async drawEntity(entityId: string, context: OracleExecutionContext) {
    if (!context.effectiveApiKey) return;
    const entity = context.vault.entities[entityId];
    if (!entity) return;

    try {
      const blob = await this.generator.generateEntityVisualization(
        entityId,
        context,
      );

      if (context.isDemoMode) {
        const imageUrl = URL.createObjectURL(blob);
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          type: "image",
          imageUrl,
          imageBlob: blob,
          entityId,
        });
      } else {
        const { image, thumbnail } = await context.vault.saveImageToVault(
          blob,
          entityId,
        );
        await context.vault.updateEntity(entityId, {
          image,
          thumbnail,
        });
      }
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ Image generation failed for **${entity.title}**: ${err.message}`,
      });
    }
  }

  async drawMessage(messageId: string, context: OracleExecutionContext) {
    if (!context.effectiveApiKey) return;
    const msgIndex = context.chatHistory.messages.findIndex(
      (m: any) => m.id === messageId,
    );
    if (msgIndex === -1) return;

    const message = context.chatHistory.messages[msgIndex];

    try {
      const blob = await this.generator.generateMessageVisualization(
        message,
        context,
      );
      const imageUrl = URL.createObjectURL(blob);
      const updatedMsgs = [...context.chatHistory.messages];
      updatedMsgs[msgIndex] = {
        ...message,
        type: "image",
        imageUrl,
        imageBlob: blob,
        isDrawing: false,
        hasDrawAction: false,
      };
      context.chatHistory.setMessages(updatedMsgs);
    } catch (err: any) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ Image generation failed: ${err.message}`,
      });
    }
  }
}
