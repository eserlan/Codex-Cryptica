<script lang="ts">
  import { computePosition, flip, offset, shift } from "@floating-ui/dom";
  import { onMount, tick, untrack } from "svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import {
    getMeanings,
    validateRange,
    type TemporalMeaning,
  } from "chronology-engine";
  import type { Entity, TemporalMetadata } from "schema";

  let {
    entity,
    targetYear,
    existingAnchorId,
    anchorPosition,
    linkedEntityTitle,
    conflict = false,
    onSave,
    onRemove,
    onCancel,
  }: {
    entity: Entity;
    targetYear: number;
    existingAnchorId?: string;
    anchorPosition?: { x: number; y: number };
    linkedEntityTitle?: string | null;
    conflict?: boolean;
    onSave: (detail: {
      meaning: TemporalMeaning;
      date?: TemporalMetadata;
      start_date?: TemporalMetadata;
      end_date?: TemporalMetadata;
      customLabel?: string;
      existingAnchorId?: string;
      createNewAnchor?: boolean;
      createEvent?: boolean;
      eventTitle?: string;
    }) => void | Promise<void>;
    onRemove?: (anchorId: string) => void | Promise<void>;
    onCancel: () => void;
  } = $props();

  const initialMeanings = untrack(() => getMeanings(entity.type));
  const initialIsPrimaryRangeStart = untrack(
    () => existingAnchorId === "primary-range-start",
  );
  const initialIsPrimaryRangeEnd = untrack(
    () => existingAnchorId === "primary-range-end",
  );
  const initialAnchor = untrack(() =>
    existingAnchorId
      ? entity.temporalAnchors?.find((anchor) => anchor.id === existingAnchorId)
      : undefined,
  );
  const initialSelectedId = untrack(() => {
    if (
      existingAnchorId === "primary-range-start" ||
      existingAnchorId === "primary-range-end"
    ) {
      return initialMeanings.find((meaning) => meaning.kind === "span")?.id;
    }
    if (initialAnchor) {
      return initialMeanings.find(
        (meaning) => meaning.id === initialAnchor.type,
      )?.id;
    }
    return undefined;
  });
  const meanings = $derived(getMeanings(entity.type));
  const existingAnchor = $derived(
    existingAnchorId
      ? entity.temporalAnchors?.find((anchor) => anchor.id === existingAnchorId)
      : undefined,
  );
  const isPrimaryRangeStart = $derived(
    existingAnchorId === "primary-range-start",
  );
  const isPrimaryRangeEnd = $derived(existingAnchorId === "primary-range-end");
  const editsSinglePrimaryRangeSide = $derived(
    isPrimaryRangeStart || isPrimaryRangeEnd,
  );
  let selectedId = $state(
    initialSelectedId ?? initialMeanings[0]?.id ?? "date",
  );
  let customLabel = $state("");
  let startDate = $state<TemporalMetadata | undefined>(
    (initialIsPrimaryRangeStart
      ? untrack(() => entity.start_date)
      : undefined) ??
      initialAnchor?.date ??
      initialAnchor?.start_date ??
      untrack(() => ({ year: targetYear })),
  );
  let endDate = $state<TemporalMetadata | undefined>(
    (initialIsPrimaryRangeEnd ? untrack(() => entity.end_date) : undefined) ??
      initialAnchor?.end_date ??
      untrack(() => ({ year: targetYear })),
  );
  let createNewAnchor = $state(false);
  let createEvent = $state(false);
  let eventTitle = $state(untrack(() => `${entity.title} - ${targetYear}`));
  let isSaving = $state(false);
  let popoverElement = $state<HTMLElement>();
  let x = $state(0);
  let y = $state(0);

  const selectedMeaning = $derived(
    meanings.find((meaning) => meaning.id === selectedId) ?? meanings[0],
  );
  const isSpan = $derived(selectedMeaning?.kind === "span");
  const rangeState = $derived(
    isSpan ? validateRange(startDate, endDate) : { valid: true as const },
  );
  const isCustomLabelInvalid = $derived(
    selectedMeaning?.id === "custom" && customLabel.trim() === "",
  );
  const linkedStatus = $derived.by(() => {
    if (!existingAnchor?.linkedEntityId) return "";
    if (linkedEntityTitle) return `Linked event: ${linkedEntityTitle}`;
    return "Linked event is missing. The anchor will remain editable.";
  });
  const writeTarget = $derived.by(() => {
    if (createEvent) return "A new linked Event will be created.";
    if (!selectedMeaning) return "";
    if (selectedMeaning.target === "date")
      return "This will update the entity date.";
    if (
      selectedMeaning.target === "start_date" ||
      selectedMeaning.target === "end_date"
    ) {
      return "This will update the entity range.";
    }
    if (existingAnchorId && !createNewAnchor)
      return "This will update the selected anchor.";
    return "This will create a temporal anchor.";
  });

  async function save() {
    if (
      isSaving ||
      !selectedMeaning ||
      !rangeState.valid ||
      isCustomLabelInvalid
    )
      return;
    isSaving = true;
    try {
      await onSave({
        meaning: selectedMeaning,
        date: isSpan || editsSinglePrimaryRangeSide ? undefined : startDate,
        start_date: isSpan || isPrimaryRangeStart ? startDate : undefined,
        end_date:
          (isSpan && !editsSinglePrimaryRangeSide) || isPrimaryRangeEnd
            ? endDate
            : undefined,
        customLabel: selectedMeaning.id === "custom" ? customLabel : undefined,
        existingAnchorId,
        createNewAnchor,
        createEvent,
        eventTitle,
      });
    } finally {
      isSaving = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onCancel();
  }

  function remove() {
    if (existingAnchorId) onRemove?.(existingAnchorId);
  }

  const updatePosition = async () => {
    if (!popoverElement || !anchorPosition) return;
    const virtualReference = {
      getBoundingClientRect: () =>
        ({
          x: anchorPosition.x,
          y: anchorPosition.y,
          top: anchorPosition.y,
          left: anchorPosition.x,
          right: anchorPosition.x,
          bottom: anchorPosition.y,
          width: 0,
          height: 0,
        }) as DOMRect,
    };
    const next = await computePosition(virtualReference, popoverElement, {
      placement: "right-start",
      middleware: [offset(12), flip(), shift({ padding: 12 })],
    });
    x = next.x;
    y = next.y;
  };

  onMount(() => {
    tick().then(updatePosition);
  });

  $effect(() => {
    void anchorPosition?.x;
    void anchorPosition?.y;
    tick().then(updatePosition);
  });
</script>

<div
  bind:this={popoverElement}
  class="fixed z-[70] w-80 rounded border border-theme-border bg-theme-surface p-4 text-theme-text shadow-xl"
  role="dialog"
  aria-labelledby="chronology-placement-title"
  tabindex="-1"
  onkeydown={handleKeydown}
  style:left="{x}px"
  style:top="{y}px"
>
  <div class="mb-3 flex items-start justify-between gap-3">
    <div>
      <h2
        id="chronology-placement-title"
        class="text-sm font-bold text-theme-primary"
      >
        Place {entity.title}
      </h2>
      <p class="text-xs text-theme-muted">Target year: {targetYear}</p>
    </div>
    <button
      type="button"
      class="rounded p-1 text-theme-muted hover:text-theme-primary"
      aria-label="Cancel placement"
      title="Cancel"
      onclick={onCancel}
    >
      <span class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>

  {#if entity.type === "event" && selectedMeaning?.target === "date"}
    <p class="mb-3 text-sm">Set event date to {targetYear}?</p>
  {:else}
    <fieldset class="mb-3 space-y-2">
      <legend
        class="mb-2 text-xs font-bold uppercase tracking-widest text-theme-muted"
      >
        Meaning
      </legend>
      {#each meanings as meaning (meaning.id)}
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" bind:group={selectedId} value={meaning.id} />
          <span>{meaning.label}</span>
        </label>
      {/each}
    </fieldset>
  {/if}

  {#if selectedMeaning?.id === "custom"}
    <label class="mb-3 block text-xs font-bold text-theme-muted">
      Custom label
      <input
        class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
        bind:value={customLabel}
      />
    </label>
  {/if}

  <div class="mb-3 space-y-2">
    <TemporalEditor
      bind:value={startDate}
      label={isSpan ? "Start date" : "Date"}
    />
    {#if isSpan}
      <TemporalEditor
        bind:value={endDate}
        label="End date"
        referenceValue={startDate}
      />
    {/if}
  </div>

  {#if existingAnchorId}
    <label class="mb-3 flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={createNewAnchor} />
      <span>Create a new anchor instead</span>
    </label>
  {/if}

  <label class="mb-3 flex items-center gap-2 text-sm">
    <input type="checkbox" bind:checked={createEvent} />
    <span>Create an event here</span>
  </label>

  {#if createEvent}
    <label class="mb-3 block text-xs font-bold text-theme-muted">
      Event title
      <input
        class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
        bind:value={eventTitle}
      />
    </label>
  {/if}

  {#if linkedStatus}
    <p
      class="mb-3 rounded border border-theme-border/60 bg-theme-bg/60 p-2 text-xs text-theme-muted"
      data-testid="linked-anchor-status"
    >
      {linkedStatus}
    </p>
  {/if}

  <p class="mb-3 text-xs text-theme-muted">{writeTarget}</p>
  {#if conflict}
    <p
      class="mb-3 rounded border border-feedback-warning/50 bg-feedback-warning/10 p-2 text-xs text-feedback-warning"
    >
      This entity changed while the placement was open. Review it before saving.
    </p>
  {/if}
  {#if !rangeState.valid}
    <p
      class="mb-3 rounded border border-feedback-error/50 bg-feedback-error/10 p-2 text-xs text-feedback-error"
    >
      {rangeState.reason}
    </p>
  {/if}
  {#if isCustomLabelInvalid}
    <p
      class="mb-3 rounded border border-feedback-error/50 bg-feedback-error/10 p-2 text-xs text-feedback-error"
    >
      Custom anchor label cannot be empty.
    </p>
  {/if}

  <div class="flex justify-end gap-2">
    {#if existingAnchorId && onRemove}
      <button
        type="button"
        class="mr-auto rounded border border-feedback-error/50 px-3 py-1.5 text-xs font-bold text-feedback-error hover:bg-feedback-error/10"
        onclick={remove}
      >
        Remove
      </button>
    {/if}
    <button
      type="button"
      class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold text-theme-muted hover:text-theme-primary"
      onclick={onCancel}
    >
      Cancel
    </button>
    <button
      type="button"
      class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-bg disabled:opacity-50"
      disabled={isSaving || !rangeState.valid || isCustomLabelInvalid}
      aria-busy={isSaving}
      onclick={save}
    >
      Save
    </button>
  </div>
</div>
