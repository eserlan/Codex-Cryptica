<script lang="ts">
  import { resolve } from "$app/paths";
  import { PATREON_URL } from "#lib/config/index.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
</script>

<footer
  class="px-6 py-4 bg-chrome-surface border-t border-chrome-border hidden md:flex md:flex-row justify-between items-center gap-4"
  data-testid="app-footer"
>
  <div class="text-micro font-sans text-chrome-muted uppercase tracking-widest">
    © 2026 Codex Cryptica // Local-First Intelligence
  </div>
  <div class="flex gap-6">
    {#if PATREON_URL}
      <a
        href={PATREON_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center text-chrome-muted hover:text-chrome-text transition-colors"
        aria-label="Support Codex Cryptica on Patreon"
        title="Support on Patreon"
      >
        <span class="icon-[mdi--patreon] h-3.5 w-3.5" aria-hidden="true"></span>
      </a>
    {/if}
    <a
      href="{resolve('')}/generators"
      class="text-micro font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Generators</a
    >
    <a
      href="{resolve('')}/explore"
      class="text-micro font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Explore</a
    >
    <button
      type="button"
      onclick={() => modalUIStore.openSettings("help")}
      class="text-micro font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest cursor-pointer"
      >Help</button
    >
    <a
      href="{resolve('')}/privacy"
      target="_blank"
      rel="noopener noreferrer"
      class="text-micro font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Privacy</a
    >
    <a
      href="{resolve('')}/terms"
      target="_blank"
      rel="noopener noreferrer"
      class="text-micro font-sans text-chrome-muted hover:text-chrome-text transition-colors uppercase tracking-widest"
      >Terms</a
    >
  </div>
</footer>
