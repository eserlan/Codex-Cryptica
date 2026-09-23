<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import {
    createIdeaDeveloperService,
    IDEA_DEVELOPER_MODES,
    IDEA_MAX_LENGTH,
    toIdeaDeveloperMarkdown,
    type IdeaDeveloperMode,
  } from "$lib/services/seo/idea-developer-service";

  const ideaDeveloper = createIdeaDeveloperService();
  let idea = $state("");
  let mode = $state<IdeaDeveloperMode>("develop");
  let isGeneratingIdea = $state(false);

  const modeLabels: Record<IdeaDeveloperMode, string> = {
    assess: "Assess the idea",
    develop: "Develop it",
    explore: "Explore alternatives",
    playable: "Make it playable",
    challenge: "Challenge it",
  };

  async function generate({
    useAI,
  }: {
    useAI: boolean;
  }): Promise<GeneratorOutput> {
    if (!useAI) {
      throw new Error(
        "The Idea Developer needs an internet connection and AI mode to run.",
      );
    }

    const submittedIdea = idea;
    const submittedMode = mode;
    isGeneratingIdea = true;
    try {
      const result = await ideaDeveloper.develop(submittedIdea, submittedMode);
      return {
        type: "note",
        kind: "idea-development",
        title: result.title,
        summary: `An optional ${modeLabels[submittedMode].toLowerCase()} draft that keeps the idea's core intact.`,
        content: toIdeaDeveloperMarkdown(result, submittedMode, submittedIdea),
        lore: result.playableOpening
          ? `### An opening to use at the table\n${result.playableOpening}`
          : `### Questions to take into prep\n${result.questionsForCreator.map((question) => `- ${question}`).join("\n")}`,
        labels: [],
        status: "draft",
      };
    } finally {
      isGeneratingIdea = false;
    }
  }

  const relatedLinks = [
    {
      href: "/answers/is-my-rpg-campaign-idea-good",
      label: "How to assess an RPG idea",
    },
    {
      href: "/answers/how-do-i-turn-an-rpg-idea-into-an-adventure",
      label: "Turn an RPG idea into an adventure",
    },
    {
      href: "/generators/adventure-generator",
      label: "Create a new adventure idea",
    },
  ];

  const faqs = [
    {
      question: "Does the Idea Developer replace my original idea?",
      answer:
        "It is designed to preserve the premise's recognisable core. The response separates those core elements from optional directions, so you can ignore anything that does not fit.",
    },
    {
      question: "What happens to the idea I submit?",
      answer:
        "Your idea is sent to Google's Gemini API to generate a response. Codex analytics do not collect its text. A copy remains in this page while you work; if you save the generated draft, it includes your original idea and is stored in a local vault. Google's processing is subject to its own terms. Avoid submitting sensitive information.",
    },
    {
      question: "Can I use the result with any tabletop RPG?",
      answer:
        "Yes. The tool avoids assuming a ruleset unless you name one. It focuses on situation, people, player choices and consequences rather than game-specific mechanics.",
    },
    {
      question: "Do I need an account?",
      answer:
        "No account is needed to develop or copy an idea. Saving a draft opens Codex Cryptica so you can choose a local campaign vault.",
    },
  ];
</script>

{#snippet formFields(_submit: () => void)}
  <div class="space-y-2">
    <label
      for="idea-mode"
      class="block text-[10px] font-bold uppercase tracking-wider text-theme-muted"
    >
      What would you like to do?
    </label>
    <select
      id="idea-mode"
      bind:value={mode}
      disabled={isGeneratingIdea}
      class="w-full rounded-lg border border-theme-border/60 bg-theme-bg/70 px-3 py-2.5 text-sm text-theme-text focus:border-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {#each IDEA_DEVELOPER_MODES as option (option)}
        <option value={option}>{modeLabels[option]}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-2">
    <label
      for="idea-input"
      class="block text-[10px] font-bold uppercase tracking-wider text-theme-muted"
    >
      Your RPG idea
    </label>
    <textarea
      id="idea-input"
      bind:value={idea}
      disabled={isGeneratingIdea}
      maxlength={IDEA_MAX_LENGTH}
      rows="9"
      required
      placeholder="A village has built its homes inside the ribs of a sleeping giant, and the bones have started to move…"
      class="w-full resize-y rounded-lg border border-theme-border/60 bg-theme-bg/70 px-3 py-2.5 text-sm leading-relaxed text-theme-text placeholder:text-theme-muted/60 focus:border-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      aria-describedby="idea-length-hint"
    ></textarea>
    <p id="idea-length-hint" class="text-right text-[10px] text-theme-muted">
      {idea.length} / {IDEA_MAX_LENGTH} characters
    </p>
  </div>
{/snippet}

<SEOGeneratorLayout
  canonicalPath="/tools/idea-developer"
  pageTitle="RPG Idea Developer | Make a Campaign Premise Playable | Codex Cryptica"
  metaDescription="Develop an RPG campaign idea you already care about. Assess it, explore alternatives, make it playable or stress-test it without replacing its core. No account required."
  keywords={[
    "RPG idea developer",
    "develop a campaign idea",
    "make an RPG idea playable",
  ]}
  eyebrow="RPG Idea Developer"
  introTitle="Develop your RPG idea"
  introText="Bring a premise you already care about. Choose how to work on it, then get a structured draft that protects its recognisable core and leaves the decisions yours."
  explainerText="Start with your idea. Keep its core. Choose whether to assess it, develop it, explore alternatives, make it playable, or challenge it."
  showGeneratorSwitcher={false}
  aiModeRequired={true}
  aiDataNotice="Your idea is sent to Google's Gemini API to generate a response. Codex analytics do not collect its text. If you save the result, your original idea is included in the draft and stored in a local vault. Avoid submitting sensitive information."
  offlineMessage="The Idea Developer needs an internet connection to work with your idea. Reconnect and try again."
  inputHint="A rough premise is enough. Add the details you want preserved."
  generateLabel="Develop my idea"
  busyLabel="Working with your idea..."
  backHref="/tools"
  backLabel="All tools"
  {relatedLinks}
  {faqs}
  {generate}
  {formFields}
/>
