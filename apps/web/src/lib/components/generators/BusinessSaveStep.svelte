<script lang="ts">
  import type {
    BusinessRelationshipLabel,
    BusinessSavePlan,
  } from "generator-engine";
  import type { BusinessSaveChoices } from "$lib/services/generators/business-vault-save";

  let {
    plan,
    busy = false,
    onSave,
    onCancel,
  }: {
    plan: BusinessSavePlan;
    busy?: boolean;
    onSave: (choices: BusinessSaveChoices) => void;
    onCancel: () => void;
  } = $props();

  // Initial state is taken from the plan once; the user's edits live here.
  // svelte-ignore state_referenced_locally
  let personTicks = $state<Record<string, boolean>>(
    Object.fromEntries(plan.people.map((p) => [p.personId, p.ticked])),
  );
  // svelte-ignore state_referenced_locally
  let partyTicks = $state<Record<string, boolean>>(
    Object.fromEntries(
      plan.parties.map((p) => [p.relationshipId, p.choice.ticked]),
    ),
  );
  // svelte-ignore state_referenced_locally
  let renames = $state<Record<string, string>>({});
  // svelte-ignore state_referenced_locally
  let sourceTicked = $state(plan.source?.ticked ?? false);
  // svelte-ignore state_referenced_locally
  let sourceLabel = $state<BusinessRelationshipLabel>(
    plan.source?.label ?? "located in",
  );

  const inputClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text";
  const labelClass =
    "text-meta font-bold uppercase tracking-wider text-theme-text/80";

  function save() {
    onSave({
      tickedPersonIds: plan.people
        .filter((p) => personTicks[p.personId])
        .map((p) => p.personId),
      partyTicks: { ...partyTicks },
      renames: { ...renames },
      sourceTicked,
      sourceLabel,
    });
  }
</script>

<section class="flex flex-col gap-4" aria-labelledby="business-save-heading">
  <h2 id="business-save-heading" class={labelClass}>Save to your vault</h2>

  <div class="flex flex-col gap-1.5">
    <p class="text-xs text-theme-text">
      <strong>{plan.business.title}</strong> is saved as a Faction.
    </p>
    {#if plan.business.collision}
      <p class="text-micro text-theme-accent">
        A thing with this name is already in your vault. Keep both, or type a
        new name.
      </p>
      <label class="flex flex-col gap-1 text-micro text-theme-muted">
        <span>Name for {plan.business.title}</span>
        <input type="text" class={inputClass} bind:value={renames.business} />
      </label>
    {/if}
  </div>

  <fieldset class="flex flex-col gap-2">
    <legend class="text-micro font-bold text-theme-muted">People</legend>
    {#each plan.people as person (person.personId)}
      <label class="flex items-center gap-2 text-xs text-theme-text">
        <input type="checkbox" bind:checked={personTicks[person.personId]} />
        {person.draft.title} ({person.link})
      </label>
      {#if person.collision}
        <p class="ml-6 text-micro text-theme-accent">Already in your vault.</p>
        <label class="ml-6 flex flex-col gap-1 text-micro text-theme-muted">
          <span>Name for {person.draft.title}</span>
          <input
            type="text"
            class={inputClass}
            bind:value={renames[person.personId]}
          />
        </label>
      {/if}
    {/each}
  </fieldset>

  {#if plan.parties.length}
    <fieldset class="flex flex-col gap-2">
      <legend class="text-micro font-bold text-theme-muted"
        >Outside parties</legend
      >
      {#each plan.parties as party (party.relationshipId)}
        {#if party.choice.kind === "match"}
          <label class="flex items-center gap-2 text-xs text-theme-text">
            <input
              type="checkbox"
              bind:checked={partyTicks[party.relationshipId]}
            />
            Link {party.name} ({party.label})
          </label>
        {:else}
          <label class="flex items-center gap-2 text-xs text-theme-text">
            <input
              type="checkbox"
              bind:checked={partyTicks[party.relationshipId]}
            />
            Create new {party.name} as a {party.choice.entityType} ({party.label})
          </label>
        {/if}
      {/each}
    </fieldset>
  {/if}

  {#if plan.source}
    <div class="flex flex-col gap-2">
      <label class="flex items-center gap-2 text-xs text-theme-text">
        <input type="checkbox" bind:checked={sourceTicked} />
        Link to the entity you opened this from
      </label>
      <label class="flex flex-col gap-1 text-micro text-theme-muted">
        <span>Link label</span>
        <select class={inputClass} bind:value={sourceLabel}>
          {#each plan.source.labelOptions as option (option)}
            <option value={option}>{option}</option>
          {/each}
        </select>
      </label>
    </div>
  {/if}

  <div class="flex flex-wrap items-center justify-end gap-2">
    <button
      type="button"
      class="px-3 py-1.5 text-xs rounded-lg border border-theme-border"
      onclick={onCancel}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-3 py-1.5 text-xs font-bold rounded-lg bg-theme-primary text-theme-on-primary disabled:opacity-50"
      disabled={busy}
      onclick={save}
    >
      {busy ? "Saving…" : "Save"}
    </button>
  </div>
</section>
