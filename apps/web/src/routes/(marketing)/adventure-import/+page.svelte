<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import { createCopier } from "./copy-feedback.svelte.js";
  import StagedConversion from "./StagedConversion.svelte";
  import {
    CANONICAL_CONVERSION_PROMPT,
    COVERAGE_REPORT_PROMPT,
    IMPORT_OUTCOMES,
    LINK_HANDOFF_TEXT,
    FIDELITY_ROWS,
    CORRESPONDENCE_EXTENSION_DOC,
    TROUBLESHOOTING_ERRORS,
  } from "./conversion-guide.js";

  const cleanBase = basePath();
  const pageUrl = "https://codexcryptica.com/adventure-import";

  const promptCopier = createCopier(CANONICAL_CONVERSION_PROMPT);
  const linkCopier = createCopier(LINK_HANDOFF_TEXT);
  const coverageCopier = createCopier(COVERAGE_REPORT_PROMPT);

  const copyLabel = $derived(
    promptCopier.label(
      "Copy conversion prompt",
      "Copied prompt",
      "Copy failed — select the prompt below manually",
    ),
  );
  const linkCopyLabel = $derived(
    linkCopier.label(
      "Copy guide link",
      "Copied link",
      "Copy failed — copy the page address instead",
    ),
  );
  const coverageCopyLabel = $derived(
    coverageCopier.label(
      "Copy coverage report prompt",
      "Copied coverage prompt",
      "Copy failed — select the prompt below manually",
    ),
  );

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

