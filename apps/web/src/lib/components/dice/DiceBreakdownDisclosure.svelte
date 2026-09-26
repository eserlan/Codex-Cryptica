<script lang="ts">
  import DiceBreakdown from "./DiceBreakdown.svelte";
  import {
    hasBreakdownDetail,
    type DiceBreakdownPart,
  } from "$lib/utils/dice-breakdown";

  /**
   * Compact by default, transparent on demand (#3443): a small chevron that
   * reveals the shared breakdown inline. It renders nothing when there is
   * nothing to reveal (a lone die, or a legacy result with no recorded
   * parts), and expanding it only toggles visibility, so it never re-rolls.
   */
  let {
    parts,
    total,
    formula,
    label = "Show dice",
  }: {
    parts: DiceBreakdownPart[] | undefined;
    total: number;
    formula?: string;
    label?: string;
  } = $props();

  let open = $state(false);
  const uid = $props.id();
  const regionId = `dice-breakdown-${uid}`;
  const hasDetail = $derived(hasBreakdownDetail(parts));
</script>

{#if hasDetail && parts}
  <div class="flex flex-col gap-2" data-testid="dice-disclosure">
    <button
      type="button"
      class="flex w-fit items-center gap-1 rounded px-1 py-0.5 font-header text-[9px] font-bold uppercase tracking-widest text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-theme-primary"
      aria-expanded={open}
      aria-controls={regionId}
      onclick={() => (open = !open)}
      data-testid="dice-disclosure-toggle"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--chevron-right] h-3 w-3 transition-transform {open
          ? 'rotate-90'
          : ''}"
      ></span>
      {open ? "Hide dice" : label}
    </button>
    <div id={regionId} hidden={!open}>
      {#if open}
        <DiceBreakdown {parts} {total} {formula} />
      {/if}
    </div>
  </div>
{/if}
