<script lang="ts">
  import type { FamilyMember } from "@codex/family-engine";

  let {
    member,
    isFocus = false,
    onSelect,
    onOpen,
  } = $props<{
    member: FamilyMember;
    isFocus?: boolean;
    onSelect?: (id: string) => void;
    onOpen?: (id: string) => void;
  }>();

  const selectable = $derived(!!onSelect && !isFocus);
</script>

{#snippet body()}
  {#if member.portraitUrl}
    <img
      src={member.portraitUrl}
      alt=""
      class="h-9 w-9 shrink-0 rounded-full object-cover"
    />
  {:else}
    <span
      class="icon-[lucide--user] h-9 w-9 shrink-0 rounded-full bg-theme-bg p-1.5 text-theme-muted"
      aria-hidden="true"
    ></span>
  {/if}
  <div class="min-w-0">
    <div class="truncate text-xs font-bold text-theme-text" title={member.name}>
      {member.name}
    </div>
    {#if member.role}
      <div class="truncate text-[10px] text-theme-muted">{member.role}</div>
    {/if}
    <div class="flex items-center gap-1 text-[10px] text-theme-muted">
      {#if member.lifespan}
        <span>{member.lifespan}</span>
      {/if}
      {#if member.deceased}
        <span
          class="rounded-sm bg-theme-bg px-1 text-[9px] uppercase tracking-wide text-theme-muted"
          >Deceased</span
        >
      {/if}
    </div>
  </div>
{/snippet}

<div
  data-testid="family-member-card"
  data-relation={member.relation}
  class="relative flex w-40 items-center rounded border shadow-sm {isFocus
    ? 'border-theme-primary bg-theme-primary/10'
    : 'border-theme-border bg-theme-surface'}"
>
  {#if selectable}
    <button
      type="button"
      data-testid="family-card-select"
      title="Centre the tree on {member.name}"
      class="flex w-full items-center gap-2 px-2 py-1.5 text-left"
      onclick={() => onSelect!(member.entityId)}
    >
      {@render body()}
    </button>
  {:else}
    <div class="flex w-full items-center gap-2 px-2 py-1.5">
      {@render body()}
    </div>
  {/if}

  {#if onOpen}
    <button
      type="button"
      data-testid="family-card-open"
      aria-label="Open {member.name}"
      title="Open {member.name}"
      class="absolute right-1 top-1 rounded p-0.5 text-theme-muted hover:text-theme-primary"
      onclick={() => onOpen!(member.entityId)}
    >
      <span class="icon-[lucide--external-link] h-3 w-3" aria-hidden="true"
      ></span>
    </button>
  {/if}
</div>
