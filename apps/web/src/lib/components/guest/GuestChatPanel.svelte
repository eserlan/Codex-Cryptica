<script lang="ts">
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { isEntityVisible, type Entity } from "schema";
  import GuestChatBubble from "./GuestChatBubble.svelte";
  import { tick } from "svelte";

  // Filter characters that are both visible and enabled for guest chat
  // ⚡ Bolt Optimization: Replace Object.values(vault.entities) and .filter with an imperative
  // loop over vault.allEntities to prevent array allocation on every keystroke/reactivity tick.
  const enabledCharacters = $derived.by(() => {
    const results: Entity[] = [];
    const entities = vault.allEntities || [];
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (
        e.type === "character" &&
        e.guestChatConfig?.isEnabled &&
        !!e.guestChatConfig.extraInstructions?.trim() &&
        isEntityVisible(e, {
          sharedMode: vault.isGuest,
          defaultVisibility: vault.defaultVisibility,
        })
      ) {
        results.push(e);
      }
    }
    return results;
  });

  let activeCharacter = $derived(
    enabledCharacters.find((c) => c.id === guestChatStore.activeCharacterId) ||
      null,
  );

  let currentTranscript = $derived(guestChatStore.activeTranscript);

  let messageInput = $state("");
  let chatContainer = $state<HTMLElement | null>(null);

  const starterPrompts = [
    "What do you know about this place?",
    "What should I be careful of?",
    "Who do you trust?",
    "What rumours have you heard?",
    "What do you want from me?",
    "Tell me about the last major event.",
  ];

  async function selectCharacter(id: string, title: string) {
    await guestChatStore.startChat(id, title);
    messageInput = "";
    await scrollToBottom();
  }

  async function sendMessage(content: string) {
    if (!activeCharacter || !content.trim() || guestChatStore.isGenerating)
      return;
    const targetId = activeCharacter.id;
    messageInput = "";
    await guestChatStore.sendMessage(targetId, content);
    await scrollToBottom();
  }

  async function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await sendMessage(messageInput);
    }
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Scroll to bottom when new messages arrive
  $effect(() => {
    if (currentTranscript?.messages?.length) {
      void scrollToBottom();
    }
  });
</script>

<div
  class="flex flex-1 min-h-0 w-full h-full bg-theme-bg/40 backdrop-blur-md border border-theme-border/50 rounded-2xl overflow-hidden font-mono"
  style="background-image: var(--bg-texture-overlay);"
