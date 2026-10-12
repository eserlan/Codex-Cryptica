<script lang="ts">
  import {
    VAULT_AUDIT_PRESETS,
    type VaultAuditCounts,
    type VaultAuditPreset,
  } from "./vaultAudit";
  import type { VaultDistributionSummary } from "./vaultDistribution";
  import VaultDistributionChart from "./VaultDistributionChart.svelte";

  let {
    counts,
    activePresetId = null,
    distributionSummary,
    activeTypeFilter = null,
    activeLabelFilter = null,
    activeLabelMode = null,
    activeTab = "findings",
    onTabChange,
    onSelectCategory,
    onSelectLabel,
    onSelectUnlabelled,
    onApplyPreset,
    onDrillDown,
    onClose,
  }: {
    counts: VaultAuditCounts;
    activePresetId?: string | null;
    distributionSummary?: VaultDistributionSummary;
    activeTypeFilter?: string | null;
    activeLabelFilter?: string | null;
    activeLabelMode?: string | null;
    activeTab?: "findings" | "distribution";
    onTabChange?: (tab: "findings" | "distribution") => void;
    onSelectCategory?: (typeId: string) => void;
    onSelectLabel?: (label: string) => void;
    onSelectUnlabelled?: () => void;
    onApplyPreset: (preset: VaultAuditPreset) => void;
    onDrillDown: (
      finding:
        | "missing_images"
        | "missing_descriptions"
        | "zero_connections"
        | "unlabelled"
        | "incomplete",
    ) => void;
    onClose: () => void;
  } = $props();

  let localTab = $state<"findings" | "distribution">("findings");
  const currentTab = $derived(
    onTabChange ? (activeTab ?? "findings") : localTab,
  );

  function switchTab(tab: "findings" | "distribution") {
    localTab = tab;
    onTabChange?.(tab);
  }
</script>

