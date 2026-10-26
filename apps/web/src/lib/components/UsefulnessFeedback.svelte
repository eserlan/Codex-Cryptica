<script lang="ts">
  import { UIPersistence } from "$lib/stores/ui/persistence";
  import {
    COMMUNITY_MIN_YES,
    communityAggregates,
    type CommunityAggregatesService,
  } from "$lib/services/community/community-aggregates";

  const DEFAULT_REASONS = [
    "Too vague",
    "Too long",
    "Didn't answer my question",
    "Advice didn't fit my game",
    "Already knew this",
    "Other",
  ] as const;

  type Vote = "yes" | "no";
  interface StoredVote {
    value: Vote;
    reason?: string;
  }
  type Stage = "idle" | "reason" | "done";

  let {
    /** Stable identifier this vote belongs to, e.g. an answer slug. Used to
     * namespace the per-browser duplicate-vote marker and passed through to
     * onVote — never sent anywhere on its own. */
    voteKey,
    reasons = DEFAULT_REASONS,
    onVote = undefined,
    /** Injectable for testing; defaults to real localStorage (SSR-safe). */
    persistence = new UIPersistence(),
    /** Registry slug for the anonymous community aggregate (spec 164).
     * When omitted the component behaves exactly as before: local marker +
     * onVote only, no network traffic. */
    slug = undefined,
    /** Injectable community client; defaults to the shared singleton. */
    communityService = communityAggregates,
  }: {
    voteKey: string;
    reasons?: readonly string[];
    onVote?: (value: Vote, reason?: string) => void;
    persistence?: UIPersistence;
    slug?: string;
    communityService?: Pick<
      CommunityAggregatesService,
      "recordVote" | "fetchBySlugs"
    >;
  } = $props();

  function storageKey(key: string): string {
    return `codex_answer_feedback_${key}`;
  }

  function readStoredVote(key: string): StoredVote | undefined {
    return persistence.read<StoredVote | undefined>(
      storageKey(key),
      (raw) => JSON.parse(raw) as StoredVote,
      undefined,
    );
  }

  let stage = $state<Stage>("idle");
  let lastVoteKey: string | undefined;
  /** Community yes-count, shown only once the public threshold is met. */
  let helpfulYes = $state<number | null>(null);

  // voteKey can change without remounting this component (SvelteKit reuses
  // the same page component instance across e.g. /answers/a -> /answers/b —
  // see discovery-tracking.ts's own note on this), so the stored-vote check
  // must resync on every distinct voteKey rather than run once at init.
  $effect(() => {
    if (voteKey === lastVoteKey) return;
    lastVoteKey = voteKey;
    stage = readStoredVote(voteKey) ? "done" : "idle";
  });

  // Community social proof (spec 164): below-threshold slugs resolve to an
  // empty list server-side, so nothing misleading can render. Fail-silent:
  // an unreachable aggregate simply leaves the line hidden.
  $effect(() => {
    const currentSlug = slug;
    helpfulYes = null;
    if (!currentSlug) return;
    let cancelled = false;
    communityService.fetchBySlugs([currentSlug]).then((items) => {
      if (cancelled) return;
      const hit = items.find((item) => item.slug === currentSlug);
      if (hit && hit.yes >= COMMUNITY_MIN_YES) helpfulYes = hit.yes;
    });
    return () => {
      cancelled = true;
    };
  });

  function submit(value: Vote, reason?: string) {
    // Capture the previous vote before overwriting so the community
    // aggregate can move the count instead of double-counting (spec 164).
    // recordVote never rejects and is deliberately not awaited: the
    // aggregate is an enhancement, never a gate on the vote UI.
    const previousVote = readStoredVote(voteKey)?.value;
    const vote: StoredVote = reason ? { value, reason } : { value };
    persistence.write(storageKey(voteKey), vote);
    stage = "done";
    onVote?.(value, reason);
    if (slug) {
      void communityService.recordVote({
        slug,
        value,
        // Sending the unchanged value lets the Worker treat selecting the
        // same answer again as an idempotent no-op.
        previous: previousVote,
      });
    }
  }

  function handleYes() {
    submit("yes");
  }

  function handleNo() {
    // Reveal the optional reason picker rather than finalizing immediately —
    // exactly one answer_useful_vote-shaped event fires per vote, so "no"
    // waits for pickReason()/skipReason() rather than firing twice.
    stage = "reason";
  }

  function pickReason(reason: string) {
    submit("no", reason);
  }

  function skipReason() {
    submit("no");
  }

  function changeVote() {
    stage = "idle";
  }
</script>

<section
  class="border-t border-theme-border pt-8"
  aria-labelledby="usefulness-feedback-heading"
>
  <h2
    id="usefulness-feedback-heading"
    class="mb-4 font-header text-xl font-bold text-theme-text sm:text-2xl"
  >
    Was this useful?
  </h2>
  {#if helpfulYes !== null}
    <p class="mb-4 font-mono text-xs text-theme-muted">
      {helpfulYes} readers found this helpful
    </p>
  {/if}

  {#if stage === "idle"}
    <div
      class="flex gap-3"
      role="group"
      aria-labelledby="usefulness-feedback-heading"
    >
      <button
        type="button"
        onclick={handleYes}
        class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/45 px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-text/80 transition-all hover:border-theme-primary/60 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      >
        <span class="icon-[lucide--thumbs-up] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Yes
      </button>
      <button
        type="button"
        onclick={handleNo}
        class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/45 px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-text/80 transition-all hover:border-theme-primary/60 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      >
        <span class="icon-[lucide--thumbs-down] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        No
      </button>
    </div>
  {:else if stage === "reason"}
    <div>
      <p class="mb-3 text-sm text-theme-muted">
        Thanks — want to say why? (optional)
      </p>
      <div class="flex flex-wrap gap-2">
        {#each reasons as reason (reason)}
          <button
            type="button"
            onclick={() => pickReason(reason)}
            class="rounded-full border border-theme-border/60 bg-theme-surface/45 px-3 py-1.5 text-micro font-bold uppercase tracking-wider text-theme-text/70 transition-all hover:border-theme-primary/60 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
          >
            {reason}
          </button>
        {/each}
        <button
          type="button"
          onclick={skipReason}
          class="px-3 py-1.5 text-micro font-bold uppercase tracking-wider text-theme-muted underline-offset-2 transition-all hover:text-theme-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
        >
          Skip
        </button>
      </div>
    </div>
  {:else}
    <p class="text-sm text-theme-muted">
      Thanks for the feedback!
      <button
        type="button"
        onclick={changeVote}
        class="ml-1 font-bold text-theme-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      >
        Change your answer
      </button>
    </p>
  {/if}
</section>
