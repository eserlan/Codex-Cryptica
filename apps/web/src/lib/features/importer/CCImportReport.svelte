<script lang="ts">
  import type { ImportReport } from "@codex/importer";

  interface Props {
    report: ImportReport;
    onDone: () => void;
  }

  let { report, onDone }: Props = $props();
</script>

<div class="flex flex-col gap-4">
  <section class="border border-theme-border bg-theme-surface rounded-lg p-4">
    <div class="flex items-start gap-3">
      <div
        class="h-10 w-10 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center shrink-0"
      >
        <span class="icon-[lucide--check-circle] h-5 w-5"></span>
      </div>
      <div class="min-w-0">
        <h3
          class="text-sm font-bold text-theme-primary uppercase font-header tracking-widest"
        >
          Import Report
        </h3>
        <p class="mt-1 text-xs text-theme-text/70 break-words">
          {report.sourceLabel}
        </p>
      </div>
    </div>
  </section>

  <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div class="border border-theme-border bg-theme-surface rounded-lg p-3">
      <div
        class="text-[10px] font-bold uppercase font-header tracking-widest text-theme-muted"
      >
        Created
      </div>
      <div class="mt-2 text-2xl font-bold text-theme-text">
        {report.entitiesCreated}
      </div>
    </div>
    <div class="border border-theme-border bg-theme-surface rounded-lg p-3">
      <div
        class="text-[10px] font-bold uppercase font-header tracking-widest text-theme-muted"
      >
        Updated
      </div>
      <div class="mt-2 text-2xl font-bold text-theme-text">
        {report.entitiesUpdated}
      </div>
    </div>
    <div class="border border-theme-border bg-theme-surface rounded-lg p-3">
      <div
        class="text-[10px] font-bold uppercase font-header tracking-widest text-theme-muted"
      >
        Skipped
      </div>
      <div class="mt-2 text-2xl font-bold text-theme-text">
        {report.itemsSkipped}
      </div>
    </div>
    <div class="border border-theme-border bg-theme-surface rounded-lg p-3">
      <div
        class="text-[10px] font-bold uppercase font-header tracking-widest text-theme-muted"
      >
        Links
      </div>
      <div class="mt-2 text-2xl font-bold text-theme-text">
        {report.relationshipsCreated}
      </div>
    </div>
  </section>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="border border-theme-border bg-theme-surface rounded-lg p-4">
      <h4
        class="text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
      >
        Unresolved References
      </h4>
      <div class="mt-3 space-y-2">
        {#if report.unresolvedReferences.length === 0}
          <p class="text-xs text-theme-muted">No unresolved references.</p>
        {:else}
          {#each report.unresolvedReferences as unresolved, i (`${unresolved.fromRef}:${unresolved.toRef}:${unresolved.type}:${i}`)}
            <div class="text-xs text-theme-text">
              <div class="font-semibold break-all">
                {unresolved.fromRef} -> {unresolved.toRef}
              </div>
              <div class="text-theme-muted">{unresolved.type}</div>
              <div class="text-red-400 mt-1">{unresolved.reason}</div>
            </div>
          {/each}
        {/if}
      </div>
    </section>

    <section class="border border-theme-border bg-theme-surface rounded-lg p-4">
      <h4
        class="text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
      >
        Failures
      </h4>
      <div class="mt-3 space-y-2">
        {#if report.failures.length === 0}
          <p class="text-xs text-theme-muted">No failures.</p>
        {:else}
          {#each report.failures as failure, i (`${failure.ref}:${failure.stage}:${failure.message}:${i}`)}
            <div class="text-xs text-theme-text">
              <div class="font-semibold break-all">{failure.ref}</div>
              <div
                class="text-theme-muted uppercase font-header tracking-wider text-[10px]"
              >
                {failure.stage}
              </div>
              <div class="text-red-400 mt-1 break-words">{failure.message}</div>
            </div>
          {/each}
        {/if}
      </div>
    </section>
  </div>

  <section class="border border-theme-border bg-theme-surface rounded-lg p-4">
    <div class="flex flex-wrap gap-4 text-xs text-theme-text">
      <span><strong>{report.assetsImported}</strong> assets imported</span>
      <span><strong>{report.assetsSkipped.length}</strong> assets skipped</span>
      <span><strong>{report.typeFallbacks.length}</strong> type fallbacks</span>
      <span
        ><strong>{report.duplicatesSkipped.length}</strong> duplicates skipped</span
      >
      <span><strong>{report.warnings.length}</strong> warnings</span>
    </div>
  </section>

  {#if report.duplicatesSkipped.length > 0}
    <section
      class="border border-theme-border bg-theme-surface rounded-lg p-4"
      data-testid="import-report-duplicates"
    >
      <h4
        class="text-xs font-bold text-theme-primary uppercase font-header tracking-widest"
      >
        Links already present
      </h4>
      <div class="mt-3 space-y-2">
        {#each report.duplicatesSkipped as duplicate, i (`${duplicate.fromRef}:${duplicate.toRef}:${duplicate.type}:${i}`)}
          <div class="text-xs text-theme-text">
            <div class="font-semibold break-all">
              {duplicate.fromRef} -> {duplicate.toRef}
            </div>
            <div class="text-theme-muted">{duplicate.type}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <div class="flex justify-end">
    <button
      type="button"
      class="px-3 py-2 bg-theme-primary text-theme-bg text-xs font-bold uppercase font-header tracking-widest rounded"
      onclick={onDone}
    >
      Done
    </button>
  </div>
</div>
