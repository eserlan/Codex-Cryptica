<script lang="ts">
  import type { Entity, GuestChatTranscript, GuestChatMessage } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { tick } from "svelte";
  import { systemClock } from "$lib/utils/runtime-deps";

  let { entity } = $props<{
    entity: Entity;
  }>();

  // Host state
  let transcripts = $state<GuestChatTranscript[]>([]);
  let isLoadingTranscripts = $state(false);

  // Editing state (shared for both host and guest view)
  let editingMessageId = $state<string | null>(null);
  let editContent = $state("");

  // Guest Chat State
  let messageInput = $state("");
  let chatContainer = $state<HTMLElement | null>(null);
  let isSending = $state(false);

  // Load Host transcripts
  const loadHostTranscripts = async () => {
    if (vault.isGuest || entity.type !== "character") return;
    isLoadingTranscripts = true;
    try {
      transcripts = await vault.loadTranscriptsForCharacter(entity.id);
    } catch (err) {
      console.error("[DetailChatsTab] Failed to load transcripts:", err);
    } finally {
      isLoadingTranscripts = false;
    }
  };

  // React to entity changes for Host
  $effect(() => {
    if (entity.id && !vault.isGuest) {
      void loadHostTranscripts();
    }
  });

  // Guest Chat transcript access
  let guestTranscript = $derived(
    vault.isGuest ? guestChatStore.transcripts[entity.id] || null : null,
  );

  async function handleStartGuestChat() {
    if (vault.isGuest) {
      await guestChatStore.startChat(entity.id, entity.title);
      await scrollToBottom();
    }
  }

  async function handleSendGuestMessage() {
    if (!messageInput.trim() || guestChatStore.isGenerating || isSending)
      return;
    isSending = true;
    try {
      const msg = messageInput;
      messageInput = "";
      await guestChatStore.sendMessage(entity.id, msg);
      await scrollToBottom();
    } finally {
      isSending = false;
    }
  }

  async function handleGuestKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSendGuestMessage();
    }
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Scroll to bottom when guest messages arrive
  $effect(() => {
    if (guestTranscript?.messages?.length) {
      void scrollToBottom();
    }
  });

  // Message Actions: Edit & Delete (Host)
  function startEditMessage(msg: GuestChatMessage) {
    editingMessageId = msg.id;
    editContent = msg.content;
  }

  async function saveHostMessageEdit(
    transcript: GuestChatTranscript,
    messageId: string,
  ) {
    const msg = transcript.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.content = editContent.trim();
      transcript.lastUpdated = systemClock.now();
      await vault.saveTranscript(transcript);
      await loadHostTranscripts();
    }
    editingMessageId = null;
  }

  async function deleteHostMessage(
    transcript: GuestChatTranscript,
    messageId: string,
  ) {
    if (confirm("Are you sure you want to delete this message?")) {
      transcript.messages = transcript.messages.filter(
        (m) => m.id !== messageId,
      );
      transcript.lastUpdated = systemClock.now();
      await vault.saveTranscript(transcript);
      await loadHostTranscripts();
    }
  }

  async function deleteHostTranscript(transcript: GuestChatTranscript) {
    if (
      confirm(
        `Delete the entire conversation session with ${transcript.guestName}?`,
      )
    ) {
      await vault.deleteTranscript(transcript.guestId, entity.id);
      await loadHostTranscripts();
    }
  }

  // Message Actions: Edit & Delete (Guest)
  async function saveGuestMessageEdit(messageId: string) {
    await guestChatStore.saveMessageEdit(entity.id, messageId, editContent);
    editingMessageId = null;
  }

  async function deleteGuestMessage(messageId: string) {
    if (
      confirm(
        "Are you sure you want to delete this message from your chat history?",
      )
    ) {
      await guestChatStore.deleteMessage(entity.id, messageId);
    }
  }
</script>

