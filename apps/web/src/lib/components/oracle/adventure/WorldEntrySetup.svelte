<script lang="ts">
  import type { WorldCalendar } from "chronology-engine";
  import TemporalEditor from "#lib/components/timeline/TemporalEditor.svelte";
  import {
    validateWorldEntrySetup,
    type WorldEntryChoice,
    type WorldEntrySetup,
    type WorldEntryIntent,
  } from "#lib/services/adventure/world-entry-setup.js";

  let {
    setup = $bindable(),
    characters,
    locations,
    calendar,
    onContinue,
  }: {
    setup: WorldEntrySetup;
    characters: WorldEntryChoice[];
    locations: WorldEntryChoice[];
    calendar: WorldCalendar;
    onContinue: (setup: WorldEntrySetup) => void;
  } = $props();

  let characterSearch = $state("");
  let locationSearch = $state("");
  let attempted = $state(false);

  // Avoid thousands of mobile <option> nodes in a large Vault.
  const visibleCharacters = $derived(
    characters
      .filter(
        (row) =>
          row.id === setup.characterId ||
          row.name
            .toLocaleLowerCase()
            .includes(characterSearch.toLocaleLowerCase()),
      )
      .slice(0, 80),
  );
  const visibleLocations = $derived(
    locations
      .filter(
        (row) =>
          row.id === setup.locationId ||
          row.name
            .toLocaleLowerCase()
            .includes(locationSearch.toLocaleLowerCase()),
      )
      .slice(0, 80),
  );
  const errors = $derived(
    validateWorldEntrySetup(setup, characters, locations, calendar),
  );

  function continueToPreview() {
    attempted = true;
    if (errors.length) return;
    onContinue(structuredClone($state.snapshot(setup)));
  }
</script>

<form
  data-testid="world-entry-setup"
  class="mx-auto w-full max-w-3xl space-y-5 rounded-xl border border-theme-border bg-theme-surface p-4 sm:p-6"
  onsubmit={(event) => {
    event.preventDefault();
    continueToPreview();
  }}
>
  <header class="space-y-2">
    <h2 class="font-header text-xl text-theme-text">Set the Stage</h2>
    <p class="text-sm text-theme-text">
      Step into your world. No quest, villain or plot is required.
    </p>
  </header>

  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold text-theme-text"
      >1. Who are you playing?</legend
    >
    {#if characters.length}
      <label class="block text-sm text-theme-text">
        Find a Vault character
        <input
          type="search"
          bind:value={characterSearch}
          placeholder="Search characters"
          data-testid="world-entry-character-search"
          class="mt-1 min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
        />
      </label>
      <select
        aria-label="Character"
        value={setup.characterId}
        data-testid="world-entry-character"
        onchange={(event) => {
          setup = { ...setup, characterId: event.currentTarget.value };
        }}
        class="min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
      >
        <option value="">New / provisional character</option>
        {#each visibleCharacters as character (character.id)}
          <option value={character.id}>{character.name}</option>
        {/each}
      </select>
    {/if}
    {#if !setup.characterId}
      <label class="block text-sm text-theme-text">
        Character name
        <input
          value={setup.provisionalCharacterName}
          data-testid="world-entry-new-character"
          oninput={(event) =>
            (setup = {
              ...setup,
              provisionalCharacterName: event.currentTarget.value,
            })}
          placeholder="Who will you play?"
          class="mt-1 min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
        />
      </label>
      <label class="block text-sm text-theme-text">
        Description (optional)
        <input
          value={setup.provisionalCharacterDescription}
          oninput={(event) =>
            (setup = {
              ...setup,
              provisionalCharacterDescription: event.currentTarget.value,
            })}
          placeholder="A few words about your character"
          class="mt-1 min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
        />
      </label>
    {/if}
  </fieldset>

  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold text-theme-text"
      >2. Where does the scene begin?</legend
    >
    {#if locations.length}
      <label class="block text-sm text-theme-text">
        Find a Vault place
        <input
          type="search"
          bind:value={locationSearch}
          placeholder="Search locations"
          data-testid="world-entry-location-search"
          class="mt-1 min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
        />
      </label>
      <select
        aria-label="Starting location"
        data-testid="world-entry-location"
        value={setup.locationId}
        onchange={(event) =>
          (setup = { ...setup, locationId: event.currentTarget.value })}
        class="min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
      >
        <option value="">New / provisional place</option>
        {#each visibleLocations as location (location.id)}
          <option value={location.id}>{location.name}</option>
        {/each}
      </select>
    {/if}
    {#if !setup.locationId}
      <label class="block text-sm text-theme-text">
        Starting place
        <input
          data-testid="world-entry-new-location"
          value={setup.provisionalLocationName}
          oninput={(event) =>
            (setup = {
              ...setup,
              provisionalLocationName: event.currentTarget.value,
            })}
          placeholder="Village, roadside, tavern…"
          class="mt-1 min-h-11 w-full rounded-md border border-theme-border bg-theme-bg p-2 text-theme-text"
        />
      </label>
    {/if}
    <p class="text-xs text-theme-text">
      Only nearby, relevant world knowledge will be used.
    </p>
  </fieldset>

  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold text-theme-text"
      >3. When does it happen?</legend
    >
    <p class="text-xs text-theme-text">
      Optional. Choose a date using your Vault calendar and eras, or leave it
      unspecified.
    </p>
    <TemporalEditor
      bind:value={setup.at}
      label="Starting world date (optional)"
    />
  </fieldset>

  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold text-theme-text"
      >4. How should it begin?</legend
    >
    {#each [{ id: "explore", label: "Just put me there — open exploration" }, { id: "scene", label: "I have a particular scene in mind" }, { id: "opportunity", label: "Introduce a plausible local situation" }] as intent (intent.id)}
      <label
        class="flex min-h-11 items-center gap-3 rounded-md border border-theme-border p-3 text-sm text-theme-text"
      >
        <input
          type="radio"
          name="world-entry-intent"
          checked={setup.intent === intent.id}
          onchange={() =>
            (setup = { ...setup, intent: intent.id as WorldEntryIntent })}
        />
        <span>{intent.label}</span>
      </label>
    {/each}
    {#if setup.intent === "scene"}
      <label class="block text-sm text-theme-text">
        Describe your scene
        <textarea
          data-testid="world-entry-scene-note"
          value={setup.scenePrompt}
          oninput={(event) =>
            (setup = { ...setup, scenePrompt: event.currentTarget.value })}
          class="mt-1 min-h-24 w-full rounded-md border border-theme-border bg-theme-bg p-3 text-theme-text"
          placeholder="I want to speak with the steward about…"
        ></textarea>
      </label>
    {/if}
  </fieldset>

  {#if attempted && errors.length}
    <ul role="alert" class="list-disc space-y-1 pl-5 text-sm text-theme-danger">
      {#each errors as error}
        <li>{error}</li>
      {/each}
    </ul>
  {/if}
  <button
    type="submit"
    data-testid="world-entry-continue"
    class="min-h-12 w-full rounded-md bg-theme-primary px-4 py-3 font-semibold text-theme-on-primary sm:w-auto"
  >
    Review starting context
  </button>
</form>
