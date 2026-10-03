<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { helpSurfaces } from "$lib/stores/help-assistant/help-surface.svelte";
  import type { EntityDetailTab } from "$lib/components/entity-detail/detail-tabs";

  /**
   * Renderless. Tells the help assistant which entry kind and tab are showing
   * and how to open a tab. It passes no names, IDs or text: the screen
   * description has nowhere to put them.
   */
  let {
    entity,
    activeTab = $bindable(),
    isEditing,
  }: {
    entity: Entity;
    activeTab: EntityDetailTab;
    isEditing: boolean;
  } = $props();

  $effect(() =>
    helpSurfaces.registerEntityDetail({
      entityKind: () => entity.type ?? null,
      activeTab: () => activeTab,
      isEditing: () => isEditing,
      canAddConnection: () => !vault.isGuest,
      canGenerateRelated: () => !vault.isGuest && !isEditing,
      openTab: (tab) => {
        activeTab = tab;
      },
    }),
  );
</script>
