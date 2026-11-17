<script lang="ts">
  import { onDestroy } from "svelte";
  import { basePath } from "#lib/utils/base-path.js";
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import { copyTextToClipboard } from "#lib/utils/share-link.js";
  import minimalExample from "../../../../static/schemas/adventure-json/examples/minimal.v1.json?raw";
  import {
    CANONICAL_CONVERSION_PROMPT,
    COVERAGE_REPORT_PROMPT,
    IMPORT_OUTCOMES,
    LINK_HANDOFF_TEXT,
    COLLECTION_RULES,
    CORRESPONDENCE_EXTENSION_DOC,
    EPISTEMIC_STATUSES,
    TOP_LEVEL_RULES,
    TROUBLESHOOTING_ERRORS,
  } from "./conversion-guide.js";

  const cleanBase = basePath();
  const pageUrl = "https://codexcryptica.com/adventure-import";

  type CopyState = "idle" | "copied" | "error";

  let isDestroyed = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  onDestroy(() => {
    isDestroyed = true;
    for (const timer of timers) clearTimeout(timer);
  });

  /** One copy action with its own feedback state and stale-result guard. */
  function createCopier(text: string) {
    let state = $state<CopyState>("idle");
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function copy() {
      const current = ++generation;
      if (timer) {
        clearTimeout(timer);
        timers.delete(timer);
        timer = undefined;
      }
      const ok = await copyTextToClipboard(
        text,
        typeof navigator === "undefined" ? undefined : navigator.clipboard,
      );
      if (isDestroyed || current !== generation) return;

      state = ok ? "copied" : "error";
      // ui-check-ignore: tracked in `timers` and cleared in onDestroy
      timer = setTimeout(() => {
        if (isDestroyed || current !== generation) return;
        state = "idle";
        timers.delete(timer!);
        timer = undefined;
      }, 2200);
      timers.add(timer);
    }

    return {
      copy,
      get state() {
        return state;
      },
    };
  }

  const promptCopier = createCopier(CANONICAL_CONVERSION_PROMPT);
  const linkCopier = createCopier(LINK_HANDOFF_TEXT);
  const coverageCopier = createCopier(COVERAGE_REPORT_PROMPT);

  const copyLabel = $derived(
    promptCopier.state === "copied"
      ? "Copied prompt"
      : promptCopier.state === "error"
        ? "Copy failed — select the prompt below manually"
        : "Copy conversion prompt",
  );

  const linkCopyLabel = $derived(
    linkCopier.state === "copied"
      ? "Copied link"
      : linkCopier.state === "error"
        ? "Copy failed — copy the page address instead"
        : "Copy guide link",
  );

  const coverageCopyLabel = $derived(
    coverageCopier.state === "copied"
      ? "Copied coverage prompt"
      : coverageCopier.state === "error"
        ? "Copy failed — select the prompt below manually"
        : "Copy coverage report prompt",
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
      : 'border border-theme-primary bg-theme-primary/10 text-theme-text hover:bg-theme-primary/20'}"
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
      <p class="text-base text-theme-text/90 leading-relaxed max-w-2xl mx-auto">
        Use ChatGPT, Claude, Gemini, or a local model to turn a PDF, Markdown
        file, or module notes into a clean, validated
        <code class="font-mono text-theme-text">adventure-json/v1</code>
        file that Codex Cryptica checks and stores on your device.
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
      <p class="text-sm md:text-base text-theme-text/90">
        Source adventure → AI assistant of your choice → Adventure JSON file →
        review and import in Codex Cryptica.
      </p>
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
          <strong>Save the reply as a plain <code>.json</code> file.</strong>
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
          the file on your device. If it is rejected, follow the validation
          message: use its field path when one is shown, or fix the JSON syntax
          described by a parse error. You can paste that message back to your
          assistant or see
          <a class="underline" href="#troubleshooting-heading"
            >troubleshooting</a
          >. Once approved, start the adventure from Adventure Mode with the
          Oracle.
        </li>
      </ol>
      <p class="text-sm md:text-base text-theme-text/90">
        Passing the import checks does not mean nothing was left out. See
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
        at the same prompt as plain text (<a
          class="underline"
          href="{cleanBase}/adventure-import/prompt.txt">prompt.txt</a
        >). It only works if your assistant can open web pages; local models and
        chats without browsing need the full prompt instead.
      </p>
      <p class="text-sm text-theme-text/90">
        <strong>This page is a guide, not a converter.</strong> You can't upload or
        paste your adventure here. The conversion happens in the assistant you choose,
        and this page never sees your source.
      </p>
      <p class="text-sm text-theme-text/90">
        Your source goes to the AI assistant you choose. The finished file is
        imported and stored on this device. During AI play, parts of it go to
        your Oracle provider.
        <a
          href="#privacy-notice-heading"
          class="text-theme-text underline underline-offset-2"
          >Where your adventure goes</a
        >
      </p>
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
        The AI provider's terms and your rights in the material decide whether
        you may upload a published module. Codex Cryptica cannot decide that for
        you. A local model keeps the conversion on your own machine, which can
        offer different privacy characteristics than a hosted service.
      </p>
      <h3 class="font-header font-bold text-base text-theme-text pt-2">
        Storage and backup
      </h3>
      <p class="text-sm md:text-base text-theme-text/85 leading-relaxed">
        Imported packages are <strong
          >not included in Codex Cryptica Cloud Backup</strong
        >, even when you opt in to include adventures. Opted-in adventure
        sessions are backed up, but the packages they started from are not.
        After restoring from Cloud Backup, or when moving to another device that
        way, import the Adventure JSON again. Keep your
        <code class="font-mono">.json</code> file. Importing the same file again gives
        the same version.
      </p>
      <p class="text-sm md:text-base text-theme-text/85 leading-relaxed">
        A Portable Backup (<code class="font-mono">.codex.zip</code>) and Save
        to Folder do include imported packages. See
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

      <section class="space-y-3" aria-labelledby="correspondence-heading">
        <h2
          id="correspondence-heading"
          class="font-header text-xl font-bold text-theme-text"
        >
          Correspondence for renamed content
        </h2>
        <p class="text-sm text-theme-text/90 leading-relaxed">
          When a new version changes an entity ID, add the supplied
          correspondence to its <code class="font-mono">extensions</code> field so
          the import review can show which earlier entity it replaces. Split and merge
          mappings remain flagged for your review.
        </p>
        <pre
          class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 whitespace-pre-wrap leading-relaxed">{CORRESPONDENCE_EXTENSION_DOC}</pre>
      </section>

      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-theme-text/90"
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
          Upload or paste the adventure you have access to into ChatGPT, Claude, Gemini,
          or a local LLM, if the provider's terms and your rights allow it.
        </div>
        <div
          class="rounded-xl border border-theme-border/50 bg-theme-bg/40 p-3"
        >
          <strong class="text-theme-text block mb-1"
            >3. Save &amp; validate</strong
          >
          Save the raw JSON response as a <code class="font-mono">.json</code>
          file, then verify it against the v1 schema.
        </div>
      </div>
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
      <p class="text-sm md:text-base text-theme-text/90">
        A converted file can end up in three different states:
      </p>
      <ul class="space-y-2 text-sm md:text-base text-theme-text">
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
      </p>
      <p class="text-sm md:text-base text-theme-text/90">
        The canonical prompt asks your assistant to audit its own output. For a
        second look, paste this follow-up into the same chat after you receive
        the JSON. The report is plain text and stays outside the JSON file.
      </p>
      {@render copyButton(coverageCopier, coverageCopyLabel, true)}
      <span role="status" class="sr-only">{coverageCopyLabel}</span>
      <pre
        tabindex="0"
        aria-label="Coverage report prompt"
        class="overflow-x-auto whitespace-pre-wrap rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 leading-relaxed">{COVERAGE_REPORT_PROMPT}</pre>
      <h3 class="font-header font-bold text-lg text-theme-text">
        Example: valid, but incomplete
      </h3>
      <p class="text-sm text-theme-text/90">
        Say a package made from the reference one-shot imports cleanly but
        dropped three things:
      </p>
      <ul class="list-disc space-y-1.5 pl-5 text-sm text-theme-text/90">
        <li>
          The optional Reed Shrine branch is gone. The self-audit item on
          mandatory and optional scenes, and the "Missing or shortened" list,
          catch it.
        </li>
        <li>
          The flooded ending, "The Water Takes It", is gone. The self-audit item
          on intended endings, and the "Covered sections" list, catch it.
        </li>
        <li>
          Wick's "By talk" option is cut, leaving only the fight. The self-audit
          item on encounter resolution options, and the "Missing or shortened"
          list, catch it.
        </li>
      </ul>
      <p class="text-sm text-theme-text/90">
        None of these break the schema, so the import succeeds. Anything the
        assistant cannot restore should appear in "Left unresolved".
      </p>
    </section>

    <!-- Worked example -->
    <section
      aria-labelledby="worked-example-heading"
      class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-3"
    >
      <h2
        id="worked-example-heading"
        class="font-header font-bold text-2xl text-theme-text"
      >
        What a valid file looks like
      </h2>
      <p class="text-sm text-theme-text/90">
        A complete, minimal Adventure JSON v1 file: one location, one NPC, one
        scene and one ending. Your assistant's output should look like this,
        only longer. For a full adventure, open the
        <a
          class="underline"
          href="{cleanBase}/schemas/adventure-json/examples/reference-one-shot.v1.json"
          >reference one-shot</a
        >.
      </p>
      <pre
        tabindex="0"
        aria-label="Minimal Adventure JSON v1 example"
        class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 leading-relaxed">{minimalExample.trim()}</pre>
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
              <tr class="border-b border-theme-border/60 text-theme-text/90">
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
                  <td class="py-2.5 text-theme-text/90">{row.notes}</td>
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
        <p class="text-sm text-theme-text/90">
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
              <dd class="text-sm text-theme-text/90 mt-1">{item.purpose}</dd>
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
        Source Certainty, Visibility &amp; Structure
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          class="rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-3"
        >
          <h3 class="font-header font-bold text-lg text-theme-text">
            How certain is this detail?
          </h3>
          <p class="text-sm text-theme-text/90 leading-relaxed">
            The JSON field <code class="font-mono">epistemicStatus</code> says whether
            the source states a detail, suggests it, is unclear, or leaves it unanswered.
          </p>
          <p class="text-sm text-theme-text font-semibold">
            Do not invent missing facts merely to fill fields.
          </p>
          <p class="text-sm text-theme-text/90 leading-relaxed">
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
                <span class="text-theme-text/90">— {entry.meaning}</span>
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
          <p class="text-sm text-theme-text/90 leading-relaxed">
            Entities carry <code class="font-mono">visibility</code> set to
            either <code class="font-mono">"player-visible"</code> or
            <code class="font-mono">"gm-only"</code>.
          </p>
          <p class="text-sm text-theme-text font-semibold">
            Every entry in <code>secrets</code> must set
            <code>visibility: "gm-only"</code>.
          </p>
          <p class="text-sm text-theme-text/90 leading-relaxed">
            Visibility applies to the <strong>whole record</strong>, not to
            single fields. Everything in a
            <code>"player-visible"</code> record (its role, motivation, summary
            and description) is treated as safe to show players. A character
            being known does not make their hidden role or motive known: keep
            the visible record to what players can know, and put the concealed
            part in a separate <code>secrets</code> entry that lists the
            character in <code>relatedEntityIds</code>.
          </p>
          <p class="text-sm text-theme-text/90 leading-relaxed">
            When you start an imported adventure, its title and premise hook or
            background are copied into the session and sent to Oracle opening
            generation. If both premise fields are empty, the description is
            used as the premise fallback, then the title. Keep the title, hook,
            background and optional description player-safe and limited to
            source-supported facts; do not put concealed information there.
          </p>
          <p class="text-sm text-theme-text/90 leading-relaxed">
            Example: Tobiah Reed, the mill accountant, is a player-visible actor
            with no motivation field. Why he wants the mill to fail is a
            <code>gm-only</code> secret that points back to him.
          </p>
          <p class="text-sm text-theme-text/90 leading-relaxed">
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
          <ul class="list-disc pl-5 space-y-1.5 text-sm text-theme-text/90">
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
              Non-entry scenes with source-supported progression must be
              reachable from <code class="font-mono">scenes[0]</code> with no dead-end
              mandatory transition loops. If progression is unknown, preserve the
              scene as ambiguous without inventing a branch.
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
          <p class="text-sm text-theme-text/90 leading-relaxed">
            Adventure JSON represents <strong
              >authored adventure structure</strong
            >
            only — never include playthrough state, session logs, or player decisions.
          </p>
          <p class="text-sm text-theme-text/90 leading-relaxed">
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
