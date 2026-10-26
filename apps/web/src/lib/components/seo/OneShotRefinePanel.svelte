<script lang="ts">
  import { onDestroy } from "svelte";
  import { oneShotToOutput, renderGmSheet } from "generator-engine";
  import type { OneShotRegenTarget } from "generator-engine";
  import { generatorEngine } from "#lib/services/seo/generator-engine.js";
  import OneShotPartRow from "./OneShotPartRow.svelte";
  import RefineNotice from "./RefineNotice.svelte";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

  let {
    output,
    useAI = false,
    onReplace,
  }: {
    output: GeneratorOutput;
    useAI?: boolean;
    onReplace: (output: GeneratorOutput) => void;
  } = $props();

  const adventure = $derived(output.oneShot);
  let busyId = $state<string | null>(null);
  let warnings = $state<string[]>([]);
  let notice = $state<string | null>(null);
  let requestToken = 0;
  let requestController: AbortController | null = null;

  onDestroy(() => {
    requestController?.abort();
    requestToken += 1;
  });

  function isCurrentRequest(token: number, startedFrom: typeof adventure) {
    return token === requestToken && output.oneShot === startedFrom;
  }

  function settle(token: number) {
    if (token !== requestToken) return;
    busyId = null;
    requestController = null;
  }

  async function regenerate(target: OneShotRegenTarget, instruction = "") {
    if (!adventure || busyId) return;
    busyId = target.id;
    warnings = [];
    notice = null;
    const startedFrom = adventure;
    const token = ++requestToken;
    requestController = new AbortController();
    try {
      const result = await generatorEngine.regenerateOneShotPart(
        adventure,
        target,
        { useAI, instruction, signal: requestController.signal },
      );
      // A new generation arrived while we waited; don't overwrite it.
      if (!isCurrentRequest(token, startedFrom)) return;
      warnings = result.warnings;
      if (result.adventure === startedFrom) return;
      onReplace(oneShotToOutput(result.adventure) as GeneratorOutput);
      const part = target.kind === "scene" ? "the scene" : "the NPC";
      notice = `${instruction ? "Revised" : "Rewrote"} ${part}. Everything else is unchanged.`;
    } catch {
      if (token === requestToken)
        notice = "That didn't work. Nothing was changed.";
    } finally {
      settle(token);
    }
  }

  async function copyGmSheet() {
    if (!adventure) return;
    try {
      await navigator.clipboard.writeText(renderGmSheet(adventure));
      notice = "GM cheat sheet copied.";
    } catch {
      notice = "Couldn't copy. Select the GM sheet text and copy it by hand.";
    }
  }

  const buttonClass =
    "flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
</script>

{#if adventure}
  <section
    class="mt-4 rounded-xl border border-theme-border/60 bg-theme-surface/40 p-4"
    aria-labelledby="one-shot-refine-heading"
    data-testid="one-shot-refine-panel"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2
        id="one-shot-refine-heading"
        class="text-meta font-bold uppercase tracking-wider text-theme-text/80"
      >
        Refine one part
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
      Rewrite a single scene or NPC{useAI ? ", or tell it what to change" : ""}.
      The core truth, clues, times and links stay as they are.
    </p>

    <ul class="mt-3 flex flex-col gap-1.5">
      {#each adventure.scenes as scene (scene.id)}
        <OneShotPartRow
          target={{ kind: "scene", id: scene.id }}
          label={`scene ${scene.title}`}
          meta={`${scene.minutes} min · ${scene.essential ? "essential" : "optional"}`}
          {busyId}
          {useAI}
          {buttonClass}
          onRun={regenerate}
        />
      {/each}
    </ul>

    <ul class="mt-3 flex flex-col gap-1.5 border-t border-theme-border/40 pt-3">
      {#each adventure.npcs as npc (npc.id)}
        <OneShotPartRow
          target={{ kind: "npc", id: npc.id }}
          label={`NPC ${npc.name}`}
          meta={npc.role}
          {busyId}
          {useAI}
          {buttonClass}
          onRun={regenerate}
        />
      {/each}
    </ul>

    <RefineNotice {notice} {warnings} />
  </section>
{/if}
