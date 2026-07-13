import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type {
  RelatedEntityContext,
  TextGenerationService,
  ChatHistoryMessage,
  ConnectedEntityPromptContext,
} from "schema";
import { TextGenerationQueryService } from "./text-generation-query.service";
import { TextGenerationChatService } from "./text-generation-chat.service";
import { TextGenerationRevisionService } from "./text-generation-revision.service";
import { TextGenerationCreationService } from "./text-generation-creation.service";
import type { LoreEntry } from "@codex/oracle-engine";

export class DefaultTextGenerationService implements TextGenerationService {
  private queryService: TextGenerationQueryService;
  private chatService: TextGenerationChatService;
  private revisionService: TextGenerationRevisionService;
  private creationService: TextGenerationCreationService;

  constructor(aiClientManager = defaultAiClientManager) {
    this.queryService = new TextGenerationQueryService(aiClientManager);
    this.chatService = new TextGenerationChatService(aiClientManager);
    this.revisionService = new TextGenerationRevisionService(aiClientManager);
    this.creationService = new TextGenerationCreationService(aiClientManager);
  }

  expandQuery(
    apiKey: string,
    query: string,
    history: ChatHistoryMessage[],
  ): Promise<string> {
    return this.queryService.expandQuery(apiKey, query, history);
  }

  distillContext(
    apiKey: string,
    context: string,
    modelName: string,
  ): Promise<string> {
    return this.queryService.distillContext(apiKey, context, modelName);
  }

  generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: any,
    sources: any[],
    options?: { isGuest?: boolean },
  ): Promise<{ body: string; lore?: string }> {
    return this.creationService.generateMergeProposal(
      apiKey,
      modelName,
      target,
      sources,
      options,
    );
  }

  reviseEntityUpdate(
    apiKey: string,
    modelName: string,
    entity: any,
    incoming: { chronicle: string; lore: string },
    relatedEntities?: RelatedEntityContext[],
    categories?: { id: string; label?: string; description?: string }[],
    options?: {
      isGuest?: boolean;
      source?: string;
      instructions?: string;
      priority?: "instructions-first" | "incoming-first" | "preserve-existing";
      themeId?: string;
      interactionsEnabled?: boolean;
    },
  ): Promise<{ content: string; lore: string; categoryId?: string }> {
    return this.revisionService.reviseEntityUpdate(
      apiKey,
      modelName,
      entity,
      incoming,
      relatedEntities,
      categories,
      options,
    );
  }

  generatePlotAnalysis(
    apiKey: string,
    modelName: string,
    subject: any,
    connectedEntities: any[],
    userQuery: string,
    options?: { isGuest?: boolean },
  ): Promise<string> {
    return this.creationService.generatePlotAnalysis(
      apiKey,
      modelName,
      subject,
      connectedEntities,
      userQuery,
      options,
    );
  }

  generateStructuredEntity(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    categories?: string[],
  ): Promise<void> {
    return this.creationService.generateStructuredEntity(
      apiKey,
      query,
      context,
      modelName,
      onUpdate,
      categories,
    );
  }

  generateResponse(
    apiKey: string,
    query: string,
    history: any[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void | Promise<void>,
    demoMode = false,
    categories?: string[],
    options?: {
      requestId?: string;
      vaultId?: string;
      existingEntities?: any[];
      systemInstructionOverride?: string;
      loreEntries?: LoreEntry[];
      conversationId?: string;
      interactionsEnabled?: boolean;
      guestMode?: boolean;
    },
  ): Promise<void> {
    return this.chatService.generateResponse(
      apiKey,
      query,
      history,
      context,
      modelName,
      onUpdate,
      demoMode,
      categories,
      options,
    );
  }

  generateRelatedEntity(
    apiKey: string,
    modelName: string,
    sourceEntity: {
      title: string;
      type: string;
      content?: string;
      lore?: string;
    },
    targetType: string,
    relationship: string,
    customInstructions = "",
    connectedEntities: ConnectedEntityPromptContext[] = [],
    categories: { id: string; label?: string }[] = [],
    templateOutline = "",
    options?: { isGuest?: boolean; aiDisabled?: boolean },
  ): Promise<{
    name: string;
    type: string;
    summary: string;
    description: string;
    labels?: string[];
    plotHook?: string;
    relationshipBack?: string;
  }> {
    return this.creationService.generateRelatedEntity(
      apiKey,
      modelName,
      sourceEntity,
      targetType,
      relationship,
      customInstructions,
      connectedEntities,
      categories,
      templateOutline,
      options,
    );
  }
}

export const textGenerationService = new DefaultTextGenerationService();
