<script lang="ts">
  import type {
    CampaignGeneratorDefinition,
    GeneratorId,
  } from "generator-engine";

  let {
    gen,
    entityTypeLabel,
    selectedId,
    isFavorite,
    onselect,
    ontogglefavorite,
    idPrefix = "generator",
    disabled = false,
  }: {
    gen: CampaignGeneratorDefinition;
    entityTypeLabel: string;
    selectedId: GeneratorId;
    isFavorite: boolean;
    onselect: (id: GeneratorId) => void;
    ontogglefavorite: (id: GeneratorId) => void;
    idPrefix?: string;
    disabled?: boolean;
  } = $props();
</script>

<div
  class={[
    "group relative flex items-start rounded-lg border transition-colors",
    selectedId === gen.id
      ? "border-chrome-accent/60 bg-chrome-accent/10"
      : "border-chrome-border bg-chrome-bg/30 hover:border-chrome-accent/35 hover:bg-chrome-bg/60",
  ]}
>
  <label class="flex flex-1 cursor-pointer items-start gap-3 px-3 py-2.5">
    <input
      type="radio"
      name="generator"
      value={gen.id}
      checked={selectedId === gen.id}
      onchange={() => onselect(gen.id)}
      {disabled}
      aria-labelledby="{idPrefix}-label-{gen.id}"
      aria-describedby={selectedId === gen.id
        ? `${idPrefix}-description-${gen.id}`
        : undefined}
      class="mt-1 accent-chrome-accent"
    />
    <span class="min-w-0 flex-1 pr-6">
      <span
        id="{idPrefix}-label-{gen.id}"
        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
      >
        <span class="text-sm font-semibold text-chrome-text">
          {gen.label}
        </span>
        <span class="text-micro uppercase tracking-wider text-chrome-muted">
          Creates {entityTypeLabel}
        </span>
      </span>
      {#if selectedId === gen.id}
        <span
          id="{idPrefix}-description-{gen.id}"
          class="mt-1 block text-xs leading-relaxed text-chrome-muted"
        >
          {gen.description}
        </span>
      {/if}
    </span>
  </label>
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation();
      ontogglefavorite(gen.id);
    }}
    class="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded text-chrome-muted transition hover:text-amber-400 focus:outline-none focus:ring-1 focus:ring-chrome-accent"
    aria-label={isFavorite
      ? `Remove ${gen.label} from favourites`
      : `Add ${gen.label} to favourites`}
    aria-pressed={isFavorite}
    {disabled}
    title={isFavorite ? "Remove from favourites" : "Add to favourites"}
  >
    <span
      aria-hidden="true"
      class={[
        "h-4 w-4 transition-transform group-hover:scale-110",
        isFavorite
          ? "icon-[lucide--star] fill-amber-400 text-amber-400"
          : "icon-[lucide--star] text-chrome-muted hover:text-amber-400",
      ]}
    ></span>
  </button>
</div>
