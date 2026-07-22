<script lang="ts">
  import type {
    CCImportSession,
    MatchDecision,
    ItemDecision,
  } from "@codex/importer";
  import { categories } from "$lib/stores/categories.svelte";

  interface Props {
    session: CCImportSession;
    onItemDecisionChange: (draftRef: string, decision: ItemDecision) => void;
    onMatchDecisionChange: (draftRef: string, decision: MatchDecision) => void;
    onItemTypeChange: (draftRef: string, type: string) => void;
    onCommit: () => void;
    onCancel: () => void;
    isStandalone?: boolean;
  }

  let {
    session,
    onItemDecisionChange,
    onMatchDecisionChange,
    onItemTypeChange,
    onCommit,
    onCancel,
    isStandalone = false,
  }: Props = $props();

  let actionableCount = $derived(
    session.items.filter((item) => {
      if (item.decision === "ignore") return false;
      if (!item.match) return true;
      return (item.matchDecision ?? "skip") !== "skip";
    }).length,
  );

  let canCommit = $derived(
    actionableCount > 0 ||
      session.relationships.length > 0 ||
      session.assets.length > 0,
  );

  const draftRefFor = (item: CCImportSession["items"][number]) =>
    item.draft.sourceId ?? item.draft.sourcePath ?? item.sourceRef;

  const warningsByRef = $derived.by(() => {
    const map = new Map<string, number>();
    for (const warning of session.warnings) {
      if (warning.ref == null) continue;
      map.set(warning.ref, (map.get(warning.ref) ?? 0) + 1);
    }
    return map;
  });

  const itemWarningCount = (item: CCImportSession["items"][number]) =>
    warningsByRef.get(item.sourceRef) ?? 0;

  interface FieldDiff {
    field: string;
    current: string;
    incoming: string;
  }

  /** Current-vs-package field diff for a matched item (FR-015), from PreviewItem.existing. */
  function fieldDiffs(item: CCImportSession["items"][number]): FieldDiff[] {
    const existing = item.existing;
    if (!existing) return [];
    const draft = item.draft;
    const diffs: FieldDiff[] = [];

    const compareScalar = (
      field: string,
      current?: string,
      incoming?: string,
    ) => {
      const currentValue = current ?? "";
      const incomingValue = incoming ?? "";
      if (currentValue !== incomingValue) {
        diffs.push({ field, current: currentValue, incoming: incomingValue });
      }
    };
    const compareList = (
      field: string,
      current?: string[],
      incoming?: string[],
    ) => {
      const currentValue = (current ?? []).join(", ");
      const incomingValue = (incoming ?? []).join(", ");
      if (currentValue !== incomingValue) {
        diffs.push({ field, current: currentValue, incoming: incomingValue });
      }
    };

    compareScalar("Title", existing.title, draft.title);
    compareScalar("Summary", existing.content, draft.content);
    compareScalar("Lore", existing.lore, draft.lore);
    compareList("Labels", existing.labels, draft.labels);
    compareList("Aliases", existing.aliases, draft.aliases);

    return diffs;
  }
</script>

