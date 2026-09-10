<script lang="ts">
  import { fade } from "svelte/transition";
  import type { SessionEntity } from "generator-engine";
  import {
    renderGeneratorMarkdown,
    renderGeneratorLore,
  } from "$lib/components/seo/markdown-renderers";

  let {
    entity,
    onClose,
    onCopy,
    onRefine,
  }: {
    entity: SessionEntity | null;
    onClose: () => void;
    onCopy?: (entity: SessionEntity) => Promise<boolean>;
    onRefine?: (entity: SessionEntity) => void;
  } = $props();

  let copyState = $state<"idle" | "success" | "error">("idle");
  let copyInFlight = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  function handleKeydown(e: KeyboardEvent) {
    if (entity && e.key === "Escape") onClose();
  }

  async function handleCopy() {
    if (!entity || !onCopy) return;
    if (copyInFlight) return;
    clearTimeout(copyTimeout);
    copyInFlight = true;
    copyState = "idle";
    try {
      const success = await onCopy(entity);
      copyState = success ? "success" : "error";
    } catch (error) {
      console.error("Failed to copy Session Hub entity", error);
      copyState = "error";
    } finally {
      copyInFlight = false;
      copyTimeout = setTimeout(() => (copyState = "idle"), 2000);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if entity}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-detail-modal-title"
      class="bg-theme-surface border border-theme-border max-w-2xl w-full max-h-[85vh] rounded-2xl shadow-xl flex flex-col text-left overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        class="px-6 py-4 border-b border-theme-border/60 flex items-center justify-between bg-theme-surface/60"
      >
        <div class="flex items-center gap-3">
          <span
            class="text-[10px] uppercase tracking-wider text-theme-primary px-2 py-0.5 rounded-full bg-theme-primary/10 border border-theme-primary/20"
            >{entity.type}</span
          >
          <h3
            id="entity-detail-modal-title"
            class="font-header font-bold text-xl text-theme-text"
          >
            {entity.title}
          </h3>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="p-2 text-theme-muted hover:text-theme-text transition-colors"
          aria-label="Close detail view"
        >
          <span aria-hidden="true" class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <div
        class="seo-md break-words overflow-y-auto p-6 text-lg leading-relaxed text-theme-text/90 [&_pre]:overflow-x-auto [&_pre]:max-w-full"
      >
        <!-- content already leads with the italicized summary, so no separate
             summary block here (would duplicate it). -->
        {@html renderGeneratorMarkdown(entity.content, "default")}

        {#if entity.lore}
          <div class="mt-6 pt-6 border-t border-theme-border/50">
            <h4
              class="font-header font-bold text-sm uppercase tracking-wider text-theme-primary mb-3"
            >
              At the Table
            </h4>
            {@html renderGeneratorLore(entity.lore, "default")}
          </div>
        {/if}
      </div>

      <div
        class="px-6 py-4 border-t border-theme-border/60 bg-theme-surface/40 flex items-center justify-end gap-2"
      >
        {#if copyState !== "idle"}
          <span
            class="mr-auto text-xs {copyState === 'success'
              ? 'text-theme-primary'
              : 'text-theme-danger'}"
            role="status"
            aria-live="polite"
          >
            {copyState === "success" ? "Copied!" : "Could not copy."}
          </span>
        {/if}
        {#if onRefine}
          <button
            type="button"
            onclick={() => entity && onRefine(entity)}
            class="rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-4 py-2 text-[10px] font-bold uppercase font-header tracking-widest text-theme-primary hover:bg-theme-primary/20 transition-all"
          >
            Refine
          </button>
        {/if}
        <button
          type="button"
          onclick={handleCopy}
          disabled={!onCopy || copyInFlight || copyState === "success"}
          class="px-4 py-2 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary font-bold uppercase font-header tracking-widest text-[10px] rounded-lg hover:bg-theme-primary/20 transition-all disabled:opacity-50"
        >
          {copyState === "success" ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 bg-theme-surface/60 border border-theme-border/60 text-theme-text font-bold uppercase font-header tracking-widest text-[10px] rounded-lg hover:bg-theme-surface transition-all"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .seo-md :global(h2) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1.25rem;
    margin: 1.5rem 0 0.75rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 40%, transparent);
    padding-bottom: 0.25rem;
  }
  .seo-md :global(h3) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1.125rem;
    margin: 1rem 0 0.5rem;
    color: color-mix(in srgb, var(--color-primary) 65%, var(--color-text));
  }
  .seo-md :global(h4) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 0.95rem;
    margin: 0.85rem 0 0.35rem;
    color: color-mix(in srgb, var(--color-primary) 45%, var(--color-text));
  }
  .seo-md :global(ul) {
    list-style: disc;
    margin-left: 1rem;
  }
  .seo-md :global(p) {
    margin-bottom: 0.75rem;
  }
  .seo-md :global(.seo-label) {
    text-shadow: 0 0 10px
      color-mix(in srgb, var(--color-primary) 70%, transparent);
    filter: brightness(1.2);
  }
</style>
