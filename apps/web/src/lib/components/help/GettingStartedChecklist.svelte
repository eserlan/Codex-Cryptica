<script lang="ts">
  import { onboardingFunnel } from "$lib/app/onboarding/onboarding-funnel";

  /**
   * Gives the onboarding funnel (#1786) its first real consumer, and closes
   * out Finding 9 from the first-run assessment ("no durable getting-started
   * affordance once welcome is hidden") — see #1791.
   *
   * Deliberately curates 4 human-meaningful milestones from the funnel's 6
   * raw steps rather than exposing all of them 1:1: `welcome_shown` reads as
   * an internal tracking event, not something a user experiences as an
   * accomplishment ("you looked at a screen ✓"), so it's folded away.
   * `demo_started` and `vault_created` are merged into one "start a
   * campaign" item — either one means the user has begun working in a
   * world, which is the meaningful fact, not which specific path they took.
   *
   * No replay-tour button here — HelpHeader.svelte already has one
   * immediately above this component (hidden in the standalone /help popup,
   * since a tour needs the main app shell it isn't rendered inside). A
   * second identical button here would be redundant in the common case and
   * broken in the standalone one.
   *
   * Snapshots `onboardingFunnel.completed()` once at mount rather than
   * wiring live reactivity — this panel lives inside the Help tab, which the
   * user opens fresh each time (not kept mounted across a session), so a
   * point-in-time read is accurate for "what have I done so far."
   */

  const completed = onboardingFunnel.completed();
  const hasFired = (step: Parameters<typeof onboardingFunnel.hasFired>[0]) =>
    completed.includes(step);

  const items = [
    {
      label: "Start a campaign",
      done: hasFired("demo_started") || hasFired("vault_created"),
    },
    { label: "Create your first character", done: hasFired("first_entity") },
    { label: "Connect two entities", done: hasFired("first_link") },
    { label: "Open the Graph", done: hasFired("graph_opened") },
  ];

  const allDone = items.every((i) => i.done);
</script>

<div
  class="mb-6 rounded border border-theme-border bg-theme-primary/5 p-4"
  data-testid="getting-started-checklist"
>
  <h3
    class="text-sm font-bold text-theme-primary uppercase font-header tracking-wider mb-3"
  >
    Getting Started
  </h3>

  {#if allDone}
    <p class="text-xs text-theme-text/80 flex items-center gap-2">
      <span
        aria-hidden="true"
        class="icon-[lucide--check-circle-2] w-4 h-4 text-theme-primary"
      ></span>
      You've done the core loop — nice!
    </p>
  {:else}
    <ul class="space-y-1.5">
      {#each items as item (item.label)}
        <li class="flex items-center gap-2 text-xs text-theme-text/90">
          <span
            aria-hidden="true"
            class="{item.done
              ? 'icon-[lucide--check-circle-2] text-theme-primary'
              : 'icon-[lucide--circle] text-theme-muted/50'} w-4 h-4 shrink-0"
          ></span>
          <span class={item.done ? "line-through text-theme-muted" : ""}
            >{item.label}</span
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>
