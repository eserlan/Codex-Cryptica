<script lang="ts">
  import { tick } from "svelte";
  import type { RefinementDocument } from "generator-engine";
  import { GeneratorRefinementService } from "$lib/services/GeneratorRefinementService.svelte";

  let {
    open,
    service,
    onAccept,
    onCancel,
    onRequested,
  }: {
    open: boolean;
    service: GeneratorRefinementService;
    onAccept: (document: RefinementDocument) => void;
    onCancel: () => void;
    onRequested?: (repeated: boolean) => void;
  } = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let instructions = $state("");
  let cancelNotified = false;
  let current = $derived(service.proposal ?? service.source);

  $effect(() => {
    if (!dialog) return;
    if (open && current && !dialog.open) {
      cancelNotified = false;
      dialog.showModal();
      instructions = "";
      void tick().then(() =>
        dialog?.querySelector<HTMLTextAreaElement>("textarea")?.focus(),
      );
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function close() {
    if (cancelNotified) return;
    cancelNotified = true;
    onCancel();
  }

  async function submit() {
    onRequested?.(service.iteration > 0);
    await (service.proposal
      ? service.refineAgain(instructions)
      : service.refine(instructions));
    if (!service.error) instructions = "";
  }

  function accept() {
    const accepted = service.accept();
    if (accepted) onAccept(accepted);
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="generator-refinement-title"
  aria-describedby="generator-refinement-help"
  class="w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] rounded-2xl border border-theme-border bg-theme-surface p-0 text-theme-text shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
  onclose={() => open && close()}
>
  {#if current}
    <form
      method="dialog"
      class="flex max-h-[90vh] flex-col"
      onsubmit={(event) => event.preventDefault()}
    >
      <header
        class="flex items-start justify-between gap-4 border-b border-theme-border/60 px-6 py-5"
      >
        <div>
          <p
            class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-theme-primary"
          >
            {service.proposal ? "Reviewing revision" : "Refine draft"}
          </p>
          <h2
            id="generator-refinement-title"
            class="mt-1 font-header text-xl font-bold"
          >
            {current.title}
          </h2>
          <p
            id="generator-refinement-help"
            class="mt-2 max-w-prose text-sm text-theme-muted"
          >
            Describe the change you want. The original stays unchanged until you
            use a revision.
          </p>
        </div>
        <button
          type="button"
          onclick={close}
          class="rounded-lg p-2 text-theme-muted hover:text-theme-text"
          aria-label="Close refinement dialog"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-5 w-5"></span>
        </button>
      </header>

      <div class="overflow-y-auto px-6 py-5">
        {#if service.proposal}
          <div
            class="mb-5 rounded-xl border border-theme-primary/30 bg-theme-primary/5 p-4"
          >
            <p
              class="mb-2 text-[10px] font-bold uppercase tracking-widest text-theme-primary"
            >
              Latest revision
            </p>
            <p
              class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text/85"
            >
              {service.proposal.content}
            </p>
          </div>
        {/if}
        <label
          for="refinement-instructions"
          class="mb-2 block text-xs font-bold uppercase tracking-widest text-theme-text/80"
        >
          {service.proposal
            ? "What should change next?"
            : "What should change?"}
        </label>
        <textarea
          id="refinement-instructions"
          bind:value={instructions}
          rows="4"
          class="w-full resize-y rounded-xl border border-theme-border bg-theme-bg/50 p-3 text-sm text-theme-text outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/30"
          placeholder="e.g. Make the motivation more conflicted and add a concrete story hook."
          aria-describedby="refinement-instructions-hint"
          disabled={service.isRefining}
        ></textarea>
        <p
          id="refinement-instructions-hint"
          class="mt-2 text-xs text-theme-muted"
        >
          One focused instruction usually gives the best result.
        </p>
        {#if service.error}
          <p
            class="mt-3 rounded-lg border border-theme-danger/40 bg-theme-danger/10 p-3 text-sm text-theme-danger"
            role="alert"
          >
            {service.error}
          </p>
        {/if}
      </div>

      <footer
        class="flex flex-wrap items-center justify-end gap-2 border-t border-theme-border/60 bg-theme-surface/40 px-6 py-4"
      >
        <button
          type="button"
          onclick={close}
          class="rounded-lg border border-theme-border/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-theme-text hover:bg-theme-surface"
          disabled={service.isRefining}
          aria-busy={service.isRefining}
        >
          Cancel
        </button>
        {#if service.proposal}
          <button
            type="button"
            onclick={accept}
            class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-theme-bg hover:brightness-110"
            disabled={service.isRefining}
            aria-busy={service.isRefining}
          >
            Use revision
          </button>
          <button
            type="button"
            onclick={submit}
            class="rounded-lg border border-theme-primary/40 bg-theme-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-theme-primary hover:bg-theme-primary/20"
            disabled={service.isRefining || !instructions.trim()}
            aria-busy={service.isRefining}
          >
            {service.isRefining ? "Refining…" : "Refine again"}
          </button>
        {:else}
          <button
            type="button"
            onclick={submit}
            class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-theme-bg hover:brightness-110"
            disabled={service.isRefining || !instructions.trim()}
            aria-busy={service.isRefining}
          >
            {service.isRefining ? "Refining…" : "Refine"}
          </button>
        {/if}
      </footer>
    </form>
  {/if}
</dialog>
