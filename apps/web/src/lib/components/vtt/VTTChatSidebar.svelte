<script lang="ts">
  import VTTChat from "./VTTChat.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  let {
    collapsed = $bindable(false),
  }: {
    collapsed?: boolean;
  } = $props();

  const canClearChat = $derived(
    !uiStore.isGuestMode && mapSession.chatMessages.length > 0,
  );

  const handleClearChat = async () => {
    if (!canClearChat) return;
    if (
      !(await uiStore.confirm({
        title: "Clear VTT Chat",
        message:
          "Clear the VTT chat for everyone in this session? This removes the current shared chat history.",
        confirmLabel: "Clear Chat",
        cancelLabel: "Keep Chat",
        isDangerous: true,
      }))
    ) {
      return;
    }
    mapSession.clearChatMessages();
  };
</script>

<aside
  class="absolute top-0 left-0 bottom-0 z-[30] flex overflow-hidden border-r border-theme-border bg-theme-surface/95 shadow-[0_0_30px_rgba(0,0,0,0.25)] backdrop-blur transition-all duration-200 pointer-events-auto {collapsed
    ? 'w-12'
    : 'w-[20rem] max-w-[calc(100vw-3rem)]'}"
  aria-label="VTT Chat Sidebar"
>
  {#if collapsed}
    <div class="flex h-full w-full flex-col items-center justify-between p-2">
      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10"
        onclick={() => (collapsed = false)}
        aria-label="Expand VTT Chat Sidebar"
        aria-expanded="false"
        type="button"
      >
        <span class="icon-[lucide--panel-left-open] w-4 h-4"></span>
      </button>

      <div class="flex flex-1 items-center justify-center">
        <span
          class="text-[10px] font-black uppercase tracking-[0.4em] text-theme-muted [writing-mode:vertical-rl]"
        >
          Chat
        </span>
      </div>
    </div>
  {:else}
    <div class="flex h-full min-h-0 w-full flex-col">
      <div
        class="flex items-center justify-between gap-3 border-b border-theme-border/70 px-3 py-3"
      >
        <div>
          <div
            class="text-[9px] font-black uppercase tracking-[0.35em] text-theme-muted"
          >
            VTT Chat
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if !uiStore.isGuestMode}
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              onclick={handleClearChat}
              aria-label="Clear VTT Chat"
              title="Clear VTT Chat"
              type="button"
              disabled={!canClearChat}
            >
              <span class="icon-[lucide--trash-2] w-4 h-4"></span>
            </button>
          {/if}

          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10"
            onclick={() => (collapsed = true)}
            aria-label="Collapse VTT Chat Sidebar"
            aria-expanded="true"
            type="button"
          >
            <span class="icon-[lucide--panel-left-close] w-4 h-4"></span>
          </button>
        </div>
      </div>

      <VTTChat />
    </div>
  {/if}
</aside>
