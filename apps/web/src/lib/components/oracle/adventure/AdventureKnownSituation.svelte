<script lang="ts">
  import type { ScenarioEvent, ScenarioItem } from "@codex/adventure-engine";

  let {
    item,
    followed = false,
    disabled = false,
    onFollow,
  }: {
    item: ScenarioItem;
    followed?: boolean;
    disabled?: boolean;
    onFollow?: () => void;
  } = $props();

  const statuses = {
    open: { label: "Open", icon: "icon-[lucide--circle-dot]" },
    resolved: { label: "Resolved", icon: "icon-[lucide--circle-check]" },
    abandoned: { label: "Left behind", icon: "icon-[lucide--circle-dashed]" },
  } as const;

  const status = $derived(statuses[item.status] ?? statuses.open);
  const visibleEvents = $derived(
    item.events.filter((event) => event.visibility === "player"),
  );

  function eventLabel(kind: ScenarioEvent["kind"]): string {
    switch (kind) {
      case "discovery":
        return "Observed";
      case "consequence":
        return "Consequence";
      default:
        return "Update";
    }
  }
</script>

<li class="space-y-2 rounded-lg border border-theme-border bg-theme-surface p-3">
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

  <blockquote
    class="border-l-2 border-theme-primary pl-3 text-sm italic leading-relaxed text-theme-text"
  >
    {item.playerVisible.rumour}
  </blockquote>

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
</li>
