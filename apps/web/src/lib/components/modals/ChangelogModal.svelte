<script lang="ts">
  import { VERSION } from "#lib/config/index.js";
  import releases from "../../content/changelog/releases.json";
  import { onboardingStore } from "#lib/stores/ui/onboarding.svelte.js";
  import ModalShell from "#lib/components/ui/ModalShell.svelte";

  // Only treat a new minor version as "new" for the auto-prompt and header copy.
  const hasUnseenMinorReleases = $derived.by(() => {
    if (!onboardingStore.lastSeenVersion) return true;

    const currentStoredMinor = parseInt(
      onboardingStore.lastSeenVersion.split(".")[1] || "0",
      10,
    );

    return releases.some((r) => {
      const releaseMinor = parseInt(r.version.split(".")[1] || "0", 10);
      return releaseMinor > currentStoredMinor;
    });
  });

  const close = () => {
    onboardingStore.markVersionAsSeen(releases[0]?.version ?? VERSION);
    onboardingStore.showChangelog = false;
  };
</script>

<ModalShell
  open={onboardingStore.showChangelog}
  onClose={close}
  labelledBy="changelog-heading"
  maxWidthClass="max-w-3xl"
  class="flex h-[calc(100dvh-2rem)] min-h-0 flex-col rounded-xl border border-theme-border bg-theme-surface font-body sm:h-auto sm:max-h-[90dvh] sm:rounded-[2rem]"
  style="overflow: hidden"
  closeAriaLabel="Close Changelog Dialog"
  scaleDuration={250}
>
  <!-- Header -->
  <div
    class="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border bg-theme-surface px-4 py-3 sm:px-8 sm:py-6"
    style="background-image: var(--bg-texture-overlay)"
  >
    <div class="min-w-0 flex-1">
      <h2
        id="changelog-heading"
        class="text-base font-bold text-theme-text uppercase font-header tracking-wide sm:text-xl sm:tracking-widest"
      >
        {hasUnseenMinorReleases ? "What's New" : "Recent Updates"}
      </h2>
      <p class="mt-1 text-xs text-theme-muted uppercase tracking-wide sm:text-micro sm:tracking-[0.2em]">
        <span class="hidden sm:inline">Codex Cryptica </span>v{VERSION}
        {!hasUnseenMinorReleases ? " · Up to date" : ""}
      </p>
    </div>
    <button
      onclick={close}
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      aria-label="Close"
      type="button"
    >
      <span aria-hidden="true" class="icon-[lucide--x] h-6 w-6"></span>
    </button>
  </div>

  <!-- Body -->
  <div
    class="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:space-y-12 sm:p-8"
    role="region"
    aria-label="Release notes"
    tabindex="0"
  >
    {#each releases as release}
      <section>
        <div
          class="mb-3 flex flex-col justify-between gap-1 border-b border-theme-border/30 pb-2 sm:mb-4 sm:flex-row sm:items-baseline sm:gap-0"
        >
          <h3
            class="text-sm font-bold text-theme-primary uppercase font-header tracking-wide break-words sm:text-base sm:tracking-widest"
          >
            {release.title}
          </h3>
          <span
            class="shrink-0 text-xs font-header uppercase tracking-wider text-theme-muted sm:text-micro"
          >
            v{release.version} // {release.date}
          </span>
        </div>

        <ul class="space-y-3 sm:space-y-4">
          {#each release.highlights as highlight}
            <li
              class="group flex gap-2 text-sm leading-relaxed text-theme-text/90 sm:gap-4"
            >
              <span
                class="icon-[lucide--sparkles] mt-0.5 h-4 w-4 shrink-0 text-theme-primary opacity-60 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              ></span>
              <span class="min-w-0 break-words">{highlight}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>

  <!-- Footer -->
  <div
    class="shrink-0 border-t border-theme-border bg-theme-surface/50 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center sm:px-8 sm:py-6"
  >
    <button
      onclick={close}
      class="inline-flex min-h-11 items-center justify-center rounded-xl border border-theme-primary bg-theme-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-theme-bg transition-all shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)] hover:border-theme-secondary hover:bg-theme-secondary sm:py-3"
      type="button"
    >
      {hasUnseenMinorReleases ? "Acknowledge Updates" : "Done"}
    </button>
    <div
      class="mt-4 hidden text-nano font-header uppercase tracking-[0.3em] text-theme-muted sm:block"
    >
      Archive synchronization protocols maintained
    </div>
  </div>
</ModalShell>
