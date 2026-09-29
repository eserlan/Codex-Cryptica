<script lang="ts">
  import StatSheetTemplateSettings from "./StatSheetTemplateSettings.svelte";
  import EntityTemplateSettings from "./entity-templates/EntityTemplateSettings.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
</script>

<div
  role="tabpanel"
  id="settings-panel-templates"
  aria-labelledby="settings-tab-templates"
  class="space-y-10 max-w-3xl mx-auto"
>
  <FeatureHint hintId="entity-templates" />

  <div class="space-y-4">
    <EntityTemplateSettings />
  </div>

  <div class="space-y-4">
    <p class="text-sm text-chrome-text/70 leading-relaxed">
      Manage reusable stat sheet layouts you can apply to any entity from its
      Stats tab. Built-in templates are always available; custom templates you
      save are scoped to this vault.
    </p>
    <StatSheetTemplateSettings />
  </div>
</div>
