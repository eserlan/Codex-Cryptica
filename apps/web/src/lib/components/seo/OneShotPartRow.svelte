<script lang="ts">
  import type { OneShotRegenTarget } from "generator-engine";

  let {
    target,
    label,
    meta,
    busyId,
    useAI = false,
    buttonClass,
    onRun,
  }: {
    target: OneShotRegenTarget;
    /** e.g. "scene The Gate", used in accessible names. */
    label: string;
    meta: string;
    busyId: string | null;
    useAI?: boolean;
    buttonClass: string;
    /** Regenerate the part; a non-empty instruction asks for a revision. */
    onRun: (target: OneShotRegenTarget, instruction?: string) => void;
  } = $props();

  let revising = $state(false);
  let revision = $state("");
  const title = $derived(label.replace(/^(scene|NPC) /, ""));

  function toggleRevise() {
    revising = !revising;
    revision = "";
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const instruction = revision.trim();
    if (!instruction) return;
    revising = false;
    revision = "";
    onRun(target, instruction);
  }
</script>

<li class="flex flex-wrap items-center justify-between gap-2 text-xs">
  <span class="text-theme-text">
    {title} <span class="text-theme-muted">· {meta}</span>
  </span>
  <div class="flex shrink-0 items-center gap-1.5">
    {#if useAI}
      <button
        type="button"
        class={buttonClass}
        disabled={busyId !== null}
        aria-label={`Revise ${label}`}
        aria-expanded={revising}
        onclick={toggleRevise}
      >
        <span class="icon-[lucide--pencil] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Revise
      </button>
    {/if}
    <button
      type="button"
      class={buttonClass}
      disabled={busyId !== null}
      aria-label={`Regenerate ${label}`}
      onclick={() => onRun(target)}
    >
      <span
        class="icon-[lucide--refresh-cw] h-3.5 w-3.5"
        class:animate-spin={busyId === target.id}
        aria-hidden="true"
      ></span>
      Regenerate
    </button>
  </div>
  {#if revising}
    <form class="flex w-full items-center gap-1.5" onsubmit={submit}>
      <input
        type="text"
        bind:value={revision}
        maxlength="500"
        placeholder="What should change? e.g. make the guard bribable"
        aria-label={`How to revise ${label}`}
        class="min-w-0 flex-1 rounded-lg border border-theme-border/60 bg-theme-bg px-2.5 py-1 text-xs text-theme-text placeholder:text-theme-muted focus:border-theme-primary focus:outline-none"
        onkeydown={(event) => {
          if (event.key === "Escape") revising = false;
        }}
        {@attach (node) => node.focus()}
      />
      <button
        type="submit"
        class={buttonClass}
        disabled={!revision.trim() || busyId !== null}
      >
        Apply
      </button>
    </form>
  {/if}
</li>
