import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
  DiscoveryProposal,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";
import { OracleCommandParser } from "../oracle-parser";
import { buildRelatedEntityContext } from "../revision-context";
import type { OracleGenerator } from "../oracle-generator";
import type { DraftingEngine } from "../drafting-engine";
import type { Clock, IdGenerator } from "../runtime";

/**
 * Orchestrates multi-step AI chat generation and proactive extraction.
 */
export class ChatExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  private isExecuting = false;

  constructor(
    private generator?: OracleGenerator,
    private draftingEngine?: DraftingEngine,
    clock?: Clock,
    idGenerator?: IdGenerator,
  ) {
    super(clock, idGenerator);
  }

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    if (this.isExecuting) {
      await context.chatHistory.addMessage({
        id: this.idGenerator.uuid(),
        role: "system",
        content:
          "The Oracle is already processing a request. Please wait for the current action to complete.",
      });
      return;
    }

    const query = intent.query!;
    const isAIIntent = intent.isAIIntent ?? true;

    if (!query.trim()) return;

    this.isExecuting = true;
    try {
      await this.executeWithStack(intent, context, async () => {
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_STARTED,
          payload: { intent },
        });

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "user",
            content: query,
          });
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content:
              "The Oracle is currently offline. Conversational expansion and AI generation are suspended.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        const userMsgId = this.idGenerator.uuid();
        await context.chatHistory.addMessage({
          id: userMsgId,
          role: "user",
          content: query,
        });

        if (!isAIIntent) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content:
              "AI features are disabled. Only utility slash commands are supported. Type /help for a list of available commands.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        const isImageRequest = OracleCommandParser.detectImageIntent(query);
        const isCreationRequest =
          OracleCommandParser.detectCreationIntent(query);

        const assistantMsg: ChatMessage = {
          id: this.idGenerator.uuid(),
          role: "assistant",
          content: "",
          type: isImageRequest ? "image" : "text",
        };
        await context.chatHistory.addMessage(assistantMsg);

        const handlePartialResponse = (partial: string) => {
          assistantMsg.content = partial;
          void context.chatHistory.updateMessage?.(
            assistantMsg.id,
            { content: partial },
            false, // skip persistence during streaming
          );
          onPartialResponse?.(partial);
        };

        const generator = this.generator || context.generator;
        if (!generator) throw new Error("Generator not available in context.");
        try {
          if (isImageRequest) {
            const { primaryEntityId } = await generator.identifyPrimaryEntity(
              query,
              context,
            );

            assistantMsg.content = query;
            assistantMsg.entityId = primaryEntityId;

            const blob = await generator.generateMessageVisualization(
              assistantMsg,
              context,
            );
            const imageUrl = URL.createObjectURL(blob);

            const finalMsgs = (await context.chatHistory.getMessages?.()) ?? [
              ...context.chatHistory.messages,
            ];
            const lastIdx = finalMsgs.findIndex(
              (m: any) => m.id === assistantMsg.id,
            );
            if (lastIdx !== -1) {
              finalMsgs[lastIdx].imageUrl = imageUrl;
              finalMsgs[lastIdx].imageBlob = blob;
              finalMsgs[lastIdx].content =
                `Generated visualization for: "${query}"`;
              finalMsgs[lastIdx].entityId = primaryEntityId;
            }
            await context.chatHistory.setMessages(finalMsgs);

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
          } else if (isCreationRequest) {
            const { primaryEntityId, sourceIds } =
              await generator.generateCreationResponse(
                query,
                context,
                handlePartialResponse,
              );

            // Final update with entity context
            const finalMsgs = (await context.chatHistory.getMessages?.()) ?? [
              ...context.chatHistory.messages,
            ];
            const userMsgIndex = finalMsgs.findIndex(
              (m: any) => m.id === userMsgId,
            );
            const assistantMsgIndex = finalMsgs.findIndex(
              (m: any) => m.id === assistantMsg.id,
            );

            if (userMsgIndex !== -1) {
              finalMsgs[userMsgIndex].entityId = primaryEntityId;
            }
            if (assistantMsgIndex !== -1) {
              finalMsgs[assistantMsgIndex].entityId = primaryEntityId;
              finalMsgs[assistantMsgIndex].sources = sourceIds;
            }
            await context.chatHistory.setMessages(finalMsgs);
          } else {
            const { primaryEntityId, sourceIds } =
              await generator.generateChatResponse(
                query,
                context,
                handlePartialResponse,
                {
                  requestId: assistantMsg.id,
                  vaultId: context.vaultId,
                },
              );

            // Final update with entity context — read live messages, not the stale snapshot
            const finalMsgs = (await context.chatHistory.getMessages?.()) ?? [
              ...context.chatHistory.messages,
            ];
            const userMsgIndex = finalMsgs.findIndex(
              (m: any) => m.id === userMsgId,
            );
            const assistantMsgIndex = finalMsgs.findIndex(
              (m: any) => m.id === assistantMsg.id,
            );

            if (userMsgIndex !== -1) {
              finalMsgs[userMsgIndex].entityId = primaryEntityId;
            }
            if (assistantMsgIndex !== -1) {
              finalMsgs[assistantMsgIndex].entityId = primaryEntityId;
              finalMsgs[assistantMsgIndex].sources = sourceIds;
              finalMsgs[assistantMsgIndex].hasDrawAction =
                context.tier === "advanced";
            }

            // Proactive Extraction
            try {
              const entityDiscoveryMode = this.getEntityDiscoveryMode(context);
              if (entityDiscoveryMode === "off") {
                await context.chatHistory.setMessages(finalMsgs);
                await this.emit(context, {
                  type: ORACLE_EVENTS.COMMAND_COMPLETED,
                  payload: { intent },
                });
                return;
              }
              const combinedText = `${query}\n\n${finalMsgs[assistantMsgIndex].content}`;
              const engineToUse = this.draftingEngine || context.draftingEngine;

              if (!engineToUse)
                throw new Error("Drafting engine not available.");
              const proposals = await engineToUse.propose(combinedText, {
                existingEntities: Object.values(context.vault.entities || {}),
                history: context.chatHistory.messages,
                categories: context.categories,
              });

              if (proposals.length > 0) {
                const existingProposals =
                  finalMsgs[assistantMsgIndex].proposals || [];
                const newProposals = proposals.filter(
                  (p: DiscoveryProposal) =>
                    !existingProposals.some(
                      (e: DiscoveryProposal) => e.title === p.title,
                    ),
                );

                finalMsgs[assistantMsgIndex].proposals = [
                  ...existingProposals,
                  ...newProposals,
                ];

                // Auto-link high confidence existing entities if no entity is linked yet
                if (!finalMsgs[assistantMsgIndex].entityId) {
                  const highConfidenceMatch = [...proposals]
                    .filter(
                      (p: DiscoveryProposal) =>
                        p.entityId && p.confidence > 0.8,
                    )
                    .sort((a, b) => b.confidence - a.confidence)[0];

                  if (highConfidenceMatch) {
                    finalMsgs[assistantMsgIndex].entityId =
                      highConfidenceMatch.entityId;
                  }
                }

                for (const p of newProposals) {
                  await context.logActivity?.({
                    type: "discovery",
                    title: p.title,
                    entityType: p.type,
                    entityId: p.entityId,
                  });
                  await this.emit(context, {
                    type: ORACLE_EVENTS.ENTITY_DISCOVERED,
                    payload: { proposal: p },
                  });
                }

                // Handle Auto-Archive if enabled (skip for guests and demo mode)
                const autoArchiveEnabled =
                  entityDiscoveryMode === "auto-create";
                if (
                  autoArchiveEnabled &&
                  !context.vault.isGuest &&
                  !context.isDemoMode
                ) {
                  for (const p of proposals) {
                    if (!p.entityId) {
                      let content = p.draft.chronicle;
                      let lore = p.draft.lore;
                      let finalType = p.type;
                      if (
                        !context.vault.isGuest &&
                        context.textGeneration?.reviseEntityUpdate &&
                        proposals.length < 5
                      ) {
                        try {
                          const shell = {
                            id: "",
                            title: p.title,
                            type: p.type,
                            content: "",
                            lore: "",
                          } as any;
                          const revised =
                            await context.textGeneration.reviseEntityUpdate(
                              context.effectiveApiKey || "",
                              context.modelName,
                              shell,
                              {
                                chronicle: p.draft.chronicle,
                                lore: p.draft.lore,
                              },
                              [],
                              this.getAvailableCategories(context),
                              { themeId: context.uiStore?.activeThemeId },
                            );
                          content = revised.content || p.draft.chronicle;
                          lore = revised.lore || p.draft.lore;
                          finalType =
                            this.getValidCategoryId(
                              context,
                              revised.categoryId,
                            ) || p.type;
                        } catch {
                          // keep raw draft on failure
                        }
                      }
                      const id = await context.vault.createEntity(
                        finalType as any,
                        p.title,
                        {
                          content,
                          lore,
                          status: "draft",
                        },
                      );

                      await this.emit(context, {
                        type: ORACLE_EVENTS.ENTITY_CREATED,
                        payload: { entityId: id, title: p.title },
                      });

                      await context.logActivity?.({
                        type: "archive",
                        title: p.title,
                        entityType: finalType,
                        entityId: id,
                      });
                      await this.handleConnectionDiscovery(id, context);
                    } else {
                      const existing = context.vault.entities[p.entityId];
                      if (existing) {
                        let updatedContent = existing.content || "";
                        let updatedLore = existing.lore || "";
                        let finalType = existing.type || p.type;
                        const updatePatch: Record<string, string> = {};
                        if (
                          !context.vault.isGuest &&
                          context.textGeneration?.reviseEntityUpdate
                        ) {
                          try {
                            const revised =
                              await context.textGeneration.reviseEntityUpdate(
                                context.effectiveApiKey || "",
                                context.modelName,
                                existing,
                                {
                                  chronicle: p.draft.chronicle,
                                  lore: p.draft.lore,
                                },
                                buildRelatedEntityContext({
                                  entity: existing,
                                  incoming: {
                                    chronicle: p.draft.chronicle,
                                    lore: p.draft.lore,
                                  },
                                  vault: context.vault,
                                  getConsolidatedContext: (related) =>
                                    context.contextRetrieval.getConsolidatedContext(
                                      related,
                                    ),
                                }),
                                this.getAvailableCategories(context),
                                { themeId: context.uiStore?.activeThemeId },
                              );

                            updatedContent = revised.content;
                            updatedLore = revised.lore;
                            finalType =
                              this.getValidCategoryId(
                                context,
                                revised.categoryId,
                              ) || finalType;
                            updatePatch.content = updatedContent;
                            updatePatch.lore = updatedLore;
                          } catch {
                            updatedLore =
                              (existing.lore || "") + "\n\n" + p.draft.lore;
                            updatePatch.lore = updatedLore;
                          }
                        } else {
                          updatedLore =
                            (existing.lore || "") + "\n\n" + p.draft.lore;
                          updatePatch.lore = updatedLore;
                        }
                        updatePatch.type = finalType;
                        await context.vault.updateEntity(
                          p.entityId,
                          updatePatch,
                        );
                        await context.logActivity?.({
                          type: "update",
                          title: p.title,
                          entityType: finalType,
                          entityId: p.entityId,
                        });
                        await this.handleConnectionDiscovery(
                          p.entityId,
                          context,
                        );
                      }
                    }
                  }
                }
              }
            } catch (extractErr) {
              console.warn("[OracleExecutor] Extraction failed", extractErr);
            }

            await context.chatHistory.setMessages(finalMsgs);
          }

          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
        } catch (err: any) {
          const error = err.message || "Error generating response.";
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content: error,
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_FAILED,
            payload: { intent, error },
          });
        }
      });
    } finally {
      this.isExecuting = false;
    }
  }
}
