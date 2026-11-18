<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";

  let { pkg }: { pkg: AdventureJsonV1 } = $props();

  function span(min: number | undefined, max: number | undefined): string {
    if (min !== undefined && max !== undefined) {
      return min === max ? String(min) : `${min}–${max}`;
    }
    if (min !== undefined) return `${min}+`;
    if (max !== undefined) return `Up to ${max}`;
    return "";
  }

  function formatSize(size: string): string {
    if (!size) return "";
    const isUpperBound = size.startsWith("Up to ");
    const value = isUpperBound ? size.slice("Up to ".length) : size;
    const players = value === "1" ? "player" : "players";
    return `${isUpperBound ? "Up to " : ""}${value} ${players}`;
  }

  function formatLevel(level: string): string {
    if (!level) return "";
    if (level.startsWith("Up to "))
      return `Up to Level ${level.slice("Up to ".length)}`;
    return `${level.includes("–") ? "Levels" : "Level"} ${level}`;
  }

  function formatParty(): string {
    const target = pkg.system?.targetParty;
    if (!target) return "";
    return [
      formatSize(span(target.sizeMin, target.sizeMax)),
      formatLevel(span(target.levelMin, target.levelMax)),
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const party = $derived(formatParty());

  const details = $derived(
    [pkg.system?.name, party].filter(Boolean).join(" · "),
  );

  const source = $derived(
    [
      pkg.source.authors?.length ? pkg.source.authors.join(", ") : null,
      pkg.source.publisher,
      pkg.source.publishedDate,
      pkg.source.license,
    ].filter(Boolean) as string[],
  );
</script>

<div class="min-w-0 space-y-1">
  <p class="font-semibold break-words text-theme-text">{pkg.title}</p>
  {#if details}
    <p class="text-sm text-theme-text">{details}</p>
  {/if}
  {#if source.length}
    <p class="text-xs break-words text-theme-text">{source.join(" · ")}</p>
  {/if}
  {#if pkg.premise.hook}
    <p class="text-sm break-words text-theme-text">{pkg.premise.hook}</p>
  {/if}
</div>
