<script lang="ts">
  import type { StatBlockImportController } from "./stat-block-import-controller.svelte";

  let { controller }: { controller: StatBlockImportController } = $props();

  function traitNames(key: "traits" | "actions"): string {
    const list = (
      controller.result?.values as Record<string, unknown> | undefined
    )?.[key];
    return Array.isArray(list)
      ? list.map((item) => (item as { name: string }).name).join(", ")
      : "";
  }
</script>

<div class="flex flex-col gap-3">
  {#if traitNames("traits")}
    <div class="text-sm text-theme-muted" data-testid="stat-block-traits">
      Traits: {traitNames("traits")}
    </div>
  {/if}
  {#if traitNames("actions")}
    <div class="text-sm text-theme-muted" data-testid="stat-block-actions">
      Actions: {traitNames("actions")}
    </div>
  {/if}

  {#if (controller.result?.leftovers.length ?? 0) > 0}
    <div class="flex flex-col gap-1" data-testid="stat-block-leftovers">
      <span
        class="text-micro font-bold uppercase tracking-widest text-theme-muted"
        >Not on the sheet</span
      >
      {#each controller.result?.leftovers ?? [] as item (item.label)}
        <p class="text-sm text-theme-primary">
          <strong>{item.label}:</strong>
          {item.text}
        </p>
      {/each}
    </div>
  {/if}

  {#if controller.missingRequired.length > 0}
    <p class="text-sm text-theme-warning" data-testid="stat-block-missing">
      Still needed before saving: {controller.missingRequired.join(", ")}.
    </p>
  {/if}
</div>
