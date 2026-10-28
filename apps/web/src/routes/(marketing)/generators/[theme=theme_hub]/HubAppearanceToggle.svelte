<script lang="ts">
  import { themeStore } from "#lib/stores/theme.svelte.js";

  const modes = [
    { id: "neutral-light", label: "Light", icon: "icon-[lucide--sun]" },
    { id: "neutral-dark", label: "Dark", icon: "icon-[lucide--moon]" },
  ] as const;
  // ui-check-ignore: Preserve the existing hub appearance colours during extraction.
  const selectedClass = "bg-theme-primary text-theme-bg shadow-sm";
  // ui-check-ignore: Preserve the existing hub appearance colours during extraction.
  const idleClass = "text-theme-muted hover:text-theme-text";
</script>

<div
  class="flex items-center gap-1 rounded-lg border border-theme-border/60 bg-theme-surface/50 p-1 shadow-sm"
  role="group"
  aria-label="App Appearance"
>
  {#each modes as mode (mode.id)}
    <button
      type="button"
      title="Switch to {mode.label} Mode"
      aria-label="{mode.label} mode"
      aria-pressed={themeStore.resolvedAppAppearanceId === mode.id}
      class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all {themeStore.resolvedAppAppearanceId ===
      mode.id
        ? selectedClass
        : idleClass}"
      onclick={() => themeStore.setAppAppearance(mode.id)}
    >
      <span class="{mode.icon} h-3.5 w-3.5" aria-hidden="true"></span>
      <span class="hidden sm:inline">{mode.label}</span>
    </button>
  {/each}
</div>
