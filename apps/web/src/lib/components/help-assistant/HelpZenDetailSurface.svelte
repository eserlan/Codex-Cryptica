<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { helpSurfaces } from "$lib/stores/help-assistant/help-surface.svelte";

  let {
    entity,
    isEditing,
  }: {
    entity: Entity | null;
    isEditing: boolean;
  } = $props();

  $effect(() => {
    if (!entity) return;
    return helpSurfaces.registerZenEntityDetail({
      entityKind: () => entity.type ?? null,
      activeTab: () => "status",
      isEditing: () => isEditing,
      canAddConnection: () => false,
      canGenerateRelated: () => !vault.isGuest && !isEditing,
      canSwitchTabs: () => false,
      openTab: () => {},
    });
  });
</script>
