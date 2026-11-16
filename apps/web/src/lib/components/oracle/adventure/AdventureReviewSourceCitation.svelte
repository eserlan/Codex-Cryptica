<script lang="ts">
  import type { SourceReference } from "@codex/adventure-engine";
  let { sourceRef }: { sourceRef: SourceReference | undefined } = $props();

  function formatSourceRef(source: SourceReference | undefined): string | null {
    if (!source) return null;
    const parts: string[] = [];
    if (source.page !== undefined) {
      parts.push(
        source.pageEnd !== undefined && source.pageEnd > source.page
          ? `pp. ${source.page}–${source.pageEnd}`
          : `p. ${source.page}`,
      );
    }
    if (source.chapter) parts.push(source.chapter);
    if (source.section) parts.push(source.section);
    if (source.anchor) parts.push(`#${source.anchor}`);
    return parts.length ? parts.join(" · ") : null;
  }

  const formatted = $derived(formatSourceRef(sourceRef));
</script>

{#if formatted}
  <span
    class="rounded border border-theme-border px-1.5 py-0.5 font-mono text-xs text-theme-text"
    data-testid="entity-source-ref"
  >
    {formatted}
  </span>
{/if}
