<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { slide } from "svelte/transition";

  const handleVisibilityChange = async (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as "visible" | "hidden";
    await vault.setDefaultVisibility(value);
  };

  // Chronology Logic
  const toggleGregorian = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    calendarStore.setConfig({
      ...calendarStore.config,
      useGregorian: checked,
    });
  };

  const addMonth = () => {
    const months = [...calendarStore.config.months];
    months.push({
      id: `month-${Date.now()}`,
      name: "New Month",
      days: 30,
    });
    calendarStore.setConfig({ ...calendarStore.config, months });
  };

  const removeMonth = (id: string) => {
    const months = calendarStore.config.months.filter((m) => m.id !== id);
    calendarStore.setConfig({ ...calendarStore.config, months });
  };

  const updateMonth = (id: string, patch: any) => {
    const months = calendarStore.config.months.map((m) =>
      m.id === id ? { ...m, ...patch } : m,
    );
    calendarStore.setConfig({ ...calendarStore.config, months });
  };

  const updateConfigField = (field: string, value: any) => {
    calendarStore.setConfig({ ...calendarStore.config, [field]: value });
  };
</script>

<div class="space-y-10">
  <!-- Fog of War -->
  <div>
    <h3
      class="text-sm font-bold text-theme-primary uppercase tracking-widest mb-4"
    >
      Fog of War
    </h3>
    <div
      class="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <label
            for="default-visibility"
            class="block text-xs font-bold text-theme-text mb-1 uppercase"
            >Default Entity Visibility</label
          >
          <p class="text-[10px] text-theme-muted leading-relaxed">
            Determines if nodes are shown or hidden by default when Shared Mode
            is active.
          </p>
        </div>
        <select
          id="default-visibility"
          value={vault.defaultVisibility}
          onchange={handleVisibilityChange}
          class="bg-theme-surface border border-theme-border text-theme-text px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-theme-primary rounded uppercase"
        >
          <option value="visible">Visible by Default</option>
          <option value="hidden">Hidden by Default</option>
        </select>
      </div>

      <div class="border-t border-theme-border/30 pt-4">
        <h4 class="text-[10px] font-bold text-theme-secondary uppercase mb-2">
          Tag Reference
        </h4>
        <ul class="space-y-2 text-[10px] font-mono">
          <li class="flex gap-2">
            <span class="text-red-400 font-bold shrink-0">hidden:</span>
            <span class="text-theme-muted"
              >Always hides the node in Shared Mode.</span
            >
          </li>
          <li class="flex gap-2">
            <span class="text-green-400 font-bold shrink-0">revealed:</span>
            <span class="text-theme-muted"
              >Shows the node even if world is Hidden by Default.</span
            >
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Chronology / Calendar -->
  <div>
    <h3
      class="text-sm font-bold text-theme-primary uppercase tracking-widest mb-4"
    >
      Chronology & Calendar
    </h3>
    <div
      class="bg-theme-bg/50 border border-theme-border p-6 rounded-lg space-y-6"
    >
      <!-- Standard Toggle -->
      <div
        class="flex items-center justify-between border-b border-theme-border/20 pb-4"
      >
        <div>
          <span class="block text-xs font-bold text-theme-text uppercase"
            >Standard Gregorian</span
          >
          <p class="text-[10px] text-theme-muted">
            Use the 12-month Earth calendar logic.
          </p>
        </div>
        <input
          type="checkbox"
          checked={calendarStore.config.useGregorian}
          onchange={toggleGregorian}
          class="w-4 h-4 accent-theme-primary"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <label
            class="text-[10px] font-bold text-theme-muted uppercase"
            for="epoch-label">Epoch Suffix</label
          >
          <input
            id="epoch-label"
            type="text"
            placeholder="e.g. AF, AC"
            value={calendarStore.config.epochLabel || ""}
            oninput={(e) =>
              updateConfigField("epochLabel", e.currentTarget.value)}
            class="w-full bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-xs text-theme-text font-mono focus:border-theme-primary outline-none"
          />
        </div>
        <div class="space-y-1">
          <label
            class="text-[10px] font-bold text-theme-muted uppercase"
            for="present-year">Present Year</label
          >
          <input
            id="present-year"
            type="number"
            value={calendarStore.config.presentYear || 0}
            oninput={(e) =>
              updateConfigField("presentYear", parseInt(e.currentTarget.value))}
            class="w-full bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-xs text-theme-text font-mono focus:border-theme-primary outline-none"
          />
        </div>
      </div>

      {#if !calendarStore.config.useGregorian}
        <div transition:slide class="pt-4 border-t border-theme-border/20">
          <div class="flex items-center justify-between mb-4">
            <h4
              class="text-[10px] font-bold text-theme-secondary uppercase tracking-widest"
            >
              Custom Month Structure
            </h4>
            <button
              onclick={addMonth}
              class="text-[9px] font-bold bg-theme-primary/10 border border-theme-primary/30 text-theme-primary px-2 py-1 rounded hover:bg-theme-primary hover:text-theme-bg transition-colors"
            >
              + ADD MONTH
            </button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {#each calendarStore.config.months as month, i (month.id)}
              <div class="flex items-center gap-2 group">
                <span class="w-4 text-[9px] font-mono text-theme-muted"
                  >{i + 1}</span
                >
                <input
                  type="text"
                  data-testid="month-name-input"
                  value={month.name}
                  oninput={(e) =>
                    updateMonth(month.id, { name: e.currentTarget.value })}
                  class="flex-1 bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text focus:border-theme-primary outline-none"
                />
                <div
                  class="flex items-center bg-theme-bg border border-theme-border rounded overflow-hidden"
                >
                  <input
                    type="number"
                    min="1"
                    value={month.days}
                    oninput={(e) =>
                      updateMonth(month.id, {
                        days: Math.max(1, parseInt(e.currentTarget.value) || 1),
                      })}
                    class="w-12 bg-transparent text-center py-1 text-xs text-theme-text focus:outline-none"
                  />
                  <span
                    class="px-2 text-[9px] font-bold text-theme-muted uppercase border-l border-theme-border"
                    >Days</span
                  >
                </div>
                <button
                  onclick={() => removeMonth(month.id)}
                  class="p-1 text-theme-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
