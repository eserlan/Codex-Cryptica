<script lang="ts">
  import { formatMoney, type StandingPressure } from "@codex/stat-sheet-engine";

  /** Lines under market pressure now: usual price beside the asking price. */
  let { standing }: { standing: StandingPressure[] } = $props();
</script>

{#if standing.length > 0}
  <section aria-label="Under market pressure" data-testid="market-standing">
    <p class="text-micro font-bold text-theme-muted">
      Under market pressure now
    </p>
    <ul class="space-y-0.5">
      {#each standing as row (row.rowId)}
        <li class="text-xs" data-testid="market-standing-row">
          <span class="font-bold">{row.name}</span>
          {#if row.baseline && row.asking}
            <span class="font-mono">
              usual {formatMoney(row.baseline)}, asking {formatMoney(
                row.asking,
              )}
            </span>
          {/if}
          {#if row.edited}
            <span class="italic text-theme-muted">(price set by you since)</span
            >
          {/if}
          <span class="text-theme-muted">{row.reasons.join("; ")}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}
