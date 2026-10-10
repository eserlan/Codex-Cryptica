<script lang="ts">
  import { THREAD_KINDS, type ThreadKind } from "solo-session-engine";

  const KIND_LABELS: Record<ThreadKind, string> = {
    question: "Question",
    lead: "Lead",
    objective: "Objective",
    mystery: "Mystery",
  };

  let {
    search = $bindable(""),
    kindFilter = $bindable<ThreadKind | "all">("all"),
  }: {
    search?: string;
    kindFilter?: ThreadKind | "all";
  } = $props();
</script>

<div class="flex gap-2">
  <input
    type="search"
    placeholder="Search threads"
    aria-label="Search threads"
    bind:value={search}
    class="min-w-0 flex-1 rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
    data-testid="solo-threads-search"
  />
  <select
    bind:value={kindFilter}
    aria-label="Filter by kind"
    class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
    data-testid="solo-threads-filter"
  >
    <option value="all">All kinds</option>
    {#each THREAD_KINDS as option (option)}
      <option value={option}>{KIND_LABELS[option]}s</option>
    {/each}
  </select>
</div>
