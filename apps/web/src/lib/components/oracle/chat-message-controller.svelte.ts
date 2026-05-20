import { browser as defaultBrowser } from "$app/environment";
import DOMPurify from "dompurify";
import { appEventBus as defaultAppEventBus } from "@codex/events";
import { ORACLE_EVENTS } from "@codex/oracle-engine";
import { clipboardService as defaultClipboardService } from "$lib/services/ClipboardService";
import { parserService as defaultParserService } from "$lib/services/parser";
import { regenerationService as defaultRegenerationService } from "$lib/services/RegenerationService.svelte";
import { graph as defaultGraph } from "$lib/stores/graph.svelte";
import {
  oracle as defaultOracle,
  type ChatMessage,
} from "$lib/stores/oracle.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";
import { isVisibleDiscoveryProposal } from "./discovery-proposal-filter";
import {
  type DomPurifyLike,
  type HtmlParserLike,
  type ParsedChatMessage,
  renderMessageHtml,
} from "./chat-message.helpers";
import { ChatMessageActions } from "./chat-message.actions";

type OracleLike = typeof defaultOracle;
type VaultLike = typeof defaultVault;
type GraphLike = typeof defaultGraph;
type RegenerationServiceLike = typeof defaultRegenerationService;
type DiscoveryProposal = NonNullable<ChatMessage["proposals"]>[number];

interface ClipboardServiceLike {
  copyHtmlAndText(html: string, text: string): Promise<boolean>;
}

export interface ChatMessageControllerDeps {
  oracle?: OracleLike;
  vault?: VaultLike;
  graph?: GraphLike;
  parserService?: HtmlParserLike;
  clipboardService?: ClipboardServiceLike;
  domPurify?: DomPurifyLike;
  appEventBus?: typeof defaultAppEventBus;
  regenerationService?: RegenerationServiceLike;
  browser?: boolean;
  actions?: ChatMessageActions;
}

export class ChatMessageController {
  isSaved = $state(false);
  activeAction = $state<"apply" | "create" | "chronicle" | "lore" | null>(null);
  isCopied = $state(false);
  showDiscoveryChips = $state(false);
  isSelectingEntity = $state(false);
  selectedEntityId = $state<string | null>(null);
  htmlCache = $state("");

  private lastParsedContent = "";
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly oracle: OracleLike;
  private readonly vault: VaultLike;
  private readonly parserService: HtmlParserLike;
  private readonly clipboardService: ClipboardServiceLike;
  private readonly domPurify: DomPurifyLike;
  private readonly appEventBus: typeof defaultAppEventBus;
  private readonly regenerationService: RegenerationServiceLike;
  private readonly browser: boolean;
  private readonly actions: ChatMessageActions;

  constructor(deps: ChatMessageControllerDeps = {}) {
    this.oracle = deps.oracle ?? defaultOracle;
    this.vault = deps.vault ?? defaultVault;
    const graph = deps.graph ?? defaultGraph;
    this.parserService = deps.parserService ?? defaultParserService;
    this.clipboardService = deps.clipboardService ?? defaultClipboardService;
    this.domPurify = deps.domPurify ?? DOMPurify;
    this.appEventBus = deps.appEventBus ?? defaultAppEventBus;
    this.regenerationService =
      deps.regenerationService ?? defaultRegenerationService;
    this.browser = deps.browser ?? defaultBrowser;
    this.actions =
      deps.actions ??
      new ChatMessageActions({
        oracle: this.oracle,
        vault: this.vault,
        graph,
        regenerationService: this.regenerationService,
      });
  }

  destroy() {
    if (this.copyResetTimer) {
      clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }
  }

  subscribeToUndo(message: Pick<ChatMessage, "id">) {
    return this.appEventBus.subscribe(ORACLE_EVENTS.UNDO_PERFORMED, (event) => {
      if (
        event.type === ORACLE_EVENTS.UNDO_PERFORMED &&
        event.payload.messageId === message.id
      ) {
        this.isSaved = false;
      }
    });
  }

