<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$stores/ui.svelte";
  import { base } from "$app/paths";
  import OracleChat from "./OracleChat.svelte";
  import { fly, fade } from "svelte/transition";
  import { demoService } from "$lib/services/demo";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { themeStore } from "$lib/stores/theme.svelte";

  const _isPopup = $derived(page.url.pathname === `${base}/oracle`);

  const popOut = () => {
    window.open(
      `${base}/oracle`,
      "codex-oracle",
      "width=600,height=800,menubar=no,toolbar=no,location=no,status=no",
    );
    oracle.toggle(); // Close the docked one when popping out
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!oracle.isOpen) return;

    // Check for Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      const target = e.target as HTMLElement;
      const isInput = target.matches(
        'input, textarea, [contenteditable="true"]',
      );

      if (!isInput) {
        // Ensure the event target is within the Oracle container to avoid intercepting
        // global undo shortcuts meant for other parts of the app (like the main editor)
        const container = document.querySelector(".oracle-window-container");
        if (container && !container.contains(target)) return;

        e.preventDefault();
        oracle.undo();
      }
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if oracle.isOpen}
  <!-- Backdrop (always on mobile, only on modal mode for desktop) -->
  <div
    class="fixed inset-0 bg-black/40 z-[89] {oracle.isModal
      ? 'block'
      : 'md:hidden'}"
    onclick={() => oracle.toggle()}
    transition:fade
    aria-hidden="true"
  ></div>

  <div
    class="oracle-window-container fixed transition-all duration-500 ease-in-out z-[90] flex flex-col bg-theme-surface border border-theme-border shadow-2xl
    {oracle.isModal
      ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-full max-h-[85vh] md:w-[800px] md:max-h-[70vh] rounded-xl'
      : 'bottom-0 left-0 w-full h-[100dvh] rounded-t-xl'}"
    transition:fly={{ y: 50, duration: 300 }}
    role={oracle.isModal ? "dialog" : "region"}
    aria-modal={oracle.isModal ? "true" : undefined}
    aria-label="Lore Oracle"
  >
    <!-- Header -->
    <div
      class="px-4 py-2 sm:py-3 border-b border-theme-border bg-theme-primary/10 flex justify-between items-center shrink-0 rounded-t-xl md:rounded-t-lg overflow-hidden"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 bg-theme-primary rounded-full {oracle.isLoading
            ? 'animate-pulse'
            : ''}"
        ></div>
        <span
          class="text-[10px] font-bold text-theme-text tracking-[0.2em] uppercase font-header"
          >Lore Oracle</span
        >
        {#if uiStore.aiDisabled}
          <span
            class="text-[8px] font-header bg-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded border border-theme-primary/30"
            >AI DISABLED</span
          >
        {/if}
      </div>
      <div class="flex items-center gap-1">
        <!-- Clear Chat -->
        {#if oracle.messages.length > 0}
          <button
            class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-red-400 transition-colors"
            onclick={async () => {
              if (
                await uiStore.confirm({
                  title: "Clear History",
                  message:
                    "Are you sure you want to clear the conversation history?",
                  confirmLabel: "Clear",
                  isDangerous: true,
                })
              ) {
                oracle.clearMessages();
              }
            }}
            title="Clear conversation history"
            aria-label="Clear conversation history"
          >
            <span class="icon-[lucide--trash-2] w-4 h-4"></span>
          </button>
        {/if}

        <!-- New Window Toggle -->
        <button
          class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-primary transition-colors hidden md:flex"
          onclick={popOut}
          title="Pop out to new window"
          aria-label="Pop out to new window"
        >
          <span class="icon-[heroicons--arrow-top-right-on-square] w-4 h-4"
          ></span>
        </button>

        <!-- Pop-out Toggle (Modal) -->
        <button
          class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-primary transition-colors hidden md:flex"
          onclick={() => oracle.toggleModal()}
          title={oracle.isModal ? "Minimize to side" : "Pop out to center"}
          aria-label={oracle.isModal ? "Minimize to side" : "Pop out to center"}
        >
          <span
            class="w-4 h-4 transition-transform duration-300 {oracle.isModal
              ? 'rotate-180 icon-[heroicons--arrows-pointing-in]'
              : 'icon-[heroicons--arrows-pointing-out]'}"
          ></span>
        </button>
        <button
          class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-primary transition-colors"
          onclick={() => oracle.toggle()}
          aria-label="Close oracle window"
        >
          <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
      </div>
    </div>

    <OracleChat
      onOpenSettings={() => {
        uiStore.openSettings();
        oracle.toggle();
      }}
    />

    {#if uiStore.isDemoMode}
      <div
        class="p-4 bg-theme-primary/5 border-t border-theme-border flex flex-col gap-3 rounded-b-xl md:rounded-b-lg"
      >
        <p
          class="text-[10px] text-theme-muted italic text-center leading-relaxed"
        >
          {demoService.marketingPrompt}
        </p>
        <button
          onclick={async () => {
            try {
              const _id = await demoService.convertToWorld();
              const url = new URL(page.url.href);
              url.searchParams.delete("demo");
              goto(url.toString(), { replaceState: true });
              oracle.toggle();
              uiStore.openSettings("vault");
            } catch (error) {
              console.error(
                `Failed to convert demo to ${themeStore.jargon.vault}`,
                error,
              );
              window.alert(
                `Failed to save ${themeStore.jargon.vault}. Please try again.`,
              );
            }
          }}
          class="w-full py-2 bg-theme-primary text-theme-bg text-[10px] font-bold uppercase font-header tracking-widest rounded hover:bg-theme-secondary transition-colors"
          title={`Save this demo exploration as your own persistent ${themeStore.jargon.vault}`}
        >
          Save as {themeStore.jargon.vault}
        </button>
      </div>
    {/if}
  </div>
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
</style>
