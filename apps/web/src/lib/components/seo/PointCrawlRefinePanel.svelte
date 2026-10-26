<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    pointCrawlToOutput,
    renderPointCrawlGmSheet,
    formatRouteConnectionLabel,
    type PointCrawlNode,
    type PointCrawlRegenTarget,
  } from "generator-engine";
  import { generatorEngine } from "#lib/services/seo/generator-engine.js";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";

  let {
    output,
    useAI = false,
    onReplace,
  }: {
    output: GeneratorOutput;
    useAI?: boolean;
    onReplace: (output: GeneratorOutput) => void;
  } = $props();

  const crawl = $derived(output.pointCrawl);
  const canUseAI = $derived(useAI && !discoveryPolicyStore.aiDisabled);
  let busyId = $state<string | null>(null);
  let warnings = $state<string[]>([]);
  let notice = $state<string | null>(null);
  let revisingId = $state<string | null>(null);
  let revisionText = $state("");
  let requestToken = 0;
  let requestController: AbortController | null = null;

  onDestroy(() => {
    requestController?.abort();
    requestToken += 1;
  });

  function isCurrentRequest(token: number, startedFrom: typeof crawl) {
    return token === requestToken && output.pointCrawl === startedFrom;
  }

  function settle(token: number) {
    if (token !== requestToken) return;
    busyId = null;
    requestController = null;
  }

  // fallow-ignore-next-line complexity
  export async function regenerate(
    target: PointCrawlRegenTarget,
    instruction = "",
  ) {
    if (!crawl || busyId) return;
    busyId = target.id;
    warnings = [];
    notice = null;
    const startedFrom = crawl;
    const token = ++requestToken;
    requestController = new AbortController();
    try {
      const result = await generatorEngine.regeneratePointCrawlPart(
        crawl,
        target,
        {
          useAI: canUseAI,
          instruction,
          signal: requestController.signal,
        },
      );
      if (!isCurrentRequest(token, startedFrom)) return;
      warnings = result.warnings;
      if (result.crawl === startedFrom) return;
      onReplace(pointCrawlToOutput(result.crawl) as GeneratorOutput);
      const partLabel = target.kind === "node" ? "location" : "route";
      notice = `${instruction ? "Revised" : "Rewrote"} the ${partLabel}. Network topology and sibling points are unchanged.`;
    } catch {
      if (token === requestToken) {
        notice = "That didn't work. Nothing was changed.";
      }
    } finally {
      settle(token);
    }
  }

  function toggleRevise(id: string) {
    if (revisingId === id) {
      revisingId = null;
      revisionText = "";
    } else {
      revisingId = id;
      revisionText = "";
    }
  }

  function submitRevise(event: SubmitEvent, target: PointCrawlRegenTarget) {
    event.preventDefault();
    const instruction = revisionText.trim();
    if (!instruction) return;
    revisingId = null;
    revisionText = "";
    void regenerate(target, instruction);
  }

  async function copyGmSheet() {
    if (!crawl) return;
    try {
      await navigator.clipboard.writeText(renderPointCrawlGmSheet(crawl));
      notice = "GM point-crawl cheat sheet copied.";
    } catch {
      notice = "Couldn't copy. Select the GM sheet text and copy it by hand.";
    }
  }

  function nodeNameById(id: string): string {
    return crawl?.nodes.find((n: PointCrawlNode) => n.id === id)?.name ?? id;
  }

  const buttonClass =
    "flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
</script>