<div class="space-y-4">
  {#if !vault.isGuest}
    <!-- HOST VIEW: Synced Guest Transcripts -->
    <div class="space-y-4">
      <div
        class="flex items-center justify-between border-b border-theme-border pb-2"
      >
        <h4
          class="font-header text-sm uppercase tracking-widest font-bold text-theme-secondary flex items-center gap-1.5"
        >
          <span class="icon-[lucide--history] w-4 h-4 text-theme-primary"
          ></span>
          Guest Conversation Logs
        </h4>
        <span class="text-xs text-theme-muted"
          >{transcripts.length} Session(s)</span
        >
      </div>

      {#if isLoadingTranscripts}
        <div
          class="flex items-center justify-center py-8 text-theme-muted gap-2 text-xs"
        >
          <span class="icon-[lucide--loader-2] w-4 h-4 animate-spin"></span>
          Loading transcripts...
        </div>
      {:else if transcripts.length === 0}
        <p class="text-xs text-theme-muted italic py-4">
          No synced guest transcripts found for this character yet.
        </p>
      {:else}
        <div
          class="space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2"
        >
          {#each transcripts as transcript (transcript.id || transcript.guestId)}
            <div
              class="border border-theme-border/60 rounded-xl p-3 bg-theme-bg/25 space-y-3 relative group/session"
            >
              <div
                class="flex justify-between items-center text-xs border-b border-theme-border/30 pb-1.5"
              >
                <div class="flex items-center gap-1.5">
                  <span
                    class="icon-[lucide--user] w-3.5 h-3.5 text-theme-secondary"
                  ></span>
                  <span class="font-bold text-theme-text"
                    >{transcript.guestName}</span
                  >
                  <span class="text-[10px] text-theme-muted"
                    >({transcript.guestId.slice(0, 6)})</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-theme-muted">
                    {new Date(transcript.lastUpdated).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onclick={() => deleteHostTranscript(transcript)}
                    class="text-theme-muted hover:text-theme-danger p-0.5 rounded transition opacity-0 group-hover/session:opacity-100 focus:opacity-100"
                    title="Delete entire session logs"
                  >
                    <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
                  </button>
                </div>
              </div>

              <div class="space-y-3.5 pt-1">
                {#each transcript.messages as msg (msg.id)}
                  <div class="space-y-1 group/msg relative">
                    <div class="flex justify-between items-center text-[10px]">
                      <span
                        class="font-bold uppercase tracking-wider {msg.role ===
                        'user'
                          ? 'text-theme-primary'
                          : 'text-theme-secondary'}"
                      >
                        {msg.role === "user"
                          ? transcript.guestName
                          : entity.title}
                      </span>

                      <div
                        class="flex items-center gap-1.5 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity"
                      >
                        {#if editingMessageId !== msg.id}
                          <button
                            type="button"
                            onclick={() => startEditMessage(msg)}
                            class="text-theme-muted hover:text-theme-primary p-0.5 rounded transition"
                            title="Edit message"
                          >
                            <span class="icon-[lucide--pencil] w-3 h-3"></span>
                          </button>
                          <button
                            type="button"
                            onclick={() =>
                              deleteHostMessage(transcript, msg.id)}
                            class="text-theme-muted hover:text-theme-danger p-0.5 rounded transition"
                            title="Delete message"
                          >
                            <span class="icon-[lucide--trash-2] w-3 h-3"></span>
                          </button>
                        {/if}
                        {#if msg.role === "assistant"}
                          <button
                            type="button"
                            onclick={() =>
                              proposerStore.promoteToRumor(msg.content)}
                            class="text-[9px] font-bold text-theme-primary hover:text-theme-secondary uppercase tracking-widest flex items-center gap-0.5 transition cursor-pointer"
                            title="Promote this response to a rumor draft"
                          >
                            <span class="icon-[lucide--sparkles] w-3 h-3"
                            ></span>
                            Promote
                          </button>
                        {/if}
                      </div>
                    </div>

                    {#if editingMessageId === msg.id}
                      <div
                        class="space-y-1.5 pl-2 border-l-2 border-theme-primary/50 py-1"
                      >
                        <textarea
                          bind:value={editContent}
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
                            onclick={() =>
                              saveHostMessageEdit(transcript, msg.id)}
                            class="text-[9px] font-bold bg-theme-primary text-theme-bg rounded px-2 py-1 hover:bg-theme-secondary transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    {:else}
                      <p
                        class="text-xs text-theme-text pl-2 border-l-2 border-theme-primary/30 py-1 whitespace-pre-wrap"
                      >
                        {msg.content}
                      </p>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <!-- GUEST VIEW: Active Chat Panel -->
    <div class="space-y-4 flex flex-col h-[500px]">
      {#if !entity.guestChatConfig?.isEnabled}
        <div
          class="flex-1 flex flex-col items-center justify-center text-center p-6 text-theme-muted bg-theme-surface/10 rounded-xl border border-theme-border/50"
        >
          <span class="icon-[lucide--messages-square] w-12 h-12 mb-3 opacity-30"
          ></span>
          <p class="text-sm font-bold uppercase tracking-widest mb-1">
            Chat Disabled
          </p>
          <p class="text-xs italic">
            Guest Character Chat is not enabled for this character.
          </p>
        </div>
      {:else if !guestTranscript}
        <div
          class="flex-1 flex flex-col items-center justify-center text-center p-6 bg-theme-surface/10 rounded-xl border border-theme-border/50"
        >
          <span
            class="icon-[lucide--messages-square] w-12 h-12 mb-3 text-theme-primary opacity-50"
          ></span>
          <p
            class="text-sm font-bold uppercase tracking-widest text-theme-text mb-2"
          >
            Start Conversation
          </p>
          <p class="text-xs text-theme-muted max-w-sm mb-4">
            Chat with {entity.title}. The AI will respond in character using the
            GM's scope.
          </p>
          <button
            type="button"
            onclick={handleStartGuestChat}
            class="px-4 py-2 bg-theme-primary text-theme-bg rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-theme-secondary transition cursor-pointer"
          >
            Connect
          </button>
        </div>
      {:else}
        <!-- Active Chat Window -->
        <div
          bind:this={chatContainer}
          class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-4 rounded-xl border border-theme-border/60 bg-theme-bg/10"
        >
          {#each guestTranscript.messages as msg (msg.id)}
            <div
              class="flex flex-col gap-1 w-full max-w-[85%] group {msg.role ===
              'user'
                ? 'self-end items-end ml-auto'
                : 'self-start items-start'}"
            >
              <div
                class="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-theme-muted"
              >
                <span>{msg.role === "user" ? "You" : entity.title}</span>
                {#if editingMessageId !== msg.id}
                  <div
                    class="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                  >
                    <button
                      type="button"
                      onclick={() => startEditMessage(msg)}
                      class="text-theme-muted hover:text-theme-primary p-0.5 rounded transition"
                      title="Edit message"
                    >
                      <span class="icon-[lucide--pencil] w-3 h-3"></span>
                    </button>
                    <button
                      type="button"
                      onclick={() => deleteGuestMessage(msg.id)}
                      class="text-theme-muted hover:text-theme-danger p-0.5 rounded transition"
                      title="Delete message"
                    >
                      <span class="icon-[lucide--trash-2] w-3 h-3"></span>
                    </button>
                  </div>
                {/if}
              </div>

              {#if editingMessageId === msg.id}
                <div
                  class="w-full space-y-1.5 p-2 rounded-xl border border-theme-border bg-theme-surface"
                >
                  <textarea
                    bind:value={editContent}
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
                      onclick={() => saveGuestMessageEdit(msg.id)}
                      class="text-[9px] font-bold bg-theme-primary text-theme-bg rounded px-2 py-1 hover:bg-theme-secondary transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              {:else}
                <div
                  class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed border transition-all duration-200
                  {msg.role === 'user'
                    ? 'bg-theme-primary/10 border-theme-primary/20 text-theme-text rounded-tr-none shadow-[0_2px_8px_rgba(var(--color-theme-primary-rgb),0.05)]'
                    : 'bg-theme-surface border-theme-border text-theme-text rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}"
                >
                  <p class="whitespace-pre-wrap">{msg.content}</p>
                </div>
              {/if}

              <span class="text-[8px] text-theme-muted select-none">
                {new Date(msg.timestamp).toLocaleTimeString([], {
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
                  class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin text-theme-primary"
                ></span>
                <span>Thinking...</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- Chat Input Form -->
        <div
          class="flex gap-2 items-end border-t border-theme-border/50 pt-2 shrink-0"
        >
          <textarea
            bind:value={messageInput}
            onkeydown={handleGuestKeydown}
            placeholder="Type a message to {entity.title}..."
            disabled={guestChatStore.isGenerating}
            class="flex-1 text-xs bg-theme-surface/50 border border-theme-border focus:border-theme-primary rounded-xl px-3 py-2.5 outline-none resize-none custom-scrollbar text-theme-text"
            rows="2"
          ></textarea>
          <button
            type="button"
            onclick={handleSendGuestMessage}
            disabled={!messageInput.trim() ||
              guestChatStore.isGenerating ||
              isSending}
            class="p-2.5 bg-theme-primary hover:bg-theme-secondary disabled:bg-theme-surface disabled:text-theme-muted disabled:border-theme-border text-theme-bg rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Send Message"
          >
            <span aria-hidden="true" class="icon-[lucide--send] w-4.5 h-4.5"
            ></span>
          </button>
        </div>
      {/if}
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
