<script lang="ts">
  import type { FamilyConnectionType } from "@codex/family-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";

  let { focusId, relation } = $props<{
    focusId: string;
    relation: "parent" | "child" | "partner";
  }>();

  // Link type from the focus character's perspective:
  // add a parent  -> focus child_of  target
  // add a child   -> focus parent_of target
  // add a partner -> focus spouse_of target
  const RELATION_TYPE: Record<typeof relation, FamilyConnectionType> = {
    parent: "child_of",
    child: "parent_of",
    partner: "spouse_of",
  };
  const label = $derived(
    relation === "parent"
      ? "Add parent"
      : relation === "child"
        ? "Add child"
        : "Add partner",
  );

  let open = $state(false);
  let targetName = $state("");
  let targetId = $state<string | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  function reset() {
    open = false;
    targetName = "";
    targetId = null;
    error = null;
    busy = false;
  }

  async function link(id: string) {
    busy = true;
    error = null;
    const res = await vault.addFamilyLink(focusId, id, RELATION_TYPE[relation]);
    busy = false;
    if (res.ok) {
      reset();
    } else {
      error = res.error ?? "Could not add family link.";
    }
  }

  async function connectExisting() {
    if (!targetId) {
      error = "Pick a character to connect.";
      return;
    }
    await link(targetId);
  }

  async function createNew() {
    const title = targetName.trim();
    if (!title) {
      error = "Enter a name for the new character.";
      return;
    }
    busy = true;
    error = null;
    const newId = await vault.createEntity("character", title);
    await link(newId);
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
