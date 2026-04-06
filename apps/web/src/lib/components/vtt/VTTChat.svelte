<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { tick } from "svelte";
  import VTTChatMessage from "./VTTChatMessage.svelte";
  import DiceCommandMenu from "./DiceCommandMenu.svelte";

  let input = $state("");
  let scrollContainer = $state<HTMLDivElement>();
  let inputEl = $state<HTMLInputElement>();
  let diceMenu = $state<ReturnType<typeof DiceCommandMenu>>();
  let showDiceMenu = $state(false);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    mapSession.sendChatMessage(trimmed);
    input = "";
    showDiceMenu = false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showDiceMenu && diceMenu?.handleKeyDown(e)) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
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
    if (input.startsWith("/roll ")) {
      showDiceMenu = true;
    } else {
      showDiceMenu = false;
    }
  });
</script>

<div class="flex-1 flex flex-col min-h-0 bg-theme-bg/10">
  <!-- Messages -->
  <div
    class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
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
          Type /roll to cast the dice
        </p>
      </div>
    {/if}

    {#each mapSession.chatMessages as message}
      <VTTChatMessage {message} />
    {/each}
  </div>

  <!-- Input -->
  <div
    class="p-3 border-t border-theme-border bg-theme-surface/50 shrink-0 relative"
  >
    {#if showDiceMenu}
      <DiceCommandMenu
        bind:this={diceMenu}
        bind:input
        anchorEl={inputEl || null}
        onSelect={(val) => {
          input = `/roll ${val}`;
          showDiceMenu = false;
          tick().then(() => inputEl?.focus());
        }}
        onClose={() => (showDiceMenu = false)}
      />
    {/if}
    <div class="flex gap-2">
      <input
        bind:this={inputEl}
        bind:value={input}
        onkeydown={handleKeyDown}
        placeholder="Type a message or /roll 1d20..."
        class="flex-1 bg-theme-bg/50 border border-theme-border rounded px-4 py-2.5 text-sm text-theme-text placeholder-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 transition-all font-body shadow-inner"
      />
      <button
        onclick={handleSubmit}
        disabled={!input.trim()}
        class="w-10 h-10 flex items-center justify-center bg-theme-primary text-theme-bg rounded hover:bg-theme-secondary transition-all active:scale-95 shadow-lg shadow-theme-primary/20 disabled:opacity-50 disabled:grayscale shrink-0"
        aria-label="Send Message"
      >
        ➤
      </button>
    </div>
  </div>
</div>
