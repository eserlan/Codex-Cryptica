<script lang="ts">
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import ChatMessage from "./ChatMessage.svelte";
  import CommandMenu from "./CommandMenu.svelte";
  import EntityMentionPicker from "./EntityMentionPicker.svelte";
  import EntityMentionDisambiguation, {
    type MentionCandidate,
  } from "./EntityMentionDisambiguation.svelte";
  import { searchService } from "@codex/search-orchestrator";
  import { OracleMentionController } from "./oracle-mention-controller.svelte";
  import { createVaultMentionSource } from "#lib/stores/oracle/mention-source.js";
  import { takeMentionHint } from "./oracle-mention-hint";
  import { browserStorage } from "#lib/utils/runtime-deps.js";
  import { type Mention, type ResolvedMention } from "entity-mention-engine";
  import { planMentionSend } from "#lib/stores/oracle/mention-intent.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import { chatCommands } from "../../config/chat-commands";
  import { fade } from "svelte/transition";
  import { tick } from "svelte";
  import { isChatNearBottom, scrollChatToBottom } from "./oracle-chat-scroll";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import {
    ORACLE_CHAT_INPUT_EVENT,
    getOracleChatDraft,
    clearOracleChatDraft,
    takeOraclePrefill,
  } from "./oracle-chat-input";

  let { onOpenSettings }: { onOpenSettings?: () => void } = $props();

  let input = $state("");

  // `@` mentions (#4052): the controller owns the picker and draft mentions.
  // Offsets are kept against the untrimmed `input`.
  const mentionController = new OracleMentionController(
    () => createVaultMentionSource(oracle.vault as any),
    (query) =>
      searchService
        .search(query, { limit: 8 })
        .then((results) => results.map((r) => r.id)),
  );
  $effect(() => {
    mentionController.syncVault((oracle.vault as any)?.activeVaultId);
  });
  $effect(() => () => mentionController.destroy());
  let lastInput = "";
  // The first-use hint is shown once per device (see takeMentionHint).
  let mentionHint = $state<string | null>(null);
  let mentionHintShown = false;
  let ambiguity = $state<{
    name: string;
    span: ResolvedMention;
    candidates: MentionCandidate[];
  } | null>(null);

  const draftMentionsFor = (raw: string): Mention[] => {
    const shift = raw.length - raw.trimStart().length;
    return mentionController.mentions.map((m) => ({
      ...m,
      start: m.start - shift,
      end: m.end - shift,
    }));
  };

  const applyText = (text: string, caret: number) => {
    input = text;
    lastInput = text;
    tick().then(() => {
      textArea?.focus();
      textArea?.setSelectionRange(caret, caret);
    });
  };

  const handleTextInput = (event: Event) => {
    const el = event.currentTarget as HTMLTextAreaElement;
    mentionController.handleInput(lastInput, el.value, el.selectionStart);
    lastInput = el.value;
    if (mentionController.open && mentionHint === null && !mentionHintShown) {
      mentionHintShown = true;
      mentionHint = takeMentionHint(browserStorage);
    }
  };

  const selectMention = (index: number) => {
    mentionController.activeIndex = index;
    const result = mentionController.handleKey(
      "Enter",
      input,
      textArea?.selectionStart ?? input.length,
    );
    if (result.handled) applyText(result.text, result.caret);
  };

  const chooseCandidate = (entityId: string) => {
    if (!ambiguity) return;
    const entity = createVaultMentionSource(oracle.vault as any).getEntity(
      entityId,
    );
    if (!entity) return;
    const shift = input.length - input.trimStart().length;
    const { start, end, displayName } = ambiguity.span;
    const applied = mentionController.choose(
      input,
      {
        start: (start ?? 0) + shift,
        end: (end ?? 0) + shift,
        query: displayName,
      },
      entity,
    );
    ambiguity = null;
    applyText(applied.text, applied.caret);
  };

  // A solo shortcut prefills the question here; the player edits and sends it.
  $effect(() => {
    if (!oracle.ui.pendingPrompt) return;
    const prompt = takeOraclePrefill(oracle.ui);
    if (prompt) {
      input = prompt;
      void tick().then(() => textArea?.focus());
    }
  });
  let scrollContainer = $state<HTMLDivElement>();
  let textArea = $state<HTMLTextAreaElement>();
  let commandMenu = $state<ReturnType<typeof CommandMenu>>();
  let showCommandMenu = $state(false);
  let hasScrolledToInitialHistory = false;
  let previousMessageCount = 0;
  let wasNearBottom = true;

  // Command history for ArrowUp/Down navigation
  let commandHistory = $state<string[]>([]);
  let historyIndex = $state(-1);
  let temporaryInput = $state("");

  const adjustHeight = () => {
    if (!textArea) return;
    textArea.style.height = "auto";
    const maxHeight = window.innerHeight < 600 ? 120 : 200;
    textArea.style.height = `${Math.min(textArea.scrollHeight, maxHeight)}px`;
  };

  $effect(() => {
    const currentInput = input;
    adjustHeight();

    if (currentInput.startsWith("/")) {
      const isCmd = (cmd: string) =>
        currentInput === cmd || currentInput.startsWith(cmd + " ");
      // Keep menu open if we haven't typed a space yet (command selection)
      // OR if it's a command that can have arguments
      if (
        !currentInput.includes(" ") ||
        isCmd("/connect") ||
        isCmd("/merge") ||
        isCmd("/draw") ||
        isCmd("/create") ||
        isCmd("/plot")
      ) {
        showCommandMenu = true;
      } else {
        showCommandMenu = false;
      }
    } else {
      showCommandMenu = false;
    }
  });

  const mentionDraftFor = (query: string, raw: string): Mention[] =>
    query.startsWith("/") ? [] : draftMentionsFor(raw);

  const candidatesFor = (
    ids: string[] = [],
    source: ReturnType<typeof createVaultMentionSource>,
  ) =>
    ids.flatMap((id) => {
      const e = source.getEntity(id);
      return e ? [{ id, title: e.title, type: e.type ?? "" }] : [];
    });

  /**
   * Checks `@` mentions before a plain question is sent. Returns true when
   * the send must wait for the user to choose an entity.
   */
  const blockForMentions = (
    query: string,
    raw: string,
    sendAsPlainText: boolean,
  ): boolean => {
    if (query.startsWith("/")) return false;
    const source = createVaultMentionSource(oracle.vault as any);
    const plan = planMentionSend(query, draftMentionsFor(raw), source);
    if (plan.unmatched) {
      notificationStore.notify(
        `No entity matched @${plan.unmatched.displayName}. Sent as text.`,
        "info",
      );
    }
    ambiguity = null;
    if (!plan.ambiguous || sendAsPlainText) return false;
    ambiguity = {
      name: plan.ambiguous.displayName,
      span: plan.ambiguous,
      candidates: candidatesFor(plan.ambiguous.candidates, source),
    };
    return true;
  };

  /** Runs a slash command. Returns false when the text is not a known command. */
  const runSlashCommand = async (query: string): Promise<boolean> => {
    if (!query.startsWith("/")) return false;
    const parts = query.split(" ");
    const cmd = chatCommands.find((c) => c.name === parts[0]);
    if (!cmd) return false;
    await cmd.handler(parts.slice(1).join(" "));
    return true;
  };

  const rememberCommand = (query: string) => {
    if (commandHistory[commandHistory.length - 1] === query) return;
    commandHistory.push(query);
    if (commandHistory.length > 50) commandHistory.shift();
  };

  const clearComposer = () => {
    input = "";
    if (textArea) {
      textArea.style.height = "";
    }
  };

  const handleSubmit = async (sendAsPlainText = false) => {
    if (!input || oracle.isLoading) return;
    const query = input.trim();
    if (!query) return;

    // Captured while `input` still holds the raw text (cleared further down).
    const draft = mentionDraftFor(query, input);
    if (blockForMentions(query, input, sendAsPlainText)) return;

    rememberCommand(query);
    historyIndex = -1;
    temporaryInput = "";
    clearComposer();

    if (await runSlashCommand(query)) {
      tick().then(() => textArea?.focus());
      return;
    }

    mentionController.takeMentions();
    await oracle.ask(query, draft);
    tick().then(() => textArea?.focus());
  };

  /** Returns true when the open mention picker consumed the key. */
  const handleMentionKey = (e: KeyboardEvent): boolean => {
    if (!mentionController.open) return false;
    const result = mentionController.handleKey(
      e.key,
      input,
      textArea?.selectionStart ?? input.length,
    );
    if (!result.handled) return false;
    e.preventDefault();
    applyText(result.text, result.caret);
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showCommandMenu && commandMenu?.handleKeyDown(e)) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // History Navigation
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      // Only navigate if cursor is at the beginning (Up) or end (Down)
      // or if the input is empty to avoid interrupting normal editing.
      const isAtStart = textArea?.selectionStart === 0;
      const isAtEnd = textArea?.selectionStart === input.length;

      if (e.key === "ArrowUp" && isAtStart) {
        if (commandHistory.length === 0) return;

        if (historyIndex === -1) {
          temporaryInput = input;
          historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
          historyIndex--;
        }

        if (historyIndex >= 0) {
          e.preventDefault();
          input = commandHistory[historyIndex];
          // Move cursor to end after update
          tick().then(() => {
            if (!textArea || oracle.isLoading) return;
            const len = input.length;
            textArea.setSelectionRange(len, len);
          });
        }
      } else if (e.key === "ArrowDown" && isAtEnd) {
        if (historyIndex !== -1) {
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input = commandHistory[historyIndex];
          } else {
            historyIndex = -1;
            input = temporaryInput;
          }
          e.preventDefault();
        }
      }
    }
  };

  const scheduleScrollToBottom = (
    behavior: "auto" | "instant" | "smooth" = "auto",
  ) => {
    tick().then(() => {
      const scroll = () => {
        const didScroll = scrollChatToBottom(scrollContainer, { behavior });
        if (didScroll) {
          wasNearBottom = true;
        }
      };

      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(scroll);
      } else {
        setTimeout(scroll);
      }
    });
  };

  $effect(() => {
    const messageCount = oracle.messages.length;
    const container = scrollContainer;

    if (!container) return;

    if (messageCount === 0) {
      hasScrolledToInitialHistory = false;
      previousMessageCount = 0;
      return;
    }

    if (!hasScrolledToInitialHistory) {
      hasScrolledToInitialHistory = true;
      previousMessageCount = messageCount;
      scheduleScrollToBottom("auto");
      return;
    }

    const newMessageArrived = messageCount > previousMessageCount;
    const shouldFollowNewMessages = newMessageArrived && wasNearBottom;

    previousMessageCount = messageCount;

    if (shouldFollowNewMessages) {
      scheduleScrollToBottom("smooth");
    }
  });

  const handleScroll = () => {
    if (!scrollContainer) return;
    wasNearBottom = isChatNearBottom(scrollContainer);
  };

  $effect(() => {
    const draft = getOracleChatDraft();
    if (draft) {
      input = input.trim() ? `${input}\n${draft}` : draft;
      clearOracleChatDraft();
      tick().then(() => {
        adjustHeight();
      });
    }

    const addResultToInput = (event: Event) => {
      const text = (event as CustomEvent<string>).detail?.trim();
      if (!text) return;

      input = input.trim() ? `${input}\n${text}` : text;
      clearOracleChatDraft();
      event.preventDefault();
      tick().then(() => {
        adjustHeight();
        textArea?.focus();
      });
    };

    window.addEventListener(ORACLE_CHAT_INPUT_EVENT, addResultToInput);
    return () =>
      window.removeEventListener(ORACLE_CHAT_INPUT_EVENT, addResultToInput);
  });
