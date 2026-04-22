<script lang="ts">
  import type { ChatCommand } from "$lib/config/chat-commands";
  import CommandMenu from "$lib/components/oracle/CommandMenu.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { tick } from "svelte";
  import VTTChatMessage from "./VTTChatMessage.svelte";

  let input = $state("");
  let scrollContainer = $state<HTMLDivElement>();
  let inputEl = $state<HTMLTextAreaElement>();
  let commandMenu = $state<ReturnType<typeof CommandMenu>>();
  let showCommandMenu = $state(false);

  const vttChatCommands: ChatCommand[] = [
    {
      name: "/roll",
      description: "Roll dice (e.g. /roll 2d20kh1 + 5)",
      handler: () => undefined,
    },
  ];

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    mapSession.sendChatMessage(trimmed);
    input = "";
    showCommandMenu = false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showCommandMenu && commandMenu?.handleKeyDown(e)) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  $effect(() => {
    if (mapSession.chatMessages.length && scrollContainer) {
      tick().then(() => {
        scrollContainer?.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  $effect(() => {
    if (input.startsWith("/")) {
      showCommandMenu = !input.includes(" ");
    } else {
      showCommandMenu = false;
    }
  });
</script>

<div class="flex-1 flex flex-col min-h-0 bg-theme-bg/10">
  <div
    class="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 scroll-smooth"
    bind:this={scrollContainer}
  >
    {#if mapSession.chatMessages.length === 0}
      <div
        class="h-full flex flex-col items-center justify-center text-center p-8 opacity-40"
      >
        <span
          class="icon-[lucide--messages-square] w-12 h-12 mb-3 text-theme-primary/50"
        ></span>
        <p class="text-[10px] uppercase tracking-[0.2em] font-header font-bold">
          Awaiting communication...
        </p>
        <p class="text-[10px] text-theme-muted mt-1 font-body">
          Type / to open commands
        </p>
      </div>
    {/if}

    {#each mapSession.chatMessages as message}
      <VTTChatMessage {message} />
    {/each}
  </div>

  <div
    class="p-2 sm:p-3 border-t border-theme-border bg-theme-surface/50 shrink-0 relative z-20 overflow-visible"
  >
    {#if showCommandMenu}
      <CommandMenu
        bind:this={commandMenu}
        bind:input
        anchorEl={inputEl || null}
        commands={vttChatCommands}
        onSelect={(cmd) => {
          input = cmd.name + " ";
          showCommandMenu = false;
          tick().then(() => inputEl?.focus());
        }}
        onClose={() => {
          showCommandMenu = false;
        }}
      />
    {/if}

    <div class="mb-2 flex items-center gap-2 px-1 text-[10px] text-theme-muted">
      <span class="font-body">
        Type <span class="font-mono text-theme-primary">/</span> to open commands
      </span>
    </div>

    <div class="flex gap-2">
      <textarea
        bind:this={inputEl}
        bind:value={input}
        onkeydown={handleKeyDown}
        placeholder="Type a message..."
        class="flex-1 bg-theme-bg/50 border border-theme-border rounded px-4 py-2.5 text-sm text-theme-text placeholder-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 transition-all font-body resize-none overflow-hidden no-scrollbar shadow-inner"
        rows="1"
      ></textarea>
      <button
        type="button"
        class="w-10 h-10 flex items-center justify-center border border-theme-border bg-theme-bg/50 text-theme-muted rounded hover:border-theme-primary hover:text-theme-primary transition-all active:scale-95 shadow-inner shrink-0 self-end"
        onclick={() => (uiStore.showDiceModal = true)}
        aria-label="Open Dice Roller"
        title="Open Dice Roller"
        data-testid="vtt-dice-roller-button"
      >
        <span class="icon-[lucide--dices] w-4 h-4"></span>
      </button>
      <button
        onclick={handleSubmit}
        disabled={!input.trim()}
        class="w-10 h-10 flex items-center justify-center border border-theme-border bg-theme-bg/50 text-theme-muted rounded hover:border-theme-primary hover:text-theme-primary transition-all active:scale-95 shadow-inner disabled:opacity-50 disabled:grayscale shrink-0 self-end"
        aria-label="Send Message"
      >
        <span class="icon-[lucide--send] w-4 h-4"></span>
      </button>
    </div>
  </div>
</div>

<style>
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
