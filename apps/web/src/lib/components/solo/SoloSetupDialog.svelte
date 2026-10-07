<script lang="ts">
  import { focusTrap } from "$lib/actions/focusTrap";
  import { soloSessionStore } from "$lib/stores/solo-session-instance";

  type MapChoice = { id: string; name: string };

  let {
    maps,
    defaultMapId,
    journalState,
    onclose,
  }: {
    maps: MapChoice[];
    defaultMapId: string | null;
    journalState: "start" | "open" | "resume";
    onclose: () => void;
  } = $props();

  // The player's pick; until they choose, the prop's default applies.
  let picked = $state<string | null>(null);
  const mapChoice = $derived(picked ?? defaultMapId ?? "");
  let withJournal = $state(true);
  let error = $state<string | null>(null);
  let busy = $state(false);

  const journalLabel = $derived(
    journalState === "start"
      ? "Start a Session Journal"
      : "Continue the running Session Journal",
  );

  async function start() {
    busy = true;
    error = null;
    try {
      await soloSessionStore.start({
        mapId: mapChoice === "" ? null : mapChoice,
        journal: withJournal,
      });
      onclose();
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "The solo session could not start.";
    } finally {
      busy = false;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
  role="presentation"
>
  <div
    class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5 shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="solo-setup-title"
    tabindex="-1"
    use:focusTrap
  >
    <h2 id="solo-setup-title" class="font-header text-lg text-theme-text">
      Start Solo Session
    </h2>
    <p class="mt-1 text-sm text-theme-muted">
      Pick a map to play on. SOLO fog turns on for it, so fogged areas stay
      hidden from you.
    </p>

    <label class="mt-4 block text-sm text-theme-text" for="solo-setup-map">
      Map
    </label>
    <select
      id="solo-setup-map"
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
      data-testid="solo-setup-map"
      value={mapChoice}
      onchange={(event) => (picked = event.currentTarget.value)}
    >
      {#each maps as map (map.id)}
        <option value={map.id}>{map.name}</option>
      {/each}
      <option value="">No map</option>
    </select>

    <label class="mt-4 flex items-center gap-2 text-sm text-theme-text">
      <input
        type="checkbox"
        data-testid="solo-setup-journal"
        bind:checked={withJournal}
      />
      {journalLabel}
    </label>

    {#if error}
      <p role="alert" class="mt-3 text-sm text-theme-danger">{error}</p>
    {/if}

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md px-3 py-2 text-sm text-theme-muted hover:text-theme-primary"
        data-testid="solo-setup-cancel"
        onclick={onclose}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md border border-theme-primary/60 px-3 py-2 text-sm font-bold text-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
        data-testid="solo-setup-start"
        disabled={busy}
        onclick={start}
      >
        Start
      </button>
    </div>
  </div>
</div>
