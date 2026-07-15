<script lang="ts">
  import type { FamilyConnectionType } from "@codex/family-engine";
  import { buildFamilyTree } from "@codex/family-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";

  let { focusId, relation } = $props<{
    focusId: string;
    relation: "parent" | "child" | "partner" | "sibling";
  }>();

  // Link type from the focus character's perspective:
  // add a parent  -> focus child_of   target
  // add a child   -> focus parent_of  target
  // add a partner -> focus spouse_of  target
  // add a sibling -> focus sibling_of target
  const RELATION_TYPE: Record<typeof relation, FamilyConnectionType> = {
    parent: "child_of",
    child: "parent_of",
    partner: "spouse_of",
    sibling: "sibling_of",
  };
  const label = $derived(
    relation === "parent"
      ? "Add parent"
      : relation === "child"
        ? "Add child"
        : relation === "partner"
          ? "Add partner"
          : "Add sibling",
  );

  let open = $state(false);
  let targetName = $state("");
  let targetId = $state<string | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);
  // Only siblings carry a brother/sister term (blank = generic "Sibling").
  let siblingTerm = $state<"" | "Brother" | "Sister">("");

  // After adding a parent, offer to also link that parent's existing spouse
  // (if any) as a parent — but only as a suggestion the user confirms.
  // Marriage doesn't imply co-parentage (remarriage, step-parents, unrelated
  // partners are all common), so we never link it automatically.
  let spouseSuggestions = $state<{ id: string; name: string }[]>([]);
  let addedParentName = $state("");

  function reset() {
    open = false;
    targetName = "";
    targetId = null;
    error = null;
    busy = false;
    siblingTerm = "";
    spouseSuggestions = [];
    addedParentName = "";
  }

  function findUnlinkedSpousesOfParent(
    parentId: string,
  ): { id: string; name: string }[] {
    const focusTree = buildFamilyTree(focusId, vault.entities);
    const existingParentIds = new Set(focusTree.parents.map((p) => p.entityId));
    const parentTree = buildFamilyTree(parentId, vault.entities);
    return parentTree.partners
      .filter(
        (p) => p.entityId !== focusId && !existingParentIds.has(p.entityId),
      )
      .map((p) => ({ id: p.entityId, name: p.name }));
  }

  async function link(id: string) {
    const term =
      relation === "sibling" && siblingTerm ? siblingTerm : undefined;
    const res = await vault.addFamilyLink(
      focusId,
      id,
      RELATION_TYPE[relation],
      term,
    );
    if (!res.ok) {
      error = res.error ?? "Could not add family link.";
      return;
    }
    if (relation === "parent") {
      const suggestions = findUnlinkedSpousesOfParent(id);
      if (suggestions.length > 0) {
        addedParentName = vault.entities[id]?.title ?? targetName;
        spouseSuggestions = suggestions;
        targetName = "";
        targetId = null;
        error = null;
        return;
      }
    }
    reset();
  }

  async function connectExisting() {
    if (!targetId) {
      error = "Pick a character to connect.";
      return;
    }
    busy = true;
    error = null;
    try {
      await link(targetId);
    } catch {
      error = "Could not add family link.";
    } finally {
      busy = false;
    }
  }

  async function createNew() {
    const title = targetName.trim();
    if (!title) {
      error = "Enter a name for the new character.";
      return;
    }
    busy = true;
    error = null;
    try {
      const newId = await vault.createEntity("character", title);
      await link(newId);
    } catch {
      error = "Could not create character.";
    } finally {
      busy = false;
    }
  }

  async function addSuggestedSpouse(spouseId: string) {
    busy = true;
    error = null;
    try {
      const res = await vault.addFamilyLink(focusId, spouseId, "child_of");
      if (res.ok) {
        spouseSuggestions = spouseSuggestions.filter((s) => s.id !== spouseId);
        if (spouseSuggestions.length === 0) reset();
      } else {
        error = res.error ?? "Could not add family link.";
      }
    } catch {
      error = "Could not add family link.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="inline-flex flex-col items-start gap-1">
  {#if !open}
    <button
      type="button"
      data-testid="add-{relation}"
      class="flex items-center gap-1 rounded border border-dashed border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      onclick={() => (open = true)}
    >
      <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
      {label}
    </button>
  {:else if spouseSuggestions.length > 0}
    <div
      data-testid="spouse-suggestions"
      class="flex w-56 flex-col gap-2 rounded border border-theme-border bg-theme-surface p-2"
    >
      <p class="text-[10px] text-theme-muted">
        {addedParentName} is married to
        {spouseSuggestions.map((s) => s.name).join(", ")} — add as a parent too?
      </p>
      {#each spouseSuggestions as spouse (spouse.id)}
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-xs text-theme-text">{spouse.name}</span>
          <button
            type="button"
            data-testid="add-suggestion-{spouse.id}"
            disabled={busy}
            class="shrink-0 rounded bg-theme-primary/20 px-2 py-1 text-[10px] font-bold text-theme-primary disabled:opacity-50"
            onclick={() => addSuggestedSpouse(spouse.id)}
          >
            Add
          </button>
        </div>
      {/each}
      {#if error}
        <p data-testid="family-slot-error" class="text-[10px] text-red-400">
          {error}
        </p>
      {/if}
      <button
        type="button"
        data-testid="dismiss-spouse-suggestions"
        class="self-start rounded px-2 py-1 text-[10px] text-theme-muted hover:text-theme-text"
        onclick={reset}
      >
        No thanks
      </button>
    </div>
  {:else}
    <div
      class="flex w-56 flex-col gap-2 rounded border border-theme-border bg-theme-surface p-2"
    >
      <Autocomplete
        bind:value={targetName}
        bind:selectedId={targetId}
        placeholder="Search characters…"
        ariaLabel="Search character to add as {relation}"
      />
      {#if relation === "sibling"}
        <select
          bind:value={siblingTerm}
          data-testid="sibling-term"
          aria-label="Sibling relationship"
          class="rounded border border-theme-border bg-theme-bg px-2 py-1 text-[10px] text-theme-text focus:border-theme-primary focus:outline-none"
        >
          <option value="">Sibling</option>
          <option value="Brother">Brother</option>
          <option value="Sister">Sister</option>
        </select>
      {/if}
      {#if error}
        <p data-testid="family-slot-error" class="text-[10px] text-red-400">
          {error}
        </p>
      {/if}
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="connect-existing"
          disabled={busy}
          class="rounded bg-theme-primary/20 px-2 py-1 text-[10px] font-bold text-theme-primary disabled:opacity-50"
          onclick={connectExisting}
        >
          Connect
        </button>
        <button
          type="button"
          data-testid="create-new"
          disabled={busy}
          class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold text-theme-text disabled:opacity-50"
          onclick={createNew}
        >
          Create new
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[10px] text-theme-muted hover:text-theme-text"
          onclick={reset}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>
