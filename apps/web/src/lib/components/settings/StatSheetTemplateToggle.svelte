<script lang="ts">
  import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";
  let { templateId }: { templateId: string } = $props();
</script>

<button
  type="button"
  class="flex items-center gap-1.5 rounded border px-2 py-1 text-micro font-bold uppercase tracking-wide transition-colors shrink-0 {statSheetTemplates.isTemplateEnabled(
    templateId,
  )
    ? 'border-theme-primary/40 bg-theme-primary/10 text-theme-primary'
    : 'border-theme-border bg-theme-bg text-theme-muted hover:text-theme-text'}"
  onclick={(e) => {
    e.stopPropagation();
    statSheetTemplates.toggleTemplateEnabled(templateId);
  }}
  data-testid="stat-sheet-toggle-enabled"
  title={statSheetTemplates.isTemplateEnabled(templateId)
    ? "Disable for this Vault"
    : "Enable for this Vault"}
>
  <span
    class="icon-[lucide--check] h-3 w-3 {statSheetTemplates.isTemplateEnabled(
      templateId,
    )
      ? 'opacity-100'
      : 'opacity-0'}"
    aria-hidden="true"
  ></span>
  {statSheetTemplates.isTemplateEnabled(templateId) ? "Applicable" : "Hidden"}
</button>
