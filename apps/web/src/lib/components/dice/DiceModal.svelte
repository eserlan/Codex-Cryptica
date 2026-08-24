<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import PlayToolsVault, { type PlayToolsTab } from "./PlayToolsVault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { openDiceWindow } from "$lib/stores/ui/navigation";

  let activeTab = $state<PlayToolsTab>("dice");

  const headerInfo = $derived.by(() => {
    switch (activeTab) {
      case "decks":
        return { title: "Decks & Cards", icon: "icon-[lucide--layers]" };
      case "tables":
        return {
          title: "Random Tables",
          icon: "icon-[lucide--table-properties]",
        };
      case "dice":
      default:
        return { title: "Play Tools", icon: "icon-[lucide--dices]" };
    }
  });
</script>

{#if modalUIStore.showDiceModal}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-theme-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    onclick={() => {
      modalUIStore.showDiceModal = false;
    }}
    onkeydown={(e) =>
      e.key === "Escape" && (modalUIStore.showDiceModal = false)}
    transition:fade={{ duration: 200 }}
    role="button"
    tabindex="0"
    aria-label="Close Modal"
  >
    <!-- Modal Container -->
    <div
      class="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      onclick={(e) => e.stopPropagation()}
      role="none"
      transition:fly={{ y: 20, duration: 300 }}
      data-testid="dice-modal"
    >
      <!-- Header -->
      <div
        class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg/50"
      >
        <div class="flex items-center gap-2">
          <span class="{headerInfo.icon} w-5 h-5 text-theme-primary"></span>
          <h2
            class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
          >
            {headerInfo.title}
          </h2>
        </div>
        <div class="flex items-center gap-1">
          <!-- Detach Button -->
          <button
            type="button"
            class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
            onclick={() => openDiceWindow(activeTab)}
            title="Pop out into new window"
            aria-label="Pop out into new window"
          >
            <span
              aria-hidden="true"
              class="icon-[lucide--external-link] w-4 h-4"
            ></span>
          </button>
          <button
            type="button"
            class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
            onclick={() => {
              modalUIStore.showDiceModal = false;
            }}
            aria-label="Close"
          >
            <span aria-hidden="true" class="icon-[lucide--x] w-5 h-5"></span>
          </button>
        </div>
      </div>

      <!-- Main Play Tools Content -->
      <div class="flex-1 min-h-0 overflow-hidden">
        <PlayToolsVault bind:activeTab />
      </div>
    </div>
  </div>
{/if}
