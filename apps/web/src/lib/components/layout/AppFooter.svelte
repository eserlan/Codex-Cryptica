<script lang="ts">
  import { base } from "$app/paths";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { DISCORD_URL, PATREON_URL } from "$lib/config";
</script>

<footer
  class="px-6 py-4 bg-theme-surface border-t border-theme-border flex flex-col md:flex-row justify-between items-center gap-4 hidden md:flex"
  style:background-image="var(--bg-texture-overlay)"
>
  <div
    class="text-[10px] font-header text-theme-muted uppercase tracking-widest"
  >
    &copy; 2026 Codex Cryptica // Local-First Intelligence
  </div>
  <div class="flex gap-6">
    {#if PATREON_URL}
      <a
        href={PATREON_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
        >Support on Patreon</a
      >
    {/if}
    {#if DISCORD_URL}
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
        >Discord</a
      >
    {/if}
    <a
      href="{base}/features"
      class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
      >Features</a
    >
    <a
      href="{base}/blog"
      class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
      >Blog</a
    >
    <a
      href="{base}/llms.txt"
      class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
      >LLMS.TXT</a
    >
    <button
      onclick={() => uiStore.openSettings("help")}
      class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest cursor-pointer"
      >Help</button
    >
    <a
      href="{base}/privacy"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
      >Privacy Policy</a
    >
    <a
      href="{base}/terms"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[10px] font-header text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
      >Terms of Service</a
    >
  </div>
</footer>
