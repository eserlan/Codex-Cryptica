<script lang="ts">
  import type { MentionSuggestion } from "entity-mention-engine";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";

  let {
    suggestions,
    activeIndex = 0,
    loading = false,
    listId = "entity-mention-list",
    anchorEl = null,
    onSelect,
  } = $props<{
    suggestions: MentionSuggestion[];
    activeIndex?: number;
    loading?: boolean;
    listId?: string;
    anchorEl?: HTMLElement | null;
    onSelect: (index: number) => void;
  }>();

  let panelEl = $state<HTMLDivElement>();
  let viewportHeight = $state(
    typeof window === "undefined"
      ? 0
      : (window.visualViewport?.height ?? window.innerHeight),
  );

  // The soft keyboard shrinks the visual viewport, not the layout viewport.
  // Sizing the list from the visual height keeps Send and the input on screen.
  const listMaxHeight = $derived(
    Math.max(120, Math.floor(viewportHeight * 0.5)),
  );

  $effect(() => {
    const vv = window.visualViewport;
    const update = () => {
      viewportHeight = vv?.height ?? window.innerHeight;
    };
    update();
    vv?.addEventListener("resize", update);
    return () => vv?.removeEventListener("resize", update);
  });

  $effect(() => {
    if (!anchorEl || !panelEl) return;
    const panel = panelEl;
    const anchor = anchorEl;
    // Places the panel above the input, flipping or shifting so it stays in view.
    void computePosition(anchor, panel, {
      strategy: "absolute",
      placement: "top-start",
      middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.width = `${anchor.getBoundingClientRect().width}px`;
    });
  });

  const countLabel = $derived(
    loading
      ? "Searching entities"
      : suggestions.length === 0
        ? "No entities match"
        : suggestions.length === 1
          ? "1 result"
          : `${suggestions.length} results. ${suggestions[activeIndex]?.title ?? ""} highlighted`,
  );

  const optionClass = (index: number) =>
    `flex min-h-12 cursor-pointer flex-col justify-center gap-0.5 px-3 py-2 text-left text-theme-text ${
      index === activeIndex ? "bg-theme-primary/15" : "hover:bg-theme-bg/60"
    }`;

  // Option ids are derived from the list id so several pickers on one page
  // cannot collide.
  const optionId = (index: number) => `${listId}-option-${index}`;
</script>

<div
  bind:this={panelEl}
  class="absolute z-30 rounded-lg border border-theme-border bg-theme-surface shadow-xl overflow-hidden {anchorEl
    ? ''
    : 'bottom-full left-2.5 right-2.5 mb-2 sm:left-4 sm:right-4'}"
  data-testid="entity-mention-picker"
>
  <p role="status" class="sr-only" aria-live="polite">{countLabel}</p>

  {#if loading}
    <p aria-hidden="true" class="px-3 py-3 text-sm text-theme-muted">
      Searching entities…
    </p>
  {:else if suggestions.length === 0}
    <p aria-hidden="true" class="px-3 py-3 text-sm text-theme-muted">
      No entities match. Keep typing or press Escape.
    </p>
  {:else}
    <ul
      id={listId}
      role="listbox"
      aria-label="Vault entities"
      aria-activedescendant={optionId(activeIndex)}
      tabindex="-1"
      class="overflow-y-auto no-scrollbar"
      style:max-height="{listMaxHeight}px"
    >
      {#each suggestions as suggestion, index (suggestion.entityId)}
        <li
          id={optionId(index)}
          role="option"
          aria-selected={index === activeIndex}
          class={optionClass(index)}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => onSelect(index)}
          onkeydown={() => {}}
        >
          <span class="flex items-baseline gap-2">
            <span class="font-medium">{suggestion.title}</span>
            <span class="text-xs uppercase tracking-wide text-theme-muted"
              >{suggestion.entityType}</span
            >
            {#if suggestion.disambiguator}
              <span class="sr-only">, {suggestion.disambiguator}</span>
            {/if}
          </span>
          {#if suggestion.descriptor}
            <span class="truncate text-sm text-theme-muted"
              >{suggestion.descriptor}</span
            >
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .no-scrollbar {
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
