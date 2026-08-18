<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  import AdventureComposer from "./AdventureComposer.svelte";
  import AdventureLiveTranscript from "./AdventureLiveTranscript.svelte";
  import AdventureManagementMenu from "./AdventureManagementMenu.svelte";
  let {
    manager,
    showHeader = true,
    onEnterFocus,
    onOpenTools,
  }: {
    manager: AdventureManager;
    showHeader?: boolean;
    onEnterFocus?: () => void;
    onOpenTools?: () => void;
  } = $props();
</script>

<section class="space-y-4" aria-label="Adventure play">
  {#if showHeader}
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2
          id="adventure-heading"
          class="text-lg font-semibold text-theme-primary"
        >
          {manager.session?.title ?? "Adventure"}
        </h2>
        <p class="text-sm text-theme-secondary">
          {manager.readOnly
            ? "Read-only in this tab"
            : manager.phase === "offline"
              ? "Waiting for connection"
              : manager.phase}
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap justify-end gap-2">
        {#if onOpenTools}
          <button
            class="min-h-12 rounded-md border border-theme-border px-3 text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
            type="button"
            onclick={onOpenTools}
          >
            <span class="inline-flex items-center gap-2">
              <span aria-hidden="true" class="icon-[lucide--wrench] h-4 w-4"
              ></span>
              Tools
            </span>
          </button>
        {/if}
        {#if onEnterFocus}
          <button
            class="min-h-12 rounded-md border border-theme-border px-3 text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
            type="button"
            onclick={onEnterFocus}
          >
            <span class="inline-flex items-center gap-2">
              <span aria-hidden="true" class="icon-[lucide--focus] h-4 w-4"
              ></span>
              Enter Focus Mode
            </span>
          </button>
        {/if}
        <AdventureManagementMenu {manager} />
      </div>
    </div>
  {/if}
  <AdventureLiveTranscript {manager} />
  <AdventureComposer {manager} />
</section>
