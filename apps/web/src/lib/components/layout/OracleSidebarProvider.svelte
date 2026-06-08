<script lang="ts">
  import { debugStore } from "$lib/stores/debug.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

  let OracleSidebarPanel = $state<any>(null);

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  $effect(() => {
    if (layoutUIStore.activeSidebarTool === "oracle" && !OracleSidebarPanel) {
      import("$lib/components/oracle/OracleSidebarPanel.svelte")
        .then((m) => (OracleSidebarPanel = m?.default))
        .catch((error) => {
          if (isSpecialEnv) {
            console.error(`Failed to load OracleSidebarPanel`, error);
          } else {
            debugStore.error(
              `Failed to lazy-load component: OracleSidebarPanel`,
              error,
            );
          }
        });
    }
  });
</script>

{#if layoutUIStore.leftSidebarOpen}
  {#if layoutUIStore.activeSidebarTool === "oracle" && OracleSidebarPanel}
    <OracleSidebarPanel />
  {/if}
{/if}
