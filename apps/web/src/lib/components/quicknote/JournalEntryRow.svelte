<script lang="ts">
  import type { JournalEntry } from "session-journal-engine";

  /**
   * One entry in the Session Journal (#3402 slice 3, #3408). A typed note looks
   * as it always has; an automatic entry (a roll, draw or table result) is
   * marked with a label and an icon, so the two are told apart at a glance
   * without relying on colour (spec 163, FR-028).
   */
  let { entry, sectionName }: { entry: JournalEntry; sectionName?: string } =
    $props();

  const AUTOMATIC_KINDS: Record<string, { label: string; icon: string }> = {
    "dice-roll": { label: "Dice roll", icon: "icon-[lucide--dices]" },
    "card-draw": { label: "Card draw", icon: "icon-[lucide--layers]" },
    "table-result": { label: "Table result", icon: "icon-[lucide--table]" },
  };
  // A type the journal has never seen is still shown, as a generic automatic
  // entry, so a future source needs no change here.
  const GENERIC_AUTOMATIC = {
    label: "Automatic entry",
    icon: "icon-[lucide--zap]",
  };

  const isAutomatic = $derived(entry.type !== "manual-note");
  const kind = $derived(
    isAutomatic
      ? (AUTOMATIC_KINDS[entry.type] ?? GENERIC_AUTOMATIC)
      : undefined,
  );
</script>

<div
  class="rounded border p-2 text-xs {isAutomatic
    ? 'border-theme-accent/40 border-l-2 bg-theme-accent/5'
    : 'border-theme-border/30'}"
  data-testid="journal-entry"
  data-entry-type={entry.type}
  data-automatic={isAutomatic ? "true" : "false"}
>
  <div class="flex items-center justify-between text-[9px] text-theme-muted">
    <span class="flex items-center gap-1.5">
      {#if kind}
        <span
          class="flex items-center gap-1 font-bold uppercase tracking-wider text-theme-accent"
          data-testid="journal-entry-label"
        >
          <span aria-hidden="true" class="{kind.icon} h-3 w-3"></span>
          {kind.label}
        </span>
      {/if}
      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
    </span>
    {#if sectionName}
      <span class="text-theme-accent">{sectionName}</span>
    {/if}
  </div>
  <p class="text-theme-text">{entry.content}</p>
</div>
