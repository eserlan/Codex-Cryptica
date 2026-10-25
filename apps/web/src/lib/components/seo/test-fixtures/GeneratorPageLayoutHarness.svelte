<script lang="ts">
  import type { Snippet } from "svelte";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  let {
    pageTitle,
    theme = $bindable(""),
    initialDraft,
    generate,
    formFields,
    relatedLinks = [],
    outputLead,
  }: {
    pageTitle?: string;
    theme?: string;
    initialDraft?: GeneratorOutput | null;
    generate: (options: { useAI: boolean }) => Promise<GeneratorOutput>;
    formFields: Snippet<[() => void]>;
    relatedLinks?: { href: string; label: string }[];
    outputLead?: Snippet;
  } = $props();
  let status = $state("");

  async function trigger() {
    try {
      status = (await generate({ useAI: false })).title;
    } catch {
      status = "Generation failed";
    }
  }

  export function triggerExplicitAutoGenerate() {
    void trigger();
  }
</script>

<h1>{pageTitle}</h1>
<p data-testid="page-theme">{theme}</p>
<p data-testid="initial-draft">{initialDraft?.title ?? "No initial draft"}</p>
{@render formFields(() => void trigger())}
{@render outputLead?.()}
<button type="button" onclick={trigger}>Generate from harness</button>
<p role="status">{status}</p>
<ul data-testid="related-links">
  {#each relatedLinks as link (link.href)}
    <li><a href={link.href}>{link.label}</a></li>
  {/each}
</ul>
