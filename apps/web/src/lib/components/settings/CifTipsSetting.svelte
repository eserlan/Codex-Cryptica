<script lang="ts">
  /**
   * "Show tips from Cif" (spec 176, FR-001 to FR-003). Hidden, not disabled,
   * when AI is unavailable, so a tip can never be turned on while AI is off.
   */
  let {
    aiAvailable,
    enabled,
    onToggle,
  }: {
    aiAvailable: boolean;
    enabled: boolean;
    onToggle: (on: boolean) => void;
  } = $props();

  const helpId = "cif-tips-help";
</script>

{#if aiAvailable}
  <div class="flex flex-col gap-2" data-testid="cif-tips-setting">
    <label class="flex items-start gap-3 text-sm text-theme-text">
      <input
        type="checkbox"
        class="mt-1 h-4 w-4 accent-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        checked={enabled}
        aria-describedby={helpId}
        onchange={(e) => onToggle(e.currentTarget.checked)}
      />
      <span>
        <span class="block font-medium">Show tips from Cif</span>
        <span
          id={helpId}
          class="block text-xs leading-relaxed text-theme-text/70"
        >
          Cif can suggest one thing to try next, once per visit, based on the
          goal you chose. Nothing is sent until you tap a tip, and Cif never
          reads your vault.
        </span>
      </span>
    </label>
  </div>
{/if}
