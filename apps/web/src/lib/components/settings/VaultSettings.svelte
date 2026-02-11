<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

  const handleVisibilityChange = async (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as 'visible' | 'hidden';
    await vault.setDefaultVisibility(value);
  };
</script>

<div class="space-y-6">
  <div>
    <h3 class="text-sm font-bold text-theme-primary uppercase tracking-widest mb-4">Fog of War</h3>
    <div class="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <label for="default-visibility" class="block text-xs font-bold text-theme-text mb-1 uppercase">Default Entity Visibility</label>
          <p class="text-[10px] text-theme-muted leading-relaxed">
            Determines if nodes are shown or hidden by default when Shared Mode is active.
          </p>
        </div>
        <select
          id="default-visibility"
          value={vault.defaultVisibility}
          onchange={handleVisibilityChange}
          class="bg-theme-surface border border-theme-border text-theme-text px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-theme-primary rounded uppercase"
        >
          <option value="visible">Visible by Default</option>
          <option value="hidden">Hidden by Default</option>
        </select>
      </div>

      <div class="border-t border-theme-border/30 pt-4">
        <h4 class="text-[10px] font-bold text-theme-secondary uppercase mb-2">Tag Reference</h4>
        <ul class="space-y-2 text-[10px] font-mono">
          <li class="flex gap-2">
            <span class="text-red-400 font-bold shrink-0">hidden:</span>
            <span class="text-theme-muted">Always hides the node in Shared Mode.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-green-400 font-bold shrink-0">revealed:</span>
            <span class="text-theme-muted">Shows the node even if world is Hidden by Default.</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
