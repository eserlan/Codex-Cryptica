<script lang="ts">
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import { page } from "$app/state";
  import {
    isToolActive,
    isViewActive,
    navItems,
    type NavItem,
  } from "./nav-items";

  const items = $derived(navItems());
  const views = $derived(items.filter((i) => i.group === "view"));
  const tools = $derived(items.filter((i) => i.group === "tool"));

  /**
   * This row does not wrap and does not scroll on its own, so every item added
   * to it comes out of a phone's viewport width. Items marked `overflow` are
   * dropped here and reached from the menu drawer instead; the rail is
   * vertical from `md:` up, where height is not the constraint.
   */
  // `shrink-0` is load-bearing: without it flex shrinks these below the 44px
  // minimum tap target long before the row ever overflows, so the scroll
  // never engages and the bar quietly squashes instead.
  const shellClass = (item: NavItem) =>
    `${item.placement === "overflow" ? "hidden md:flex" : "flex"} shrink-0 w-11 h-11 md:w-10 md:h-10 items-center justify-center rounded-md transition-all duration-200 group relative border`;

  const stateClass = (active: boolean) =>
    active
      ? "bg-chrome-accent/10 text-chrome-accent border-chrome-accent/30 shadow-sm"
      : "border-transparent text-chrome-muted hover:text-chrome-text hover:bg-chrome-muted/10";
</script>

<nav
  class="bg-chrome-surface border-chrome-border flex shrink-0 z-[80]
    flex-row md:flex-col items-center justify-center-safe md:justify-start pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:py-4 gap-2 md:gap-4
    w-full md:w-14 min-h-14 h-auto md:h-full border-t md:border-t-0 md:border-r
    overflow-x-auto md:overflow-x-visible"
  aria-label="Activity Bar"
  data-testid="activity-bar"
>
  <!-- Main Views -->
  {#each views as view}
    {@const active = isViewActive(view, page.url.pathname)}
    <a
      href={view.href}
      class="{shellClass(view)} {stateClass(active)}"
      aria-label={view.label}
      title={view.title ?? view.label}
      data-testid={`activity-bar-${view.id}`}
    >
      <span
        class="{view.icon} w-5 h-5 transition-transform duration-200 group-hover:scale-110"
        aria-hidden="true"
      ></span>

      {#if active}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-chrome-accent rounded-t-full md:rounded-r-full md:rounded-t-none"
        ></div>
      {/if}
    </a>
  {/each}

  <!-- Separator -->
  <div
    class="w-px h-6 bg-chrome-border md:w-8 md:h-px my-1 md:my-2 opacity-50 shrink-0"
  ></div>

  <!-- Sidecar Tools -->
  {#each tools as tool}
    {@const active = isToolActive(tool)}
    <button
      onclick={tool.action}
      class="{shellClass(tool)} {stateClass(active)}"
      aria-label={tool.label}
      title={tool.title ?? tool.label}
      data-testid={`activity-bar-${tool.id}`}
    >
      <span
        class="{tool.icon} w-5 h-5 transition-transform duration-200 group-hover:scale-110"
        aria-hidden="true"
      ></span>

      {#if tool.id === "quicknote" && quickNoteStore.count > 0}
        <span
          class="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-chrome-bg bg-chrome-accent shadow-md"
        >
          {quickNoteStore.count}
        </span>
      {/if}

      {#if active}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-chrome-accent rounded-t-full md:rounded-r-full md:rounded-t-none"
        ></div>
      {/if}
    </button>
  {/each}
</nav>