</script>

{#if !oracle.isEnabled}
  <div
    class="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4"
  >
    <div
      class="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center text-theme-primary mb-2"
    >
      <span aria-hidden="true" class="icon-[heroicons--sparkles] w-8 h-8"
      ></span>
    </div>
    <h3
      class="text-theme-text font-bold uppercase font-header tracking-widest text-xs"
    >
      Oracle Offline
    </h3>
    <p class="text-xs text-theme-muted leading-relaxed max-w-[280px]">
      To consult the archives, please provide a <strong
        class="text-theme-primary">OpenAI/Luna API Key</strong
      >
      in the Settings panel.
      {#if !import.meta.env.VITE_SHARED_GEMINI_KEY}
        <br /><span class="text-micro opacity-50">
          (Shared key not detected on localhost)</span
        >
      {/if}
    </p>

    <button
      class="px-6 py-2 bg-theme-primary hover:bg-theme-secondary text-theme-bg font-bold rounded-full text-micro tracking-widest transition-all active:scale-95 shadow-lg shadow-theme-primary/20"
      onclick={() => {
        if (onOpenSettings) onOpenSettings();
        else modalUIStore.openSettings();
      }}
    >
      OPEN SETTINGS
    </button>
    <div class="flex flex-col gap-2 w-full pt-4">
      <p class="text-micro text-theme-muted font-header">
        Vault contents never leave this device except for inference via your own
        API key.
      </p>
    </div>
  </div>
{:else}
  <!-- Messages -->
  <div
    class="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 scroll-smooth"
    bind:this={scrollContainer}
    data-testid="oracle-chat-scroll-container"
    onscroll={handleScroll}
  >
    {#if oracle.messages.length === 0}
      <div
        class="h-full flex items-center justify-center"
        data-testid="oracle-empty-state"
      >
        <EmptyState
          icon="icon-[heroicons--sparkles]"
          headline="The Archives are Open"
          body="Greetings, Seeker. Ask of any entity in your vault and I shall consult the echoes of your lore."
        />
      </div>
    {/if}

    {#each oracle.messages as _msg, i (oracle.messages[i].id)}
      <ChatMessage bind:message={oracle.messages[i]} />
    {/each}

    {#if oracle.isLoading || oracle.isThinking}
      <div
        class="flex justify-start"
        transition:fade
        role="status"
        aria-live="polite"
      >
        <div
          class="bg-theme-surface border border-theme-border px-3 py-2 rounded text-xs text-theme-primary font-header animate-pulse flex items-center gap-2"
        >
          <span
            class="icon-[lucide--loader-2] w-3 h-3 animate-spin"
            aria-hidden="true"
          ></span>
          <span
            >{oracle.isThinking
              ? "Consulting archives..."
              : "Accessing..."}</span
          >
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->

  <div
    class="px-2.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-theme-border bg-theme-bg/30 shrink-0 relative z-20 overflow-visible"
    style:background-image="var(--bg-texture-overlay)"
  >
    {#if showCommandMenu}
      <CommandMenu
        bind:this={commandMenu}
        bind:input
        anchorEl={textArea || null}
        onSelect={(cmd) => {
          input = cmd.name + " ";
          showCommandMenu = false;
          tick().then(() => textArea?.focus());
        }}
        onClose={() => {
          showCommandMenu = false;
        }}
      />
    {/if}
    {#if mentionController.open}
      <EntityMentionPicker
        suggestions={mentionController.suggestions}
        loading={mentionController.loading}
        anchorEl={textArea ?? null}
        activeIndex={mentionController.activeIndex}
        onSelect={selectMention}
      />
    {/if}
    {#if mentionHint}
      <p
        class="mx-2.5 mb-1 flex items-start gap-2 text-xs text-theme-muted sm:mx-4"
        data-testid="entity-mention-hint"
      >
        <span class="flex-1">{mentionHint}</span>
        <button
          type="button"
          class="shrink-0 font-medium text-theme-primary hover:text-theme-secondary"
          onclick={() => (mentionHint = null)}>Got it</button
        >
      </p>
    {/if}
    {#if ambiguity}
      <EntityMentionDisambiguation
        name={ambiguity.name}
        candidates={ambiguity.candidates}
        onChoose={chooseCandidate}
        onSendAsText={() => void handleSubmit(true)}
      />
    {/if}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      class="flex gap-2"
      aria-busy={oracle.isLoading}
    >
      <textarea
        bind:this={textArea}
        bind:value={input}
        data-testid="oracle-input"
        aria-label="Chat Input"
        onkeydown={(e) => {
          if (!handleMentionKey(e)) handleKeyDown(e);
        }}
        oninput={handleTextInput}
        placeholder="Ask the archives or type &quot;/&quot; for commands..."
        class="flex-1 bg-theme-bg/50 border border-theme-border rounded px-3 sm:px-4 py-2.5 text-base sm:text-sm text-theme-text placeholder-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 transition-all font-body resize-none overflow-hidden no-scrollbar shadow-inner"
        disabled={oracle.isLoading}
        rows="1"
      ></textarea>
      <button
        type="submit"
        class="w-10 h-10 flex items-center justify-center bg-theme-primary hover:bg-theme-secondary text-theme-bg rounded transition shadow-lg shadow-theme-primary/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shrink-0 self-end"
        disabled={!input.trim() || oracle.isLoading}
        aria-label="Send Message"
      >
        {#if oracle.isLoading}
          <span
            class="icon-[lucide--loader-2] w-5 h-5 animate-spin"
            aria-hidden="true"
          ></span>
        {:else}
          ➤
        {/if}
      </button>
    </form>
  </div>
{/if}

<style>
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
