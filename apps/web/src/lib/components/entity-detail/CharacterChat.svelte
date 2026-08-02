<script lang="ts">
  import type { Entity, GuestChatMessage } from "schema";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { tick } from "svelte";

  let { entity } = $props<{ entity: Entity }>();

  let editingMessageId = $state<string | null>(null);
  let messageEditContent = $state("");
  let messageInput = $state("");
  let chatContainer = $state<HTMLElement | null>(null);
  let isStarting = $state(false);
  let isSending = $state(false);
  let speakerCharacterId = $state("");

  const transcript = $derived(guestChatStore.transcripts[entity.id] || null);
  const speakerCharacters = $derived(
    Object.values(vault.entities).filter(
      (candidate) =>
        candidate.type === "character" && candidate.id !== entity.id,
    ),
  );
  const speakerName = $derived(
    transcript?.speakerCharacterId
      ? vault.entities[transcript.speakerCharacterId]?.title
      : null,
  );

  async function startChat() {
    if (isStarting) return;

    isStarting = true;
    try {
      await guestChatStore.startChat(
        entity.id,
        entity.title,
        speakerCharacterId || undefined,
      );
      await scrollToBottom();
    } finally {
      isStarting = false;
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

<div class="space-y-4 flex flex-col h-[500px]">
  {#if !entity.guestChatConfig?.isEnabled}
    <div
      class="flex-1 flex flex-col items-center justify-center text-center p-6 text-theme-muted bg-theme-surface/10 rounded-xl border border-theme-border/50"
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
      class="flex-1 flex flex-col items-center justify-center text-center p-6 bg-theme-surface/10 rounded-xl border border-theme-border/50"
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
    {#if speakerName}
      <p class="text-xs text-theme-muted">
        Chatting as <span class="font-bold text-theme-text">{speakerName}</span>
      </p>
    {/if}
    <div
      bind:this={chatContainer}
      class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-4 rounded-xl border border-theme-border/60 bg-theme-bg/10"
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
              class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed border transition-all duration-200
              {message.role === 'user'
                ? 'bg-theme-primary/10 border-theme-primary/20 text-theme-text rounded-tr-none shadow-[0_2px_8px_rgba(var(--color-theme-primary-rgb),0.05)]'
                : 'bg-theme-surface border-theme-border text-theme-text rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}"
            >
              <p class="whitespace-pre-wrap">{message.content}</p>
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
        placeholder="Type a message to {entity.title}..."
        disabled={guestChatStore.isGenerating}
        class="flex-1 text-xs bg-theme-surface/50 border border-theme-border focus:border-theme-primary rounded-xl px-3 py-2.5 outline-none resize-none custom-scrollbar text-theme-text"
        rows="2"
      ></textarea>
      <button
        type="button"
        onclick={sendMessage}
        disabled={!messageInput.trim() ||
          guestChatStore.isGenerating ||
          isSending}
        class="p-2.5 bg-theme-primary hover:bg-theme-secondary disabled:bg-theme-surface disabled:text-theme-muted disabled:border-theme-border text-theme-bg rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
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
