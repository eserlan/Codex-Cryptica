<script lang="ts">
  import { onDestroy } from "svelte";
  import HexDiscoveryFailure from "./HexDiscoveryFailure.svelte";
  import HexDiscoveryPartActions from "./HexDiscoveryPartActions.svelte";
  import type { DiscoveryPartId, HexDiscoveryDraft } from "hex-crawl-engine";
  import HexDiscoveryPartCard from "./HexDiscoveryPartCard.svelte";
  import type { HexDiscoveryControls } from "./discovery-controls";

  let {
    draft,
    controls,
    proposedLink,
    factionMatch,
    failure,
    customTerrainLabel,
    onCancel,
  }: {
    draft: HexDiscoveryDraft;
    controls: HexDiscoveryControls;
    proposedLink: { entityId: string; title: string } | null;
    factionMatch: { id: string; title: string } | null;
    failure: "ai-failed" | null;
    customTerrainLabel?: string;
    onCancel: () => void;
  } = $props();

  const PARTS: { id: DiscoveryPartId; label: string }[] = [
    { id: "landmark", label: "Landmark" },
    { id: "encounter", label: "Encounter" },
    { id: "hazard", label: "Hazard" },
    { id: "secret", label: "Secret" },
    { id: "factionPresence", label: "Faction presence" },
    { id: "atmosphere", label: "Atmosphere" },
  ];

  let busy = $state(false);
  let status = $state("");
  let linkTicked = $state(true);
  let controller: AbortController | null = null;

  const factionName = $derived(draft.parts.factionPresence.factionName ?? "");

  onDestroy(() => {
    controller?.abort();
  });

  /** Generation can be cancelled; saves and discards are quick and are not. */
  async function generate(task: (signal: AbortSignal) => Promise<unknown>) {
    if (busy) return;
    const current = new AbortController();
    controller = current;
    busy = true;
    status = "Drafting…";
    try {
      await task(current.signal);
      status = "Draft updated.";
    } catch {
      status = current.signal.aborted
        ? "Generation cancelled."
        : "The AI couldn't draft this hex.";
    } finally {
      busy = false;
      controller = null;
    }
  }

  function cancel() {
    controller?.abort();
    status = "Generation cancelled.";
    onCancel();
  }

  function terrainFallbackMessage(): string | null {
    if (!draft.usedGeneralTables || !customTerrainLabel) return null;
    return `No tables for '${customTerrainLabel}', so general tables were used.`;
  }
</script>

<section aria-label="Discovery review" class="space-y-3">
  {#if terrainFallbackMessage()}
    <p class="text-micro text-theme-muted">{terrainFallbackMessage()}</p>
  {/if}

  {#if failure === "ai-failed"}
    <HexDiscoveryFailure
      {busy}
      onRetry={() => generate((signal) => controls.retry(signal))}
      onRollTables={() => void controls.rollTables()}
    />
  {/if}

  <div class="space-y-2" role="list">
    {#each PARTS as item (item.id)}
      <div role="listitem">
        <HexDiscoveryPartCard
          label={item.label}
          part={draft.parts[item.id]}
          {busy}
          onRegenerate={() =>
            generate((signal) => controls.regenerate(item.id, signal))}
          onDiscard={() => void controls.discardPart(item.id)}
        >
          <HexDiscoveryPartActions
            partId={item.id}
            {controls}
            {proposedLink}
            {factionName}
            {factionMatch}
            bind:linkTicked
          />
        </HexDiscoveryPartCard>
      </div>
    {/each}
  </div>

  <div class="flex flex-wrap items-center justify-between gap-2">
    <p role="status" aria-live="polite" class="text-micro text-theme-muted">
      {status}
    </p>
    <div class="flex gap-2">
      {#if busy}
        <button
          type="button"
          onclick={cancel}
          class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40"
        >
          Cancel
        </button>
      {/if}
      <button
        type="button"
        onclick={() => void controls.discardDraft()}
        class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
      >
        Discard draft
      </button>
    </div>
  </div>
</section>