>
  <!-- Sidebar of Enabled Characters -->
  <aside
    class="w-64 border-r border-theme-border/60 bg-theme-surface/30 flex flex-col min-h-0 shrink-0 max-md:w-full {activeCharacter
      ? 'max-md:hidden'
      : ''}"
  >
    <div class="p-4 border-b border-theme-border/60">
      <h3
        class="text-xs font-bold uppercase tracking-wider text-theme-secondary flex items-center gap-1.5"
      >
        <span class="icon-[lucide--messages-square] w-4 h-4 text-theme-primary"
        ></span>
        Lore Contacts
      </h3>
    </div>
    <nav class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
      {#each enabledCharacters as char}
        <button
          type="button"
          onclick={() => selectCharacter(char.id, char.title)}
          class="w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer
            {guestChatStore.activeCharacterId === char.id
            ? 'bg-theme-primary/10 border-theme-primary/30 text-theme-text font-bold shadow-[inset_0_0_12px_rgba(var(--color-theme-primary-rgb),0.15)]'
            : 'border-transparent text-theme-muted hover:bg-theme-surface/50 hover:text-theme-text'}"
        >
          <!-- NPC Icon -->
          <div
            class="w-8 h-8 rounded-lg bg-theme-surface/80 border border-theme-border flex items-center justify-center shrink-0"
          >
            <span class="icon-[lucide--user] w-4 h-4 text-theme-primary"></span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs truncate">{char.title}</p>
            <p class="text-[9px] text-theme-muted truncate">
              {char.guestChatConfig?.contextScope === "hybrid"
                ? "Hybrid Scope"
                : "Public Scope"}
            </p>
          </div>
        </button>
      {/each}
      {#if enabledCharacters.length === 0}
        <div class="p-4 text-center text-xs text-theme-muted italic">
          No characters available for chat.
        </div>
      {/if}
    </nav>
  </aside>

  <!-- Chat Session View -->
  <main
    class="flex-1 min-h-0 flex flex-col bg-theme-bg/20 relative {!activeCharacter
      ? 'max-md:hidden'
      : ''}"
  >
    {#if activeCharacter}
      <!-- Chat Header -->
      <header
        class="p-4 border-b border-theme-border/60 flex items-center justify-between bg-theme-surface/10 shrink-0"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            onclick={() => {
              guestChatStore.activeCharacterId = null;
            }}
            class="md:hidden p-1.5 text-theme-muted hover:text-theme-text transition border border-theme-border/50 rounded-lg"
            aria-label="Back to contacts list"
          >
            <span aria-hidden="true" class="icon-[lucide--chevron-left] w-4 h-4"
            ></span>
          </button>
          <div>
            <h2 class="text-sm font-bold text-theme-text">
              {activeCharacter.title}
            </h2>
            <p class="text-[9px] text-theme-muted uppercase tracking-wider">
              In-Character Conversation
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => {
            if (
              confirm(
                `Are you sure you want to reset your conversation memory with ${activeCharacter?.title}?`,
              )
            ) {
              guestChatStore.clearTranscript(activeCharacter.id);
            }
          }}
          class="text-[10px] px-3 py-1.5 border border-theme-border/60 rounded-xl font-bold uppercase tracking-wider text-theme-muted hover:text-theme-danger hover:border-theme-danger/30 transition flex items-center gap-1.5 cursor-pointer"
          title="Clear local conversation memory"
        >
          <span class="icon-[lucide--refresh-cw] w-3 h-3"></span>
          Reset Memory
        </button>
      </header>

      <!-- Message History -->
      <div
        bind:this={chatContainer}
        class="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 flex flex-col"
      >
        {#each currentTranscript?.messages || [] as msg}
          <GuestChatBubble
            message={msg}
            characterTitle={activeCharacter.title}
          />
        {/each}

        {#if !currentTranscript || currentTranscript.messages.length === 0}
          <div class="m-auto max-w-md w-full py-8 px-4 text-center space-y-6">
            <div class="space-y-2">
              <h3
                class="text-xs font-bold text-theme-secondary uppercase tracking-widest"
              >
                Start a Conversation
              </h3>
              <p class="text-xs text-theme-muted leading-relaxed">
                Ask a question or select one of the suggested prompts below to
                begin talking with {activeCharacter.title} in-character.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-2 text-left">
              {#each starterPrompts as prompt}
                <button
                  type="button"
                  onclick={() => sendMessage(prompt)}
                  class="w-full p-3 text-xs text-theme-muted hover:text-theme-text bg-theme-surface/30 hover:bg-theme-primary/10 border border-theme-border/50 hover:border-theme-primary/30 rounded-xl transition cursor-pointer text-left flex items-center justify-between"
                >
                  <span>{prompt}</span>
                  <span
                    class="icon-[lucide--arrow-right] w-3.5 h-3.5 text-theme-primary shrink-0 opacity-70"
                  ></span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if guestChatStore.isGenerating}
          <div
            class="self-start flex items-center gap-2 text-theme-muted text-xs p-2"
          >
            <span class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin"
            ></span>
            <span>{activeCharacter.title} is thinking...</span>
          </div>
        {/if}
      </div>

      <!-- Input Bar -->
      <footer
        class="p-4 border-t border-theme-border/60 bg-theme-surface/10 shrink-0"
      >
        <div class="flex gap-2">
          <textarea
            bind:value={messageInput}
            onkeydown={handleKeydown}
            placeholder="Type your message in-character..."
            rows="1"
            class="flex-1 bg-theme-bg/60 border border-theme-border rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-theme-primary resize-none text-theme-text custom-scrollbar"
          ></textarea>
          <button
            type="button"
            onclick={() => sendMessage(messageInput)}
            disabled={!messageInput.trim() || guestChatStore.isGenerating}
            class="px-4 bg-theme-primary text-theme-bg hover:bg-theme-secondary font-bold uppercase tracking-widest text-[10px] rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            aria-label="Send message"
          >
            <span aria-hidden="true" class="icon-[lucide--send] w-4 h-4"></span>
          </button>
        </div>
      </footer>
    {:else}
      <!-- Empty State -->
      <div class="m-auto text-center space-y-3 p-4">
        <div
          class="w-12 h-12 rounded-full border border-theme-border/80 flex items-center justify-center mx-auto bg-theme-surface/50"
        >
          <span class="icon-[lucide--messages-square] w-6 h-6 text-theme-muted"
          ></span>
        </div>
        <p class="text-xs text-theme-muted">
          Select a character from the contact list to start chatting.
        </p>
      </div>
    {/if}
  </main>
</div>

<style>
  /* Custom scrollbar matching styling guidelines */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--theme-selected-border);
    border-radius: 2px;
  }
</style>
