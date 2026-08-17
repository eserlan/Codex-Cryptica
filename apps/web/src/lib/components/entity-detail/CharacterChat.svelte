<script lang="ts">
  import type { Entity, GuestChatMessage, GuestChatTranscript } from "schema";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { characterChatExportService } from "$lib/services/character-chat-export";
  import { tick } from "svelte";

  let { entity } = $props<{ entity: Entity }>();

  let editingMessageId = $state<string | null>(null);
  let messageEditContent = $state("");
  let messageInput = $state("");
  let chatContainer = $state<HTMLElement | null>(null);
  let isStarting = $state(false);
  let isSending = $state(false);
  let speakerCharacterId = $state("");
  let showSpeakerSwitcher = $state(false);
  let pendingSpeakerId = $state("");
  let isSwitchingSpeaker = $state(false);
  let isCopying = $state(false);
  let isSavingJournal = $state(false);
  let sessions = $state<GuestChatTranscript[]>([]);
  let isResuming = $state<string | null>(null);

  const transcript = $derived(guestChatStore.transcripts[entity.id] || null);
  // ⚡ Bolt Optimization: Replace Object.values().filter() with an imperative
  // for...in loop over vault.entities to reduce intermediate array allocations.
  const speakerCharacters = $derived.by(() => {
    const results: Entity[] = [];
    const entities = vault.entities;
    for (const key in entities) {
      if (Object.prototype.hasOwnProperty.call(entities, key)) {
        const candidate = entities[key];
        if (candidate.type === "character" && candidate.id !== entity.id) {
          results.push(candidate);
        }
      }
    }
    return results;
  });
  const speakerName = $derived(
    transcript?.speakerCharacterId
      ? vault.entities[transcript.speakerCharacterId]?.title
      : null,
  );
  const otherSessions = $derived(
    sessions.filter((session) => session.id !== transcript?.id),
  );

  const hasPersonality = $derived.by(() => {
    const lore = entity.lore || "";
    return (
      /(?:^|\n)##\s+Personality\s*&\s*Voice\s*\n/i.test(lore) ||
      Boolean(entity.guestChatConfig?.extraInstructions?.trim())
    );
  });

  function speakerLabel(forSpeakerId?: string) {
    if (!forSpeakerId) return "Yourself";
    return vault.entities[forSpeakerId]?.title ?? "Unknown character";
  }

  async function refreshSessions(characterId: string) {
    try {
      const result = await guestChatStore.listSessions(characterId);
      // Guard against a stale response landing after the entity changed.
      if (characterId === entity.id) {
        sessions = result;
      }
    } catch (err) {
      console.error("[CharacterChat] Failed to load chat sessions:", err);
    }
  }

  $effect(() => {
    if (entity.id) void refreshSessions(entity.id);
  });

  async function startChat() {
    if (isStarting) return;

    isStarting = true;
    try {
      await guestChatStore.startChat(
        entity.id,
        entity.title,
        speakerCharacterId || undefined,
      );
      await refreshSessions(entity.id);
      await scrollToBottom();
    } finally {
      isStarting = false;
    }
  }

  async function resumeSession(transcriptId: string) {
    if (isResuming) return;
    isResuming = transcriptId;
    try {
      await guestChatStore.resumeSession(entity.id, transcriptId);
      showSpeakerSwitcher = false;
      await scrollToBottom();
    } finally {
      isResuming = null;
    }
  }

  function openSpeakerSwitcher() {
    pendingSpeakerId = transcript?.speakerCharacterId ?? "";
    showSpeakerSwitcher = true;
  }

  async function confirmSpeakerSwitch() {
    if (isSwitchingSpeaker) return;
    isSwitchingSpeaker = true;
    try {
      speakerCharacterId = pendingSpeakerId;
      await guestChatStore.startNewSession(
        entity.id,
        entity.title,
        pendingSpeakerId || undefined,
      );
      await refreshSessions(entity.id);
      showSpeakerSwitcher = false;
    } finally {
      isSwitchingSpeaker = false;
    }
  }

  async function copyChat() {
    if (!transcript || isCopying) return;
    isCopying = true;
    try {
      await characterChatExportService.copyConversation(transcript, {
        speakerName: speakerName ?? undefined,
        characterTitle: entity.title,
      });
    } finally {
      isCopying = false;
    }
  }

  async function sendToJournal() {
    if (!transcript || isSavingJournal) return;
    isSavingJournal = true;
    try {
      await characterChatExportService.sendConversationToJournal(transcript, {
        speakerName: speakerName ?? undefined,
        characterTitle: entity.title,
      });
    } finally {
      isSavingJournal = false;
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || guestChatStore.isGenerating || isSending)
      return;

    isSending = true;
    try {
      const message = messageInput;
      messageInput = "";
      await guestChatStore.sendMessage(entity.id, message);
      await scrollToBottom();
    } finally {
      isSending = false;
    }
  }

  async function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  }

  function startEditMessage(message: GuestChatMessage) {
    editingMessageId = message.id;
    messageEditContent = message.content;
  }

  async function saveMessageEdit(messageId: string) {
    await guestChatStore.saveMessageEdit(
      entity.id,
      messageId,
      messageEditContent,
    );
    editingMessageId = null;
  }

  async function deleteMessage(messageId: string) {
    if (
      confirm(
        "Are you sure you want to delete this message from your chat history?",
      )
    ) {
      await guestChatStore.deleteMessage(entity.id, messageId);
    }
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  $effect(() => {
    if (transcript?.messages?.length) {
      void scrollToBottom();
    }
  });
</script>

<div class="flex flex-col gap-4 sm:h-[500px]">
  {#if !entity.guestChatConfig?.isEnabled}
    <div
      class="min-h-52 flex flex-col items-center justify-center rounded-xl border border-theme-border/50 bg-theme-surface/10 p-6 text-center text-theme-muted sm:flex-1"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--messages-square] w-12 h-12 mb-3 opacity-30"
      ></span>
      <p class="text-sm font-bold uppercase tracking-widest mb-1">
        Chat Disabled
      </p>
      <p class="text-xs italic">
        Enable Guest Character Chat above to start a conversation.
      </p>
    </div>
  {:else if !transcript}
    <div
      class="min-h-52 flex flex-col items-center justify-center rounded-xl border border-theme-border/50 bg-theme-surface/10 p-6 text-center sm:flex-1"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--messages-square] w-12 h-12 mb-3 text-theme-primary opacity-50"
      ></span>
      <p
        class="text-sm font-bold uppercase tracking-widest text-theme-text mb-2"
      >
        Start Conversation
      </p>
      <p class="text-xs text-theme-muted max-w-sm mb-4">
        Chat with {entity.title}. The AI will respond in character using the
        configured scope.
      </p>
      {#if !hasPersonality}
        <div
          class="mb-4 w-full max-w-sm rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-left text-xs text-amber-400"
          role="alert"
        >
          <div class="flex items-center gap-1.5 font-bold">
            <span
              class="icon-[lucide--alert-triangle] w-4 h-4 shrink-0"
              aria-hidden="true"
            ></span>
            Voice Guidance Missing
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-amber-300/90">
            This character lacks a <code
              class="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]"
              >## Personality & Voice</code
            > section in GM Lore. Edit this character or add the section so the AI
            knows how to respond.
          </p>
        </div>
      {/if}
      <div class="mb-4 w-full max-w-sm text-left">
        <label
          for="character-chat-speaker"
          class="mb-1 block text-xs font-bold uppercase tracking-wider text-theme-muted"
        >
          Chat as
        </label>
        <select
          id="character-chat-speaker"
          name="character-chat-speaker"
          bind:value={speakerCharacterId}
          class="min-h-12 w-full rounded-lg border border-theme-border bg-theme-surface px-3 text-base text-theme-text outline-none focus:border-theme-primary sm:min-h-0 sm:text-xs"
        >
          <option value="">Yourself</option>
          {#each speakerCharacters as speaker (speaker.id)}
            <option value={speaker.id}>{speaker.title}</option>
          {/each}
        </select>
        <p class="mt-1 text-xs text-theme-muted">
          This helps {entity.title} respond to your role and relationship.
        </p>
      </div>
      <button
        type="button"
        onclick={startChat}
        disabled={isStarting}
        aria-busy={isStarting}
        class="px-4 py-2 bg-theme-primary text-theme-bg rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-theme-secondary transition cursor-pointer"
      >
        {isStarting ? "Connecting..." : "Connect"}
      </button>
    </div>
  {:else}
    <div
      class="flex items-center justify-between gap-2 rounded-lg border border-theme-border/50 bg-theme-surface/30 px-3 py-2"
    >
      <p class="text-xs text-theme-muted">
        Chatting as
        <span class="font-bold text-theme-text"
          >{speakerName ?? "Yourself"}</span
        >
      </p>
      <div class="flex items-center gap-2">
        {#if transcript?.messages?.length}
          <button
            type="button"
            onclick={copyChat}
            disabled={isCopying}
            class="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary transition cursor-pointer disabled:opacity-50"
            title="Copy conversation"
            aria-label="Copy conversation"
          >
            <span aria-hidden="true" class="icon-[lucide--copy] w-3 h-3"></span>
            Copy
          </button>
          {#if !vault.isGuest}
            <button
              type="button"
              onclick={sendToJournal}
              disabled={isSavingJournal}
              class="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary transition cursor-pointer disabled:opacity-50"
              title="Send to Journal"
              aria-label="Send to Journal"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--book-marked] w-3 h-3"
              ></span>
              Journal
            </button>
          {/if}
        {/if}
        <button
          type="button"
          onclick={openSpeakerSwitcher}
          class="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary transition cursor-pointer"
        >
          <span aria-hidden="true" class="icon-[lucide--refresh-cw] w-3 h-3"
          ></span>
          Sessions
          {#if otherSessions.length > 0}
            <span
              class="rounded-full bg-theme-primary/20 px-1.5 text-theme-primary"
            >
              {otherSessions.length}
            </span>
          {/if}
        </button>
      </div>
    </div>

    {#if showSpeakerSwitcher}
      <div
        class="flex flex-col gap-3 rounded-lg border border-theme-primary/30 bg-theme-primary/5 p-3"
      >
        {#if otherSessions.length > 0}
          <div class="flex flex-col gap-1.5">
            <span
              class="text-xs font-bold uppercase tracking-wider text-theme-muted"
            >
              Resume a Previous Conversation
            </span>
            {#each otherSessions as session (session.id)}
              <button
                type="button"
                onclick={() => resumeSession(session.id)}
                disabled={isResuming === session.id}
                class="flex items-center justify-between gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-left transition hover:border-theme-primary cursor-pointer disabled:opacity-50"
              >
                <span class="min-w-0">
                  <span class="block text-xs font-bold text-theme-text"
                    >{speakerLabel(session.speakerCharacterId)}</span
                  >
                  <span class="block text-[10px] text-theme-muted">
                    {session.messages.length} message{session.messages
                      .length === 1
                      ? ""
                      : "s"} · {new Date(
                      session.lastUpdated,
                    ).toLocaleDateString()}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  class="icon-[lucide--chevron-right] w-4 h-4 shrink-0 text-theme-muted"
                ></span>
              </button>
            {/each}
          </div>
          <div class="border-t border-theme-border/40"></div>
        {/if}

        <div class="flex flex-col gap-2">
          <label
            for="character-chat-speaker-switch"
            class="text-xs font-bold uppercase tracking-wider text-theme-muted"
          >
            Start a New Chat as
          </label>
          <select
            id="character-chat-speaker-switch"
            name="character-chat-speaker-switch"
            bind:value={pendingSpeakerId}
            class="min-h-12 w-full rounded-lg border border-theme-border bg-theme-surface px-3 text-base text-theme-text outline-none focus:border-theme-primary sm:min-h-0 sm:text-xs"
          >
            <option value="">Yourself</option>
            {#each speakerCharacters as speaker (speaker.id)}
              <option value={speaker.id}>{speaker.title}</option>
            {/each}
          </select>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              onclick={() => (showSpeakerSwitcher = false)}
              class="text-[9px] font-bold text-theme-muted hover:text-theme-text uppercase px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={confirmSpeakerSwitch}
              disabled={isSwitchingSpeaker}
              class="text-[9px] font-bold bg-theme-primary text-theme-bg rounded px-3 py-1.5 hover:bg-theme-secondary transition cursor-pointer disabled:opacity-50"
            >
              {isSwitchingSpeaker ? "Starting..." : "Start New Chat"}
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if !hasPersonality}
      <div
        class="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
        role="alert"
      >
        <span
          class="icon-[lucide--alert-triangle] w-4 h-4 shrink-0"
          aria-hidden="true"
        ></span>
        <span>
          <strong>Voice Guidance Missing:</strong> Add a
          <code class="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]"
            >## Personality & Voice</code
          > section in GM Lore or edit this character to generate one.
        </span>
      </div>
    {/if}
    <div
      bind:this={chatContainer}
      class="min-h-48 max-h-[40dvh] overflow-y-auto custom-scrollbar space-y-4 rounded-xl border border-theme-border/60 bg-theme-bg/10 p-3 sm:min-h-0 sm:max-h-none sm:flex-1"
    >
      {#each transcript.messages as message (message.id)}
        <div
          class="flex flex-col gap-1 w-full max-w-[85%] group {message.role ===
          'user'
            ? 'self-end items-end ml-auto'
            : 'self-start items-start'}"
        >
          <div
            class="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-theme-muted"
          >
            <span>{message.role === "user" ? "You" : entity.title}</span>
            {#if editingMessageId !== message.id}
              <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
              >
                <button
                  type="button"
                  onclick={() => startEditMessage(message)}
                  class="text-theme-muted hover:text-theme-primary p-0.5 rounded transition"
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <span aria-hidden="true" class="icon-[lucide--pencil] w-3 h-3"
                  ></span>
                </button>
                <button
                  type="button"
                  onclick={() => deleteMessage(message.id)}
                  class="text-theme-muted hover:text-theme-danger p-0.5 rounded transition"
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <span
                    aria-hidden="true"
                    class="icon-[lucide--trash-2] w-3 h-3"
                  ></span>
                </button>
              </div>
            {/if}
          </div>

          {#if editingMessageId === message.id}
            <div
              class="w-full space-y-1.5 p-2 rounded-xl border border-theme-border bg-theme-surface"
            >
              <textarea
                bind:value={messageEditContent}
                aria-label="Edit message"
                class="w-full text-xs bg-theme-bg border border-theme-border rounded p-1.5 text-theme-text focus:ring-1 focus:ring-theme-primary outline-none"
                rows="2"
              ></textarea>
              <div class="flex justify-end gap-1.5">
                <button
                  type="button"
                  onclick={() => (editingMessageId = null)}
                  class="text-[9px] font-bold text-theme-muted hover:text-theme-text uppercase px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onclick={() => saveMessageEdit(message.id)}
                  class="text-[9px] font-bold bg-theme-primary text-theme-bg rounded px-2 py-1 hover:bg-theme-secondary transition"
                >
                  Save
                </button>
              </div>
            </div>
          {:else}
            <div
              class="w-full rounded-2xl px-4 py-2.5 text-sm leading-relaxed border transition-all duration-200
              {message.role === 'user'
                ? 'bg-theme-primary/10 border-theme-primary/20 text-theme-text rounded-tr-none shadow-[0_2px_8px_rgba(var(--color-theme-primary-rgb),0.05)]'
                : 'bg-theme-surface border-theme-border text-theme-text rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}"
            >
              <p class="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          {/if}

          <span class="text-[8px] text-theme-muted select-none">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      {/each}

      {#if guestChatStore.isGenerating}
        <div
          class="flex flex-col gap-1 w-full max-w-[85%] self-start items-start"
        >
          <span
            class="text-[9px] font-bold uppercase tracking-wider text-theme-muted"
            >{entity.title}</span
          >
          <div
            class="rounded-2xl px-4 py-2.5 text-sm bg-theme-surface border border-theme-border text-theme-muted rounded-tl-none flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin text-theme-primary"
            ></span>
            <span>Thinking...</span>
          </div>
        </div>
      {/if}
    </div>

    <div
      class="flex gap-2 items-end border-t border-theme-border/50 pt-2 shrink-0"
    >
      <label class="sr-only" for="character-chat-message"
        >Message {entity.title}</label
      >
      <textarea
        id="character-chat-message"
        bind:value={messageInput}
        onkeydown={handleKeydown}
        placeholder="Type a message..."
        disabled={guestChatStore.isGenerating}
        class="flex-1 resize-none rounded-xl border border-theme-border bg-theme-surface/50 px-3 py-2.5 text-base text-theme-text outline-none focus:border-theme-primary custom-scrollbar sm:text-xs"
        rows="2"
      ></textarea>
      <button
        type="button"
        onclick={sendMessage}
        disabled={!messageInput.trim() ||
          guestChatStore.isGenerating ||
          isSending}
        class="flex min-h-12 min-w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-theme-primary p-2.5 text-theme-bg transition hover:bg-theme-secondary disabled:border-theme-border disabled:bg-theme-surface disabled:text-theme-muted"
        aria-label="Send message to {entity.title}"
      >
        <span aria-hidden="true" class="icon-[lucide--send] w-4.5 h-4.5"></span>
      </button>
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--theme-border);
    border-radius: 4px;
  }
</style>
