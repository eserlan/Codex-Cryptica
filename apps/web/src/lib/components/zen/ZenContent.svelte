<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import { isEntityVisible, type Entity } from "schema";

  let {
    entity,
    editState = $bindable(),
    scrollContainer = $bindable(),
  } = $props<{
    entity: Entity | null;
    editState: any;
    scrollContainer: HTMLDivElement | undefined;
  }>();

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!entity) return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  const getTemporalLabel = (type: string, field: "start" | "end") => {
    const t = (type || "").toLowerCase();
    if (field === "start") {
      if (
        ["npc", "creature", "character", "monster"].some((x) => t.includes(x))
      )
        return "Born";
      if (
        ["faction", "location", "city", "organization", "guild"].some((x) =>
          t.includes(x),
        )
      )
        return "Founded";
      if (["item", "artifact", "object", "weapon"].some((x) => t.includes(x)))
        return "Created";
      return "Started";
    }
    if (field === "end") {
      if (
        ["npc", "creature", "character", "monster"].some((x) => t.includes(x))
      )
        return "Died";
      if (
        ["faction", "location", "city", "organization", "guild"].some((x) =>
          t.includes(x),
        )
      )
        return "Dissolved";
      if (["item", "artifact", "object", "weapon"].some((x) => t.includes(x)))
        return "Destroyed";
      return "Ended";
    }
    return "Date";
  };

  const formatDate = (date: any) => {
    if (!date || date.year === undefined) return "";
    if (date.label) return date.label;
    let str = `${date.year}`;
    if (date.month !== undefined) str += `/${date.month}`;
    if (date.day !== undefined) str += `/${date.day}`;
    return str;
  };
</script>

<div
  bind:this={scrollContainer}
  class="flex-1 p-6 md:p-8 md:overflow-y-auto custom-scrollbar bg-theme-bg"
  style="background-image: var(--bg-texture-overlay)"
  data-testid="zen-content"
>
  <div class="max-w-3xl mx-auto space-y-12">
    <!-- Temporal Data -->
    {#if editState.isEditing}
      <div class="bg-theme-surface p-4 rounded border border-theme-border">
        <h3
          class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest mb-4"
        >
          Timeline Configuration
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TemporalEditor
            bind:value={editState.startDate}
            label={getTemporalLabel(
              editState?.type ?? entity?.type ?? "",
              "start",
            )}
          />
          <TemporalEditor
            bind:value={editState.endDate}
            label={getTemporalLabel(
              editState?.type ?? entity?.type ?? "",
              "end",
            )}
          />
        </div>
      </div>
    {:else if entity?.start_date || entity?.end_date}
      <div
        class="flex flex-wrap gap-8 p-4 bg-theme-primary/5 border border-theme-border rounded"
      >
        {#if entity?.start_date}
          <div class="flex flex-col">
            <span
              class="text-[10px] text-theme-secondary font-bold tracking-widest mb-1 uppercase font-header"
            >
              {getTemporalLabel(entity?.type || "", "start")}
            </span>
            <span class="text-lg font-header text-theme-primary"
              >{formatDate(entity?.start_date)}</span
            >
          </div>
        {/if}
        {#if entity?.end_date}
          <div class="flex flex-col">
            <span
              class="text-[10px] text-theme-secondary font-bold tracking-widest mb-1 uppercase font-header"
            >
              {getTemporalLabel(entity?.type || "", "end")}
            </span>
            <span class="text-lg font-header text-theme-primary"
              >{formatDate(entity?.end_date)}</span
            >
          </div>
        {/if}
      </div>
    {/if}

    <!-- Chronicle -->
    {#if editState.isEditing || isVisible}
      <div>
        <h2
          class="text-xl font-header font-bold text-theme-primary mb-4 flex items-center gap-2 border-b border-theme-border pb-2"
        >
          <span class="icon-[lucide--book-open] w-5 h-5"></span>
          {themeStore.jargon.chronicle_header}
        </h2>
        {#if editState.isEditing}
          <MarkdownEditor
            content={editState.content}
            editable={true}
            onUpdate={(md) => (editState.content = md)}
          />
        {:else if isVisible}
          <div class="prose-container">
            <MarkdownEditor
              content={entity?.content || "No records found."}
              editable={false}
            />
          </div>
        {:else}
          <div
            class="text-theme-muted italic text-sm flex items-center gap-2 py-4"
          >
            <span class="icon-[lucide--lock] w-4 h-4"></span>
            Chronicle is hidden in shared mode
          </div>
        {/if}
      </div>
    {/if}

    {#if !vault.isGuest && (editState.isEditing || entity?.lore)}
      <div>
        <h2
          class="text-xl font-header font-bold text-theme-primary mb-4 flex items-center gap-2 border-b border-theme-border pb-2"
        >
          <span class="icon-[lucide--scroll-text] w-5 h-5"></span>
          {themeStore.jargon.lore_header}
        </h2>
        {#if editState.isEditing}
          <MarkdownEditor
            content={editState.lore}
            editable={true}
            onUpdate={(md) => (editState.lore = md)}
          />
        {:else}
          <div class="prose-container">
            <MarkdownEditor
              content={entity?.lore || "No detailed lore available."}
              editable={false}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
