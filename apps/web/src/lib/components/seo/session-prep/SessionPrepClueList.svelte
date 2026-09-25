<script lang="ts">
  import { defaultIdFactory, type PrepClue } from "generator-engine";
  import PrepAiTag from "./PrepAiTag.svelte";
  import {
    prepAddClass,
    prepFieldClass,
    prepRemoveClass,
  } from "./prep-field-styles";

  let {
    clues = $bindable(),
    locked,
    aiDisabled,
    bottlenecks,
    routesInFlight,
    routeErrors,
    onSuggestRoutes,
  }: {
    clues: PrepClue[];
    locked: boolean;
    aiDisabled: boolean;
    bottlenecks: Set<string>;
    /** Id of the fact whose routes AI is currently suggesting. */
    routesInFlight: string | null;
    routeErrors: Record<string, string | undefined>;
    onSuggestRoutes: (clueId: string) => void;
  } = $props();

  function markGm(clue: PrepClue) {
    clue.source = "gm";
  }

  function addClue() {
    clues = [
      ...clues,
      {
        id: defaultIdFactory(),
        source: "gm",
        fact: "",
        routes: [],
        critical: true,
      },
    ];
  }
</script>

<ul class="space-y-2.5">
  {#each clues as clue, index (clue.id)}
    <li class="space-y-1.5">
      <div class="flex items-start gap-1.5">
        <input
          bind:value={clue.fact}
          oninput={() => markGm(clue)}
          disabled={locked}
          placeholder="The fact"
          aria-label="The fact"
          class="{prepFieldClass} flex-1"
        />
        <PrepAiTag source={clue.source} />
        <button
          type="button"
          onclick={() => (clues = clues.filter((_, i) => i !== index))}
          disabled={locked}
          class={prepRemoveClass}
          aria-label="Remove fact"
          title="Remove"
        >
          <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
      </div>
      <textarea
        value={clue.routes.join("\n")}
        oninput={(event) => {
          clue.routes = event.currentTarget.value.split("\n");
          markGm(clue);
        }}
        disabled={locked}
        rows="2"
        placeholder="Ways to find it, one per line"
        aria-label="Ways to find this fact, one per line"
        class={prepFieldClass}
      ></textarea>
      <label class="flex items-center gap-1.5 text-[11px] text-theme-muted">
        <input type="checkbox" bind:checked={clue.critical} disabled={locked} />
        Progress depends on this
      </label>
      {#if bottlenecks.has(clue.id)}
        <div
          class="flex flex-wrap items-center gap-2 rounded-lg border border-theme-accent/40 bg-theme-accent/10 px-2 py-1.5"
        >
          <p class="flex-1 text-[11px] leading-snug text-theme-text">
            This fact looks needed for progress but has only one way to be
            found.
          </p>
          <button
            type="button"
            onclick={() => onSuggestRoutes(clue.id)}
            disabled={aiDisabled}
            class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-theme-primary transition hover:brightness-110 disabled:opacity-50"
          >
            <span
              class={routesInFlight === clue.id
                ? "icon-[lucide--loader-circle] h-3.5 w-3.5 animate-spin"
                : "icon-[lucide--sparkles] h-3.5 w-3.5"}
              aria-hidden="true"
            ></span>
            Suggest more ways
          </button>
          {#if routeErrors[clue.id]}
            <p role="alert" class="w-full text-[11px] text-theme-danger">
              {routeErrors[clue.id]}
            </p>
          {/if}
        </div>
      {/if}
    </li>
  {/each}
</ul>
<button type="button" onclick={addClue} disabled={locked} class={prepAddClass}>
  <span class="icon-[lucide--plus] h-3.5 w-3.5" aria-hidden="true"></span>
  Add fact
</button>
