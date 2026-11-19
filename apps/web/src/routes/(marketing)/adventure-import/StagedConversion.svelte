<script lang="ts">
  import { createCopier } from "./copy-feedback.svelte.js";
  import {
    STAGED_ANCHOR,
    STAGED_ASSEMBLE_SCRIPT,
    STAGED_CHUNK_PROMPT,
    STAGED_COVERAGE_PROMPT,
    STAGED_FAILURE_MODES,
    STAGED_INVENTORY_PROMPT,
    STAGED_NEW_CHAT_PROMPT,
  } from "./staged-conversion.js";

  const stages = [
    {
      id: "inventory",
      title: "1. Inventory the source",
      intro:
        "Start a chat, attach the adventure and send this. You get a list of sections with page ranges and one id for each recurring character, faction and place. Check the page count it reports against the real one.",
      text: STAGED_INVENTORY_PROMPT,
      button: "Copy inventory prompt",
      copier: createCopier(STAGED_INVENTORY_PROMPT),
    },
    {
      id: "chunk",
      title: "2. Convert one section at a time",
      intro:
        "Send one prompt per section from the inventory. Pick the option that matches where you are working.",
    },
    {
      id: "coverage",
      title: "3. Check coverage against the inventory",
      intro:
        "Paste the inventory and every completion record. This finds missing sections, ids that were referred to but never defined, and duplicate ids for the same character.",
      text: STAGED_COVERAGE_PROMPT,
      button: "Copy coverage prompt",
      copier: createCopier(STAGED_COVERAGE_PROMPT),
    },
  ];

  const sectionOptions = [
    {
      id: "same-chat",
      title: "Same chat",
      help: "Use this only in a chat that already holds the canonical conversion prompt and the inventory. Fill in the bracketed line, send it once per section, and save each JSON-only result as chunk-01.json, chunk-02.json and so on. Request and keep each completion record separately, never in a chunk file.",
      text: STAGED_CHUNK_PROMPT,
      button: "Copy same-chat section prompt",
      copier: createCopier(STAGED_CHUNK_PROMPT),
    },
    {
      id: "new-chat",
      title: "New chat",
      help: "Do not assume the assistant remembers other chats. In a fresh chat, paste these four things in order:",
      steps: [
        "The full canonical conversion prompt (or the prompt.txt link)",
        "The inventory with its locked package metadata",
        "The source pages or text for this one section",
        "This prompt, with the bracketed line filled in",
      ],
      text: STAGED_NEW_CHAT_PROMPT,
      button: "Copy new-chat section prompt",
      copier: createCopier(STAGED_NEW_CHAT_PROMPT),
    },
  ];

  const scriptCopier = createCopier(STAGED_ASSEMBLE_SCRIPT);
</script>

{#snippet copyBlock(
  copier: ReturnType<typeof createCopier>,
  button: string,
  text: string,
)}
  <button
    type="button"
    onclick={copier.copy}
    class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-theme-text bg-theme-primary/10 px-5 py-2 text-sm font-semibold text-theme-text hover:bg-theme-primary/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
  >
    <span
      class="{copier.state === 'copied'
        ? 'icon-[lucide--check]'
        : 'icon-[lucide--copy]'} h-4 w-4"
      aria-hidden="true"
    ></span>
    {copier.label(button, "Copied")}
  </button>
  <pre
    class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 whitespace-pre-wrap leading-relaxed">{text}</pre>
{/snippet}

