<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import OracleChat from "./OracleChat.svelte";
  import { demoService } from "$lib/services/demo";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";

  onMount(() => {
    // Component initialization logic if any
  });

  const popOut = () => {
    window.open(
      `${base}/oracle`,
      "codex-oracle",
      "width=600,height=800,menubar=no,toolbar=no,location=no,status=no",
    );
    uiStore.closeSidebar();
  };
</script>

<div
  class="w-full md:w-96 h-full bg-theme-surface border-r border-theme-border flex flex-col z-[60] shrink-0 shadow-2xl relative
         max-md:fixed max-md:inset-0 max-md:border-none"
  transition:fly={{ x: -384, duration: 300 }}
  data-testid="oracle-sidebar-panel"
>
  <!-- Header -->
  <div
    class="px-4 py-3 border-b border-theme-border bg-theme-primary/10 flex justify-between items-center shrink-0"
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
      {#if uiStore.liteMode}
        <span
          class="text-[8px] font-mono bg-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded border border-theme-primary/30"
          >LITE</span
        >
      {/if}
    </div>

    <div class="flex items-center gap-1">
      <!-- Clear Chat -->
      {#if oracle.messages.length > 0}
        <button
          class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-red-400 transition-colors"
          onclick={() => {
            if (
              confirm(
                "Are you sure you want to clear the conversation history?",
              )
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

      <!-- Pop out -->
      <button
        class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-primary transition-colors hidden md:flex"
        onclick={popOut}
        title="Pop out to new window"
        aria-label="Pop out to new window"
      >
        <span class="icon-[heroicons--arrow-top-right-on-square] w-4 h-4"
        ></span>
      </button>

      <!-- Close -->
      <button
        class="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-primary transition-colors"
        onclick={() => uiStore.closeSidebar()}
        aria-label="Close panel"
      >
        ✕
      </button>
    </div>
  </div>

  <!-- Chat Content -->
  <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
    <OracleChat
      onOpenSettings={() => {
        uiStore.openSettings();
        uiStore.closeSidebar();
      }}
    />
  </div>

  <!-- Demo Mode CTA -->
  {#if uiStore.isDemoMode}
    <div
      class="p-4 bg-theme-primary/5 border-t border-theme-border flex flex-col gap-3"
    >
      <p
        class="text-[10px] text-theme-muted italic text-center leading-relaxed"
      >
        {demoService.marketingPrompt}
      </p>
      <button
        onclick={async () => {
          try {
            const _id = await demoService.convertToCampaign();
            const url = new URL(page.url.href);
            url.searchParams.delete("demo");
            goto(url.toString(), { replaceState: true });
            uiStore.closeSidebar();
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
      >
        Save as {themeStore.jargon.vault}
      </button>
    </div>
  {/if}
</div>
