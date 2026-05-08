<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fly, fade } from "svelte/transition";
  import DiceVault from "./DiceVault.svelte";
</script>

{#if uiStore.showDiceModal}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-theme-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    onclick={() => {
      uiStore.showDiceModal = false;
    }}
    onkeydown={(e) => e.key === "Escape" && (uiStore.showDiceModal = false)}
    transition:fade={{ duration: 200 }}
    role="button"
    tabindex="0"
    aria-label="Close Modal"
  >
    <!-- Modal Container -->
    <div
      class="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
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
          <span class="icon-[lucide--dices] w-5 h-5 text-theme-primary"></span>
          <h2
            class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
          >
            Die Roller
          </h2>
        </div>
        <div class="flex items-center gap-1">
          <!-- Detach Button -->
          <button
            class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
            onclick={() => uiStore.openDiceWindow()}
            title="Pop out into new window"
            aria-label="Pop out into new window"
          >
            <span class="icon-[lucide--external-link] w-4 h-4"></span>
          </button>
          <button
            class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
            onclick={() => {
              uiStore.showDiceModal = false;
            }}
            aria-label="Close"
          >
            <span class="icon-[lucide--x] w-5 h-5"></span>
          </button>
        </div>
      </div>

      <!-- Main Dice Content -->
      <div class="flex-1 overflow-hidden">
        <DiceVault />
      </div>
    </div>
  </div>
{/if}