{#snippet sectionOption(option: (typeof sectionOptions)[number])}
  <div class="space-y-3" data-testid="option-{option.id}">
    <h4 class="font-header font-bold text-base text-theme-text">
      {option.title}
    </h4>
    <p class="text-sm text-theme-text/90">{option.help}</p>
    {#if option.steps}
      <ol class="list-decimal pl-6 space-y-1 text-sm text-theme-text/90">
        {#each option.steps as step (step)}
          <li>{step}</li>
        {/each}
      </ol>
    {/if}
    {@render copyBlock(option.copier, option.button, option.text)}
  </div>
{/snippet}

<section
  id={STAGED_ANCHOR}
  aria-labelledby="long-adventures-heading"
  class="scroll-mt-6 rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 space-y-6"
>
  <div class="space-y-2">
    <h2
      id="long-adventures-heading"
      class="font-header font-bold text-2xl text-theme-text"
    >
      Long adventures: convert in stages
    </h2>
    <p class="text-sm md:text-base text-theme-text/90 leading-relaxed">
      A long PDF can be too much for one reply. Instead of letting an assistant
      cut the result short, work in bounded passes: <strong
        >inventory → convert section by section → check coverage → assemble →
        import</strong
      >. Conversion runs in the assistant you choose. Hosted assistants may
      process your source on their servers; local models can process it on your
      device. This page converts nothing, and Codex Cryptica imports and checks
      the finished JSON on your device without receiving the original source.
    </p>
    <p class="text-sm md:text-base text-theme-text font-semibold">
      Do not trust an assistant that says it processed the whole upload. Check
      its work against the inventory and the page numbers in each entry.
    </p>
  </div>

  <div class="space-y-3">
    <h3 class="font-header font-bold text-lg text-theme-text">
      What went wrong? Three different problems
    </h3>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm border-collapse">
        <thead>
          <tr class="border-b border-theme-border/60 text-theme-text/90">
            <th class="py-2 pr-4">Problem</th>
            <th class="py-2 pr-4">What you see</th>
            <th class="py-2">What to do</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-theme-border/40 align-top">
          {#each STAGED_FAILURE_MODES as mode (mode.problem)}
            <tr>
              <th scope="row" class="py-2.5 pr-4 font-semibold text-theme-text"
                >{mode.problem}</th
              >
              <td class="py-2.5 pr-4 text-theme-text/90">{mode.signs}</td>
              <td class="py-2.5 text-theme-text/90">{mode.fix}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="text-sm text-theme-text/90">
      If a part cannot be read or converted, leave it out and say so. An
      incomplete conversion that is labelled incomplete is fine; a finished-
      looking one with invented material is not.
    </p>
  </div>

  {#each stages as stage (stage.id)}
    <div class="space-y-3" data-testid="stage-{stage.id}">
      <h3 class="font-header font-bold text-lg text-theme-text">
        {stage.title}
      </h3>
      <p class="text-sm text-theme-text/90">{stage.intro}</p>
      {#if stage.id === "chunk"}
        {#each sectionOptions as option (option.id)}
          {@render sectionOption(option)}
        {/each}
      {:else if stage.copier}
        {@render copyBlock(stage.copier, stage.button, stage.text)}
      {/if}
    </div>
  {/each}

  <div class="space-y-3" data-testid="stage-assemble">
    <h3 class="font-header font-bold text-lg text-theme-text">
      4. Assemble the sections into one file
    </h3>
    <p class="text-sm text-theme-text/90">
      Do not ask an assistant to merge everything in one reply: the result may
      be too large and may quietly drop entries. This small script does it
      exactly. It keeps every entry and its <code class="font-mono"
        >sourceRef</code
      >, merges entries that are identical, and stops with an error if two
      sections define the same id differently. It never invents a link. If you
      do not use Node, ask a code-capable assistant to run it on your files.
      Save the script as <code class="font-mono">assemble.js</code> and run
      <code class="font-mono">node assemble.js chunk-01.json chunk-02.json</code
      >
      (adding all your chunk files). It writes
      <code class="font-mono">adventure.json</code> only when assembly succeeds, preserving
      an existing file if a check fails.
    </p>
    <button
      type="button"
      onclick={scriptCopier.copy}
      class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-theme-text bg-theme-primary/10 px-5 py-2 text-sm font-semibold text-theme-text hover:bg-theme-primary/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    >
      <span
        class="{scriptCopier.state === 'copied'
          ? 'icon-[lucide--check]'
          : 'icon-[lucide--copy]'} h-4 w-4"
        aria-hidden="true"
      ></span>
      {scriptCopier.label("Copy assemble script", "Copied")}
    </button>
    <pre
      class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 leading-relaxed">{STAGED_ASSEMBLE_SCRIPT}</pre>
  </div>

  <div class="space-y-2" data-testid="stage-import">
    <h3 class="font-header font-bold text-lg text-theme-text">
      5. Import and fix what it reports
    </h3>
    <p class="text-sm text-theme-text/90">
      Import <code class="font-mono">adventure.json</code> as described above. Codex
      Cryptica checks every id and cross-reference and names the exact field that
      is wrong. Send that message and the matching section's file back to your assistant
      and redo only that section, then assemble again.
    </p>
  </div>
</section>
