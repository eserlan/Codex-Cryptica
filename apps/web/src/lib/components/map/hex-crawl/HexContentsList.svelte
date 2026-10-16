<script lang="ts">
  import { pinsInHex, type HexCoord } from "hex-crawl-engine";

  interface ContentsPin {
    id: string;
    entityId?: string;
    hexCoordinates?: { q: number; r: number };
  }
  interface ContentsEntity {
    id: string;
    title: string;
    type: string;
  }

  let {
    pins,
    hex,
    entities,
    onOpen,
    onAttach,
    onCreate,
  }: {
    pins: readonly ContentsPin[];
    hex: HexCoord;
    entities: readonly ContentsEntity[];
    onOpen: (entityId: string) => void;
    onAttach: (entityId: string) => void;
    onCreate: (type: string, title: string) => void;
  } = $props();

  const CREATE_TYPES = [
    { id: "location", label: "Location" },
    { id: "npc", label: "Character" },
    { id: "faction", label: "Faction" },
    { id: "event", label: "Event" },
    { id: "note", label: "Note" },
  ];

  const byId = $derived(new Map(entities.map((e) => [e.id, e])));
  const inHex = $derived(
    pinsInHex(pins, hex, (id) => byId.has(id)).flatMap((pin) => {
      const entity = pin.entityId ? byId.get(pin.entityId) : undefined;
      return entity ? [entity] : [];
    }),
  );

  let query = $state("");
  let createType = $state("location");
  let newTitle = $state("");

  const matches = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return entities
      .filter((e) => e.title.toLowerCase().includes(needle))
      .slice(0, 8);
  });

  function create() {
    const title = newTitle.trim();
    if (!title) return;
    onCreate(createType, title);
    newTitle = "";
  }
</script>

<div class="space-y-3">
  <h4 class="text-micro uppercase tracking-widest font-bold text-theme-muted">
    In this hex
  </h4>

  {#if inHex.length > 0}
    <ul class="space-y-1">
      {#each inHex as entity (entity.id)}
        <li>
          <button
            type="button"
            aria-label="Open {entity.title}"
            onclick={() => onOpen(entity.id)}
            class="flex w-full items-center justify-between gap-2 rounded-md border border-theme-border px-2 py-1 text-left text-sm text-theme-text hover:border-theme-primary/40"
          >
            <span class="truncate">{entity.title}</span>
            <span class="text-micro text-theme-muted">{entity.type}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-micro text-theme-muted">
      Nothing is pinned to this hex yet.
    </p>
  {/if}

  <div class="space-y-1">
    <label class="block space-y-1">
      <span
        class="text-micro uppercase tracking-widest font-bold text-theme-muted"
      >
        Attach entity
      </span>
      <input
        type="search"
        bind:value={query}
        aria-label="Search entities"
        placeholder="Search by title"
        class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-primary"
      />
    </label>
    {#each matches as entity (entity.id)}
      <button
        type="button"
        aria-label="Attach {entity.title}"
        onclick={() => {
          onAttach(entity.id);
          query = "";
        }}
        class="block w-full truncate rounded-md px-2 py-1 text-left text-sm text-theme-text hover:bg-theme-primary/10"
      >
        {entity.title}
      </button>
    {/each}
  </div>

  <div class="space-y-1">
    <span
      class="text-micro uppercase tracking-widest font-bold text-theme-muted"
    >
      Create entity here
    </span>
    <div class="flex flex-wrap items-stretch gap-2">
      <select
        aria-label="Entity type"
        bind:value={createType}
        class="rounded-lg border border-theme-border bg-theme-bg px-2 py-1.5 text-sm text-theme-text"
      >
        {#each CREATE_TYPES as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
      <input
        type="text"
        bind:value={newTitle}
        aria-label="New entity title"
        placeholder="Title"
        class="min-w-0 flex-1 rounded-lg border border-theme-border bg-theme-bg px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-primary"
      />
    </div>
    <button
      type="button"
      onclick={create}
      class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40"
    >
      Create entity here
    </button>
  </div>
</div>
