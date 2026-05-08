<script lang="ts">
  import DiceVault from "$lib/components/dice/DiceVault.svelte";
</script>

<svelte:head>
  <title>Codex Cryptica | Die Roller</title>
</svelte:head>

<div class="h-screen bg-theme-bg flex flex-col overflow-hidden font-body">
  <!-- Header (Standalone Version) -->
  <div
    class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-surface shrink-0"
  >
    <div class="flex items-center gap-2">
      <span class="icon-[lucide--dices] w-5 h-5 text-theme-primary"></span>
      <h1
        class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
      >
        Die Roller
      </h1>
    </div>
    <div
      class="text-[9px] text-theme-muted uppercase font-mono tracking-widest opacity-60"
    >
      Standalone Mode
    </div>
  </div>

  <div class="flex-1 min-h-0">
    <DiceVault isStandalone={true} />
  </div>

  <footer
    class="p-2 text-center text-[9px] text-theme-muted/40 uppercase font-header tracking-widest bg-theme-surface border-t border-theme-border shrink-0"
  >
    Codex Cryptica // Local Dice Vault
  </footer>
</div>

<style>
  @reference "../../../app.css";
</style>
