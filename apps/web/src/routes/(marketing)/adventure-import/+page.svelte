<script lang="ts">
  import { onDestroy } from "svelte";
  import { basePath } from "#lib/utils/base-path.js";
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import { copyTextToClipboard } from "#lib/utils/share-link.js";
  import {
    CANONICAL_CONVERSION_PROMPT,
    COLLECTION_RULES,
    EPISTEMIC_STATUSES,
    TOP_LEVEL_RULES,
    TROUBLESHOOTING_ERRORS,
  } from "./conversion-guide.js";

  const cleanBase = basePath();
  const pageUrl = "https://codexcryptica.com/adventure-import";

  let copyState = $state<"idle" | "copied" | "error">("idle");
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    if (copyTimer) clearTimeout(copyTimer);
  });

  async function handleCopyPrompt() {
    const ok = await copyTextToClipboard(
      CANONICAL_CONVERSION_PROMPT,
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
    );
    copyState = ok ? "copied" : "error";
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyState = "idle";
    }, 2200);
  }

  const breadcrumbSchema = safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://codexcryptica.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Adventure JSON Conversion Guide",
        item: pageUrl,
      },
    ],
  });
</script>

<svelte:head>
  <title>Adventure JSON Conversion Guide | Codex Cryptica</title>
  <meta
    name="description"
    content="Convert any tabletop RPG adventure you own into Codex Cryptica Adventure JSON v1 using ChatGPT, Claude, Gemini, or a local LLM. Includes the canonical prompt, static JSON Schema, examples, and validation troubleshooting."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={pageUrl} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbSchema}</scr` +
    `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <main
    class="max-w-5xl mx-auto px-4 sm:px-6 py-14 flex-grow w-full space-y-12"
  >
    <!-- Hero -->
    <section class="text-center space-y-5">
      <div
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-micro font-mono font-medium bg-theme-primary/10 border border-theme-primary/20 text-theme-text"
      >
        <span class="icon-[lucide--file-json] w-3.5 h-3.5" aria-hidden="true"
        ></span>
        Adventure JSON v1
      </div>
      <h1
        class="font-header font-extrabold text-3xl md:text-5xl tracking-wide text-theme-text"
      >
        Adventure JSON Conversion Guide
      </h1>
      <p
        class="text-lg md:text-xl font-medium text-theme-text max-w-3xl mx-auto"
      >
        Give your AI assistant this page and the adventure you legally have
        access to.
      </p>
      <p class="text-base text-theme-text/80 leading-relaxed max-w-2xl mx-auto">
        Use ChatGPT, Claude, Gemini, or a local model to turn a PDF, Markdown
        file, or module notes into a clean, validated
        <code class="font-mono text-theme-text">adventure-json/v1</code>
        file that Codex Cryptica processes strictly on your device.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href="{cleanBase}/schemas/adventure-json/v1.json"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-primary/40 bg-theme-primary/10 text-theme-text text-sm font-semibold hover:bg-theme-primary/20 transition-colors"
        >
          <span class="icon-[lucide--braces] w-4 h-4" aria-hidden="true"></span>
          JSON Schema (v1.json)
        </a>
        <a
          href="{cleanBase}/schemas/adventure-json/examples/minimal.v1.json"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-border/60 bg-theme-surface/50 text-theme-text text-sm font-medium hover:border-theme-primary/50 transition-colors"
        >
          <span class="icon-[lucide--file-code] w-4 h-4" aria-hidden="true"
          ></span>
          Minimal Example
        </a>
        <a
          href="{cleanBase}/schemas/adventure-json/examples/reference-one-shot.v1.json"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-border/60 bg-theme-surface/50 text-theme-text text-sm font-medium hover:border-theme-primary/50 transition-colors"
        >
          <span class="icon-[lucide--book-open] w-4 h-4" aria-hidden="true"
          ></span>
          Reference One-Shot Example
        </a>
      </div>
    </section>

    <!-- Privacy & Responsibility Notice -->
    <section
      aria-labelledby="privacy-notice-heading"
      class="rounded-2xl border border-theme-primary/30 bg-theme-surface/45 p-6 space-y-2"
    >
      <div class="flex items-center gap-2 text-theme-text">
        <span class="icon-[lucide--shield-check] w-5 h-5" aria-hidden="true"
        ></span>
        <h2 id="privacy-notice-heading" class="font-header font-bold text-lg">
          Privacy &amp; External Provider Responsibility
        </h2>
      </div>
      <p class="text-sm md:text-base text-theme-text/85 leading-relaxed">
        Document conversion happens entirely inside your chosen external AI
        assistant (ChatGPT, Claude, Gemini, or a local model).
        <strong
          >Codex Cryptica never receives or uploads your source document</strong
        >
        and processes the resulting Adventure JSON strictly on-device. You are responsible
        for ensuring you have the legal right to share any source material with your
        chosen AI provider under that provider's terms.
      </p>
    </section>

    <!-- Canonical Copyable Prompt -->
    <section
      aria-labelledby="prompt-heading"
      class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="prompt-heading"
            class="font-header font-bold text-2xl text-theme-text"
          >
            Canonical Conversion Prompt
          </h2>
          <p class="text-sm text-theme-text/80 mt-1">
            Paste this prompt into ChatGPT, Claude, Gemini, or your local model
            alongside the adventure text or PDF you want to convert.
          </p>
        </div>
        <button
          type="button"
          onclick={handleCopyPrompt}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary text-theme-on-primary font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <span
            class="{copyState === 'copied'
              ? 'icon-[lucide--check]'
              : 'icon-[lucide--copy]'} w-4 h-4"
            aria-hidden="true"
          ></span>
          {#if copyState === "copied"}
            Copied prompt
          {:else if copyState === "error"}
            Copy failed — select manually
          {:else}
            Copy conversion prompt
          {/if}
        </button>
      </div>

      <pre
        class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 whitespace-pre-wrap leading-relaxed">{CANONICAL_CONVERSION_PROMPT}</pre>

      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-theme-text/80"
      >
        <div
          class="rounded-xl border border-theme-border/50 bg-theme-bg/40 p-3"
        >
          <strong class="text-theme-text block mb-1"
            >1. Provide this guide</strong
          >
          Share
          <code class="font-mono"
            >https://codexcryptica.com/adventure-import</code
          > or paste the prompt above.
        </div>
        <div
          class="rounded-xl border border-theme-border/50 bg-theme-bg/40 p-3"
        >
          <strong class="text-theme-text block mb-1"
            >2. Attach your source</strong
          >
          Upload or paste the adventure you legally own into ChatGPT, Claude, Gemini,
          or a local LLM.
        </div>
        <div
          class="rounded-xl border border-theme-border/50 bg-theme-bg/40 p-3"
        >
          <strong class="text-theme-text block mb-1"
            >3. Save &amp; validate</strong
          >
          Save the output as <code class="font-mono">.json</code> and verify it against
          the v1 schema before importing locally.
        </div>
      </div>
    </section>

    <!-- Top-level Contract & Collections -->
    <section aria-labelledby="contract-heading" class="space-y-6">
      <h2
        id="contract-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Field-by-Field Structure
      </h2>

      <div
        class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-4"
      >
        <h3 class="font-header font-bold text-lg text-theme-text">
          Top-Level Contract
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-theme-border/60 text-theme-text/80">
                <th class="py-2 pr-4 font-mono">Field</th>
                <th class="py-2 pr-4">Requirement</th>
                <th class="py-2">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-theme-border/40">
              {#each TOP_LEVEL_RULES as row (row.field)}
                <tr>
                  <td
                    class="py-2.5 pr-4 font-mono text-theme-text whitespace-nowrap"
                    >{row.field}</td
                  >
                  <td class="py-2.5 pr-4 text-theme-text">{row.requirement}</td>
                  <td class="py-2.5 text-theme-text/80">{row.notes}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-4"
      >
        <h3 class="font-header font-bold text-lg text-theme-text">
          Required Collections (11 Arrays)
        </h3>
        <p class="text-sm text-theme-text/80">
          Every Adventure JSON v1 file must include all 11 collection arrays;
          use
          <code class="font-mono text-theme-text">[]</code> when a collection has
          no entries.
        </p>
        <dl class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each COLLECTION_RULES as item (item.name)}
            <div
              class="rounded-xl border border-theme-border/50 bg-theme-bg/40 p-3.5"
            >
              <dt class="font-mono text-sm font-semibold text-theme-text">
                {item.name}
              </dt>
              <dd class="text-sm text-theme-text/80 mt-1">{item.purpose}</dd>
            </div>
          {/each}
        </dl>
      </div>
    </section>

    <!-- Epistemic Status, Visibility & Authorship Rules -->
    <section aria-labelledby="rules-heading" class="space-y-6">
      <h2
        id="rules-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Epistemic Honesty, Visibility &amp; Structural Rules
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-3"
        >
          <h3 class="font-header font-bold text-lg text-theme-text">
            Epistemic Status
          </h3>
          <p class="text-sm text-theme-text font-semibold">
            Do not invent missing facts merely to fill fields.
          </p>
          <p class="text-sm text-theme-text/80 leading-relaxed">
            If the source text is silent, omit the optional field. If the source
            text is contradictory or unclear, record an item in
            <code class="font-mono">unresolved</code> instead of guessing.
          </p>
          <ul class="space-y-2 pt-1 text-sm">
            {#each EPISTEMIC_STATUSES as entry (entry.status)}
              <li class="flex gap-2">
                <code class="font-mono text-theme-text shrink-0"
                  >{entry.status}</code
                >
                <span class="text-theme-text/80">— {entry.meaning}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div
          class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-3"
        >
          <h3 class="font-header font-bold text-lg text-theme-text">
            Visibility &amp; GM Secrets
          </h3>
          <p class="text-sm text-theme-text/80 leading-relaxed">
            Entities carry <code class="font-mono">visibility</code> set to
            either <code class="font-mono">"player-visible"</code> or
            <code class="font-mono">"gm-only"</code>.
          </p>
          <p class="text-sm text-theme-text font-semibold">
            Every entry in <code>secrets</code> must set
            <code>visibility: "gm-only"</code>.
          </p>
          <p class="text-sm text-theme-text/80 leading-relaxed">
            Authored facts are canonical, whereas NPC testimony, rumours, and
            in-world handouts must not be promoted to objective truth unless
            confirmed by the authored text.
          </p>
        </div>

        <div
          class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-3"
        >
          <h3 class="font-header font-bold text-lg text-theme-text">
            Structural Integrity &amp; Provenance
          </h3>
          <ul class="list-disc pl-5 space-y-1.5 text-sm text-theme-text/80">
            <li>Every entity ID must be unique across all collections.</li>
            <li>
              Cross-references (<code class="font-mono">parentLocationId</code>,
              <code class="font-mono">locationId</code>,
              <code class="font-mono">sceneId</code>,
              <code class="font-mono">actorIds</code>) must resolve to existing
              IDs with no self-references.
            </li>
            <li>Location parent chains must be acyclic.</li>
            <li>
              Non-entry scenes must be reachable from
              <code class="font-mono">scenes[0]</code> with no dead-end mandatory
              transition loops.
            </li>
            <li>
              Attach optional <code class="font-mono">sourceRef</code>
              (<code class="font-mono">page</code>,
              <code class="font-mono">pageEnd</code>,
              <code class="font-mono">chapter</code>,
              <code class="font-mono">section</code>,
              <code class="font-mono">anchor</code>,
              <code class="font-mono">textQuote</code>) for traceability.
            </li>
          </ul>
        </div>

        <div
          class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-3"
        >
          <h3 class="font-header font-bold text-lg text-theme-text">
            Separation of Concerns &amp; Copyright
          </h3>
          <p class="text-sm text-theme-text/80 leading-relaxed">
            Adventure JSON represents <strong
              >authored adventure structure</strong
            >
            only — never include playthrough state, session logs, or player decisions.
          </p>
          <p class="text-sm text-theme-text/80 leading-relaxed">
            Prefer concise structured summaries, key dialogue cues, and room
            briefs rather than verbatim copying of large blocks of protected
            source prose.
          </p>
        </div>
      </div>
    </section>

    <!-- Troubleshooting -->
    <section aria-labelledby="troubleshooting-heading" class="space-y-4">
      <h2
        id="troubleshooting-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Common Validation Errors &amp; Troubleshooting
      </h2>
      <div class="space-y-3">
        {#each TROUBLESHOOTING_ERRORS as err (err.code)}
          <div
            class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-5 space-y-1.5"
          >
            <h3 class="font-mono text-sm font-bold text-theme-text">
              {err.code}
            </h3>
            <p class="text-sm text-theme-text/90">
              <strong>Cause:</strong>
              {err.cause}
            </p>
            <p class="text-sm text-theme-text/80">
              <strong>Fix:</strong>
              {err.fix}
            </p>
          </div>
        {/each}
      </div>
    </section>
  </main>
</div>
