/**
 * Serialize a value into a JSON-LD string that is safe to inject into a
 * `<script type="application/ld+json">` element via Svelte's `{@html}`.
 *
 * A literal `<script>` element in a Svelte template treats its contents as
 * raw text and never interpolates `{...}`, so JSON-LD must be injected with
 * `{@html}`. To do that safely we escape `<` to its `<` unicode form,
 * which is still valid JSON but cannot break out of the script element (e.g.
 * a `</script>` sequence appearing inside user-generated content). This is the
 * standard XSS-safe JSON-embedding technique.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
