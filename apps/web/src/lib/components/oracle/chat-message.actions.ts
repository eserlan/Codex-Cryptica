import { graph as defaultGraph } from "$lib/stores/graph.svelte";
import { debugStore } from "$lib/stores/debug.svelte";
import {
  oracle as defaultOracle,
  type ChatMessage,
} from "$lib/stores/oracle.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";
import { revisionService as defaultRevisionService } from "$lib/services/RevisionService.svelte";
import { sanitizeId } from "$lib/utils/markdown";
import type { ParsedChatMessage } from "./chat-message.helpers";
import { systemClock } from "$lib/utils/runtime-deps";

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
type RevisionServiceLike = typeof defaultRevisionService;

export interface ChatMessageActionsDeps {
  oracle?: OracleLike;
  vault?: VaultLike;
  graph?: GraphLike;
  revisionService?: RevisionServiceLike;
}

export interface SavedStateCallbacks {
  setSaved(saved: boolean): void;
}

export class ChatMessageActions {
  private oracle: OracleLike;
  private vault: VaultLike;
  private graph: GraphLike;
  private revisionService: RevisionServiceLike;

  constructor(deps: ChatMessageActionsDeps = {}) {
    this.oracle = deps.oracle ?? defaultOracle;
    this.vault = deps.vault ?? defaultVault;
    this.graph = deps.graph ?? defaultGraph;
    this.revisionService = deps.revisionService ?? defaultRevisionService;
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
    return JSON.parse(JSON.stringify(entity)) as EntityLike;
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

    debugStore.log("[Oracle] Smart Apply triggered for:", finalTargetId);

    if (!finalTargetId || !params.message.content) {
      debugStore.warn(
        "[Oracle] Smart Apply aborted: Missing target or content",
      );
      return;
    }

    const entity = this.vault.entities[finalTargetId] as EntityLike | undefined;
    if (!entity) {
      debugStore.error(
        "[Oracle] Smart Apply failed: Entity not found in vault",
        finalTargetId,
      );
      return;
    }

    const incoming: { chronicle?: string; lore?: string } = {};
    if (params.parsed.chronicle) incoming.chronicle = params.parsed.chronicle;
    if (params.parsed.lore) incoming.lore = params.parsed.lore;

    if (Object.keys(incoming).length === 0) {
      debugStore.warn("[Oracle] Smart Apply aborted: No updates extracted");
      return;
    }

    const updates = await this.oracle.reviseSmartApply(finalTargetId, incoming);

    debugStore.log(
      "[Oracle] Smart Apply revised updates:",
      // Log a summary only — `updates` may contain full content/lore strings
      // which would hold large references in debugStore's ring buffer.
      Object.fromEntries(
        Object.entries(updates ?? {}).map(([k, v]) => [
          k,
          typeof v === "string" ? `${v.length} chars` : v,
        ]),
      ),
    );

    // Instead of immediate update with undo, use the draft flow for a unified experience
    this.revisionService.pendingDraft = {
      entityId: finalTargetId,
      messageId: params.message.id,
      source: "oracle-chat",
      chronicle: updates.content ?? entity?.content ?? "",
      lore: updates.lore ?? entity?.lore ?? "",
      timestamp: systemClock.now(),
    };

    // Auto-focus the entity so the user sees the draft overlay
    this.vault.selectedEntityId = finalTargetId;
    params.setSaved(true);
  }

  async createAsNode(params: {
    message: ChatMessage;
    parsed: ParsedChatMessage;
    setSaved(saved: boolean): void;
  }) {
    if (!params.parsed.title || this.vault.isGuest) return;

    try {
      const type = (params.parsed.type || "character") as any;
      const connections: ConnectionLike[] = (params.parsed.connections || [])
        .flatMap((conn) => {
          const targetName = typeof conn === "string" ? conn : conn.target;
          const targetId = sanitizeId(targetName || "");
          if (!targetId) return [];
          const label =
            typeof conn === "string" ? conn : conn.label || conn.target;
          return [
            {
              target: targetId,
              label: label || undefined,
              type: "related_to",
              strength: 1.0,
            },
          ];
        })
        .map((conn) => conn as ConnectionLike);

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
      // Graph sync will trigger a real layout+fit after the node is added.
      // Forcing an immediate fit here can zoom to temporary seed positions.

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

    const updates = await this.oracle.reviseSmartApply(finalTargetId, {
      chronicle: params.message.content,
    });

    const entity = this.vault.entities[finalTargetId] as EntityLike | undefined;
    this.revisionService.pendingDraft = {
      entityId: finalTargetId,
      messageId: params.message.id,
      source: "oracle-chat",
      chronicle: updates.content ?? entity?.content ?? "",
      lore: updates.lore ?? entity?.lore ?? "",
      timestamp: systemClock.now(),
    };

    this.vault.selectedEntityId = finalTargetId;
    params.setSaved(true);
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

    const updates = await this.oracle.reviseSmartApply(finalTargetId, {
      lore: params.message.content,
    });

    const entity = this.vault.entities[finalTargetId] as EntityLike | undefined;
    this.revisionService.pendingDraft = {
      entityId: finalTargetId,
      messageId: params.message.id,
      source: "oracle-chat",
      chronicle: updates.content ?? entity?.content ?? "",
      lore: updates.lore ?? entity?.lore ?? "",
      timestamp: systemClock.now(),
    };

    this.vault.selectedEntityId = finalTargetId;
    params.setSaved(true);
  }

  async undo() {
    await this.oracle.undo();
  }
}

export const chatMessageActions = new ChatMessageActions();
