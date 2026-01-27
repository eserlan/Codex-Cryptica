<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$stores/ui.svelte";
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
    class="fixed bottom-0 left-0 w-full md:bottom-40 md:left-6 md:w-96 h-[80vh] md:h-[65vh] md:max-h-[800px] md:min-h-[500px] bg-black/95 border-t md:border border-purple-900/50 rounded-t-xl md:rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden"
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

        <button
          class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded-full text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-purple-900/40"
          onclick={() => {
            uiStore.openSettings();
            oracle.toggle(); // Close oracle window when opening settings
          }}
        >
          OPEN SETTINGS
        </button>
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
            class="h-full flex flex-col items-center justify-center text-center p-8 space-y-6"
          >
            <div class="relative">
              <div
                class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"
              ></div>
              <span
                class="icon-[heroicons--sparkles] w-12 h-12 text-purple-500 relative z-10 opacity-50"
              ></span>
            </div>

            <div class="space-y-2">
              <h4
                class="text-purple-100 font-bold uppercase tracking-[0.2em] text-[10px]"
              >
                The Archives are Open
              </h4>
              <p class="text-xs text-purple-400/60 leading-relaxed font-mono">
                Greetings, Seeker. I am the Oracle, the keeper of your recorded
                lore. Ask of the robber, the mayor, or the shadows beyond the
                village... I shall consult the echoes of your vault.
              </p>
            </div>

            <div class="pt-4">
              <p
                class="text-[9px] text-purple-900/40 uppercase tracking-widest animate-bounce"
              >
                Awaiting your query...
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
    class="fixed bottom-6 right-6 md:bottom-28 md:left-6 w-14 h-14 bg-purple-900/10 border border-purple-500/30 rounded-full flex items-center justify-center text-purple-400 hover:bg-purple-900/30 hover:text-purple-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] z-50 group overflow-hidden"
    onclick={() => oracle.toggle()}
    transition:fade
    title="Open Lore Oracle"
  >
    <!-- Internal Orb Content -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent"
    ></div>
    <div
      class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-purple-500/20 transition-opacity duration-300"
    ></div>

    <!-- Magical Sparkle SVG -->
    <svg
      class="w-7 h-7 relative z-10 transition-transform duration-500 group-hover:rotate-12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>

    <!-- Scanning Line Effect -->
    <div
      class="absolute inset-0 pointer-events-none overflow-hidden opacity-30"
    >
      <div
        class="w-full h-[1px] bg-purple-400/50 absolute top-0 animate-scan"
      ></div>
    </div>
  </button>
{/if}

<style>
  @keyframes -global-scan {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(200%);
    }
  }
  .animate-scan {
    animation: -global-scan 3s linear infinite;
  }
</style>
