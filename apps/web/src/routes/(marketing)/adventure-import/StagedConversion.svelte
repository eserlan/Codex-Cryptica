<script lang="ts">
  import { createCopier } from "./copy-feedback.svelte.js";
  import {
    STAGED_ANCHOR,
    STAGED_ASSEMBLE_SCRIPT,
    STAGED_CHECK_SCRIPT,
    STAGED_COVERAGE_PROMPT,
    STAGED_FAILURE_MODES,
    STAGED_INVENTORY_PROMPT,
    STAGED_MANIFEST_EXAMPLE,
    STAGED_NEW_CHAT_PROMPT,
    STAGED_SAME_CHAT_PROMPT,
  } from "./staged-conversion.js";

  type Stage =
    | { id: "chunk"; title: string; intro: string }
    | {
        id: "inventory" | "coverage";
        title: string;
        intro: string;
        text: string;
        button: string;
        copier: ReturnType<typeof createCopier>;
      };

  type SectionOption =
    | {
        id: "same-chat";
        title: string;
        help: string;
        text: string;
        button: string;
        copier: ReturnType<typeof createCopier>;
      }
    | {
        id: "new-chat";
        title: string;
        help: string;
        steps: string[];
        text: string;
        button: string;
        copier: ReturnType<typeof createCopier>;
      };

  const stages: Stage[] = [
    {
      id: "inventory",
      title: "1. Inventory the source",
      intro:
        "Start a chat, attach the adventure and send this. You get the checkpoint manifest as JSON: the locked metadata, the sections with page ranges, the ids each section owns and one id for each recurring character, faction and place. Save it as manifest.json. Check the page count it reports against the real one.",
      text: STAGED_INVENTORY_PROMPT,
      button: "Copy inventory prompt",
      copier: createCopier(STAGED_INVENTORY_PROMPT),
    },
    {
      id: "chunk",
      title: "2. Convert one section at a time",
      intro:
        "Use the same chat if it still has the complete conversion prompt, manifest and source. For a fresh chat, attach the section and provide all four items in the new-chat handoff. Save the JSON result as the manifest's chunk file; keep the completion delta separate and merge it into your saved manifest.",
    },
    {
      id: "coverage",
      title: "3. Check coverage against the inventory",
      intro:
        "Paste the manifest and every chunk JSON file. The check works from the real chunk files, never from completion deltas. This finds missing sections, ids that were referred to but never defined, and duplicate ids for the same character. For the exact check, run the check script below.",
      text: STAGED_COVERAGE_PROMPT,
      button: "Copy coverage prompt",
      copier: createCopier(STAGED_COVERAGE_PROMPT),
    },
  ];

  const sectionOptions: SectionOption[] = [
    {
      id: "same-chat",
      title: "Same chat",
      help: "Use this only when the chat still contains the complete canonical conversion prompt, the checkpoint manifest and the source for this section. Fill in its section key.",
      text: STAGED_SAME_CHAT_PROMPT,
      button: "Copy same-chat section prompt",
      copier: createCopier(STAGED_SAME_CHAT_PROMPT),
    },
    {
      id: "new-chat",
      title: "New chat",
      help: "Do not assume the assistant remembers another chat. In a fresh chat, provide these four things in order:",
      steps: [
        "The complete canonical conversion prompt (or its prompt.txt link)",
        "The checkpoint manifest JSON",
        "The source pages or text for this section",
        "This prompt, with the section key filled in",
      ],
      text: STAGED_NEW_CHAT_PROMPT,
      button: "Copy new-chat section prompt",
      copier: createCopier(STAGED_NEW_CHAT_PROMPT),
    },
  ];

  const scriptCopier = createCopier(STAGED_ASSEMBLE_SCRIPT);
  const manifestCopier = createCopier(STAGED_MANIFEST_EXAMPLE);
  const checkCopier = createCopier(STAGED_CHECK_SCRIPT);
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

