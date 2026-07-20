<script lang="ts">
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import type { TemporalMetadata } from "schema";
  import type { DateSelection } from "chronology-engine";
  import { calendarEngine, parseDirectDateInput } from "chronology-engine";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";
  import { onMount, tick, untrack } from "svelte";
  import { scale, slide } from "svelte/transition";
  import { toDateSelection } from "./utils/toDateSelection";
  import { systemClock } from "$lib/utils/runtime-deps";

  let {
    value = $bindable(),
    referenceValue,
    trigger,
    onClose,
  }: {
    value?: TemporalMetadata | DateSelection;
    referenceValue?: TemporalMetadata | DateSelection;
    trigger: HTMLElement;
    onClose: () => void;
  } = $props();

  let pickerElement = $state<HTMLElement>();

  let x = $state(0);
  let y = $state(0);

  let activeSelection = $state<DateSelection>(
    untrack(() => toDateSelection(value, referenceValue, calendarStore.config)),
  );

  let directDateInput = $state("");
  let directDateError = $state("");
  let isDirectDateEditing = $state(false);

  let activeTab = $state<"era" | "manual">("manual");
  let selectedEraId = $state<string | null>(null);

  // Keyboard live region announcement
  let announcementText = $state("");

  // Store references to scroll containers
  let scrollElements = $state<Record<string, HTMLDivElement>>({});
  let directEntryModes = $state<Record<string, boolean>>({});

  // Keep track of active programmatic scroll sync targets to prevent scroll feedback loops
  const lastProgrammaticScroll: Record<string, number> = {};

  // Deriving the dynamic columns state from activeSelection
  const columns = $derived(
    calendarEngine.deriveWheelColumns(
      activeSelection,
      calendarStore.getSnapshot(),
    ),
  );

  // Active repair state
  const repairState = $derived(
    calendarEngine.getRepairState(activeSelection, calendarStore.getSnapshot()),
  );

  const formatDirectDateInput = (sel: DateSelection) => {
    if (sel.precision === "day" && sel.day !== undefined && sel.unitId) {
      const config = calendarStore.config;
      const months = calendarEngine.getMonths(config);
      const mIndex = months.findIndex((m) => m.id === sel.unitId) + 1;
      if (mIndex > 0) {
        return `${String(sel.day).padStart(2, "0")}${String(mIndex).padStart(2, "0")}${sel.year}`;
      }
    }
    return "";
  };

  $effect(() => {
    if (!isDirectDateEditing) {
      directDateInput = formatDirectDateInput(activeSelection);
      directDateError = "";
    }
  });

  // Sync scroll positions of the columns when the selection changes programmatically
  $effect(() => {
    const _sel = activeSelection;
    tick().then(() => {
      for (const col of columns) {
        const container = scrollElements[col.id];
        if (container) {
          const index = col.options.findIndex((o) => o.id === col.selectedId);
          if (index !== -1) {
            const targetScrollTop = index * 40;
            if (Math.abs(container.scrollTop - targetScrollTop) > 2) {
              lastProgrammaticScroll[col.id] = systemClock.now();
              container.scrollTop = targetScrollTop;
            }
          }
        }
      }
    });
  });

  // Custom velocity-sensitive mouse wheel handler for the year column
  $effect(() => {
    const yearContainer = scrollElements["year"];
    if (!yearContainer) return;

    let wheelAccumulator = 0;
    const handleYearWheel = (e: WheelEvent) => {
      // Only process vertical scrolling
      if (Math.abs(e.deltaY) === 0) return;
      e.preventDefault();

      wheelAccumulator += e.deltaY;
      const speed = Math.abs(e.deltaY);

      let stepSize = 1;
      // High speed thresholds
      if (speed > 300) stepSize = 25;
      else if (speed > 100) stepSize = 10;
      else if (speed > 50) stepSize = 5;

      // Sensitivity - how much accumulation is required to trigger a tick
      const threshold = speed > 50 ? 20 : 40;

      if (Math.abs(wheelAccumulator) >= threshold) {
        const ticks =
          Math.sign(wheelAccumulator) *
          Math.floor(Math.abs(wheelAccumulator) / threshold);
        wheelAccumulator -= ticks * threshold;

        const patch = { year: activeSelection.year + ticks * stepSize };
        activeSelection = calendarEngine.applyParentChange(
          activeSelection,
          patch,
          calendarStore.getSnapshot(),
        );
      }
    };

    yearContainer.addEventListener("wheel", handleYearWheel, {
      passive: false,
    });
    return () => yearContainer.removeEventListener("wheel", handleYearWheel);
  });

  const updatePosition = async () => {
    if (!trigger || !pickerElement) return;
    const { x: newX, y: newY } = await computePosition(trigger, pickerElement, {
      placement: "bottom-start",
      middleware: [offset(8), flip(), shift({ padding: 10 })],
    });
    x = newX;
    y = newY;
  };

  onMount(() => {
    updatePosition();
    pickerElement?.focus();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerElement &&
        !pickerElement.contains(e.target as Node) &&
        !trigger.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updatePosition();
          ticking = false;
        });
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  });

  const save = () => {
    if (directDateError) return;

    // Normalize properties according to precision to keep saved structures clean and unambiguous
    const cleanSelection = { ...activeSelection };
    if (cleanSelection.precision === "year") {
      delete cleanSelection.unitId;
      delete cleanSelection.day;
      delete cleanSelection.anchorId;
    } else if (cleanSelection.precision === "unit") {
      delete cleanSelection.day;
      delete cleanSelection.anchorId;
    } else if (cleanSelection.precision === "day") {
      delete cleanSelection.anchorId;
    } else if (cleanSelection.precision === "anchor") {
      delete cleanSelection.unitId;
      delete cleanSelection.day;
    }

    // Save as rich DateSelection structure
    value = {
      ...cleanSelection,
      calendarRevision: calendarStore.config.revision || 1,
    };
    onClose();
  };

  const selectEra = (era: any) => {
    const patch: Partial<DateSelection> = { year: era.start_year };
    activeSelection = calendarEngine.applyParentChange(
      activeSelection,
      patch,
      calendarStore.getSnapshot(),
    );
    selectedEraId = era.id;
    activeTab = "manual";
  };

  const handleDirectDateInput = (e: Event) => {
    directDateInput = (e.target as HTMLInputElement).value;
    if (!directDateInput.trim()) {
      directDateError = "";
      return;
    }

    const parsed = parseDirectDateInput(directDateInput, calendarStore.config);
    if (!parsed) {
      directDateError = "Use DDMMYYYY, DDMM-YYYY, or DD/MM/-YYYY.";
      return;
    }

    const months = calendarEngine.getMonths(calendarStore.config);
    let unitId = months[0]?.id;
    if (parsed.month !== undefined) {
      unitId = months[parsed.month - 1]?.id || months[0]?.id;
    }

    activeSelection = {
      precision: "day",
      year: parsed.year,
      unitId,
      day: parsed.day,
      calendarRevision: calendarStore.config.revision || 1,
    };
    directDateError = "";
  };

  const selectOption = (colId: string, optionId: string) => {
    let patch: Partial<DateSelection> = {};
    if (colId === "year") {
      patch = { year: Number(optionId) };
    } else if (colId === "unit") {
      patch = { unitId: optionId };
    } else if (colId === "day") {
      patch = { day: Number(optionId) };
    } else if (colId === "anchor") {
      patch = { anchorId: optionId };
    }
    activeSelection = calendarEngine.applyParentChange(
      activeSelection,
      patch,
      calendarStore.getSnapshot(),
    );
  };

  const onWheelScroll = (colId: string, event: Event) => {
    // Ignore scroll events for 150ms after a programmatic scroll
    if (systemClock.now() - (lastProgrammaticScroll[colId] || 0) < 150) {
      return;
    }
    const container = event.currentTarget as HTMLDivElement;
    const index = Math.round(container.scrollTop / 40);
    const col = columns.find((c) => c.id === colId);
    if (!col) return;
    const option = col.options[index];
    if (option && option.id !== col.selectedId) {
      selectOption(colId, option.id);
    }
  };

  const handleColumnKeydown = (colId: string, event: KeyboardEvent) => {
    const col = columns.find((c) => c.id === colId);
    if (!col) return;
    const index = col.options.findIndex((o) => o.id === col.selectedId);

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index > 0) {
        const opt = col.options[index - 1];
        selectOption(colId, opt.id);
        announceValue(colId, opt.label);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (index < col.options.length - 1) {
        const opt = col.options[index + 1];
        selectOption(colId, opt.id);
        announceValue(colId, opt.label);
      }
    }
  };

  const announceValue = (colId: string, label: string) => {
    announcementText = `${colId} selected: ${label}`;
  };

  const commitDirectColInput = (colId: string, text: string) => {
    const val = Number.parseInt(text, 10);
    if (Number.isNaN(val)) {
      directEntryModes[colId] = false;
      return;
    }

    let patch: Partial<DateSelection> = {};
    if (colId === "year") {
      patch = { year: val };
    } else if (colId === "day") {
      const config = calendarStore.config;
      const months = calendarEngine.getMonths(config);
      const activeUnitId = activeSelection.unitId || (months[0]?.id ?? "");
      const month = months.find((m) => m.id === activeUnitId) || months[0];
      const maxDays = month ? month.days : 30;
      if (val < 1 || val > maxDays) {
        directDateError = `Day must be between 1 and ${maxDays}`;
        directEntryModes[colId] = false;
        return;
      }
      patch = { day: val };
    }

    activeSelection = calendarEngine.applyParentChange(
      activeSelection,
      patch,
      calendarStore.getSnapshot(),
    );
    directEntryModes[colId] = false;
    directDateError = "";
  };

  const confirmRepair = () => {
    if (repairState) {
      activeSelection = { ...repairState.suggestedSelection };
    }
  };

  const focusOnMount = (el: HTMLInputElement) => {
    el.focus();
  };

  const focusableElements = $derived.by(() => {
    if (!pickerElement) return [];
    return Array.from(
      pickerElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ) as HTMLElement[];
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && document.activeElement?.tagName !== "BUTTON") {
      if (directDateError) {
        e.preventDefault();
        return;
      }
      save();
    }

    // Simple Focus Trap
    if (e.key === "Tab") {
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const selectedEra = $derived(
    graph.eras.find((e) => e.id === selectedEraId) ||
      graph.eras.find(
        (e) =>
          activeSelection.year >= e.start_year &&
          (!e.end_year || activeSelection.year <= e.end_year),
      ),
  );

  const isYearOutOfRange = $derived.by(() => {
    if (!selectedEraId) return false;
    const era = graph.eras.find((e) => e.id === selectedEraId);
    if (!era) return false;
    return (
      activeSelection.year < era.start_year ||
      (era.end_year !== null &&
        era.end_year !== undefined &&
        activeSelection.year > era.end_year)
    );
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={pickerElement}
  role="dialog"
  aria-modal="true"
  aria-label="Date Picker"
  class="fixed z-[1000] w-[90vw] max-w-sm md:w-80 bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col font-body outline-none"
  style:left="{x}px"
  style:top="{y}px"
  tabindex="0"
  onkeydown={handleKeydown}
  transition:scale={{ start: 0.95, duration: 150 }}
>
  <!-- Accessible ARIA Live region for announcements -->
  <div
    class="sr-only"
    role="status"
    aria-live="polite"
    data-testid="aria-announcement"
  >
    {announcementText}
  </div>

  <!-- Header / Tabs -->
  <div class="flex border-b border-theme-border bg-theme-bg/50" role="tablist">
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === "era"}
      aria-controls="era-panel"
      id="era-tab"
      class="flex-1 py-2 text-[10px] font-bold uppercase font-header tracking-widest transition-colors {activeTab ===
      'era'
        ? 'text-theme-primary bg-theme-primary/10'
        : 'text-theme-muted hover:text-theme-text'}"
      onclick={() => (activeTab = "era")}
    >
      Eras
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === "manual"}
      aria-controls="manual-panel"
      id="manual-tab"
      class="flex-1 py-2 text-[10px] font-bold uppercase font-header tracking-widest transition-colors {activeTab ===
      'manual'
        ? 'text-theme-primary bg-theme-primary/10'
        : 'text-theme-muted hover:text-theme-text'}"
      onclick={() => (activeTab = "manual")}
    >
      Detail
    </button>
  </div>

  <!-- Content -->
  <div class="p-3 max-h-[360px] overflow-y-auto custom-scrollbar space-y-3">
    {#if activeTab === "era"}
      <div
        id="era-panel"
        role="tabpanel"
        aria-labelledby="era-tab"
        class="space-y-1"
      >
        {#each graph.eras as era}
          <button
            type="button"
            class="w-full text-left p-2 rounded hover:bg-theme-primary/10 border border-transparent hover:border-theme-primary/20 transition-all group"
            data-testid="era-select-button"
            onclick={() => selectEra(era)}
          >
            <div class="flex items-center gap-2">
              <div
                class="w-1 h-4 rounded-full"
                style:background-color={era.color}
              ></div>
              <span
                class="text-xs font-bold text-theme-text group-hover:text-theme-primary"
                >{era.name}</span
              >
            </div>
            <div class="text-[9px] text-theme-muted ml-3 font-header">
              Year {era.start_year}
              {era.end_year ? `→ ${era.end_year}` : "→ Present"}
            </div>
          </button>
        {:else}
          <div
            class="py-8 text-center text-theme-muted text-[10px] uppercase tracking-widest"
          >
            No Eras Defined
          </div>
        {/each}
      </div>
    {:else}
      <div
        id="manual-panel"
        role="tabpanel"
        aria-labelledby="manual-tab"
        class="space-y-3"
      >
        <!-- Precision Toggle -->
        <div
          class="flex bg-theme-bg p-0.5 rounded-md border border-theme-border/30"
        >
          {#each ["year", "unit", "day", ...(calendarStore.config.anchors?.length ? ["anchor"] : [])] as p}
            <button
              type="button"
              class="flex-1 py-1 text-[9px] font-bold uppercase font-header tracking-tighter transition-all rounded {activeSelection.precision ===
              p
                ? 'bg-theme-primary text-theme-bg shadow-sm'
                : 'text-theme-muted hover:text-theme-text'}"
              onclick={() => {
                let newPrec = p as any;
                let patch: Partial<DateSelection> = { precision: newPrec };
                if (newPrec === "unit" && !activeSelection.unitId) {
                  patch.unitId = calendarStore.config.months[0]?.id;
                } else if (newPrec === "day") {
                  if (!activeSelection.unitId) {
                    patch.unitId = calendarStore.config.months[0]?.id;
                  }
                  if (activeSelection.day === undefined) {
                    patch.day = 1;
                  }
                } else if (newPrec === "anchor" && !activeSelection.anchorId) {
                  patch.anchorId = calendarStore.config.anchors?.[0]?.id;
                }
                activeSelection = calendarEngine.applyParentChange(
                  activeSelection,
                  patch,
                  calendarStore.getSnapshot(),
                );
              }}
            >
              {p}
            </button>
          {/each}
        </div>

        <!-- Direct typing Input -->
        <div class="space-y-1">
          <label
            for="direct-date-input"
            class="text-[9px] font-bold text-theme-muted uppercase font-header tracking-widest"
            >Quick Entry</label
          >
          <input
            id="direct-date-input"
            type="text"
            value={directDateInput}
            oninput={handleDirectDateInput}
            onfocus={() => (isDirectDateEditing = true)}
            onblur={() => (isDirectDateEditing = false)}
            class="w-full bg-theme-bg border {directDateError
              ? 'border-red-500/70'
              : 'border-theme-border'} rounded px-3 py-1.5 text-sm text-theme-text focus:border-theme-primary outline-none font-body"
            placeholder="DDMMYYYY, DDMM-YYYY, or DD/MM/-YYYY"
            aria-invalid={!!directDateError}
            aria-describedby={directDateError ? "direct-date-error" : undefined}
          />
          {#if directDateError}
            <div
              id="direct-date-error"
              role="alert"
              aria-live="polite"
              class="text-[9px] text-red-500 font-bold uppercase font-header"
            >
              {directDateError}
            </div>
          {/if}
        </div>

        <!-- Scroll Wheels Columns Container -->
        <div
          class="relative flex justify-center bg-theme-bg border border-theme-border/30 rounded-lg overflow-hidden h-[160px]"
        >
          <!-- Centered lens highlights for visual alignment and Premium feedback -->
          <div
            class="absolute left-0 right-0 top-[60px] h-[40px] border-y border-theme-primary/30 bg-theme-primary/5 pointer-events-none z-10"
          ></div>

          <!-- Vertical gradient overlays for 3D roll aesthetics -->
          <div
            class="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-theme-bg to-transparent pointer-events-none z-10"
          ></div>
          <div
            class="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-theme-bg to-transparent pointer-events-none z-10"
          ></div>

          <!-- Side-by-side Wheels -->
          <div class="flex w-full divide-x divide-theme-border/10">
            {#each columns as col}
              <div class="flex-1 flex flex-col items-center relative min-w-0">
                <!-- Header -->
                <div
                  class="text-[8px] font-bold text-theme-muted uppercase font-header tracking-wider py-1 border-b border-theme-border/10 w-full text-center bg-theme-surface/50 z-20"
                >
                  {col.label}
                </div>

                {#if directEntryModes[col.id]}
                  <div
                    class="flex-1 flex items-center justify-center h-[130px] w-full bg-theme-surface/30 z-20"
                  >
                    <input
                      type="text"
                      id={"manual-" + col.id + "-input"}
                      data-testid={"manual-" + col.id + "-input"}
                      value={col.selectedId}
                      onkeydown={(e) => {
                        if (e.key === "Enter") {
                          commitDirectColInput(
                            col.id,
                            (e.target as HTMLInputElement).value,
                          );
                        } else if (e.key === "Escape") {
                          directEntryModes[col.id] = false;
                        }
                      }}
                      onblur={(e) =>
                        commitDirectColInput(
                          col.id,
                          (e.target as HTMLInputElement).value,
                        )}
                      class="w-16 bg-theme-bg border border-theme-primary rounded px-1.5 py-0.5 text-xs text-theme-text font-mono text-center outline-none"
                      placeholder="Type..."
                      use:focusOnMount
                    />
                  </div>
                {:else}
                  <div
                    bind:this={scrollElements[col.id]}
                    role="listbox"
                    aria-label="{col.label} column"
                    tabindex="0"
                    onscroll={(e) => onWheelScroll(col.id, e)}
                    onkeydown={(e) => handleColumnKeydown(col.id, e)}
                    class="w-full h-[130px] overflow-y-auto relative snap-y snap-mandatory select-none custom-scrollbar outline-none focus:bg-theme-primary/5 transition-colors"
                  >
                    <!-- Top spacer -->
                    <div class="h-[45px]" aria-hidden="true"></div>

                    {#each col.options as option}
                      <button
                        type="button"
                        id="opt-{col.id}-{option.id}"
                        role="option"
                        tabindex="-1"
                        aria-selected={col.selectedId === option.id}
                        onclick={() => selectOption(col.id, option.id)}
                        class="h-10 w-full flex items-center justify-center snap-center text-[10px] font-semibold tracking-wider uppercase transition-colors hover:text-theme-primary {col.selectedId ===
                        option.id
                          ? 'text-theme-primary font-bold text-xs'
                          : 'text-theme-muted'}"
                      >
                        <!-- Truncate long options with ellipses inside the track -->
                        <span class="truncate px-2" title={option.label}
                          >{option.label}</span
                        >
                      </button>
                    {/each}

                    <!-- Bottom spacer -->
                    <div class="h-[45px]" aria-hidden="true"></div>
                  </div>

                  {#if col.canDirectEnter}
                    <button
                      type="button"
                      onmousedown={(e) => e.preventDefault()}
                      onclick={() => (directEntryModes[col.id] = true)}
                      class="absolute bottom-1 right-1 p-0.5 bg-theme-surface/80 hover:bg-theme-primary/10 hover:text-theme-primary border border-theme-border/30 rounded text-theme-muted transition-all z-20"
                      aria-label="Direct jump to {col.label}"
                    >
                      <span
                        aria-hidden="true"
                        class="icon-[lucide--keyboard] w-3 h-3"
                      ></span>
                    </button>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Inline repair banner -->
        {#if repairState}
          <div
            data-testid="repair-warning-banner"
            class="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-theme-text space-y-1"
          >
            <div
              class="font-bold flex items-center gap-1 text-yellow-500 uppercase font-header tracking-wider"
            >
              <span class="icon-[lucide--alert-triangle] w-3.5 h-3.5"></span>
              Calendar Conflict
            </div>
            <p class="text-[10px] leading-snug text-theme-muted">
              The calendar configuration changed. Selected values are invalid.
            </p>
            <button
              type="button"
              onclick={confirmRepair}
              class="w-full py-1 text-[9px] font-bold uppercase font-header tracking-wider bg-yellow-500 hover:bg-yellow-400 text-theme-bg transition-colors rounded"
            >
              Confirm Repair
            </button>
          </div>
        {/if}

        <!-- Full Synchronized Preview Box below the wheels -->
        <div
          class="p-2 bg-theme-bg/50 border border-theme-border/20 rounded-lg text-center"
          data-testid="synchronized-preview"
        >
          <div
            class="text-[8px] font-bold text-theme-muted uppercase font-header tracking-wider mb-0.5"
          >
            Preview
          </div>
          <div class="text-xs font-semibold font-mono text-theme-primary">
            {calendarEngine.format(activeSelection, calendarStore.config)}
          </div>
        </div>

        {#if isYearOutOfRange}
          <div
            transition:slide
            class="text-[8px] text-red-500 font-bold uppercase font-header text-center py-1 bg-red-500/5 rounded border border-red-500/20"
          >
            Year {activeSelection.year} is outside {selectedEra?.name}
          </div>
        {:else if selectedEra}
          <div
            transition:slide
            class="text-[8px] text-theme-primary/70 font-bold uppercase font-header flex items-center justify-center gap-1 py-1"
          >
            <span class="w-1 h-1 rounded-full bg-theme-primary animate-pulse"
            ></span>
            Part of {selectedEra.name}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Footer Actions -->
  <div
    class="p-3 border-t border-theme-border flex gap-2 bg-theme-bg/30 shrink-0"
  >
    <button
      type="button"
      class="flex-1 py-1.5 text-[10px] font-bold uppercase font-header tracking-widest border border-theme-border text-theme-muted hover:text-theme-text transition-colors rounded"
      onclick={onClose}
    >
      Cancel
    </button>
    <button
      type="button"
      class="flex-1 py-1.5 text-[10px] font-bold uppercase font-header tracking-widest bg-theme-primary text-theme-bg hover:bg-theme-secondary transition-colors rounded"
      data-testid="apply-date-button"
      disabled={!!directDateError || !!repairState}
      onclick={save}
    >
      Apply
    </button>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 2px;
  }
</style>