  async consumeSelectedEntity(message: Pick<ChatMessage, "id">) {
    if (!this.selectedEntityId) return;

    const id = this.selectedEntityId;
    this.isSelectingEntity = false;
    this.selectedEntityId = null;

    try {
      await this.oracle.updateMessageEntity(message.id, id);
    } catch {
      // Link selection is non-critical; avoid a noisy toast from this UI path.
    }
  }

  resetSavedWhenDraftCleared(
    message: Pick<ChatMessage, "content">,
    isLastAction: boolean,
  ) {
    if (
      this.isSaved &&
      !this.regenerationService.pendingDraft &&
      message.content
    ) {
      if (!isLastAction) {
        this.isSaved = false;
      }
    }
  }

  getVisibleProposals(message: Pick<ChatMessage, "proposals">) {
    const raw = (message.proposals ?? []).filter(isVisibleDiscoveryProposal);
    const seen = new Set<string>();
    const deduped = raw.filter((proposal) => {
      const key = this.discoveryProposalKey(proposal);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (this.vault.isGuest) {
      return deduped.filter(
        (proposal) =>
          proposal.entityId && this.vault.entities[proposal.entityId],
      );
    }

    return deduped;
  }

  discoveryProposalKey(proposal: DiscoveryProposal) {
    return `${proposal.entityId ?? "new"}:${proposal.title}`;
  }

  async renderContent(message: Pick<ChatMessage, "content">) {
    if (!message.content || message.content === this.lastParsedContent) return;

    const currentContent = message.content;
    try {
      const html = await renderMessageHtml(
        currentContent,
        this.parserService,
        this.browser,
        this.domPurify,
      );
      if (currentContent !== message.content) return;
      this.htmlCache = html;
      this.lastParsedContent = currentContent;
    } catch (err) {
      console.error("[ChatMessage] Parsing failed:", err);
      this.htmlCache = `<p class="text-red-400">Failed to render chronicle.</p>`;
    }
  }

  async copyToClipboard(message: Pick<ChatMessage, "content">) {
    if (!message.content) return;

    try {
      let contentToCopy = this.htmlCache;
      if (!contentToCopy) {
        contentToCopy = await renderMessageHtml(
          message.content,
          this.parserService,
          this.browser,
          this.domPurify,
        );
      }

      const success = await this.clipboardService.copyHtmlAndText(
        contentToCopy,
        message.content,
      );

      if (success) {
        this.isCopied = true;
        if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
        this.copyResetTimer = setTimeout(() => {
          this.isCopied = false;
          this.copyResetTimer = null;
        }, 2000);
      }
    } catch (err) {
      console.error("[ChatMessage] Clipboard copy failed:", err);
    }
  }

  async applySmart(params: {
    message: ChatMessage;
    parsed: ParsedChatMessage;
    activeEntityId: string | null;
  }) {
    this.activeAction = "apply";
    try {
      await this.actions.applySmart({
        ...params,
        setSaved: (saved) => {
          this.isSaved = saved;
        },
      });
    } finally {
      this.activeAction = null;
    }
  }

  async createAsNode(params: {
    message: ChatMessage;
    parsed: ParsedChatMessage;
  }) {
    this.activeAction = "create";
    try {
      await this.actions.createAsNode({
        ...params,
        setSaved: (saved) => {
          this.isSaved = saved;
        },
      });
    } finally {
      this.activeAction = null;
    }
  }

  async copyToChronicle(params: {
    message: ChatMessage;
    activeEntityId: string | null;
  }) {
    this.activeAction = "chronicle";
    try {
      await this.actions.copyToChronicle({
        ...params,
        setSaved: (saved) => {
          this.isSaved = saved;
        },
      });
    } finally {
      this.activeAction = null;
    }
  }

  async copyToLore(params: {
    message: ChatMessage;
    activeEntityId: string | null;
  }) {
    this.activeAction = "lore";
    try {
      await this.actions.copyToLore({
        ...params,
        setSaved: (saved) => {
          this.isSaved = saved;
        },
      });
    } finally {
      this.activeAction = null;
    }
  }

  async undo() {
    await this.actions.undo();
  }
}
