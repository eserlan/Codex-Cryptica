import { graph as defaultGraph } from "$lib/stores/graph.svelte";
import {
  oracle as defaultOracle,
  type ChatMessage,
} from "$lib/stores/oracle.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";
import { sanitizeId } from "$lib/utils/markdown";
import type { ParsedChatMessage } from "./chat-message.helpers";

type EntityLike = {
  id: string;
  title: string;
  type: string;
  content?: string;
  lore?: string;
  image?: string | null;
  thumbnail?: string | null;
};

type ConnectionLike = {
  target: string;
  type: string;
  strength: number;
  label?: string;
};

type VaultLike = typeof defaultVault;
type OracleLike = typeof defaultOracle;
type GraphLike = typeof defaultGraph;

export interface ChatMessageActionsDeps {
  oracle?: OracleLike;
  vault?: VaultLike;
  graph?: GraphLike;
}

export interface SavedStateCallbacks {
  setSaved(saved: boolean): void;
}

export class ChatMessageActions {
  private oracle: OracleLike;
  private vault: VaultLike;
  private graph: GraphLike;

  constructor(deps: ChatMessageActionsDeps = {}) {
    this.oracle = deps.oracle ?? defaultOracle;
    this.vault = deps.vault ?? defaultVault;
    this.graph = deps.graph ?? defaultGraph;
  }

  private finalTargetId(
    message: Pick<ChatMessage, "archiveTargetId" | "entityId">,
    activeEntityId: string | null,
  ) {
    return message.archiveTargetId || message.entityId || activeEntityId;
  }

  private captureState(entityId: string) {
    const entity = this.vault.entities[entityId] as EntityLike | undefined;
    if (!entity) return null;

    try {
      return structuredClone(entity) as EntityLike;
    } catch (error) {
      console.warn(
        "Failed to structuredClone entity, falling back to JSON parse/stringify",
        error,
      );
      return JSON.parse(JSON.stringify(entity)) as EntityLike;
    }
  }

  private async updateWithUndo(
    entityId: string,
    update: { content?: string; lore?: string },
    description: string,
    messageId: string,
    onUndo: (beforeState: EntityLike) => Promise<void>,
    setSaved: (saved: boolean) => void,
  ) {
    const beforeState = this.captureState(entityId);
    this.vault.selectedEntityId = entityId;
    await this.vault.updateEntity(entityId, update);
    setSaved(true);

    if (beforeState) {
      this.oracle.pushUndoAction(
        description,
        async () => {
          await onUndo(beforeState);
          setSaved(false);
        },
        messageId,
      );
    }
  }

  async applySmart(params: {
    message: ChatMessage;
    parsed: ParsedChatMessage;
    activeEntityId: string | null;
    setSaved(saved: boolean): void;
  }) {
    const finalTargetId = this.finalTargetId(
      params.message,
      params.activeEntityId,
    );

    console.log("[Oracle] Smart Apply triggered for:", finalTargetId);

    if (!finalTargetId || !params.message.content) {
      console.warn("[Oracle] Smart Apply aborted: Missing target or content");
      return;
    }

    const entity = this.vault.entities[finalTargetId] as EntityLike | undefined;
    if (!entity) {
      console.error(
        "[Oracle] Smart Apply failed: Entity not found in vault",
        finalTargetId,
      );
      return;
    }

    const updates: Partial<EntityLike> = {};
    if (params.parsed.chronicle) {
      updates.content = params.parsed.chronicle;
    }
    if (params.parsed.lore) {
      updates.lore = params.parsed.lore;
    }

    console.log("[Oracle] Smart Apply updates:", updates);

    if (Object.keys(updates).length === 0) {
      console.warn("[Oracle] Smart Apply aborted: No updates extracted");
      return;
    }

    await this.updateWithUndo(
      finalTargetId,
      updates,
      `Smart Apply to ${entity.title}`,
      params.message.id,
      async (beforeState) => {
        const undoUpdates: { content?: string; lore?: string } = {};
        if (params.parsed.chronicle) undoUpdates.content = beforeState.content;
        if (params.parsed.lore) undoUpdates.lore = beforeState.lore;
        await this.vault.updateEntity(beforeState.id, undoUpdates);
      },
      params.setSaved,
    );
  }

  async createAsNode(params: {
    message: ChatMessage;
    parsed: ParsedChatMessage;
    setSaved(saved: boolean): void;
  }) {
    if (!params.parsed.title || this.vault.isGuest) return;

    try {
      const type = (params.parsed.type || "character") as any;
      const connections: ConnectionLike[] = [
        ...(params.parsed.connections || []).map((conn) => {
          const targetName = typeof conn === "string" ? conn : conn.target;
          const label =
            typeof conn === "string" ? conn : conn.label || conn.target;
          return {
            target: sanitizeId(targetName || ""),
            label: label || undefined,
            type: "related_to",
            strength: 1.0,
          };
        }),
      ];

      const id = await this.vault.createEntity(type, params.parsed.title, {
        content: params.parsed.chronicle ?? undefined,
        lore: params.parsed.lore ?? undefined,
        connections,
        image: params.parsed.image ?? undefined,
        thumbnail: params.parsed.thumbnail ?? undefined,
      });

      this.vault.selectedEntityId = id;
      params.setSaved(true);
      this.oracle.updateMessageEntity(params.message.id, id);
      this.graph.requestFit();

      this.oracle.pushUndoAction(
        `Create Node ${params.parsed.title}`,
        async () => {
          await this.vault.deleteEntity(id);
          this.oracle.updateMessageEntity(params.message.id, null);
          params.setSaved(false);
        },
        params.message.id,
      );
    } catch (error) {
      console.error("Failed to create node from chat", error);
    }
  }

  async copyToChronicle(params: {
    message: ChatMessage;
    activeEntityId: string | null;
    setSaved(saved: boolean): void;
  }) {
    const finalTargetId = this.finalTargetId(
      params.message,
      params.activeEntityId,
    );
    if (!finalTargetId || !params.message.content) return;

    await this.updateWithUndo(
      finalTargetId,
      { content: params.message.content },
      `Update Chronicle: ${
        (this.vault.entities[finalTargetId] as EntityLike | undefined)?.title ??
        "Unknown"
      }`,
      params.message.id,
      async (beforeState) => {
        await this.vault.updateEntity(beforeState.id, {
          content: beforeState.content,
        });
      },
      params.setSaved,
    );
  }

  async copyToLore(params: {
    message: ChatMessage;
    activeEntityId: string | null;
    setSaved(saved: boolean): void;
  }) {
    const finalTargetId = this.finalTargetId(
      params.message,
      params.activeEntityId,
    );
    if (!finalTargetId || !params.message.content) return;

    await this.updateWithUndo(
      finalTargetId,
      { lore: params.message.content },
      `Update Lore: ${
        (this.vault.entities[finalTargetId] as EntityLike | undefined)?.title ??
        "Unknown"
      }`,
      params.message.id,
      async (beforeState) => {
        await this.vault.updateEntity(beforeState.id, {
          lore: beforeState.lore,
        });
      },
      params.setSaved,
    );
  }

  async undo() {
    await this.oracle.undo();
  }
}

export const chatMessageActions = new ChatMessageActions();
