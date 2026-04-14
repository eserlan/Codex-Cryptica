<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { fade, scale } from "svelte/transition";

  let query = $state("");
  let selectedEntityId = $state<string | null>(null);
  let name = $state("");

  const coords = $derived(mapSession.pendingTokenCoords);

  const entities = $derived.by(() => {
    const all = vault.allEntities;
    const allowed = all.filter((entity) =>
      ["character", "creature"].includes(entity.type),
    );
    if (!query) return allowed.slice(0, 12);

    const term = query.toLowerCase();
    return allowed
      .filter((entity) => entity.title.toLowerCase().includes(term))
      .slice(0, 12);
  });

  const selectedEntity = $derived.by(() => {
    if (!selectedEntityId) return null;
    return vault.entities[selectedEntityId] || null;
  });

  function close() {
    mapSession.pendingTokenCoords = null;
    query = "";
    selectedEntityId = null;
    name = "";
  }

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.currentTarget === event.target) {
      close();
    }
  };

  const handleBackdropKeydown = (event: KeyboardEvent) => {
    if (
      event.currentTarget === event.target &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      close();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!coords) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  function createToken() {
    if (!coords) return;
    const entity = selectedEntity;
    const displayName = (name || entity?.title || "Token").trim();

    mapSession.addToken({
      name: displayName,
      x: coords.x,
      y: coords.y,
      entityId: selectedEntityId,
      imageUrl: entity?.image ?? null,
      color: entity ? "#8b5cf6" : undefined,
    });
    close();
  }
</script>

{#if coords}
  <div
    data-testid="token-add-backdrop"
    class="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    transition:fade
    role="button"
    tabindex="0"
    aria-label="Close token dialog"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div
      class="w-full max-w-lg rounded-xl border border-theme-border bg-theme-surface shadow-2xl overflow-hidden"
      transition:scale
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-add-title"
    >
      <div
        class="p-4 border-b border-theme-border flex items-center justify-between"
      >
        <div>
          <h2
            id="token-add-title"
            class="text-sm font-bold uppercase tracking-widest font-header text-theme-text"
          >
            Add Token
          </h2>
          <p class="text-[10px] text-theme-muted mt-1">
            Place a combat marker at the clicked map position.
          </p>
        </div>
        <button
          class="text-theme-muted hover:text-theme-text"
          onclick={close}
          aria-label="Close token dialog"
        >
          <span class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div class="grid gap-3 md:grid-cols-[1fr_1fr]">
          <label class="space-y-2">
            <span
              class="text-[10px] uppercase font-bold tracking-widest text-theme-muted"
              >Token Name</span
            >
            <input
              class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
              bind:value={name}
              placeholder="Goblin Captain"
            />
          </label>

          <label class="space-y-2">
            <span
              class="text-[10px] uppercase font-bold tracking-widest text-theme-muted"
              >Search Entity</span
            >
            <input
              class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
              bind:value={query}
              placeholder="Search characters and creatures..."
            />
          </label>
        </div>

        <div
          class="max-h-56 overflow-y-auto custom-scrollbar rounded-lg border border-theme-border bg-theme-bg/50 p-2"
        >
          {#each entities as entity (entity.id)}
            <button
              class="w-full text-left px-3 py-2 rounded-lg border transition-colors {selectedEntityId ===
              entity.id
                ? 'border-theme-primary bg-theme-primary/10'
                : 'border-transparent hover:border-theme-border hover:bg-theme-surface/50'}"
              onclick={() => {
                selectedEntityId = entity.id;
                if (!name) name = entity.title;
              }}
            >
              <div class="text-sm font-bold text-theme-text">
                {entity.title}
              </div>
              <div
                class="text-[10px] uppercase tracking-widest text-theme-muted"
              >
                {entity.type}
              </div>
            </button>
          {:else}
            <div class="px-3 py-6 text-center text-xs text-theme-muted italic">
              No matching entities.
            </div>
          {/each}
        </div>
      </div>

      <div
        class="p-4 border-t border-theme-border flex items-center justify-between gap-3"
      >
        <div class="text-[10px] text-theme-muted">
          {#if coords}
            Position: {Math.round(coords.x)}, {Math.round(coords.y)}
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-theme-border text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
            onclick={close}
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest"
            onclick={createToken}
          >
            Create Token
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={handleKeydown} />
