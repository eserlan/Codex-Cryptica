<script lang="ts">
  import { onDestroy } from "svelte";
  import type { RecentActivity } from "@codex/vault-engine";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { renderMarkdown } from "$lib/utils/markdown";

  let { activity } = $props<{ activity: RecentActivity }>();
  let imageUrl = $state("");
  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  const relativeTime = $derived.by(() => {
    const diffMs = Date.now() - activity.lastModified;
    const diffMinutes = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    const formatter = new Intl.RelativeTimeFormat(undefined, {
      numeric: "auto",
    });

    if (Math.abs(diffMinutes) < 60)
      return formatter.format(-diffMinutes, "minute");
    if (Math.abs(diffHours) < 24) return formatter.format(-diffHours, "hour");
    return formatter.format(-diffDays, "day");
  });

  const excerpt = $derived(activity.excerpt || "No excerpt available yet.");
  const renderedExcerpt = $derived(
    excerpt ? renderMarkdown(excerpt, { inline: true }) : "",
  );
  const category = $derived(
    activity.type ? categories.getCategory(activity.type) : undefined,
  );

  const openInGraph = () => {
    uiStore.dismissedWorldPage = true;
    vault.selectedEntityId = activity.id;
  };

  const openInZenMode = () => {
    uiStore.dismissedWorldPage = true;
    vault.selectedEntityId = activity.id;
    uiStore.openZenMode(activity.id);
  };

  const handleCardClick = (event: MouseEvent) => {
    if (event.detail > 1) return;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      openInGraph();
      clickTimer = null;
    }, 320);
  };

  const handleCardDoubleClick = () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
    openInZenMode();
  };

  onDestroy(() => {
    if (clickTimer) clearTimeout(clickTimer);
  });

  $effect(() => {
    const imagePath = activity.thumbnail || activity.image || "";
    let stale = false;

    if (!imagePath) {
      imageUrl = "";
      return;
    }

    void vault.resolveImageUrl(imagePath).then((url) => {
      if (!stale) imageUrl = url;
    });

    return () => {
      stale = true;
    };
  });
</script>

<article
  class="group relative overflow-hidden rounded-2xl border border-theme-border/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%),linear-gradient(180deg,color-mix(in_srgb,var(--color-theme-surface)_82%,black),color-mix(in_srgb,var(--color-theme-bg)_92%,black))] text-theme-text shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-theme-primary/55 hover:shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
  data-testid="entity-card"
>
  {#if imageUrl}
    <div
      class="absolute inset-0 bg-cover bg-center scale-105 opacity-100"
      style={`background-image: url("${imageUrl}")`}
    ></div>
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-theme-primary)_8%,transparent),rgba(2,6,23,0.14),rgba(2,6,23,0.68))]"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_46%)]"
    ></div>
    <div class="absolute inset-0 border border-theme-border/40"></div>
  {:else}
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-theme-primary)_18%,transparent),transparent_52%),linear-gradient(180deg,color-mix(in_srgb,var(--color-theme-surface)_78%,black),color-mix(in_srgb,var(--color-theme-bg)_94%,black))]"
      data-testid="entity-card-placeholder"
    ></div>
    <div
      class="absolute inset-0 bg-[linear-gradient(transparent_0,color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)_1px,transparent_1px),linear-gradient(90deg,transparent_0,color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40"
    ></div>
    <div
      class="absolute inset-x-0 top-[12%] h-[58%] flex items-center justify-center"
    >
      <div
        class="flex h-28 w-28 items-center justify-center rounded-full border border-theme-primary/30 bg-[color-mix(in_srgb,var(--color-theme-primary)_14%,transparent)] text-theme-primary/75 shadow-[0_0_60px_color-mix(in_srgb,var(--color-theme-primary)_18%,transparent)] backdrop-blur-sm"
      >
        <span
          class="{getIconClass(category?.icon)} h-14 w-14"
          data-testid="entity-card-placeholder-icon"
        ></span>
      </div>
    </div>
  {/if}

  <button
    type="button"
    class={`absolute inset-0 z-30 h-full w-full cursor-pointer text-left focus:outline-none ${imageUrl ? "" : ""}`}
    aria-label={`Open ${activity.title} in the graph`}
    onclick={handleCardClick}
    ondblclick={handleCardDoubleClick}
  >
    <span class="sr-only">Open {activity.title} in the graph</span>
  </button>

  <div class="relative z-20 flex min-h-[17rem] h-full flex-col justify-between">
    <div class="p-2.5 md:p-3">
      <header
        class="flex items-center justify-between gap-3 rounded-2xl border border-theme-primary/15 bg-[color-mix(in_srgb,var(--color-theme-bg)_74%,transparent)] backdrop-blur-md px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <div
          class="min-w-0 flex items-center gap-1.5 text-theme-primary/90 flex-1"
        >
          <span
            class="{getIconClass(
              category?.icon,
            )} h-3.5 w-3.5 shrink-0 drop-shadow-[0_0_0.35px_currentColor]"
            data-testid="entity-card-category-icon"
          ></span>
          <h3
            class="min-w-0 font-header text-sm md:text-base uppercase tracking-[0.14em] text-theme-text truncate"
          >
            {activity.title}
          </h3>
        </div>
        <span class="shrink-0 text-[10px] text-theme-muted whitespace-nowrap">
          {relativeTime}
        </span>
      </header>
    </div>

    <div class="p-2.5 md:p-3">
      <div
        class="rounded-xl border border-theme-border/50 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-theme-bg)_78%,transparent),color-mix(in_srgb,var(--color-theme-surface)_76%,transparent))] backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      >
        <p
          class="text-sm leading-relaxed min-h-[4.5rem] text-theme-text/95 line-clamp-4"
        >
          {@html renderedExcerpt}
        </p>

        {#if activity.tags.length > 0}
          <div class="mt-4 flex flex-wrap gap-2">
            {#each activity.tags as tag (tag)}
              <span
                class="rounded-full border border-theme-primary/20 bg-[color-mix(in_srgb,var(--color-theme-primary)_10%,var(--color-theme-bg))] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-theme-secondary backdrop-blur-sm"
              >
                {tag}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</article>
