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

  const party = $derived.by(() => {
    const target = pkg.system?.targetParty;
    if (!target) return "";
    const parts: string[] = [];
    const size = span(target.sizeMin, target.sizeMax);
    if (size) {
      const isUpperBound = size.startsWith("Up to ");
      const value = isUpperBound ? size.slice("Up to ".length) : size;
      const players = value === "1" ? "player" : "players";
      parts.push(`${isUpperBound ? "Up to " : ""}${value} ${players}`);
    }
    const level = span(target.levelMin, target.levelMax);
    if (level) {
      if (level.startsWith("Up to ")) {
        parts.push(`Up to Level ${level.slice("Up to ".length)}`);
      } else {
        parts.push(`${level.includes("–") ? "Levels" : "Level"} ${level}`);
      }
    }
    return parts.join(" · ");
  });

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
