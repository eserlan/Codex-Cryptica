<script lang="ts">
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import type { CalendarEra } from "chronology-engine";
  import { formatEraYear } from "chronology-engine";

  let eras: CalendarEra[] = $derived(calendarStore.config.eras || []);

  const addEra = async () => {
    const nextStart =
      eras.length > 0 ? (eras[eras.length - 1].startYear ?? 0) + 100 : 0;

    const newEra: CalendarEra = {
      id: crypto.randomUUID(),
      name: `Era ${eras.length + 1}`,
      label: "",
      startYear: nextStart,
      yearAtStart: 1,
      direction: "forward",
    };

    await calendarStore.setConfig({
      ...calendarStore.config,
      eras: [...eras, newEra],
    });
  };

  const updateEra = async (id: string, patch: Partial<CalendarEra>) => {
    const updated = eras.map((e) => (e.id === id ? { ...e, ...patch } : e));
    await calendarStore.setConfig({
      ...calendarStore.config,
      eras: updated,
    });
  };

  const removeEra = async (id: string) => {
    const updated = eras.filter((e) => e.id !== id);
    await calendarStore.setConfig({
      ...calendarStore.config,
      eras: updated,
    });
  };
</script>

<div class="space-y-4 pt-4 border-t border-theme-border/20">
  <div class="flex items-center justify-between">
    <div>
      <h4
        class="text-meta font-bold text-theme-secondary uppercase font-header tracking-widest"
      >
        Calendar Eras
      </h4>
      <p class="text-micro text-theme-muted mt-0.5">
        Define historical eras with independent or backward-counting year
        numbers.
      </p>
    </div>
    <button
      type="button"
      onclick={addEra}
      data-testid="add-era-btn"
      class="text-micro font-bold bg-theme-primary/10 border border-theme-primary/30 text-theme-primary px-2.5 py-1 rounded hover:bg-theme-primary hover:text-theme-bg transition-colors font-header flex items-center gap-1.5"
    >
      <span aria-hidden="true" class="icon-[lucide--plus] h-3.5 w-3.5"></span>
      ADD ERA
    </button>
  </div>

  {#if eras.length === 0}
    <div
      class="p-4 bg-theme-surface/30 border border-dashed border-theme-border/40 rounded text-center"
    >
      <p class="text-xs text-theme-muted">
        No custom eras defined. Years will be formatted using the Default Year
        Suffix above.
      </p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each eras as era, i (era.id)}
        <div
          class="bg-theme-surface/50 border border-theme-border/40 rounded-lg p-3 space-y-3"
          data-testid="era-row-{i}"
        >
          <div
            class="flex items-center justify-between gap-2 border-b border-theme-border/20 pb-2"
          >
            <span class="text-micro font-mono text-theme-muted font-bold">
              #{i + 1}
            </span>
            <div class="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Era Name (e.g. After the Fall)"
                data-testid="era-name-input-{i}"
                aria-label="Era name #{i + 1}"
                value={era.name}
                oninput={(e) =>
                  updateEra(era.id, { name: e.currentTarget.value })}
                class="flex-1 bg-theme-surface border border-theme-border rounded px-2.5 py-1 text-xs text-theme-text focus:border-theme-primary outline-none"
              />
              <input
                type="text"
                placeholder="Label (e.g. AF)"
                data-testid="era-label-input-{i}"
                aria-label="Era abbreviation #{i + 1}"
                value={era.label || ""}
                oninput={(e) =>
                  updateEra(era.id, { label: e.currentTarget.value })}
                class="w-24 bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text font-mono focus:border-theme-primary outline-none uppercase"
              />
            </div>
            <button
              type="button"
              onclick={() => removeEra(era.id)}
              data-testid="remove-era-btn-{i}"
              aria-label="Remove Era {era.name}"
              class="text-theme-muted hover:text-red-400 p-1 rounded transition-colors"
            >
              <span aria-hidden="true" class="icon-[lucide--trash-2] h-4 w-4"
              ></span>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="space-y-0.5">
              <label
                for="era-start-{era.id}"
                class="text-nano font-bold text-theme-muted uppercase font-header"
              >
                Internal Year
              </label>
              <input
                id="era-start-{era.id}"
                type="number"
                data-testid="era-start-input-{i}"
                value={era.startYear}
                oninput={(e) => {
                  const val = parseInt(e.currentTarget.value, 10);
                  if (!isNaN(val)) updateEra(era.id, { startYear: val });
                }}
                class="w-full bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text font-mono focus:border-theme-primary outline-none"
              />
            </div>

            <div class="space-y-0.5">
              <label
                for="era-display-start-{era.id}"
                class="text-nano font-bold text-theme-muted uppercase font-header"
              >
                Starts At Year
              </label>
              <input
                id="era-display-start-{era.id}"
                type="number"
                data-testid="era-year-at-start-input-{i}"
                value={era.yearAtStart ?? 1}
                oninput={(e) => {
                  const val = parseInt(e.currentTarget.value, 10);
                  if (!isNaN(val)) updateEra(era.id, { yearAtStart: val });
                }}
                class="w-full bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text font-mono focus:border-theme-primary outline-none"
              />
            </div>

            <div class="space-y-0.5">
              <label
                for="era-direction-{era.id}"
                class="text-nano font-bold text-theme-muted uppercase font-header"
              >
                Direction
              </label>
              <select
                id="era-direction-{era.id}"
                data-testid="era-direction-select-{i}"
                value={era.direction ?? "forward"}
                onchange={(e) =>
                  updateEra(era.id, {
                    direction: e.currentTarget.value as "forward" | "backward",
                  })}
                class="w-full bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text font-header focus:border-theme-primary outline-none"
              >
                <option value="forward">Forward (1, 2, 3...)</option>
                <option value="backward">Backward (3, 2, 1...)</option>
              </select>
            </div>
          </div>

          <!-- Sample Live Preview for this era -->
          <div
            class="bg-theme-bg/60 rounded px-2.5 py-1.5 flex items-center justify-between text-nano font-mono text-theme-muted"
          >
            <span>Preview start:</span>
            <span class="text-theme-primary font-bold">
              Year {era.startYear} ➔ {formatEraYear(
                era.startYear,
                calendarStore.config,
              ) || `${era.yearAtStart ?? 1} ${era.label || era.name}`}
            </span>
          </div>
        </div>
      {/each}

      <div
        class="flex items-center justify-between gap-4 p-2.5 bg-theme-surface/30 border border-theme-border/40 rounded-lg text-xs"
      >
        <div class="space-y-0.5">
          <label
            for="era-fallback-suffix"
            class="text-nano font-bold text-theme-muted uppercase font-header"
          >
            Fallback Year Suffix
          </label>
          <p class="text-nano text-theme-muted">
            Used for dates outside configured eras (e.g. ancient history).
          </p>
        </div>
        <input
          id="era-fallback-suffix"
          type="text"
          placeholder="e.g. BCE, Ancient"
          value={calendarStore.config.epochLabel || ""}
          oninput={(e) =>
            calendarStore.setConfig({
              ...calendarStore.config,
              epochLabel: e.currentTarget.value,
            })}
          class="w-36 bg-theme-surface border border-theme-border rounded px-2.5 py-1 text-xs text-theme-text font-mono focus:border-theme-primary outline-none"
        />
      </div>
    </div>
  {/if}
</div>