<!-- fallow-ignore-next-line complexity -->
{#if crawl}
  <section
    class="mt-4 rounded-xl border border-theme-border/60 bg-theme-surface/40 p-4"
    aria-labelledby="point-crawl-refine-heading"
    data-testid="point-crawl-refine-panel"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2
        id="point-crawl-refine-heading"
        class="text-meta font-bold uppercase tracking-wider text-theme-text/80"
      >
        Refine one location or route
      </h2>
      <button type="button" class={buttonClass} onclick={copyGmSheet}>
        <span
          class="icon-[lucide--clipboard-list] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        Copy GM sheet
      </button>
    </div>
    <p class="mt-1 text-micro text-theme-muted leading-relaxed">
      Rewrite any single location node or route{canUseAI
        ? ", or give a custom steering note"
        : ""}. Graph topology, neighbours, and key-before-lock links stay
      intact.
    </p>

    <h3
      class="mt-3 text-nano font-bold uppercase tracking-wider text-theme-muted"
    >
      Locations ({crawl.nodes.length})
    </h3>
    <ul class="mt-1.5 flex flex-col gap-1.5">
      {#each crawl.nodes as node (node.id)}
        <li class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="text-theme-text">
            {node.name}
            <span class="text-theme-muted"
              >· {node.role} (layer {node.layer})</span
            >
          </span>
          <div class="flex shrink-0 items-center gap-1.5">
            {#if canUseAI}
              <button
                type="button"
                class={buttonClass}
                disabled={busyId !== null}
                aria-label="Revise location {node.name}"
                aria-expanded={revisingId === node.id}
                onclick={() => toggleRevise(node.id)}
              >
                <span
                  class="icon-[lucide--pencil] h-3.5 w-3.5"
                  aria-hidden="true"
                ></span>
                Revise
              </button>
            {/if}
            <button
              type="button"
              class={buttonClass}
              disabled={busyId !== null}
              aria-label="Regenerate location {node.name}"
              onclick={() => void regenerate({ kind: "node", id: node.id })}
            >
              <span
                class="icon-[lucide--refresh-cw] h-3.5 w-3.5 {busyId === node.id
                  ? 'animate-spin'
                  : ''}"
                aria-hidden="true"
              ></span>
              Regenerate
            </button>
          </div>
          {#if revisingId === node.id && canUseAI}
            <form
              class="flex w-full items-center gap-1.5"
              onsubmit={(e) => submitRevise(e, { kind: "node", id: node.id })}
            >
              <input
                type="text"
                bind:value={revisionText}
                maxlength="500"
                placeholder="What should change? e.g. make it a flooded clocktower"
                aria-label="How to revise location {node.name}"
                class="min-w-0 flex-1 rounded-lg border border-theme-border/60 bg-theme-bg px-2.5 py-1 text-xs text-theme-text placeholder:text-theme-muted focus:border-theme-primary focus:outline-none"
                onkeydown={(event) => {
                  if (event.key === "Escape") revisingId = null;
                }}
              />
              <button
                type="submit"
                class={buttonClass}
                disabled={!revisionText.trim() || busyId !== null}
              >
                Apply
              </button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>

    <h3
      class="mt-4 border-t border-theme-border/40 pt-3 text-nano font-bold uppercase tracking-wider text-theme-muted"
    >
      Routes ({crawl.routes.length})
    </h3>
    <ul class="mt-1.5 flex flex-col gap-1.5">
      {#each crawl.routes as route (route.id)}
        {@const routeTitle = `${nodeNameById(route.fromNodeId)} → ${nodeNameById(route.toNodeId)}`}
        <li class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="text-theme-text">
            {routeTitle}
            <span class="text-theme-muted"
              >· {formatRouteConnectionLabel(route)}</span
            >
          </span>
          <div class="flex shrink-0 items-center gap-1.5">
            {#if canUseAI}
              <button
                type="button"
                class={buttonClass}
                disabled={busyId !== null}
                aria-label="Revise route {routeTitle}"
                aria-expanded={revisingId === route.id}
                onclick={() => toggleRevise(route.id)}
              >
                <span
                  class="icon-[lucide--pencil] h-3.5 w-3.5"
                  aria-hidden="true"
                ></span>
                Revise
              </button>
            {/if}
            <button
              type="button"
              class={buttonClass}
              disabled={busyId !== null}
              aria-label="Regenerate route {routeTitle}"
              onclick={() => void regenerate({ kind: "route", id: route.id })}
            >
              <span
                class="icon-[lucide--refresh-cw] h-3.5 w-3.5 {busyId ===
                route.id
                  ? 'animate-spin'
                  : ''}"
                aria-hidden="true"
              ></span>
              Regenerate
            </button>
          </div>
          {#if revisingId === route.id && canUseAI}
            <form
              class="flex w-full items-center gap-1.5"
              onsubmit={(e) => submitRevise(e, { kind: "route", id: route.id })}
            >
              <input
                type="text"
                bind:value={revisionText}
                maxlength="500"
                placeholder="What should change? e.g. add a toll collector"
                aria-label="How to revise route {routeTitle}"
                class="min-w-0 flex-1 rounded-lg border border-theme-border/60 bg-theme-bg px-2.5 py-1 text-xs text-theme-text placeholder:text-theme-muted focus:border-theme-primary focus:outline-none"
                onkeydown={(event) => {
                  if (event.key === "Escape") revisingId = null;
                }}
              />
              <button
                type="submit"
                class={buttonClass}
                disabled={!revisionText.trim() || busyId !== null}
              >
                Apply
              </button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>

    <div aria-live="polite">
      {#if notice}
        <p
          class="mt-3 text-micro text-theme-muted"
          data-testid="point-crawl-refine-notice"
        >
          {notice}
        </p>
      {/if}
      {#if warnings.length}
        <ul
          class="mt-2 list-disc pl-4 text-micro text-theme-accent"
          data-testid="point-crawl-refine-warnings"
        >
          {#each warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}
