<script lang="ts">
  import type { HexJourneyStore } from "$lib/stores/hex-crawl/hex-journey.svelte";
  let { store, visible = true }: { store: HexJourneyStore; visible?: boolean } =
    $props();
  let hoursText = $state("");
  let hoursError = $state(false);
  $effect(() => {
    void store.route;
    hoursText = "";
    hoursError = false;
  });
  function updateHours(value: string) {
    hoursText = value;
    if (!value.trim()) {
      hoursError = false;
      store.setHoursPerHex(null);
      return;
    }
    const hours = Number(value);
    if (Number.isFinite(hours) && hours > 0) {
      hoursError = false;
      store.setHoursPerHex(hours);
    } else {
      hoursError = true;
      store.setHoursPerHex(null);
    }
  }
</script>

<!-- fallow-ignore-next-line complexity -- Renders mutually exclusive phases from the transient journey state machine. -->
{#if visible && (store.route || store.pendingArrival || store.eligibleTokens.length > 1 || store.error)}
  <section
    aria-label="Hex journey"
    class="pointer-events-auto rounded-xl border border-theme-border bg-theme-bg/95 p-3 text-theme-text shadow-lg"
  >
    {#if !store.route}
      {#if store.error}<p role="status" class="text-sm text-theme-muted">
          {store.error}
        </p>{/if}
      {#if store.pendingArrival}<button
          type="button"
          disabled={store.busy || !store.canRetryArrival}
          onclick={() => void store.retryArrival()}
          class="mt-2 rounded-lg bg-theme-primary px-3 py-1.5 text-sm text-theme-on-primary"
          >Retry arrival save</button
        >{/if}
      {#if store.eligibleTokens.length > 1}
        <label class="block text-sm" for="journey-token">Party token</label>
        <select
          id="journey-token"
          value={store.selectedTokenId ?? ""}
          onchange={(event) => store.selectToken(event.currentTarget.value)}
          class="mt-1 w-full rounded-lg border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
        >
          <option value="">Choose a token</option>
          {#each store.eligibleTokens as token (token.id)}<option
              value={token.id}
              >{token.label ?? token.id} · {token.hex.q},{token.hex.r}</option
            >{/each}
        </select>
      {/if}
    {/if}
    {#if store.route}
      <p role="status" aria-live="polite" class="text-sm font-semibold">
        {store.phase === "arrived"
          ? "Arrived"
          : store.phase === "stepping"
            ? "Moving to the next hex…"
            : `${store.estimate?.completedSteps ?? 0} of ${store.estimate?.totalSteps ?? 0} hexes travelled · ${store.estimate?.remainingDistance ?? 0} ${store.route.gridUnit} remaining${store.estimate?.remainingHours != null ? ` · ${store.estimate.remainingHours} hours` : ""}`}
      </p>
      {#if store.phase === "preview"}
        <label class="mt-2 block text-sm" for="journey-hours"
          >Hours per hex</label
        >
        <input
          id="journey-hours"
          type="number"
          min="0.01"
          step="any"
          value={hoursText}
          oninput={(event) => updateHours(event.currentTarget.value)}
          class="mt-1 w-32 rounded-lg border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
        />
        {#if hoursError}<p role="alert" class="mt-1 text-xs text-theme-muted">
            Enter a number greater than zero.
          </p>{/if}
        {#if store.error}<p role="alert" class="mt-1 text-xs text-theme-muted">
            {store.error}
          </p>{/if}
        <p class="mt-1 text-xs text-theme-muted">
          {store.estimate?.totalHours == null
            ? "Set hours per hex to estimate time."
            : `${store.estimate.totalHours} hours estimated.`}
        </p>
        {#if store.startBlockedReason}<p class="mt-1 text-xs text-theme-muted">
            {store.startBlockedReason}
          </p>{/if}
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!store.canStart}
            onclick={() => void store.start()}
            class="rounded-lg bg-theme-primary px-3 py-1.5 text-sm text-theme-on-primary disabled:opacity-50"
            >Start journey</button
          >
          <button
            type="button"
            aria-label="Dismiss journey preview"
            onclick={() => store.dismissPreview()}
            class="rounded-lg border border-theme-border px-3 py-1.5 text-sm"
            >Dismiss</button
          >
        </div>
      {:else if store.phase === "ready"}
        <button
          type="button"
          disabled={store.busy}
          onclick={() => void store.step()}
          class="mt-2 rounded-lg bg-theme-primary px-3 py-1.5 text-sm text-theme-on-primary"
          >Next hex</button
        >
        <button
          type="button"
          onclick={() => store.stop()}
          class="ml-2 rounded-lg border border-theme-border px-3 py-1.5 text-sm"
          >Stop journey</button
        >
      {:else if store.phase === "blocked"}
        <p class="text-sm text-theme-muted">{store.error}</p>
        {#if store.pendingArrival}<button
            type="button"
            disabled={store.busy || !store.canRetryArrival}
            onclick={() => void store.retryArrival()}
            class="mt-2 rounded-lg bg-theme-primary px-3 py-1.5 text-sm text-theme-on-primary"
            >Retry arrival save</button
          >{/if}
        <button
          type="button"
          onclick={() => store.stop()}
          class="mt-2 rounded-lg border border-theme-border px-3 py-1.5 text-sm"
          >Stop journey</button
        >
      {:else if store.phase === "arrived"}
        <button
          type="button"
          onclick={() => store.stop()}
          class="mt-2 rounded-lg border border-theme-border px-3 py-1.5 text-sm"
          >Dismiss journey</button
        >
      {/if}
    {/if}
  </section>
{/if}