{#snippet sectionOption(option: SectionOption)}
  <div class="space-y-3" data-testid="option-{option.id}">
    <h4 class="font-header font-bold text-base text-theme-text">
      {option.title}
    </h4>
    <p class="text-sm text-theme-text/90">{option.help}</p>
    {#if "steps" in option}
      <ol class="list-decimal pl-6 space-y-1 text-sm text-theme-text/90">
        {#each option.steps as step (step)}
          <li>{step}</li>
        {/each}
      </ol>
    {/if}
    {@render copyBlock(option.copier, option.button, option.text)}
  </div>
{/snippet}

{#snippet stageContent(stage: Stage)}
  {#if stage.id === "chunk"}
    {#each sectionOptions as option (option.id)}
      {@render sectionOption(option)}
    {/each}
  {:else if stage.copier && stage.button && stage.text}
    {@render copyBlock(stage.copier, stage.button, stage.text)}
  {/if}
  {#if stage.id === "coverage"}
    <button
      type="button"
      onclick={checkCopier.copy}
      class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-theme-text bg-theme-primary/10 px-5 py-2 text-sm font-semibold text-theme-text hover:bg-theme-primary/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    >
      <span
        class="{checkCopier.state === 'copied'
          ? 'icon-[lucide--check]'
          : 'icon-[lucide--copy]'} h-4 w-4"
        aria-hidden="true"
      ></span>
      {checkCopier.label("Copy check script", "Copied")}
    </button>
    <pre
      class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 leading-relaxed">{STAGED_CHECK_SCRIPT}</pre>
  {/if}
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

  <div class="space-y-3" data-testid="stage-manifest">
    <h3 class="font-header font-bold text-lg text-theme-text">
      The checkpoint manifest
    </h3>
    <p class="text-sm text-theme-text/90">
      Stage 1 produces one small checkpoint file, the manifest. It holds the
      locked metadata, the sections, which section owns each id, the expected
      counts, the completed chunks, pending references and gaps. It is a
      separate file: never paste it into, or import it as, the adventure JSON.
      Its format is published as a
      <a
        href="/schemas/adventure-checkpoint/v1.json"
        class="underline font-semibold">JSON Schema</a
      >. Because the manifest carries everything, each later pass works in a
      fresh chat or a different assistant.
    </p>
    <ul class="list-disc pl-5 text-sm text-theme-text/90 space-y-1">
      <li>
        <code class="font-mono">partial</code>: some sections are not done yet.
        This is honest, and fine to resume.
      </li>
      <li>
        <code class="font-mono">failed</code>: a pass could not convert its
        section. Name the section and redo it in smaller pieces.
      </li>
      <li>
        <code class="font-mono">complete</code>: only after the check script
        passes with no problems.
      </li>
    </ul>
    <p class="text-sm text-theme-text/90">
      After each pass, merge its completion delta into your saved manifest's
      <code class="font-mono">completed</code>,
      <code class="font-mono">pending</code> and
      <code class="font-mono">gaps</code>. The rest of the manifest is never
      regenerated.
    </p>
    <button
      type="button"
      onclick={manifestCopier.copy}
      class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-theme-text bg-theme-primary/10 px-5 py-2 text-sm font-semibold text-theme-text hover:bg-theme-primary/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    >
      <span
        class="{manifestCopier.state === 'copied'
          ? 'icon-[lucide--check]'
          : 'icon-[lucide--copy]'} h-4 w-4"
        aria-hidden="true"
      ></span>
      {manifestCopier.label("Copy example manifest", "Copied")}
    </button>
    <pre
      class="overflow-x-auto rounded-xl border border-theme-border/60 bg-theme-bg/80 p-4 text-xs md:text-sm font-mono text-theme-text/90 whitespace-pre-wrap leading-relaxed">{STAGED_MANIFEST_EXAMPLE}</pre>
  </div>

  {#each stages as stage (stage.id)}
    <div class="space-y-3" data-testid="stage-{stage.id}">
      <h3 class="font-header font-bold text-lg text-theme-text">
        {stage.title}
      </h3>
      <p class="text-sm text-theme-text/90">{stage.intro}</p>
      {@render stageContent(stage)}
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
