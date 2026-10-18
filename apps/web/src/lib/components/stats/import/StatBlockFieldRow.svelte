<script lang="ts">
  import type { FieldStateName, ReadResult } from "@codex/stat-sheet-engine";

  export interface FieldRowModel {
    path: string;
    label: string;
    kind: "number" | "text" | "list";
  }

  interface Props {
    row: FieldRowModel;
    result: ReadResult;
    state: FieldStateName;
    onCommit: (raw: string) => void;
  }

  let { row, result, state, onCommit }: Props = $props();

  const STATE_LABEL: Record<FieldStateName, string> = {
    found: "Found",
    check: "Check this",
    "not-found": "Not found",
    converted: "Converted",
    "from-cr": "Worked out from CR",
    corrected: "Corrected",
  };

  const STATE_ICON: Record<FieldStateName, string> = {
    found: "icon-[lucide--check]",
    check: "icon-[lucide--circle-alert]",
    "not-found": "icon-[lucide--minus]",
    converted: "icon-[lucide--refresh-cw]",
    "from-cr": "icon-[lucide--calculator]",
    corrected: "icon-[lucide--pencil]",
  };

  const value = $derived.by(() => {
    const raw = row.path.split(".").reduce<unknown>((node, part) => {
      if (node === null || typeof node !== "object") return undefined;
      return (node as Record<string, unknown>)[part];
    }, result.values);
    if (raw === null || raw === undefined) return "";
    return Array.isArray(raw) ? raw.join(", ") : String(raw);
  });

  const note = $derived(
    result.notes.find((n) => n.path === row.path && n.state !== "derived"),
  );
  const original = $derived.by(() => {
    const converted = result.notes.find(
      (n) => n.path === row.path && n.state === "converted",
    );
    return converted ? (converted.original ?? "added") : null;
  });
</script>

<div
  class="flex flex-col gap-1 rounded border border-theme-border p-2"
  data-testid="stat-block-row"
  data-path={row.path}
>
  <div class="flex items-center justify-between gap-2">
    <label
      class="text-micro font-bold uppercase tracking-wide text-theme-muted"
      for={`sb-${row.path}`}>{row.label}</label
    >
    <span
      class="flex items-center gap-1 text-micro text-theme-muted"
      data-state={state}
    >
      <span class="{STATE_ICON[state]} h-3 w-3" aria-hidden="true"></span>
      {STATE_LABEL[state]}
    </span>
  </div>
  <input
    id={`sb-${row.path}`}
    type={row.kind === "number" ? "number" : "text"}
    {value}
    onchange={(e) => onCommit((e.currentTarget as HTMLInputElement).value)}
    class="rounded border border-theme-border bg-transparent px-2 py-1 text-sm text-theme-primary"
  />
  {#if original !== null}
    <p class="text-micro text-theme-muted" data-testid="stat-block-original">
      Original 5e value: {original}
    </p>
  {/if}
  {#if note?.state === "check" && note.source}
    <p class="text-micro text-theme-muted" data-testid="stat-block-source">
      From the text: “{note.source}”
    </p>
  {/if}
</div>