{#snippet findingCards()}
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
    <!-- Missing Images -->
    <button
      type="button"
      onclick={() => onDrillDown("missing_images")}
      class="flex flex-col items-start gap-1 rounded-lg border border-theme-border/60 bg-theme-bg/60 p-2.5 text-left transition hover:border-theme-primary/50 hover:bg-theme-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
      data-testid="audit-card-missing-images"
    >
      <div class="flex w-full items-center justify-between text-theme-muted">
        <span class="icon-[lucide--image-off] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        <span
          class="rounded-full bg-theme-primary/15 px-1.5 py-0.2 text-nano font-bold text-theme-primary"
        >
          {counts.missingImages}
        </span>
      </div>
      <span class="text-xs font-semibold text-theme-text"
        >Missing portraits</span
      >
      <span class="text-nano text-theme-muted/70">No genuine image</span>
    </button>

    <!-- Missing Descriptions -->
    <button
      type="button"
      onclick={() => onDrillDown("missing_descriptions")}
      class="flex flex-col items-start gap-1 rounded-lg border border-theme-border/60 bg-theme-bg/60 p-2.5 text-left transition hover:border-theme-primary/50 hover:bg-theme-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
      data-testid="audit-card-missing-descriptions"
    >
      <div class="flex w-full items-center justify-between text-theme-muted">
        <span class="icon-[lucide--file-text] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        <span
          class="rounded-full bg-theme-primary/15 px-1.5 py-0.2 text-nano font-bold text-theme-primary"
        >
          {counts.missingDescriptions}
        </span>
      </div>
      <span class="text-xs font-semibold text-theme-text">No summary</span>
      <span class="text-nano text-theme-muted/70">Empty description</span>
    </button>

    <!-- Zero Connections -->
    <button
      type="button"
      onclick={() => onDrillDown("zero_connections")}
      class="flex flex-col items-start gap-1 rounded-lg border border-theme-border/60 bg-theme-bg/60 p-2.5 text-left transition hover:border-theme-primary/50 hover:bg-theme-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
      data-testid="audit-card-zero-connections"
    >
      <div class="flex w-full items-center justify-between text-theme-muted">
        <span class="icon-[lucide--git-fork] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        <span
          class="rounded-full bg-theme-primary/15 px-1.5 py-0.2 text-nano font-bold text-theme-primary"
        >
          {counts.zeroConnections}
        </span>
      </div>
      <span class="text-xs font-semibold text-theme-text">No connections</span>
      <span class="text-nano text-theme-muted/70">Isolated nodes</span>
    </button>

    <!-- Unlabelled -->
    <button
      type="button"
      onclick={() => onDrillDown("unlabelled")}
      class="flex flex-col items-start gap-1 rounded-lg border border-theme-border/60 bg-theme-bg/60 p-2.5 text-left transition hover:border-theme-primary/50 hover:bg-theme-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
      data-testid="audit-card-unlabelled"
    >
      <div class="flex w-full items-center justify-between text-theme-muted">
        <span class="icon-[lucide--tag] h-3.5 w-3.5" aria-hidden="true"></span>
        <span
          class="rounded-full bg-theme-primary/15 px-1.5 py-0.2 text-nano font-bold text-theme-primary"
        >
          {counts.unlabelled}
        </span>
      </div>
      <span class="text-xs font-semibold text-theme-text">Unlabelled</span>
      <span class="text-nano text-theme-muted/70">No tags / labels</span>
    </button>

    <!-- Incomplete -->
    <button
      type="button"
      onclick={() => onDrillDown("incomplete")}
      class="flex flex-col items-start gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-left transition hover:border-amber-500/60 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 col-span-2 sm:col-span-1"
      data-testid="audit-card-incomplete"
    >
      <div class="flex w-full items-center justify-between text-amber-500">
        <span
          class="icon-[lucide--alert-triangle] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        <span
          class="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-nano font-bold text-amber-600 dark:text-amber-400"
        >
          {counts.incomplete}
        </span>
      </div>
      <span class="text-xs font-semibold text-theme-text">All flagged</span>
      <span class="text-nano text-theme-muted/70">Any missing field</span>
    </button>
  </div>
{/snippet}

{#snippet quickPresets()}
  <div class="flex flex-wrap items-center gap-1.5 pt-1">
    <span
      class="text-nano uppercase tracking-wider font-semibold text-theme-muted mr-1"
    >
      Quick Presets:
    </span>
    {#each VAULT_AUDIT_PRESETS as preset (preset.id)}
      {@const isActive = activePresetId === preset.id}
      <button
        type="button"
        onclick={() => onApplyPreset(preset)}
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {isActive
          ? 'border-theme-primary bg-theme-primary/15 text-theme-primary font-semibold'
          : 'border-theme-border/80 bg-theme-bg/60 text-theme-muted hover:border-theme-primary/50 hover:text-theme-text'}"
        title={preset.description}
        data-testid={`audit-preset-${preset.id}`}
      >
        <span class="{preset.icon} h-3.5 w-3.5" aria-hidden="true"></span>
        <span>{preset.title}</span>
      </button>
    {/each}
  </div>
{/snippet}

<div
  class="rounded-xl border border-theme-border bg-theme-surface/90 p-3.5 sm:p-4 shadow-sm backdrop-blur transition-all flex flex-col gap-3.5"
  data-testid="vault-audit-panel"
  role="region"
  aria-label="Vault Audit"
>
  <!-- Header -->
  <div class="flex items-start justify-between gap-3">
    <div class="flex items-center gap-2">
      <div
        class="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-primary/15 text-theme-primary"
      >
        <span class="icon-[lucide--clipboard-check] h-4 w-4" aria-hidden="true"
        ></span>
      </div>
      <div>
        <h2 class="text-xs font-bold uppercase tracking-wider text-theme-text">
          Vault Audit
        </h2>
        <p class="text-micro text-theme-muted">
          Fact-based checks across this vault. Not every entity requires every
          field; select a finding to review and clean up.
        </p>
      </div>
    </div>

    <button
      type="button"
      onclick={onClose}
      class="rounded-md p-1 text-theme-muted transition-colors hover:bg-theme-primary/10 hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
      title="Close Vault Audit"
      aria-label="Close Vault Audit"
      data-testid="vault-audit-close"
    >
      <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
    </button>
  </div>

  <!-- Segmented View Switcher: Findings vs Distribution -->
  {#if distributionSummary}
    <div
      class="flex items-center gap-1 border-b border-theme-border/50 pb-2"
      role="tablist"
      aria-label="Vault audit views"
    >
      <button
        type="button"
        role="tab"
        aria-selected={currentTab === "findings"}
        onclick={() => switchTab("findings")}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {currentTab ===
        'findings'
          ? 'bg-theme-primary/15 text-theme-primary'
          : 'text-theme-muted hover:bg-theme-primary/5 hover:text-theme-text'}"
        data-testid="audit-tab-findings"
      >
        <span
          class="icon-[lucide--clipboard-check] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        <span>Findings</span>
        {#if counts.incomplete > 0}
          <span
            class="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-nano font-bold text-amber-600 dark:text-amber-400"
          >
            {counts.incomplete}
          </span>
        {/if}
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={currentTab === "distribution"}
        onclick={() => switchTab("distribution")}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {currentTab ===
        'distribution'
          ? 'bg-theme-primary/15 text-theme-primary'
          : 'text-theme-muted hover:bg-theme-primary/5 hover:text-theme-text'}"
        data-testid="audit-tab-distribution"
      >
        <span class="icon-[lucide--bar-chart-2] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        <span>Distribution</span>
        <span
          class="rounded-full bg-theme-border/50 px-1.5 py-0.2 text-nano text-theme-text font-normal"
        >
          {distributionSummary.totalUniqueEntities}
        </span>
      </button>
    </div>
  {/if}

  {#if currentTab === "findings" || !distributionSummary}
    {@render findingCards()}
    {@render quickPresets()}
  {:else}
    <VaultDistributionChart
      summary={distributionSummary}
      {activeTypeFilter}
      {activeLabelFilter}
      {activeLabelMode}
      onSelectCategory={onSelectCategory ?? (() => {})}
      onSelectLabel={onSelectLabel ?? (() => {})}
      onSelectUnlabelled={onSelectUnlabelled ?? (() => {})}
    />
  {/if}
</div>
