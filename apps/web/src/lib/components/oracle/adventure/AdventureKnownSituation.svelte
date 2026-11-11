<script lang="ts">
  import {
    playerScenarioProjection,
    type ScenarioEvent,
    type ScenarioItem,
  } from "@codex/adventure-engine";

  let {
    item,
    followed = false,
    disabled = false,
    anchorEntities = [],
    linkedThread = null,
    canCreateThread = true,
    onFollow,
    onRecordTheory,
    onSaveThread,
  }: {
    item: ScenarioItem;
    followed?: boolean;
    disabled?: boolean;
    anchorEntities?: Array<{ id: string; title: string }>;
    linkedThread?: {
      id: string;
      title: string;
      status: "open" | "closed";
    } | null;
    canCreateThread?: boolean;
    onFollow?: () => void;
    onRecordTheory?: (text: string) => Promise<void>;
    onSaveThread?: () => void;
  } = $props();

  let theoryDraft = $state("");
  let recordingTheory = $state(false);

  const statuses = {
    open: { label: "Open", icon: "icon-[lucide--circle-dot]" },
    resolved: { label: "Resolved", icon: "icon-[lucide--circle-check]" },
    abandoned: { label: "Left behind", icon: "icon-[lucide--circle-dashed]" },
  } as const;

  const status = $derived(statuses[item.status] ?? statuses.open);
  const projected = $derived(playerScenarioProjection(item));
  const visibleEvents = $derived(projected?.events ?? []);

  function eventLabel(kind: ScenarioEvent["kind"]): string {
    switch (kind) {
      case "discovery":
        return "Observed";
      case "consequence":
        return "Consequence";
      case "theory":
        return "Conjecture";
      case "status-change":
        return "Status";
      default:
        return "Update";
    }
  }

  async function submitTheory(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = theoryDraft.trim();
    if (!trimmed || !onRecordTheory || recordingTheory || disabled) return;
    recordingTheory = true;
    try {
      await onRecordTheory(trimmed);
      theoryDraft = "";
    } finally {
      recordingTheory = false;
    }
  }
</script>

{#snippet header()}
  <div class="flex items-start justify-between gap-3">
    <p class="min-w-0 text-sm font-semibold leading-snug text-theme-text">
      {item.playerVisible.lead}
    </p>
    <span
      class="inline-flex shrink-0 items-center gap-1 rounded-full border border-theme-border bg-theme-bg px-2 py-0.5 text-xs font-medium text-theme-text"
    >
      <span class="{status.icon} h-3 w-3" aria-hidden="true"></span>
      {status.label}
    </span>
  </div>
{/snippet}

{#snippet followAndRumourBar()}
  <div class="flex flex-wrap items-center justify-between gap-2">
    <p class="text-xs text-theme-text">Reported rumour · not yet verified</p>
    {#if item.status === "open" && onFollow}
      <button
        type="button"
        class="min-h-10 rounded-md border border-theme-border px-3 text-sm text-theme-text hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary disabled:opacity-50"
        {disabled}
        aria-pressed={followed}
        aria-label={followed
          ? `Unfollow ${item.playerVisible.lead}`
          : `Follow ${item.playerVisible.lead}`}
        onclick={onFollow}
      >
        {followed ? "Following · Unfollow" : "Follow lead"}
      </button>
    {/if}
  </div>
{/snippet}

{#snippet anchorAndThreadBadges()}
  {#if anchorEntities.length > 0 || linkedThread || (onSaveThread && canCreateThread)}
    <div class="flex flex-wrap items-center gap-2 pt-1">
      {#each anchorEntities as entity (entity.id)}
        <span
          class="inline-flex items-center gap-1 rounded-md border border-theme-border bg-theme-bg px-2 py-0.5 text-xs text-theme-text"
          title="Linked Vault entity"
        >
          <span class="icon-[lucide--link] h-3 w-3" aria-hidden="true"></span>
          {entity.title}
        </span>
      {/each}
      {#if linkedThread}
        <span
          class="inline-flex items-center gap-1 rounded-md border border-theme-border bg-theme-bg px-2 py-0.5 text-xs font-medium text-theme-text"
          title="Solo Thread in Vault"
        >
          <span class="icon-[lucide--git-branch] h-3 w-3" aria-hidden="true"
          ></span>
          Solo Thread · {linkedThread.status === "open" ? "Open" : "Closed"}
        </span>
      {:else if onSaveThread && canCreateThread}
        <button
          type="button"
          class="min-h-8 inline-flex items-center gap-1 rounded-md border border-theme-border px-2 text-xs text-theme-text hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary disabled:opacity-50"
          {disabled}
          onclick={onSaveThread}
        >
          <span class="icon-[lucide--bookmark] h-3 w-3" aria-hidden="true"
          ></span>
          Save to Solo Threads
        </button>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet conjectureForm()}
  {#if onRecordTheory}
    <form
      class="flex flex-wrap items-center gap-2 border-t border-theme-border pt-2"
      onsubmit={submitTheory}
    >
      <label for="theory-{item.id}" class="sr-only"
        >Record conjecture for {item.playerVisible.lead}</label
      >
      <input
        id="theory-{item.id}"
        type="text"
        class="min-h-9 flex-1 min-w-40 rounded-md border border-theme-border bg-theme-surface px-2.5 text-xs text-theme-text placeholder:text-theme-text/60 focus-visible:outline-2 focus-visible:outline-theme-primary disabled:opacity-50"
        placeholder="Record a theory or conjecture…"
        bind:value={theoryDraft}
        disabled={disabled || recordingTheory}
      />
      <button
        type="submit"
        class="min-h-9 rounded-md border border-theme-border px-2.5 text-xs font-medium text-theme-text hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary disabled:opacity-50"
        disabled={disabled || recordingTheory || !theoryDraft.trim()}
      >
        Save conjecture
      </button>
    </form>
  {/if}
{/snippet}

<li
  class="space-y-2 rounded-lg border border-theme-border bg-theme-surface p-3"
>
  {@render header()}
  {@render followAndRumourBar()}

  <blockquote
    class="border-l-2 border-theme-primary pl-3 text-sm italic leading-relaxed text-theme-text"
  >
    {item.playerVisible.rumour}
  </blockquote>

  {@render anchorAndThreadBadges()}

  {#if visibleEvents.length > 0}
    <details class="border-t border-theme-border pt-2" open>
      <summary class="cursor-pointer text-xs font-medium text-theme-text">
        Known developments ({visibleEvents.length})
      </summary>
      <ul class="mt-2 space-y-1 text-xs leading-relaxed text-theme-text">
        {#each visibleEvents as event (event.id)}
          <li><strong>{eventLabel(event.kind)}:</strong> {event.text}</li>
        {/each}
      </ul>
    </details>
  {/if}

  {@render conjectureForm()}
</li>
