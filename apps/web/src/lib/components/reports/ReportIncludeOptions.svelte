<script lang="ts">
  import type {
    ReportInclude,
    ReportInput,
    ReportSource,
  } from "entity-report-engine";

  import ReportOptionCheckbox from "./ReportOptionCheckbox.svelte";

  let {
    include = $bindable(),
    input,
    source,
  }: {
    include: ReportInclude;
    input: ReportInput | null;
    source: ReportSource;
  } = $props();

  const emptyOptionHint = $derived<
    Partial<Record<keyof ReportInclude, string>>
  >({
    ...((input?.relationships.length ?? 0) === 0 && {
      relationships: "No relationships between these entities.",
    }),
    ...(!Object.values(input?.factionMembership ?? {}).some(
      (members) => members.length > 0,
    ) && {
      factionsAffiliations: "No faction members or affiliations found.",
    }),
  });

  const sourceCount = (source: "canvas" | "graph") =>
    input?.relationships.filter((r) => r.sources?.includes(source)).length ?? 0;
  const connectionOptions = $derived<
    {
      key: "canvasConnections" | "graphConnections";
      label: string;
      hint?: string;
    }[]
  >([
    ...(source.origin === "canvas"
      ? [
          {
            key: "canvasConnections" as const,
            label: "Lines drawn on the canvas",
            hint:
              sourceCount("canvas") === 0
                ? "No lines between these entities."
                : undefined,
          },
        ]
      : []),
    {
      key: "graphConnections" as const,
      label: "Connections from the graph",
      hint:
        sourceCount("graph") === 0
          ? "No graph connections between these entities."
          : undefined,
    },
  ]);

  const includeOptions: { key: keyof ReportInclude; label: string }[] = [
    { key: "descriptions", label: "Descriptions" },
    { key: "relationships", label: "Relationships" },
    { key: "factionsAffiliations", label: "Factions and affiliations" },
    { key: "portraits", label: "Portraits" },
    { key: "gmOnlySecrets", label: "GM-only secrets" },
  ];
</script>

<fieldset class="space-y-2">
  <legend class="text-xs uppercase tracking-widest font-header text-theme-muted"
    >Include</legend
  >
  {#each includeOptions as opt (opt.key)}
    {@const hint = emptyOptionHint[opt.key]}
    <ReportOptionCheckbox
      bind:checked={include[opt.key]}
      label={opt.label}
      {hint}
    />
    {#if opt.key === "relationships" && !hint}
      <div class="ml-6 space-y-1">
        {#each connectionOptions as conn (conn.key)}
          <ReportOptionCheckbox
            small
            bind:checked={include[conn.key]}
            label={conn.label}
            hint={conn.hint}
            disabled={!include.relationships}
          />
        {/each}
      </div>
    {/if}
  {/each}
  <p class="text-[11px] text-theme-muted">
    GM-only secrets stay out of the report unless you turn them on.
  </p>
</fieldset>
