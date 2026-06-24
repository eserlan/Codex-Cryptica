<script lang="ts">
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { entitySnippet } from "./entityTableSnippet";
  import { getEntityCreatedAt, getEntityModifiedAt } from "./entityTableSort";

  let {
    entity,
    vaultId,
    selected = false,
    onToggleSelect,
  }: {
    entity: Entity;
    vaultId: string;
    selected?: boolean;
    onToggleSelect?: (id: string) => void;
  } = $props();

  const cat = $derived(categories.getCategory(entity.type));
  const href = $derived(`${base}/vault/${vaultId}/entity/${entity.id}`);
  const snippet = $derived(entitySnippet(entity));
  const chips = $derived(
    (entity.labels?.length ? entity.labels : (entity.tags ?? [])).slice(0, 3),
  );
  const extraChips = $derived(
    Math.max(
      0,
      (entity.labels?.length
        ? entity.labels.length
        : (entity.tags?.length ?? 0)) - chips.length,
    ),
  );
  const createdAt = $derived(getEntityCreatedAt(entity));
  const modifiedAt = $derived(getEntityModifiedAt(entity));

  function formatDate(ts: number | undefined): string {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Whole-row navigation as a convenience; the title cell hosts the real link
  // so keyboard users get a focusable target.
  function handleRowClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("a")) return; // let the title link handle it
    if (target.closest("[data-row-select]")) return; // let the checkbox toggle
    void goto(href);
  }
</script>

<tr
  class="group cursor-pointer border-b border-theme-border/60 transition-colors hover:bg-theme-primary/5 {selected
    ? 'bg-theme-primary/10'
    : ''}"
  data-testid="entity-table-row"
  data-selected={selected}
  onclick={handleRowClick}
>
  <!-- Select -->
  <td class="px-3 py-2 align-top" data-row-select>
    <input
      type="checkbox"
      checked={selected}
      onchange={() => onToggleSelect?.(entity.id)}
      aria-label="Select {entity.title}"
      data-testid="entity-table-row-select"
      class="h-4 w-4 cursor-pointer accent-theme-primary"
    />
  </td>

  <!-- Name -->
  <td class="px-3 py-2 align-top">
    <a
      {href}
      class="font-header text-sm font-semibold text-theme-text hover:text-theme-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 rounded"
      data-testid="entity-table-row-link"
    >
      {entity.title}
    </a>
  </td>

  <!-- Type -->
  <td class="px-3 py-2 align-top whitespace-nowrap">
    {#if cat}
      <span
        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
        style="border-color: {cat.color}55; color: {cat.color};"
      >
        <span class="{getIconClass(cat.icon)} h-3.5 w-3.5" aria-hidden="true"
        ></span>
        {cat.label}
      </span>
    {:else}
      <span class="text-xs text-theme-muted">{entity.type}</span>
    {/if}
  </td>

  <!-- Summary snippet -->
  <td class="px-3 py-2 align-top">
    {#if snippet}
      <span class="line-clamp-2 text-xs text-theme-muted/90">{snippet}</span>
    {:else}
      <span class="text-theme-muted/50" aria-label="No summary">—</span>
    {/if}
  </td>

  <!-- Tags / labels -->
  <td class="px-3 py-2 align-top">
    {#if chips.length}
      <span class="flex flex-wrap gap-1">
        {#each chips as chip (chip)}
          <span
            class="rounded bg-theme-surface px-1.5 py-0.5 text-[10px] text-theme-muted"
            >{chip}</span
          >
        {/each}
        {#if extraChips > 0}
          <span class="text-[10px] text-theme-muted/60">+{extraChips}</span>
        {/if}
      </span>
    {:else}
      <span class="text-theme-muted/50" aria-label="No tags">—</span>
    {/if}
  </td>

  <!-- Created -->
  <td class="px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90">
    {#if createdAt}
      {formatDate(createdAt)}
    {:else}
      <span class="text-theme-muted/50" aria-label="No created date">—</span>
    {/if}
  </td>

  <!-- Modified -->
  <td class="px-3 py-2 align-top whitespace-nowrap text-xs text-theme-muted/90">
    {#if modifiedAt}
      {formatDate(modifiedAt)}
    {:else}
      <span class="text-theme-muted/50" aria-label="No modified date">—</span>
    {/if}
  </td>
</tr>
