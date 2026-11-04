<script lang="ts">
  import { guestChatStore } from "#lib/stores/guest-chat.svelte.js";
  import { fly, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import GuestChatPanel from "../guest/GuestChatPanel.svelte";
  import { focusTrap } from "#lib/actions/focusTrap.js";

  const handleClose = () => {
    guestChatStore.showChatModal = false;
  };
</script>

{#if guestChatStore.showChatModal}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8"
    transition:fade={{ duration: 300 }}
    onkeydown={(e) => e.key === "Escape" && handleClose()}
    data-testid="guest-chat-modal"
  >
    <button
      type="button"
      class="absolute inset-0 w-full h-full bg-black/80 backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary cursor-default"
      aria-label="Close dialog"
      onclick={handleClose}
      onpointerdown={(e) => e.preventDefault()}
      tabindex="-1"
    ></button>
    <div
      class="w-full md:max-w-5xl h-full md:h-[80vh] shadow-2xl overflow-hidden relative rounded-2xl flex flex-col"
      style:box-shadow="var(--theme-glow)"
      transition:fly={{ y: 50, duration: 400, easing: quintOut }}
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Guest Character Chat"
      tabindex="-1"
      use:focusTrap
    >
      <!-- Close button on desktop -->
      <button
        type="button"
        onclick={handleClose}
        class="absolute top-4 right-4 z-50 p-2 rounded-full bg-theme-bg/60 border border-theme-border/50 text-theme-muted hover:text-theme-text hover:bg-theme-bg transition flex items-center justify-center"
        aria-label="Close chat"
      >
        <span aria-hidden="true" class="icon-[lucide--x] w-5 h-5"></span>
      </button>

      <GuestChatPanel />
    </div>
  </div>
{/if}
