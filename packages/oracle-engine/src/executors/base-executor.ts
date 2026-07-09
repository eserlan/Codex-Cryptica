import type { Clock, IdGenerator } from "../runtime";
import { systemClock, systemIdGenerator } from "../runtime";
import type {
  OracleExecutionContext,
  OracleIntent,
  EntityDiscoveryMode,
  ConnectionDiscoveryMode,
  ChatMessage,
} from "../types";

/**
 * Base class for all Oracle command executors.
 * Provides shared utilities and enforces architectural patterns.
 */
export abstract class BaseExecutor {
  constructor(protected clock: Clock = systemClock, protected idGenerator: IdGenerator = systemIdGenerator) {}

  /**
   * Helper to extract and normalize categories from context.
   */
  protected getAvailableCategories(context: OracleExecutionContext) {
    return (context.categories || [])
      .map((category: any) => ({
        id: String(category?.id || "").trim(),
        label: category?.label ? String(category.label) : undefined,
        description: category?.description
          ? String(category.description)
          : undefined,
      }))
      .filter((category) => category.id);
  }

  /**
   * Validates if a proposed category ID exists in the current context.
   */
  protected getValidCategoryId(
    context: OracleExecutionContext,
    proposed: string | undefined,
  ): string | undefined {
    const categories = this.getAvailableCategories(context);
    return categories.some((category) => category.id === proposed)
      ? proposed
      : undefined;
  }

  /**
   * Wraps execution with a command stack check to prevent circular dependencies.
   */
  protected async executeWithStack(
    intent: OracleIntent,
    context: OracleExecutionContext,
    logic: () => Promise<void>,
  ): Promise<void> {
    const stack = context.commandStack || [];
    // Identify command by type and primary target if available
    const commandKey = `${intent.type}:${intent.entityId || intent.entityName || ""}`;

    if (stack.includes(commandKey)) {
      console.warn(
        `[BaseExecutor] Circular command detected and blocked: ${commandKey}`,
      );
      throw new Error(`Circular command detected: ${intent.type}`);
    }

    context.commandStack = [...stack, commandKey];
    try {
      await logic();
    } finally {
      // Restore stack
      context.commandStack = stack;
    }
  }

  /**
   * Helper to emit events via the context's event bus.
   */
  protected async emit(context: OracleExecutionContext, event: any) {
    if (context.eventBus?.emit) {
      await context.eventBus.emit({
        ...event,
        domain: "oracle",
        metadata: {
          timestamp: this.clock.now(),
          vaultId: context.vaultId,
        },
      });
    }
  }

  protected getEntityDiscoveryMode(
    context: OracleExecutionContext,
  ): EntityDiscoveryMode {
    if (context.automationPolicy?.entityDiscovery) {
      return context.automationPolicy.entityDiscovery;
    }
    if (context.uiStore?.entityDiscoveryMode) {
      return context.uiStore.entityDiscoveryMode;
    }
    return context.uiStore?.autoArchive ? "auto-create" : "suggest";
  }

  protected getConnectionDiscoveryMode(
    context: OracleExecutionContext,
  ): ConnectionDiscoveryMode {
    return (
      context.automationPolicy?.connectionDiscovery ||
      context.uiStore?.connectionDiscoveryMode ||
      "suggest"
    );
  }

  protected async handleConnectionDiscovery(
    entityId: string,
    context: OracleExecutionContext,
    analysisText?: string,
  ) {
    const mode = this.getConnectionDiscoveryMode(context);
    if (mode === "off" || !context.proposeConnectionsForEntity) {
      return 0;
    }

    try {
      return (
        (await context.proposeConnectionsForEntity(entityId, {
          apply: mode === "auto-apply",
          analysisText,
        })) || 0
      );
    } catch (error: unknown) {
      console.warn(
        "[OracleExecutor] Failed to handle connection discovery",
        error,
      );
      return 0;
    }
  }

  protected buildCreateConnectionContext(
    name: string,
    context: OracleExecutionContext,
  ): string | undefined {
    const recentMessages = (context.chatHistory?.messages || [])
      .slice(-8)
      .map((message: ChatMessage) => message.content?.trim())
      .filter((content: string | undefined): content is string =>
        Boolean(content),
      );

    if (recentMessages.length === 0) {
      return undefined;
    }

    const joined = recentMessages.join("\n\n");
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(`\\b${escapedName}\\b`, "i");

    if (nameRegex.test(joined)) {
      return joined;
    }

    return `${name}\n\n${joined}`;
  }
}
