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
  import { createEmptySessionPrep, type SessionPrep } from "generator-engine";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const service = createSessionPrepService();
  const exampleDraft = toSessionPrepOutput(EXAMPLE_SESSION_PREP);

  let prep = $state<SessionPrep>(createEmptySessionPrep());
  let isBuilding = $state(false);
  let isFormAiBusy = $state(false);

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
    isBuilding = true;
    try {
      const result = await buildSessionPrep(
        $state.snapshot(prep) as SessionPrep,
        { useAI, service },
      );
      prep = result.prep;
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
        "No. It prepares a situation you can run: pressure, people, places, information, complications and consequences. It never sets a scene order or a planned ending, and AI only fills steps you leave empty or options you choose to add.",
    },
    {
      question: "Will AI change what I have already written?",
      answer:
        "No. Drafting fills only empty steps. Suggestions appear as options beside a step, and nothing changes until you pick one. Anything the AI added is marked so you can edit or remove it.",
    },
    {
      question: "Can I use it without AI?",
      answer:
        "Yes. Turn AI off, or go offline, and fill in the steps yourself. The builder still flags needed facts that have only one way to be found and turns your steps into a one-page run sheet.",
    },
    {
      question: "What happens to what I type?",
      answer:
        "When you use AI, your hook and prep are sent to Google's Gemini API to generate suggestions. Codex analytics do not collect their text. If you save the run sheet, it is stored in a local vault on your device. Avoid submitting sensitive information.",
    },
    {
      question: "Do I need an account?",
      answer:
        "No account is needed to build or copy a run sheet. Saving it opens Codex Cryptica so you can choose a local campaign vault.",
    },
  ];
</script>

{#snippet formFields(_submit: () => void)}
  <SessionPrepBuilderForm
    bind:prep
    onBusyChange={(busy) => (isFormAiBusy = busy)}
    {service}
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
  introText="Start from the hook or situation you already have. Work through the prep steps, let AI draft what you leave empty, and get a one-page run sheet you can read at the table."
  explainerText="Prepare a situation, not a script. Fill what you know, let AI draft the rest, keep what fits."
  showGeneratorSwitcher={false}
  wideForm
  initialDraft={exampleDraft}
  aiDataNotice="With AI on, your hook and prep are sent to Google's Gemini API. Codex analytics do not collect their text. Saved run sheets stay in a local vault on your device. Avoid submitting sensitive information."
  offlineMessage="AI drafting needs an internet connection. You can still fill the steps yourself and build the run sheet."
  inputHint="Fill any steps you know. With AI on, building drafts the empty ones first."
  generateLabel="Build my run sheet"
  busyLabel="Building your run sheet..."
  backHref="/tools"
  backLabel="All tools"
  {relatedLinks}
  {faqs}
  {generate}
  {formFields}
/>
