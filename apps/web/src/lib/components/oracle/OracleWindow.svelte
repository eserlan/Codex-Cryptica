<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$stores/ui.svelte";
  import { base } from "$app/paths";
  import OracleChat from "./OracleChat.svelte";
  import { fly, fade } from "svelte/transition";

  const popOut = () => {
    window.open(
      `${base}/oracle`,
      "codex-oracle",
      "width=600,height=800,menubar=no,toolbar=no,location=no,status=no",
    );
    oracle.toggle(); // Close the docked one when popping out
  };
</script>

{#if oracle.isOpen}
  <!-- Backdrop (always on mobile, only on modal mode for desktop) -->
  <div
    class="fixed inset-0 bg-black/60 z-40 {oracle.isModal
      ? 'block'
      : 'md:hidden'}"
    onclick={() => oracle.toggle()}
    transition:fade
    aria-hidden="true"
  ></div>

  <div
    class="fixed transition-all duration-500 ease-in-out z-50 overflow-hidden flex flex-col bg-black/95 border border-purple-900/50 shadow-2xl
    {oracle.isModal
      ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-full max-h-[85vh] md:w-[800px] md:max-h-[70vh] rounded-xl'
      : 'bottom-0 left-0 w-full md:bottom-40 md:left-6 md:w-96 h-full max-h-[85vh] md:max-h-[calc(100vh-420px)] md:min-h-[400px] rounded-t-xl md:rounded-lg'}"
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
      <div class="flex items-center gap-1">
        <!-- New Window Toggle -->
        <button
          class="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors hidden md:flex"
          onclick={popOut}
          title="Pop out to new window"
        >
          <span class="icon-[heroicons--arrow-top-right-on-square] w-4 h-4"
          ></span>
        </button>

        <!-- Pop-out Toggle (Modal) -->
        <button
          class="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors hidden md:flex"
          onclick={() => oracle.toggleModal()}
          title={oracle.isModal ? "Minimize to side" : "Pop out to center"}
        >
          <span
            class="w-4 h-4 transition-transform duration-300 {oracle.isModal
              ? 'rotate-180 icon-[heroicons--arrows-pointing-in]'
              : 'icon-[heroicons--arrows-pointing-out]'}"
          ></span>
        </button>
        <button
          class="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors"
          onclick={() => oracle.toggle()}
          aria-label="Close oracle window"
        >
          ✕
        </button>
      </div>
    </div>

    <OracleChat
      onOpenSettings={() => {
        uiStore.openSettings();
        oracle.toggle();
      }}
    />
  </div>
{/if}

<!-- Toggle Button -->
{#if !oracle.isOpen}
  <button
    class="fixed bottom-6 right-6 md:bottom-28 md:left-6 w-10 h-10 bg-purple-900/10 border border-purple-500/30 rounded-full flex items-center justify-center text-purple-400 hover:bg-purple-900/30 hover:text-purple-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] z-50 group overflow-hidden"
    onclick={() => oracle.toggle()}
    transition:fade
    title="Open Lore Oracle"
    data-testid="oracle-orb"
  >
    <!-- Internal Orb Content -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent"
    ></div>
    <div
      class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-purple-500/20 transition-opacity duration-300"
    ></div>

    <svg
      class="w-5 h-5 relative z-10 transition-transform duration-500 group-hover:rotate-12"
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
