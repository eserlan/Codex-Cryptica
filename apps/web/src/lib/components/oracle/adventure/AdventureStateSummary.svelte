<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { Snippet } from "svelte";
  let {
    manager,
    variant = "strip",
    maxExpandedHeightPx,
    media,
  }: {
    manager: AdventureManager;
    variant?: "strip" | "panel";
    maxExpandedHeightPx?: number;
    media?: Snippet;
  } = $props();
  const uid = $props.id();
  const headingId = `adventure-state-heading-${uid}`;

  let detailsEl = $state<HTMLDetailsElement>();
  let summaryEl = $state<HTMLElement>();

  const STATUS_LABELS = {
    open: "Open",
    resolved: "Resolved",
    abandoned: "Left behind",
  } as const;

  const locationText = $derived(manager.recap?.location?.text?.trim() || null);
  const summaryLocation = $derived(locationText ?? "Current situation");
  const situationText = $derived(
    manager.recap?.situation?.text?.trim() || null,
  );
  const elapsedTimeLabel = $derived(
    manager.recap?.elapsedTimeLabel?.trim() || null,
  );

  // Only non-empty groups are listed.
  const groups = $derived.by(() => {
    const recap = manager.recap;
    if (!recap) return [];
    const leadItems =
      recap.knownLeads?.map((lead) => {
        const statusLabel = STATUS_LABELS[lead.status] ?? "Open";
        const focusSuffix = lead.focused ? ", following" : "";
        const updateSuffix = lead.lastUpdate ? ` — ${lead.lastUpdate}` : "";
        return `${lead.lead} (${statusLabel}${focusSuffix})${updateSuffix}`;
      }) ?? [];
    return [
      { label: "Objectives", items: recap.objectives.map((item) => item.text) },
      {
        label: "Who's here",
        items: recap.activeCharacters.map((item) => item.text),
      },
      {
        label: "What you know",
        items: recap.knownFacts.map((item) => item.text),
      },
      { label: "Known leads", items: leadItems },
      { label: "Recap: what just happened", items: recap.recentTurnSummaries },
    ].filter((group) => group.items.length > 0);
  });

  const hasExpandedDetails = $derived(
    Boolean(
      locationText || elapsedTimeLabel || situationText || groups.length > 0,
    ),
  );

  function handleDetailsKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && detailsEl?.open) {
      event.preventDefault();
      detailsEl.open = false;
      summaryEl?.focus();
    }
  }
</script>

{#if manager.session && manager.recap}
  {#if variant === "panel"}
    {@render scenePanel(manager.recap)}
  {:else}
    {@render sceneStrip()}
  {/if}
{/if}

{#snippet scenePanel(recap: NonNullable<AdventureManager["recap"]>)}
  <section
    aria-labelledby={headingId}
    data-testid="adventure-scene-panel"
    class="space-y-3 text-sm text-theme-text"
  >
    <h3 id={headingId} class="font-header text-base font-bold">
      Current scene
    </h3>
    {#if recap.location}
      <p
        class="font-semibold break-words"
        data-testid="adventure-scene-location"
      >
        {recap.location.text}
      </p>
    {/if}
    {@render media?.()}
    {#if recap.situation}
      <p>{recap.situation.text}</p>
    {/if}
    {@render sceneGroups()}
  </section>
{/snippet}

{#snippet sceneStrip()}
  <section aria-labelledby={headingId} data-testid="adventure-scene-strip">
    <h3 id={headingId} class="sr-only">Current situation</h3>
    <!-- Compact by default: the transcript is the primary play surface. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <details
      bind:this={detailsEl}
      class="group border-b border-theme-border/60 bg-theme-surface/35"
      data-testid="adventure-scene-details"
      onkeydown={handleDetailsKeydown}
    >
      <summary
        bind:this={summaryEl}
        aria-label={`Scene details: ${summaryLocation}`}
        title={summaryLocation}
        class="flex min-h-9 cursor-pointer list-none items-center gap-1.5 px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-surface/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theme-primary sm:px-4 [&::-webkit-details-marker]:hidden"
      >
        <span
          class="icon-[lucide--map-pin] h-3.5 w-3.5 shrink-0 text-theme-muted"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 truncate font-medium text-theme-text/90">
          {summaryLocation}
        </span>
        <span
          class="icon-[lucide--chevron-down] h-3.5 w-3.5 shrink-0 text-theme-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        ></span>
      </summary>
      <!-- fallow-ignore-next-line css-broken-reference -->
      <div
        data-testid="adventure-scene-details-body"
        class="max-h-[min(32dvh,16rem)] space-y-2.5 overflow-y-auto overscroll-contain border-t border-theme-border/60 bg-theme-surface/75 px-3 py-2.5 text-sm text-theme-text sm:px-4"
        style:max-height={maxExpandedHeightPx
          ? `${maxExpandedHeightPx}px`
          : undefined}
      >
        {#if locationText || elapsedTimeLabel}
          <div
            class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
          >
            {#if locationText}
              <!-- The summary line truncates; the full place name is always here. -->
              <p
                class="min-w-0 break-words"
                data-testid="adventure-scene-location"
              >
                <span class="font-semibold">Location:</span>
                <span>{locationText}</span>
              </p>
            {/if}
            {#if elapsedTimeLabel}
              <p
                class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-theme-text"
                data-testid="adventure-scene-elapsed"
                title="Elapsed fictional time"
              >
                <span
                  class="icon-[lucide--clock] h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                ></span>
                <span>{elapsedTimeLabel}</span>
              </p>
            {/if}
          </div>
        {/if}
        {#if situationText}
          <p class="break-words">{situationText}</p>
        {/if}
        {@render sceneGroups()}
        {#if !hasExpandedDetails}
          <p
            class="text-xs text-theme-text"
            data-testid="adventure-scene-empty"
          >
            No additional scene details yet.
          </p>
        {/if}
      </div>
    </details>
  </section>
{/snippet}

{#snippet sceneGroups()}
  {#each groups as group (group.label)}
    <div>
      <h4 class="font-semibold">{group.label}</h4>
      <ul class="mt-1 list-disc pl-5 text-theme-text">
        {#each group.items as item, index (index)}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
  {/each}
{/snippet}
