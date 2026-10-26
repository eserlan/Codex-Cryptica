<script lang="ts">
  import { onDestroy } from "svelte";
  import { StatBlockImportController } from "./stat-block-import-controller.svelte";
  import { defaultStatBlockImportDeps } from "./stat-block-import-deps";
  import StatBlockReview from "./StatBlockReview.svelte";
  import { focusTrap } from "$lib/actions/focusTrap";
  import StatBlockPasteStep from "./StatBlockPasteStep.svelte";

  interface Props {
    entityId?: string | null;
    controller?: StatBlockImportController;
    onClose: () => void;
    onOpenExisting?: (id: string) => void;
  }

  let {
    entityId = null,
    controller: injected,
    onClose,
    onOpenExisting,
  }: Props = $props();

  // Constructor injection: tests pass a controller, the app builds the default.
  // svelte-ignore state_referenced_locally
  const controller =
    injected ??
    new StatBlockImportController(defaultStatBlockImportDeps(entityId));

  onDestroy(() => controller.cancel());

  const clash = $derived(
    controller.step === "name-clash" ? controller.clashEntity() : null,
  );
  const overwrites = $derived(controller.pendingPlan?.overwrites ?? []);

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      controller.cancel();
      onClose();
    }
  }

  function close() {
    controller.cancel();
    onClose();
  }

  const EMPTY = "(empty)";
  function formatValue(value: unknown): string {
    if (Array.isArray(value))
      return value.length > 0 ? value.join(", ") : EMPTY;
    return value == null || value === "" ? EMPTY : String(value);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
  data-testid="stat-block-import-overlay"
>
  <div
    role="dialog"
    use:focusTrap
    aria-modal="true"
    aria-label="Import stat block"
    class="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-auto rounded-lg border border-theme-border bg-theme-surface p-5 text-theme-primary shadow-xl"
    data-testid="stat-block-import-modal"
  >
    <header class="flex items-center justify-between">
      <h2 class="font-bold">Import stat block</h2>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-primary"
        aria-label="Close"
        onclick={close}
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </header>

    {#if controller.step === "paste" || controller.step === "reading"}
      <StatBlockPasteStep {controller} onCancel={close} />
    {/if}

    {#if controller.step === "review"}
      <div class="flex flex-col gap-3" data-testid="stat-block-step-review">
        <StatBlockReview {controller} />

        <label class="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            class="mt-1"
            checked={controller.keepText}
            onchange={(e) =>
              controller.setKeepText(
                (e.currentTarget as HTMLInputElement).checked,
              )}
            data-testid="stat-block-keep-text"
          />
          <span>
            Keep the original text in notes.
            <span class="text-micro text-theme-muted"
              >Notes are included when you share or publish this vault.</span
            >
          </span>
        </label>

        {#if controller.error}
          <p class="text-sm text-theme-danger" role="alert">
            {controller.error}
          </p>
        {/if}

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
            onclick={() => (controller.step = "paste")}>Back</button
          >
          <button
            type="button"
            class="ml-auto rounded border border-theme-primary px-3 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-primary disabled:opacity-50"
            disabled={!controller.canSave}
            onclick={() => void controller.save()}
            data-testid="stat-block-save"
          >
            Save
          </button>
          <button
            type="button"
            class="text-micro font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
            onclick={close}
            data-testid="stat-block-cancel">Cancel</button
          >
        </div>
      </div>
    {/if}

    {#if controller.step === "confirm"}
      <div class="flex flex-col gap-3" data-testid="stat-block-step-confirm">
        <p class="text-sm">These values will be replaced:</p>
        <ul
          class="flex flex-col gap-1 text-sm"
          data-testid="stat-block-overwrites"
        >
          {#each overwrites as write (write.fieldId)}
            <li>
              {write.fieldId}: {formatValue(write.before)} → {formatValue(
                write.after.value ?? write.after.formula ?? write.after.rows,
              )}
            </li>
          {/each}
        </ul>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
            onclick={() => controller.backToReview()}>Back</button
          >
          <button
            type="button"
            class="ml-auto rounded border border-theme-primary px-3 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-primary"
            onclick={() => void controller.commit()}
            data-testid="stat-block-confirm">Replace these values</button
          >
        </div>
      </div>
    {/if}

    {#if controller.step === "name-clash"}
      <div class="flex flex-col gap-3" data-testid="stat-block-step-clash">
        <p class="text-sm">
          An entity called “{controller.result?.name}” already exists in this
          vault.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          {#if clash}
            <button
              type="button"
              class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
              onclick={() => {
                onOpenExisting?.(clash.id);
                close();
              }}>Open existing</button
            >
          {/if}
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
            onclick={() => void controller.importIntoExisting()}
            data-testid="stat-block-import-into">Import into it</button
          >
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
            onclick={() => void controller.createSeparate()}
            data-testid="stat-block-create-separate">Create separate</button
          >
        </div>
      </div>
    {/if}

    {#if controller.step === "saved"}
      <div class="flex flex-col gap-3" data-testid="stat-block-step-saved">
        <p class="text-sm">The stat sheet is saved.</p>
        <button
          type="button"
          class="self-start rounded border border-theme-primary px-3 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-primary"
          onclick={onClose}>Close</button
        >
      </div>
    {/if}
  </div>
</div>