<div class={["flex flex-col gap-4 min-h-0", isStandalone && "flex-1"]}>
  <section class="border border-theme-border bg-theme-surface rounded-lg p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3
          class="text-sm font-bold text-theme-primary uppercase font-header tracking-widest"
        >
          Review Import Package
        </h3>
        <p class="mt-1 text-xs text-theme-text/70 break-words">
          {session.sourceLabel}
        </p>
      </div>

      <div
        class="flex flex-wrap gap-2 text-[10px] font-bold uppercase font-header tracking-wider"
      >
        <span
          class="px-2 py-1 border border-theme-border bg-theme-bg text-theme-text rounded"
        >
          {session.items.length} Items
        </span>
        <span
          class="px-2 py-1 border border-theme-border bg-theme-bg text-theme-text rounded"
        >
          {session.items.filter((item) => item.match).length} Matches
        </span>
        <span
          class="px-2 py-1 border border-theme-border bg-theme-bg text-theme-text rounded"
        >
          {session.relationships.length} Links
        </span>
        <span
          class="px-2 py-1 border border-theme-border bg-theme-bg text-theme-text rounded"
        >
          {session.assets.length} Assets
        </span>
        <span
          class="px-2 py-1 border border-theme-border bg-theme-bg text-theme-text rounded"
        >
          {session.warnings.length} Warnings
        </span>
      </div>
    </div>
  </section>

  <section
    class="border border-theme-border bg-theme-surface rounded-lg overflow-hidden min-h-0 flex flex-col"
  >
    <div class="border-b border-theme-border px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4
          class="text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
        >
          Found entities
        </h4>
        <span
          class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
        >
          {session.items.length} detected
        </span>
      </div>
    </div>

    <div
      class="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.9fr)_auto] gap-3 px-4 py-2 border-b border-theme-border text-[10px] font-bold uppercase font-header tracking-wider text-theme-muted"
    >
      <span>Entity</span>
      <span>Type</span>
      <span>Match</span>
      <span>Action</span>
    </div>

    <div class="overflow-y-auto min-h-0">
      {#each session.items as item (item.sourceRef)}
        {@const diffs = fieldDiffs(item)}
        <div
          class="border-b border-theme-border/70 last:border-b-0"
          data-testid={item.match && diffs.length > 0
            ? `cif-review-diff-${item.sourceRef}`
            : undefined}
        >
          <div
            class="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.9fr)_auto] gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <label class="flex items-start gap-3">
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 accent-[var(--color-theme-primary)]"
                  checked={item.decision === "include"}
                  onchange={(event) =>
                    onItemDecisionChange(
                      draftRefFor(item),
                      event.currentTarget.checked ? "include" : "ignore",
                    )}
                  aria-label={`Include ${item.draft.title}`}
                />

                <span class="min-w-0">
                  <span
                    class="block text-sm font-semibold text-theme-text truncate"
                    title={item.sourceRef}
                  >
                    {item.draft.title}
                  </span>
                  {#if item.typeFallback}
                    <span
                      class="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase font-header tracking-wider text-amber-500"
                    >
                      <span class="icon-[lucide--triangle-alert] h-3.5 w-3.5"
                      ></span>
                      Type fallback — check the type
                    </span>
                  {/if}
                  {#if itemWarningCount(item) > 0}
                    <span
                      class="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase font-header tracking-wider text-red-400"
                    >
                      <span class="icon-[lucide--alert-triangle] h-3.5 w-3.5"
                      ></span>
                      {itemWarningCount(item)} warning{itemWarningCount(
                        item,
                      ) === 1
                        ? ""
                        : "s"}
                    </span>
                  {/if}
                </span>
              </label>
            </div>

            <div class="min-w-0 flex items-start">
              <select
                class={[
                  "px-2 py-1 border bg-theme-bg text-[10px] font-bold uppercase font-header tracking-wider rounded",
                  item.typeFallback
                    ? "border-amber-500 text-amber-500"
                    : "border-theme-border text-theme-text",
                ]}
                value={item.resolvedType}
                onchange={(event) =>
                  onItemTypeChange(
                    draftRefFor(item),
                    event.currentTarget.value,
                  )}
                aria-label={`Type for ${item.draft.title}`}
              >
                {#if !categories.list.some((c) => c.id === item.resolvedType)}
                  <option value={item.resolvedType}>{item.resolvedType}</option>
                {/if}
                {#each categories.list as category (category.id)}
                  <option value={category.id}>{category.label}</option>
                {/each}
              </select>
            </div>

            <div class="min-w-0 flex items-start">
              {#if item.match}
                <span
                  class="inline-flex items-center gap-1 px-2 py-1 border border-theme-primary/30 bg-theme-primary/10 text-[10px] font-bold uppercase font-header tracking-wider text-theme-primary rounded"
                >
                  <span class="icon-[lucide--link-2] h-3.5 w-3.5"></span>
                  Existing
                </span>
              {:else}
                <span
                  class="inline-flex items-center gap-1 px-2 py-1 border border-theme-border bg-theme-bg text-[10px] font-bold uppercase font-header tracking-wider text-theme-muted rounded"
                >
                  <span class="icon-[lucide--sparkles] h-3.5 w-3.5"></span>
                  New
                </span>
              {/if}
            </div>

            <div class="flex items-start justify-end">
              {#if item.match}
                <div
                  class="inline-flex rounded border border-theme-border overflow-hidden"
                >
                  {#each ["skip", "update", "create"] as option (option)}
                    <button
                      type="button"
                      class={[
                        "px-2.5 py-1 text-[10px] font-bold uppercase font-header tracking-wider border-l first:border-l-0",
                        (item.matchDecision ?? "skip") === option
                          ? "bg-theme-primary text-theme-bg border-theme-primary"
                          : "bg-theme-bg text-theme-text border-theme-border hover:bg-theme-surface",
                      ]}
                      onclick={() =>
                        onMatchDecisionChange(
                          draftRefFor(item),
                          option as MatchDecision,
                        )}
                      aria-pressed={(item.matchDecision ?? "skip") === option}
                    >
                      {option}
                    </button>
                  {/each}
                </div>
              {:else}
                <span
                  class="text-[10px] font-bold uppercase font-header tracking-wider text-theme-muted pt-1"
                >
                  Create
                </span>
              {/if}
            </div>
          </div>

          {#if item.match && diffs.length > 0}
            <div class="px-4 pb-3 -mt-1 space-y-1.5">
              {#each diffs as diff (diff.field)}
                <div class="text-[11px] leading-tight">
                  <span
                    class="font-bold uppercase font-header tracking-wider text-theme-muted"
                    >{diff.field}:</span
                  >
                  <span class="text-red-400/80 line-through break-words"
                    >{diff.current || "(empty)"}</span
                  >
                  <span class="text-theme-muted">→</span>
                  <span class="text-theme-primary break-words"
                    >{diff.incoming || "(empty)"}</span
                  >
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <div class="grid gap-4 lg:grid-cols-3">
    <details
      class="border border-theme-border bg-theme-surface rounded-lg p-4"
      open={session.warnings.length > 0}
    >
      <summary
        class="cursor-pointer list-none text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
      >
        Warnings
      </summary>
      <div class="mt-3 space-y-2">
        {#if session.warnings.length === 0}
          <p class="text-xs text-theme-muted">No warnings.</p>
        {:else}
          {#each session.warnings as warning (`${warning.code}:${warning.ref ?? warning.message}`)}
            <div class="text-xs text-theme-text">
              <div class="font-semibold">{warning.code}</div>
              <div class="text-theme-muted break-words">{warning.message}</div>
            </div>
          {/each}
        {/if}
      </div>
    </details>

    <details
      class="border border-theme-border bg-theme-surface rounded-lg p-4"
      open
    >
      <summary
        class="cursor-pointer list-none text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
      >
        Found links
      </summary>
      <div class="mt-3 space-y-2">
        {#if session.relationships.length === 0}
          <p class="text-xs text-theme-muted">No relationships.</p>
        {:else}
          <p class="text-xs text-theme-text">
            {session.relationships.length} relationship{session.relationships
              .length === 1
              ? ""
              : "s"} found.
          </p>
        {/if}
      </div>
    </details>

    <details class="border border-theme-border bg-theme-surface rounded-lg p-4">
      <summary
        class="cursor-pointer list-none text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
      >
        Assets
      </summary>
      <div class="mt-3 space-y-2">
        {#if session.assets.length === 0}
          <p class="text-xs text-theme-muted">No assets.</p>
        {:else}
          {#each session.assets as asset (asset.draft.id)}
            <div class="text-xs text-theme-text">
              <div class="font-semibold break-all">
                {asset.draft.originalName}
              </div>
              <div class="text-theme-muted break-all">
                {asset.eligible ? "Eligible" : (asset.skipReason ?? "Skipped")}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </details>
  </div>

  <div
    class="flex items-center justify-between gap-3 border-t border-theme-border pt-3"
  >
    <p class="text-xs text-theme-muted">
      {actionableCount} item{actionableCount === 1 ? "" : "s"} ready to import
    </p>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-3 py-2 border border-theme-border text-theme-text text-xs font-bold uppercase font-header tracking-widest rounded hover:bg-theme-bg"
        onclick={onCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-3 py-2 bg-theme-primary text-theme-bg text-xs font-bold uppercase font-header tracking-widest rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={onCommit}
        disabled={!canCommit}
      >
        {#if actionableCount > 0}
          Import {actionableCount}
        {:else if session.relationships.length > 0}
          Import Links
        {:else}
          Import Assets
        {/if}
      </button>
    </div>
  </div>
</div>
