<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { slide } from "svelte/transition";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { demoService } from "$lib/services/demo";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { themeStore } from "$lib/stores/theme.svelte";

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
    const { config } = calendarStore;
    if (!config.useGregorian && config.months.length <= 1) {
      return;
    }
    const months = config.months.filter((m) => m.id !== id);
    calendarStore.setConfig({ ...config, months });
  };

  const updateMonth = (id: string, patch: any) => {
    const months = calendarStore.config.months.map((m) =>
      m.id === id ? { ...m, ...patch } : m,
    );
    calendarStore.setConfig({ ...calendarStore.config, months });
  };

  const updateConfigField = <K extends keyof typeof calendarStore.config>(
    field: K,
    value: (typeof calendarStore.config)[K],
  ) => {
    calendarStore.setConfig({ ...calendarStore.config, [field]: value });
  };
</script>

<div class="space-y-10">
  {#if uiStore.isDemoMode}
    <div
      class="bg-theme-primary/10 border border-theme-primary/30 p-6 rounded-lg text-center space-y-4 animate-in fade-in slide-in-from-top-4"
    >
      <div
        class="w-12 h-12 bg-theme-primary/20 rounded-full flex items-center justify-center mx-auto"
      >
        <span class="icon-[lucide--sparkles] text-theme-primary w-6 h-6"></span>
      </div>
      <div>
        <h3
          class="text-base font-bold text-theme-text uppercase font-header tracking-widest"
        >
          Transmuting Exploration into Reality
        </h3>
        <p class="text-[11px] text-theme-muted mt-1 leading-relaxed">
          You are currently in **Demo Mode**. All changes are transient. <br />
          Save this dataset as a new {themeStore.jargon.vault} to begin your permanent
          chronicle.
        </p>
      </div>
      <button
        onclick={async () => {
          try {
            await demoService.convertToCampaign();
            const url = new URL(page.url.href);
            url.searchParams.delete("demo");
            goto(url.toString(), { replaceState: true });
            uiStore.closeSettings();
          } catch (error) {
            console.error(
              `Failed to convert demo to ${themeStore.jargon.vault}:`,
              error,
            );
            window.alert(
              `Failed to save ${themeStore.jargon.vault}. Please try again.`,
            );
          }
        }}
        class="px-8 py-3 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-xs rounded hover:bg-theme-secondary transition-all active:scale-95 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.2)]"
        title={`Save this demo exploration as your own persistent ${themeStore.jargon.vault}`}
      >
        Save as {themeStore.jargon.vault}
      </button>
    </div>
  {/if}

  <!-- Active Archive Info -->
  <div>
    <h3
      class="text-base font-bold text-theme-primary uppercase font-header tracking-widest mb-4"
    >
      Active Archive
    </h3>
    <div
      class="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4"
    >
      <div class="flex flex-col gap-4">
        <div>
          <span
            class="block text-[10px] font-bold text-theme-muted mb-1 uppercase font-header tracking-wider"
            >Status</span
          >
          <span class="text-sm font-mono text-theme-text"
            >Connected to Local Archive (OPFS)</span
          >
        </div>
        <div>
          <span
            class="block text-[10px] font-bold text-theme-muted mb-1 uppercase font-header tracking-wider"
            >Entity Count</span
          >
          <span class="text-sm font-mono text-theme-text"
            >{Object.keys(vault.entities).length} tracked entities</span
          >
        </div>
        {#if vault.hasConflictFiles}
          <div
            class="pt-4 border-t border-theme-border/30 flex justify-between items-center"
          >
            <div>
              <span
                class="block text-[10px] font-bold text-amber-500 mb-1 uppercase font-header tracking-wider"
              >
                Sync Conflicts Detected
              </span>
              <span class="text-xs text-theme-muted">
                Redundant copies from previous sync issues exist.
              </span>
            </div>
            <button
              class="px-4 py-2 border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 rounded transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              onclick={async () => {
                if (
                  confirm(
                    "This will scan for .conflict files, keep only the newest version of each file, and remove the rest. Continue?",
                  )
                ) {
                  await vault.cleanupConflictFiles();
                }
              }}
            >
              <span class="icon-[lucide--trash-2] w-4 h-4"></span>
              Squash History
            </button>
          </div>
        {/if}

        <div
          class="pt-4 border-t border-theme-border/30 flex justify-between items-center"
        >
          <div>
            <span
              class="block text-[10px] font-bold text-blue-500 mb-1 uppercase font-header tracking-wider"
            >
              Rescue Misplaced Files
            </span>
            <span class="text-xs text-theme-muted">
              Use this if your images or maps are missing after a conflict
              squash.
            </span>
          </div>
          <button
            class="px-4 py-2 border border-blue-500/50 text-blue-500 hover:bg-blue-500/10 rounded transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            onclick={async () => {
              await vault.recoverMisplacedFiles();
            }}
          >
            <span class="icon-[lucide--life-buoy] w-4 h-4"></span>
            Recover Files
          </button>
        </div>

        <div
          class="pt-4 border-t border-theme-border/30 flex justify-between items-center"
        >
          <div>
            <span
              class="block text-[10px] font-bold text-theme-muted mb-1 uppercase font-header tracking-wider"
            >
              Schema Integrity
            </span>
            <span class="text-xs text-theme-muted">
              Remove top-level fields that were incorrectly duplicated into
              metadata.
            </span>
          </div>
          <button
            class="px-4 py-2 border border-theme-muted/50 text-theme-text hover:bg-theme-muted/10 rounded transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            onclick={async () => {
              await vault.cleanupMetadata();
            }}
          >
            <span class="icon-[lucide--database-zap] w-4 h-4"></span>
            Purge Metadata
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Fog of War -->
  <div>
    <h3
      class="text-base font-bold text-theme-primary uppercase font-header tracking-widest mb-4"
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
            class="block text-sm font-bold text-theme-text mb-1 uppercase font-header"
            >Default Entity Visibility</label
          >
          <p class="text-[11px] text-theme-muted leading-relaxed">
            Determines if nodes are shown or hidden by default when Shared Mode
            is active.
          </p>
        </div>
        <select
          id="default-visibility"
          value={vault.defaultVisibility}
          onchange={handleVisibilityChange}
          class="bg-theme-surface border border-theme-border text-theme-text px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-theme-primary rounded uppercase"
        >
          <option value="visible">Visible by Default</option>
          <option value="hidden">Hidden by Default</option>
        </select>
      </div>

      <div class="border-t border-theme-border/30 pt-4">
        <h4
          class="text-[11px] font-bold text-theme-secondary uppercase font-header mb-2"
        >
          Tag Reference
        </h4>
        <ul class="space-y-2 text-[11px] font-mono">
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
      class="text-base font-bold text-theme-primary uppercase font-header tracking-widest mb-4"
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
          <span
            class="block text-sm font-bold text-theme-text uppercase font-header"
            >Standard Gregorian</span
          >
          <p class="text-[11px] text-theme-muted">
            Use the 12-month Earth calendar logic.
          </p>
        </div>
        <input
          type="checkbox"
          data-testid="gregorian-toggle"
          checked={calendarStore.config.useGregorian}
          onchange={toggleGregorian}
          class="w-4 h-4 accent-theme-primary"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <label
            class="text-[11px] font-bold text-theme-muted uppercase font-header"
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
            class="text-[11px] font-bold text-theme-muted uppercase font-header"
            for="present-year">Present Year</label
          >
          <input
            id="present-year"
            type="number"
            value={calendarStore.config.presentYear || 0}
            oninput={(e) => {
              const parsed = parseInt(e.currentTarget.value, 10);
              if (!isNaN(parsed)) {
                updateConfigField("presentYear", parsed);
              }
            }}
            class="w-full bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-xs text-theme-text font-mono focus:border-theme-primary outline-none"
          />
        </div>
      </div>

      {#if !calendarStore.config.useGregorian}
        <div transition:slide class="pt-4 border-t border-theme-border/20">
          <div class="flex items-center justify-between mb-4">
            <h4
              class="text-[11px] font-bold text-theme-secondary uppercase font-header tracking-widest"
            >
              Custom Month Structure
            </h4>
            <button
              onclick={addMonth}
              class="text-[10px] font-bold bg-theme-primary/10 border border-theme-primary/30 text-theme-primary px-2 py-1 rounded hover:bg-theme-primary hover:text-theme-bg transition-colors font-header"
            >
              + ADD MONTH
            </button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {#each calendarStore.config.months as month, i (month.id)}
              <div class="flex items-center gap-2 group">
                <span class="w-4 text-[10px] font-mono text-theme-muted"
                  >{i + 1}</span
                >
                <input
                  type="text"
                  data-testid="month-name-input"
                  value={month.name}
                  oninput={(e) =>
                    updateMonth(month.id, { name: e.currentTarget.value })}
                  class="flex-1 bg-theme-surface border border-theme-border rounded px-2 py-1 text-sm text-theme-text focus:border-theme-primary outline-none"
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
                    class="w-12 bg-transparent text-center py-1 text-sm text-theme-text focus:outline-none"
                  />
                  <span
                    class="px-2 text-[10px] font-bold text-theme-muted uppercase font-header border-l border-theme-border"
                    >Days</span
                  >
                </div>
                <button
                  onclick={() => removeMonth(month.id)}
                  class="p-1 text-theme-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove Month"
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
