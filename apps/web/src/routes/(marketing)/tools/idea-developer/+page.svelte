<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import ConversationNotice from "$lib/components/idea-developer/ConversationNotice.svelte";
  import IdeaDeveloperTool from "$lib/components/idea-developer/IdeaDeveloperTool.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { ideaDeveloperTracker } from "$lib/services/analytics/idea-developer-tracking";
  import {
    applyArrival,
    parseArrival,
  } from "$lib/services/idea-developer/arrival";
  import { ideaDeveloperStore } from "$lib/stores/idea-developer.svelte";

  const cleanBase = $derived(base.replace(/\/+$/, ""));
  const canonical = buildAbsoluteUrl("/tools/idea-developer");

  // A "Develop your idea" link carries where the visitor came from and a
  // suggested mode. Read on the client only: the page is prerendered.
  onMount(() => {
    const arrival = parseArrival(window.location.search);
    if (arrival) ideaDeveloperTracker.arrived(arrival);
    applyArrival(arrival, ideaDeveloperStore, () =>
      document.getElementById("idea-developer-input")?.focus(),
    );
  });
</script>

<!-- Unlisted until the provider retention check (T026a) is signed off and T027 runs; T027 removes this noindex. -->
<SeoHead
  title="Idea Developer: develop your RPG idea | Codex Cryptica"
  description="Paste a rough RPG idea and develop it instead of replacing it: what's already interesting, pressure, people who care, things the players could do, and what happens if nobody steps in."
  canonicalUrl={canonical}
  image={buildAbsoluteUrl("/og-image.png")}
  imageAlt="Codex Cryptica Idea Developer"
  robots="noindex, follow"
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <main class="mx-auto max-w-2xl break-words px-4 py-12 sm:px-6 sm:py-20">
    <header class="mb-8">
      <p
        class="mb-3 font-mono text-base sm:text-sm font-bold uppercase tracking-[0.24em] text-theme-primary"
      >
        Idea Developer
      </p>
      <h1
        class="font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        Develop your RPG idea
      </h1>
      <p
        class="mt-4 max-w-2xl text-lg sm:text-base font-light text-theme-muted"
      >
        Paste the idea you already have. The Idea Developer builds on it and
        keeps it recognisably yours, then asks you the questions only you can
        answer.
      </p>
    </header>

    <IdeaDeveloperTool />

    <section
      id="how-it-works"
      class="mt-12 rounded-xl border border-theme-border/70 bg-theme-surface/50 p-5"
    >
      <h2 class="font-header text-xl sm:text-lg font-bold text-theme-text">
        What it does, and what it doesn't
      </h2>
      <ul
        class="mt-3 flex list-disc flex-col gap-2 pl-5 text-lg sm:text-base text-theme-muted"
      >
        <li>
          It develops your idea: what's already interesting, the central
          question, pressure, people who care, things the players could do, and
          what happens if nobody steps in.
        </li>
        <li>
          It doesn't replace your idea, write a whole campaign, or give it a
          score.
        </li>
        <li>
          The questions it asks are yours to answer. You can answer them and
          keep going, ask for a change, or switch between Assess and Develop.
        </li>
        <li>
          It suggests generators that fit, and you can save the result to your
          Codex.
        </li>
        <li>
          Your idea is sent to an AI service to write each response. Codex
          Cryptica doesn't keep it. See <a
            href="{cleanBase}/privacy"
            class="font-bold text-theme-primary underline underline-offset-2"
            >What happens to my idea?</a
          >
        </li>
      </ul>
    </section>

    <div class="mt-8">
      <ConversationNotice />
    </div>
  </main>
</div>
