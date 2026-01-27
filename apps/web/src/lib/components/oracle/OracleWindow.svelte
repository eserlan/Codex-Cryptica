<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import ChatMessage from "./ChatMessage.svelte";
  import { fly, fade } from "svelte/transition";

  let input = $state("");
  let scrollContainer = $state<HTMLDivElement>();

  const handleSubmit = async () => {
    if (!input || oracle.isLoading) return;
    const query = input;
    input = "";
    await oracle.ask(query);
  };

  $effect(() => {
    if (oracle.messages.length && scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  });
</script>

{#if oracle.isOpen}
  <!-- Backdrop for mobile/tablet to dismiss easily -->
  <div
    class="fixed inset-0 bg-black/40 z-40 md:hidden"
    onclick={() => oracle.toggle()}
    transition:fade
    aria-hidden="true"
  ></div>

  <div
    class="fixed bottom-0 right-0 w-full md:bottom-20 md:right-6 md:w-96 h-[80vh] md:h-[500px] bg-black/95 border-t md:border border-purple-900/50 rounded-t-xl md:rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden"
    transition:fly={{ y: 50, duration: 300 }}
  >
    <!-- Header -->
    <div
      class="px-4 py-3 border-b border-purple-900/30 bg-purple-900/20 flex justify-between items-center shrink-0"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 bg-purple-500 rounded-full {oracle.isLoading
            ? 'animate-pulse'
            : ''}"
        ></div>
        <span
          class="text-[10px] font-bold text-purple-300 tracking-[0.2em] uppercase"
          >Lore Oracle</span
        >
      </div>
      <button
        class="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors"
        onclick={() => oracle.toggle()}
        aria-label="Close oracle window"
      >
        ✕
      </button>
    </div>

    <!-- Content -->
    {#if !oracle.isEnabled}
      <div
        class="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4"
      >
        <div
          class="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center text-purple-500 mb-2"
        >
          <span class="icon-[heroicons--sparkles] w-8 h-8"></span>
        </div>
        <h3 class="text-purple-100 font-bold uppercase tracking-widest text-xs">
          Oracle Offline
        </h3>
        <p class="text-xs text-purple-300/70 leading-relaxed">
          To consult the archives, please provide a <strong
            >Google Gemini API Key</strong
          > in the Settings panel.
        </p>
        <div class="flex flex-col gap-2 w-full pt-4">
          <p class="text-[10px] text-purple-500 font-mono">
            Vault contents never leave this device except for inference via your
            own API key.
          </p>
        </div>
      </div>
    {:else}
      <!-- Messages -->
      <div
        class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        bind:this={scrollContainer}
      >
        {#if oracle.messages.length === 0}
          <div
            class="h-full flex items-center justify-center text-center p-6 text-purple-900/30"
          >
            <div class="flex flex-col items-center gap-3">
              <span
                class="icon-[heroicons--chat-bubble-left-right] w-10 h-10 opacity-20"
              ></span>
              <p class="text-[10px] font-mono tracking-widest">
                AWAITING QUERY...
              </p>
            </div>
          </div>
        {/if}

        {#each oracle.messages as msg}
          <ChatMessage message={msg} />
        {/each}

        {#if oracle.isLoading}
          <div class="flex justify-start" transition:fade>
            <div
              class="bg-purple-950/20 border border-purple-900/30 px-3 py-2 rounded text-xs text-purple-400 font-mono animate-pulse"
            >
              Consulting archives...
            </div>
          </div>
        {/if}
      </div>

      <!-- Input -->
      <div class="p-4 border-t border-purple-900/30 bg-purple-900/5 shrink-0">
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          class="flex gap-2"
        >
          <input
            bind:value={input}
            placeholder="Ask the archives..."
            class="flex-1 bg-black/40 border border-purple-900/40 rounded px-4 py-2.5 text-sm text-purple-100 placeholder-purple-900/50 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 transition-all font-mono"
            disabled={oracle.isLoading}
          />
          <button
            type="submit"
            class="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-black rounded transition shadow-lg shadow-purple-900/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
            disabled={!input.trim() || oracle.isLoading}
          >
            ➤
          </button>
        </form>
      </div>
    {/if}
  </div>
{/if}

<!-- Toggle Button -->
{#if !oracle.isOpen}
  <button
    class="fixed bottom-6 right-6 md:bottom-20 md:right-6 w-14 h-14 bg-purple-900/20 border border-purple-500/50 rounded-full flex items-center justify-center text-purple-400 hover:bg-purple-900/40 hover:text-purple-200 hover:scale-110 active:scale-90 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] z-50 group overflow-hidden"
    onclick={() => oracle.toggle()}
    transition:fade
    title="Open Lore Oracle"
  >
    <div
      class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
    ></div>
    <span class="icon-[heroicons--sparkles] w-7 h-7 group-hover:animate-pulse"
    ></span>
  </button>
{/if}
