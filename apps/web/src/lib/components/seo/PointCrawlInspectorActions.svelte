<script lang="ts">
  import type { PointCrawlRegenTarget } from "generator-engine/point-crawl-state";

  let {
    target,
    canUseAI = false,
    busy = false,
    disabled = false,
    label,
    onRegeneratePart,
  }: {
    target: PointCrawlRegenTarget;
    canUseAI?: boolean;
    busy?: boolean;
    disabled?: boolean;
    label: string;
    onRegeneratePart: (
      target: PointCrawlRegenTarget,
      instruction?: string,
    ) => void | Promise<void>;
  } = $props();

  let showSteeringInput = $state(false);
  let steeringNote = $state("");
  let previousTarget = "";
  let actionFailed = $state(false);

  $effect(() => {
    const currentTarget = `${target.kind}:${target.id}`;
    if (currentTarget !== previousTarget) {
      previousTarget = currentTarget;
      showSteeringInput = false;
      steeringNote = "";
    }
  });

  async function submitRegen(event?: SubmitEvent): Promise<void> {
    event?.preventDefault();
    actionFailed = false;
    try {
      await onRegeneratePart(target, steeringNote.trim() || undefined);
    } catch {
      actionFailed = true;
      return;
    }
    showSteeringInput = false;
    steeringNote = "";
  }
</script>

<div class="flex flex-wrap items-center gap-2">
  {#if canUseAI}
    <button
      type="button"
      disabled={disabled || busy}
      onclick={() => (showSteeringInput = !showSteeringInput)}
      class="inline-flex items-center gap-1 rounded-md border border-theme-border/60 bg-theme-surface/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
      data-testid="point-crawl-inspector-revise"
      ><span class="icon-[lucide--pencil] h-4 w-4" aria-hidden="true"
      ></span>Steer</button
    >
  {/if}
  <button
    type="button"
    disabled={disabled || busy}
    onclick={() => submitRegen()}
    class="inline-flex items-center gap-1 rounded-md border border-theme-border/60 bg-theme-surface/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
    data-testid="point-crawl-inspector-regenerate"
    ><span
      class="icon-[lucide--refresh-cw] h-4 w-4 {busy ? 'animate-spin' : ''}"
      aria-hidden="true"
    ></span>{label}</button
  >
</div>

{#if actionFailed}
  <p class="mt-2 text-xs text-theme-text" role="alert">
    The refinement could not load. Your point crawl was left unchanged.
  </p>
{/if}

{#if showSteeringInput && canUseAI}
  <form class="mt-2.5 flex items-center gap-2" onsubmit={submitRegen}>
    <input
      type="text"
      bind:value={steeringNote}
      maxlength="400"
      placeholder={target.kind === "node"
        ? "How should this location change?"
        : "How should this route change?"}
      aria-label={target.kind === "node"
        ? "Steer location rewrite"
        : "Steer route rewrite"}
      class="min-w-0 flex-1 rounded-lg border border-theme-border/60 bg-theme-bg px-3 py-2 text-base text-theme-text focus:border-theme-primary focus:outline-none"
    />
    <button
      type="submit"
      disabled={!steeringNote.trim() || disabled || busy}
      class="rounded-md bg-theme-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-on-primary disabled:opacity-50"
      >Apply</button
    >
  </form>
{/if}
