<script lang="ts">
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { vault } from "$lib/stores/vault.svelte";
  import { characterChoices } from "$lib/services/solo-characters";
  import SoloMenu from "./SoloMenu.svelte";

  const characters = $derived(characterChoices(vault.entities));
  // Built from the saved party ids and the live character list, so the chips
  // and boxes always agree with what is stored (and with each other).
  const memberIds = $derived(new Set(soloSessionStore.session?.partyIds ?? []));
  const party = $derived(characters.filter((c) => memberIds.has(c.id)));

  function openEntry(id: string) {
    vault.selectedEntityId = id;
  }

  function toggle(id: string, on: boolean) {
    const current = soloSessionStore.session?.partyIds ?? [];
    const next = on ? [...current, id] : current.filter((c) => c !== id);
    void soloSessionStore.setParty(next);
  }
</script>

<SoloMenu label="Party" testId="solo-party-menu" helpTarget="solo-party-menu">
  <div class="flex w-64 flex-col gap-2">
    {#if party.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each party as member (member.id)}
          <button
            type="button"
            class="rounded-md border border-theme-border px-2 py-0.5 text-sm text-theme-text hover:text-theme-primary"
            data-testid="solo-party-member"
            onclick={() => openEntry(member.id)}
          >
            {member.name}
          </button>
        {/each}
      </div>
    {/if}

    {#if characters.length === 0}
      <p class="text-sm text-theme-muted">
        Party members are Character entries. Create a character first.
      </p>
    {:else}
      <ul class="flex flex-col gap-1">
        {#each characters as character (character.id)}
          <li>
            <label class="flex items-center gap-2 text-sm text-theme-text">
              <input
                type="checkbox"
                aria-label={character.name}
                checked={memberIds.has(character.id)}
                onchange={(event) =>
                  toggle(character.id, event.currentTarget.checked)}
              />
              {character.name}
            </label>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</SoloMenu>
