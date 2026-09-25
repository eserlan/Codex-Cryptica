<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import SessionPrepBuilderForm from "$lib/components/seo/session-prep/SessionPrepBuilderForm.svelte";
  import { EXAMPLE_SESSION_PREP } from "$lib/components/seo/session-prep/example-prep";
  import {
    buildSessionPrep,
    toSessionPrepOutput,
  } from "$lib/components/seo/session-prep/session-prep-output";
  import { createSessionPrepService } from "$lib/services/seo/session-prep-service";
  import { onlineStatus } from "$lib/stores/online.svelte";
  import {
    createEmptySessionPrep,
    type SessionPrep,
    type SessionPrepGuidance,
  } from "generator-engine";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const service = createSessionPrepService();
  const exampleDraft = toSessionPrepOutput(EXAMPLE_SESSION_PREP);

  let prep = $state<SessionPrep>(createEmptySessionPrep());
  let isBuilding = $state(false);
  let isFormAiBusy = $state(false);
  /** Set by the form just before it submits; read once by `generate`. */
  let pendingBuild: { fillEmpty: boolean; guidance?: SessionPrepGuidance } = {
    fillEmpty: false,
  };
  let builtPrep = $state<string | null>(null);
  const hasUnbuiltChanges = $derived(
    builtPrep !== null && JSON.stringify(prep) !== builtPrep,
  );

  async function generate({
    useAI,
  }: {
    useAI: boolean;
  }): Promise<GeneratorOutput> {
    if (isFormAiBusy) {
      throw new Error(
        "AI is still working on a step. Build the run sheet when it finishes.",
      );
    }
    const { fillEmpty, guidance } = pendingBuild;
    pendingBuild = { fillEmpty: false };
    isBuilding = true;
    try {
      const result = await buildSessionPrep(
        $state.snapshot(prep) as SessionPrep,
        { useAI: useAI && fillEmpty, service, guidance },
      );
      prep = result.prep;
      builtPrep = JSON.stringify(result.prep);
      return result.output;
    } finally {
      isBuilding = false;
    }
  }

  const relatedLinks = [
    {
      href: "/answers/how-do-i-prepare-an-rpg-session-step-by-step",
      label: "How to prepare an RPG session step by step",
    },
    {
      href: "/answers/how-much-prep-do-you-need-for-an-rpg-session",
      label: "How much prep do you need?",
    },
    {
      href: "/tools/idea-developer",
      label: "Develop a campaign or adventure idea",
    },
  ];

  const faqs = [
    {
      question: "Does the builder write my session for me?",
      answer:
        "No. It prepares a situation you can run: pressure, people, places, information, complications and consequences. It never sets a scene order or a planned ending, and AI only answers the questions you hand to it or adds options you choose.",
    },
    {
      question: "Will AI change what I have already written?",
      answer:
        "Not unless you ask. AI answers only the questions you leave empty. Suggestions appear as options beside a section, and nothing changes until you pick one. Redrafting a whole section happens only when you press Redraft, and you can undo it. Anything the AI added is marked so you can edit or remove it.",
    },
    {
      question: "Can I use it without AI?",
      answer:
        "Yes. Answer the questions yourself, online or offline, and build. The builder still flags needed facts that have only one way to be found and turns your answers into a one-page run sheet you can keep adjusting.",
    },
    {
      question: "What happens to what I type?",
      answer:
        "When you use AI, your hook, your prep, any notes you give the AI and the ideas you turned down are sent to Google's Gemini API to generate suggestions. Codex analytics do not collect their text. If you save the run sheet, it is stored in a local vault on your device. Avoid submitting sensitive information.",
    },
    {
      question: "Do I need an account?",
      answer:
        "No account is needed to build or copy a run sheet. Saving it opens Codex Cryptica so you can choose a local campaign vault.",
    },
  ];
</script>

{#snippet formFields(submit: () => void)}
  <SessionPrepBuilderForm
    bind:prep
    onBusyChange={(busy) => (isFormAiBusy = busy)}
    onBuild={(options) => {
      pendingBuild = options;
      submit();
    }}
    {service}
    hasBuilt={builtPrep !== null}
    {hasUnbuiltChanges}
    disabled={isBuilding}
    online={onlineStatus.current}
  />
{/snippet}

<SEOGeneratorLayout
  canonicalPath="/tools/session-prep-builder"
  pageTitle="Session Prep Builder | Turn a Hook into an RPG Run Sheet | Codex Cryptica"
  metaDescription="Turn a hook or campaign situation into a table-ready run sheet. Prep pressure, people, places, clues and consequences, with AI drafting only the steps you leave empty."
  keywords={["session prep builder", "RPG run sheet", "GM session prep tool"]}
  eyebrow="Session Prep Builder"
  introTitle="Build your next session"
  introText="Start from the hook or situation you already have. Answer a few questions, or let AI answer them, and get a one-page run sheet you can read at the table. Then adjust any section until it fits."
  explainerText="Prepare a situation, not a script. Answer what you know, let AI draft the rest, then adjust what does not fit."
  showGeneratorSwitcher={false}
  singleColumn
  initialDraft={exampleDraft}
  aiDataNotice="With AI on, your hook, prep, notes to the AI and turned-down ideas are sent to Google's Gemini API. Codex analytics do not collect their text. Saved run sheets stay in a local vault on your device. Avoid submitting sensitive information."
  offlineMessage="AI answers need an internet connection. You can still answer the questions yourself and build the run sheet."
  inputHint="Answer each question yourself, or let AI answer it."
  showSubmitButton={false}
  backHref="/tools"
  backLabel="All tools"
  {relatedLinks}
  {faqs}
  {generate}
  {formFields}
/>
