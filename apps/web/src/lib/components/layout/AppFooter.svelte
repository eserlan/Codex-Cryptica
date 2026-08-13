<script lang="ts">
  import { base } from "$app/paths";
  import { DISCORD_URL, PATREON_URL } from "$lib/config";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
</script>

<footer
  class="px-6 py-4 bg-chrome-surface border-t border-chrome-border flex flex-col md:flex-row justify-between items-center gap-4 hidden md:flex"
>
  <div
    class="text-[10px] font-sans text-chrome-muted uppercase tracking-widest"
  >
    &copy; 2026 Codex Cryptica // Local-First Intelligence
  </div>
  <div class="flex gap-6">
    {#if PATREON_URL}
      <a
        href={PATREON_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
        >Support on Patreon</a
      >
    {/if}
    {#if DISCORD_URL}
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
        >Discord</a
      >
    {/if}
    <a
      href="{base}/features"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Features</a
    >
    <a
      href="{base}/tools"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Tools</a
    >
    <a
      href="{base}/blog"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Blog</a
    >
    <a
      href="{base}/worlds"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Explore Worlds</a
    >
    <a
      href="{base}/responsible-ai-worldbuilding"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Responsible AI</a
    >
    <button
      onclick={() => modalUIStore.openSettings("help")}
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest cursor-pointer"
      >Help</button
    >
    <a
      href="{base}/privacy"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Privacy Policy</a
    >
    <a
      href="{base}/terms"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[10px] font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Terms of Service</a
    >
  </div>
</footer>
