<script lang="ts">
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { isVaultReadyForGenerators } from "$lib/stores/vault/readiness";
  import SoloMenu from "./SoloMenu.svelte";

  const ready = $derived(isVaultReadyForGenerators(vault));

  // The four quick generators, plus the full picker.
  const QUICK: { id: string; label: string; testId: string }[] = [
    { id: "npc", label: "NPC", testId: "solo-generate-npc" },
    { id: "encounter", label: "Encounter", testId: "solo-generate-encounter" },
    { id: "rumour", label: "Rumour", testId: "solo-generate-rumour" },
    {
      id: "plot-twist",
      label: "Complication",
      testId: "solo-generate-complication",
    },
  ];

  function open(generatorId: string | null) {
    modalUIStore.openGeneratorWorkflow(generatorId);
  }
</script>

<SoloMenu
  label="Generate"
  testId="solo-generate-menu"
  helpTarget="solo-generate-menu"
  disabled={!ready}
  reason={ready ? null : "Generators open once your vault has loaded."}
>
  <ul class="flex flex-col gap-1" role="menu">
    {#each QUICK as item (item.id)}
      <li>
        <button
          type="button"
          role="menuitem"
          class="w-full rounded-md px-3 py-1.5 text-left text-sm text-theme-text hover:bg-theme-primary/10"
          data-testid={item.testId}
          onclick={() => open(item.id)}
        >
          {item.label}
        </button>
      </li>
    {/each}
    <li class="mt-1 border-t border-theme-border pt-1">
      <button
        type="button"
        role="menuitem"
        class="w-full rounded-md px-3 py-1.5 text-left text-sm text-theme-muted hover:bg-theme-primary/10"
        data-testid="solo-generate-all"
        onclick={() => open(null)}
      >
        All generators…
      </button>
    </li>
  </ul>
</SoloMenu>