{#snippet copyButton(
  copier: { copy: () => void; state: string },
  label: string,
  primary: boolean,
)}
  <button
    type="button"
    onclick={copier.copy}
    class="inline-flex min-h-11 items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary {primary
      ? 'bg-theme-primary text-theme-on-primary hover:opacity-90'
      : 'border border-theme-text bg-theme-primary/10 text-theme-text hover:bg-theme-primary/20'}"
  >
    <span
      class="{copier.state === 'copied'
        ? 'icon-[lucide--check]'
        : primary
          ? 'icon-[lucide--copy]'
          : 'icon-[lucide--link]'} w-4 h-4"
      aria-hidden="true"
    ></span>
    {label}
  </button>
{/snippet}

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
    class="max-w-5xl mx-auto px-4 sm:px-6 py-14 flex-grow w-full space-y-10"
  >
    <!-- Hero -->
    <section class="text-center space-y-4">
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
      <p class="text-base text-theme-text/90 leading-relaxed max-w-2xl mx-auto">
        Use ChatGPT, Claude, Gemini, or a local model to turn a PDF, Markdown
        file, or module notes into a validated
        <code class="font-mono text-theme-text">adventure-json/v1</code>
        file that Codex Cryptica checks and stores on your device.
      </p>
      <p
        class="text-xs md:text-sm font-mono text-theme-text/90 max-w-2xl mx-auto rounded-xl border border-theme-primary/30 bg-theme-surface/50 px-4 py-2.5"
      >
        <strong>For AI assistants reading this URL:</strong> follow only the
        <a class="underline" href="#prompt-heading"
          >Canonical Conversion Prompt</a
        >
        (<a class="underline" href="{cleanBase}/adventure-import/prompt.txt"
          >prompt.txt</a
        >). The sections below it are human reference documentation — do not use
        their templates unless the user asks for a staged conversion.
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

    <!-- Quick start -->
    <section
      aria-labelledby="quick-start-heading"
      class="rounded-2xl border border-theme-primary/40 bg-theme-surface/50 p-6 space-y-5"
    >
      <h2
        id="quick-start-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Quick start: from your adventure to Codex Cryptica
      </h2>
      <ol
        class="list-decimal space-y-2 pl-5 text-sm md:text-base text-theme-text"
      >
        <li>
          <strong>Copy the prompt.</strong> Use the button below. If your
          assistant can open web pages, <em>Copy guide link</em> is a shorter shortcut.
        </li>
        <li>
          <strong>Paste it and attach your adventure</strong> in the AI assistant
          you prefer (a hosted chatbot or a local model), as a file or pasted text.
        </li>
        <li>
          <strong>Save the result as a plain <code>.json</code> file.</strong>
          Keep only the JSON: no Markdown code fences, no commentary before or after.
        </li>
        <li>
          <strong>Import it in your Vault.</strong> Open Adventure Mode and
          choose <em>Import Adventure JSON</em>
          (<a class="underline" href="#import-adventure-json-heading"
            >step-by-step below</a
          >).
        </li>
        <li>
          <strong>Review, approve, then start.</strong> Codex Cryptica checks
          the file on your device. If it is rejected, paste the validation
          message back to your assistant or see
          <a class="underline" href="#troubleshooting-heading"
            >troubleshooting</a
          >.
        </li>
      </ol>
      <p class="text-sm text-theme-text/90">
        Long PDF that an assistant cannot finish in one go? Use the
        <a class="underline" href="#long-adventures">staged method</a>. Passing
        the import checks does not mean nothing was left out — see
        <a class="underline" href="#completeness-heading"
          >valid is not the same as complete</a
        >.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        {@render copyButton(promptCopier, copyLabel, true)}
        {@render copyButton(linkCopier, linkCopyLabel, false)}
        <span role="status" class="sr-only">{copyLabel}. {linkCopyLabel}</span>
        <a
          href="#prompt-heading"
          class="inline-flex min-h-11 items-center rounded-xl border border-theme-border/60 px-4 py-2 text-sm font-medium text-theme-text hover:border-theme-primary/50"
          >Read the full prompt</a
        >
      </div>
      <p class="text-sm text-theme-text/90">
        <strong>Copy guide link</strong> copies a one-line instruction pointing
        at the plain-text prompt (<a
          class="underline"
          href="{cleanBase}/adventure-import/prompt.txt">prompt.txt</a
        >). It only works if your assistant can open web pages; local models and
        chats without browsing need the full prompt instead.
      </p>
      <p class="text-sm text-theme-text/90">
        <strong>This page is a guide, not a converter.</strong> You can't upload
        or paste your adventure here.
        <a
          href="#privacy-notice-heading"
          class="text-theme-text underline underline-offset-2"
          >Where your adventure goes</a
        >
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
          <p class="text-sm text-theme-text/90 mt-1">
            Paste this prompt into ChatGPT, Claude, Gemini, or your local model
            alongside the adventure text or PDF you want to convert.
          </p>
        </div>
        {@render copyButton(promptCopier, copyLabel, true)}
      </div>

      <pre
        class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 whitespace-pre-wrap leading-relaxed">{CANONICAL_CONVERSION_PROMPT}</pre>
    </section>

    <!-- What to do with the converted file -->
    <section
      aria-labelledby="import-adventure-json-heading"
      class="rounded-2xl border border-theme-primary/30 bg-theme-surface/50 p-6 space-y-4"
      style:background-image="var(--bg-texture-overlay)"
    >
      <h2
        id="import-adventure-json-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Next: upload your Adventure JSON
      </h2>
      <p
        class="font-body text-sm font-light leading-relaxed text-theme-text md:text-base"
      >
        There is no paste box on this guide. Save the AI's JSON-only response,
        without Markdown fences, as a <code class="font-mono">.json</code> file.
      </p>
      <ol
        class="list-decimal space-y-1.5 pl-5 font-body text-sm font-light text-theme-text"
      >
        <li>
          Open the Vault where you want to save it, then open Adventure Mode. If
          another adventure is open, choose <strong>Leave adventure</strong>
          first; it saves automatically.
        </li>
        <li>
          Under <strong>Import Adventure JSON</strong>, click
          <strong>Choose Adventure JSON</strong> or drop the file in the import area.
        </li>
        <li>Review the validated package and approve it to save it.</li>
      </ol>
      <a
        href="{cleanBase}/adventure#import-adventure-json"
        class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-theme-primary px-4 py-2 text-sm font-semibold text-theme-on-primary hover:opacity-90 transition-opacity"
      >
        <span class="icon-[lucide--file-up] h-4 w-4" aria-hidden="true"></span>
        Go to Adventure JSON import
      </a>
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
          Where your adventure goes
        </h2>
      </div>
      <ol
        class="list-decimal pl-5 space-y-2 text-sm md:text-base text-theme-text/85 leading-relaxed"
      >
        <li>
          <strong>Conversion:</strong> your source text or PDF goes to the AI assistant
          you choose, hosted or local. It does not go to Codex Cryptica, and this
          page never receives it.
        </li>
        <li>
          <strong>Import:</strong> the Adventure JSON is validated, reviewed and approved
          in Codex Cryptica, then stored in the Vault on this device. No AI call is
          made.
        </li>
        <li>
          <strong>AI play:</strong> during Oracle turns, bounded parts of the package,
          such as its title and premise, are sent to your selected Oracle AI provider
          along with relevant Vault records. The whole package is not sent.
        </li>
      </ol>
      <p class="text-sm md:text-base text-theme-text/85 leading-relaxed">
        Imported packages are <strong
          >not included in Codex Cryptica Cloud Backup</strong
        >, even when you opt in to include adventures. Keep your
        <code class="font-mono">.json</code> file. A Portable Backup (<code
          class="font-mono">.codex.zip</code
        >) and Save to Folder do include imported packages. See
        <a
          href="{cleanBase}/help#help/cloud-backup"
          class="text-theme-text underline underline-offset-2"
          >Cloud Backup help</a
        >
        and
        <a
          href="{cleanBase}/help#help/export-and-backup"
          class="text-theme-text underline underline-offset-2"
          >Export and Back Up help</a
        >.
      </p>
    </section>

    <!-- Long adventures -->
    <StagedConversion />

    <!-- Valid vs complete -->
    <section
      aria-labelledby="completeness-heading"
      class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-4"
    >
      <h2
        id="completeness-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Valid is not the same as complete
      </h2>
      <ul class="space-y-1.5 text-sm md:text-base text-theme-text">
        {#each IMPORT_OUTCOMES as outcome (outcome.label)}
          <li>
            <strong>{outcome.label}.</strong>
            {outcome.meaning}
          </li>
        {/each}
      </ul>
      <p class="text-sm md:text-base text-theme-text">
        Codex Cryptica checks only (a) and (b). It never sees your source, so a
        successful import does not prove that nothing was left out or changed.
        For a second look, paste this follow-up into the same chat after you
        receive the JSON:
      </p>
      {@render copyButton(coverageCopier, coverageCopyLabel, true)}
      <span role="status" class="sr-only">{coverageCopyLabel}</span>
      <pre
        aria-label="Coverage report prompt"
        class="overflow-x-auto whitespace-pre-wrap rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 leading-relaxed">{COVERAGE_REPORT_PROMPT}</pre>
    </section>

    <!-- Fidelity limits -->
    <section
      aria-labelledby="fidelity-heading"
      class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-4"
    >
      <h2
        id="fidelity-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        What converts well, and what needs manual work
      </h2>
      <p class="text-sm md:text-base text-theme-text/90">
        Adventure JSON v1 carries narrative structure (places, people, scenes,
        clues and secrets). Keep your source book at hand for stat blocks,
        tactical maps, DCs and system rules. The optional
        <code class="font-mono">system</code> field is descriptive metadata only and
        does not make game mechanics executable.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <caption class="sr-only">
            How each kind of adventure content converts to Adventure JSON v1
          </caption>
          <thead>
            <tr class="border-b border-theme-border/60 text-theme-text">
              <th scope="col" class="py-2 pr-4 font-semibold">Content</th>
              <th scope="col" class="py-2 pr-4 font-semibold">Converts</th>
              <th scope="col" class="py-2 font-semibold">How v1 handles it</th>
            </tr>
          </thead>
          <tbody>
            {#each FIDELITY_ROWS as row (row.content)}
              <tr
                class="border-b border-theme-border/30 align-top"
                data-fidelity-row
              >
                <th
                  scope="row"
                  class="py-2 pr-4 font-semibold text-theme-text whitespace-nowrap"
                  >{row.content}</th
                >
                <td class="py-2 pr-4 text-theme-text whitespace-nowrap">
                  {row.converts === "well"
                    ? "Converts well"
                    : "May need manual work"}
                </td>
                <td class="py-2 text-theme-text/90">{row.v1Handling}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Revising an adventure -->
    <section
      aria-labelledby="revisions-heading"
      class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-4"
    >
      <h2
        id="revisions-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        Revising an adventure you already imported
      </h2>
      <ul class="list-disc pl-5 space-y-1.5 text-sm text-theme-text/90">
        <li>
          <strong
            >Package <code class="font-mono">id</code> and entity IDs:</strong
          >
          keep them stable across revisions of the same adventure, and raise
          <code class="font-mono">version</code> (SemVer) when content changes.
        </li>
        <li>
          <strong>Re-importing:</strong> identical content is deduplicated as a
          no-op; changed content with the same <code class="font-mono">id</code>
          is reviewed and diffed as a new version while existing sessions stay pinned
          to the version they started with.
        </li>
      </ul>
      <section class="space-y-2" aria-labelledby="correspondence-heading">
        <h3
          id="correspondence-heading"
          class="font-header text-lg font-bold text-theme-text"
        >
          Correspondence for renamed content
        </h3>
        <pre
          class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 whitespace-pre-wrap leading-relaxed">{CORRESPONDENCE_EXTENSION_DOC}</pre>
      </section>
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
            <p class="text-sm text-theme-text/90">
              <strong>Fix:</strong>
              {err.fix}
            </p>
          </div>
        {/each}
      </div>
    </section>
  </main>
</div>
