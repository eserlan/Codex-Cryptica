<script lang="ts">
  import { oneShotToOutput, renderGmSheet } from "generator-engine";
  import type { OneShotRegenTarget } from "generator-engine";
  import { generatorEngine } from "$lib/services/seo/generator-engine";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

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

  async function regenerate(target: OneShotRegenTarget) {
    if (!adventure || busyId) return;
    busyId = target.id;
    warnings = [];
    notice = null;
    const startedFrom = adventure;
    try {
      const result = await generatorEngine.regenerateOneShotPart(
        adventure,
        target,
        { useAI },
      );
      // A new generation arrived while we waited; don't overwrite it.
      if (output.oneShot !== startedFrom) return;
      warnings = result.warnings;
      if (result.adventure !== startedFrom) {
        onReplace(oneShotToOutput(result.adventure) as GeneratorOutput);
        notice = `Rewrote ${target.kind === "scene" ? "the scene" : "the NPC"}. Everything else is unchanged.`;
      }
    } catch {
      notice = "That didn't work. Nothing was changed.";
    } finally {
      busyId = null;
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

{#snippet regenButton(target: OneShotRegenTarget, label: string)}
  <button
    type="button"
    class={buttonClass}
    disabled={busyId !== null}
    aria-label={label}
    onclick={() => regenerate(target)}
  >
    <span
      class="icon-[lucide--refresh-cw] h-3.5 w-3.5"
      class:animate-spin={busyId === target.id}
      aria-hidden="true"
    ></span>
    Regenerate
  </button>
{/snippet}

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
      Rewrite a single scene or NPC. The core truth, clues, times and links stay
      as they are.
    </p>

    <ul class="mt-3 flex flex-col gap-1.5">
      {#each adventure.scenes as scene (scene.id)}
        <li class="flex items-center justify-between gap-2 text-xs">
          <span class="text-theme-text">
            {scene.title}
            <span class="text-theme-muted"
              >· {scene.minutes} min · {scene.essential
                ? "essential"
                : "optional"}</span
            >
          </span>
          {@render regenButton(
            { kind: "scene", id: scene.id },
            `Regenerate scene ${scene.title}`,
          )}
        </li>
      {/each}
    </ul>

    <ul class="mt-3 flex flex-col gap-1.5 border-t border-theme-border/40 pt-3">
      {#each adventure.npcs as npc (npc.id)}
        <li class="flex items-center justify-between gap-2 text-xs">
          <span class="text-theme-text"
            >{npc.name} <span class="text-theme-muted">· {npc.role}</span></span
          >
          {@render regenButton(
            { kind: "npc", id: npc.id },
            `Regenerate NPC ${npc.name}`,
          )}
        </li>
      {/each}
    </ul>

    <div aria-live="polite">
      {#if notice}
        <p class="mt-3 text-micro text-theme-muted">{notice}</p>
      {/if}
      {#if warnings.length}
        <ul class="mt-2 list-disc pl-4 text-micro text-theme-accent">
          {#each warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}
