<script lang="ts">
  import { CAPTURE_KINDS, type CaptureKind } from "session-journal-engine";

  /**
   * The Capture menu (spec 174, US4): one switch per kind of automatic entry.
   * Each switch is a native checkbox, so it works from the keyboard and is read
   * as a checkbox by screen readers.
   */
  let {
    captureOff,
    captureMapMoves,
    onToggle,
  }: {
    captureOff?: CaptureKind[];
    /** The older map-move flag. False still means map moves are off. */
    captureMapMoves?: boolean;
    onToggle: (kind: CaptureKind, on: boolean) => void;
  } = $props();

  // The switches are only in the page while the menu is open.
  let open = $state(false);

  const LABELS: Record<CaptureKind, string> = {
    dice: "Dice rolls",
    tables: "Table results",
    decks: "Card draws",
    "map-moves": "Map moves",
    scenes: "Scene changes",
    oracle: "Oracle answers and random events",
    tension: "Tension changes",
    threads: "Thread changes",
    party: "Party changes",
    generated: "Generated results",
  };

  function isOn(kind: CaptureKind): boolean {
    if (captureOff?.includes(kind)) return false;
    return kind !== "map-moves" || captureMapMoves !== false;
  }
</script>

<details
  class="relative"
  data-testid="journal-capture-menu"
  ontoggle={(event) =>
    (open = (event.currentTarget as HTMLDetailsElement).open)}
>
  <summary
    class="cursor-pointer list-none text-micro font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary"
  >
    Capture
  </summary>
  {#if open}
    <fieldset
      class="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-1 rounded-md border border-theme-border bg-theme-surface p-3 text-sm text-theme-text shadow-lg"
    >
      <legend class="sr-only">Choose what the journal records</legend>
      <p class="mb-1 text-xs text-theme-muted">
        Automatic entries for this journal. Notes you type are always kept.
      </p>
      {#each CAPTURE_KINDS as kind (kind)}
        <label class="flex items-center justify-between gap-2">
          <span>{LABELS[kind]}</span>
          <input
            type="checkbox"
            checked={isOn(kind)}
            data-testid={`capture-${kind}`}
            onchange={(event) =>
              onToggle(kind, (event.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      {/each}
    </fieldset>
  {/if}
</details>
