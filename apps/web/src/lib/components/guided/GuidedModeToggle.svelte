<script lang="ts">
  import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";

  function toggle() {
    guidedModeStore.toggleGuidedMode();
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={guidedModeStore.isGuidedMode}
  aria-label={guidedModeStore.isGuidedMode
    ? "Switch to Full Toolbox mode"
    : "Switch to Guided mode"}
  title={guidedModeStore.isGuidedMode
    ? "Guided Mode is on — click for Full Toolbox"
    : "Full Toolbox mode — click for Guided Mode"}
  data-testid="guided-mode-toggle"
  onclick={toggle}
  class="inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60"
>
  <span
    class={[
      "rounded-full px-2.5 py-1 transition-colors",
      guidedModeStore.isGuidedMode
        ? "bg-theme-primary text-theme-bg"
        : "text-theme-muted",
    ]}
  >
    <span aria-hidden="true" class="icon-[lucide--compass] w-3 h-3 mr-1 inline-block align-[-2px]"
    ></span>Guided
  </span>
  <span
    class={[
      "rounded-full px-2.5 py-1 transition-colors",
      !guidedModeStore.isGuidedMode
        ? "bg-theme-primary text-theme-bg"
        : "text-theme-muted",
    ]}
  >
    <span aria-hidden="true"
      class="icon-[lucide--layout-grid] w-3 h-3 mr-1 inline-block align-[-2px]"
    ></span>Full Toolbox
  </span>
</button>
