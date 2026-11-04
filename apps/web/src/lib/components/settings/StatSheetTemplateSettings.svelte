<script lang="ts">
  import { vaultRegistry } from "#lib/stores/vault-registry.svelte.js";
  import StatSheetCategoryDefaults from "./StatSheetCategoryDefaults.svelte";
  import StatSheetBuiltInTemplates from "./StatSheetBuiltInTemplates.svelte";
  import StatSheetVaultTemplates from "./StatSheetVaultTemplates.svelte";
  import StatSheetPresentationSettings from "./StatSheetPresentationSettings.svelte";
  import { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";

  const order = new StatSheetTemplateFieldOrder();
  let expandedIds = $state(new Set<string>());
  const togglePreview = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedIds = next;
  };
</script>

<div class="space-y-6">
  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <div class="mb-4">
      <div>
        <h4
          class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
        >
          Applicable Templates for Vault ({vaultRegistry.vaultName})
        </h4>

        <p class="text-micro text-theme-muted mt-1 leading-relaxed">
          Select which stat sheet templates apply to this campaign/vault.
          Disabled templates will be hidden from entity template pickers.
        </p>
      </div>
    </div>
  </div>

  <StatSheetCategoryDefaults />
  <StatSheetBuiltInTemplates {expandedIds} {togglePreview} {order} />
  <StatSheetVaultTemplates {expandedIds} {togglePreview} {order} />
  <StatSheetPresentationSettings />
</div>
