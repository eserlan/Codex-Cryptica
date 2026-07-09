<script lang="ts">
  import { VERSION } from "$lib/config";
  import releases from "../../content/changelog/releases.json";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import ModalShell from "$lib/components/ui/ModalShell.svelte";

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
  class="flex max-h-[90vh] flex-col rounded-[2rem] border border-theme-border bg-theme-surface font-body"
  closeAriaLabel="Close Changelog Dialog"
  scaleDuration={250}
>
  <!-- Header -->
  <div
    class="flex shrink-0 items-center justify-between border-b border-theme-border bg-theme-surface px-8 py-6"
    style="background-image: var(--bg-texture-overlay)"
  >
    <div>
      <h2
        id="changelog-heading"
        class="text-xl font-bold text-theme-text uppercase font-header tracking-widest"
      >
        {hasUnseenMinorReleases ? "What's New" : "Recent Updates"}
      </h2>
      <p class="mt-1 text-[10px] text-theme-muted uppercase tracking-[0.2em]">
        Codex Cryptica {VERSION}
        {!hasUnseenMinorReleases ? "(Up to Date)" : ""}
      </p>
    </div>
    <button
      onclick={close}
      class="text-theme-muted transition-colors hover:text-theme-primary"
      aria-label="Close"
      type="button"
    >
      <span class="icon-[lucide--x] h-6 w-6"></span>
    </button>
  </div>

  <!-- Body -->
  <div class="flex-1 space-y-12 overflow-y-auto p-8 custom-scrollbar">
    {#each releases as release}
      <section>
        <div
          class="mb-4 flex flex-col justify-between gap-1 border-b border-theme-border/30 pb-2 sm:flex-row sm:items-baseline sm:gap-0"
        >
          <h3
            class="text-base font-bold text-theme-primary uppercase font-header tracking-widest"
          >
            {release.title}
          </h3>
          <span
            class="shrink-0 text-[10px] font-header uppercase tracking-wider text-theme-muted"
          >
            v{release.version} // {release.date}
          </span>
        </div>

        <ul class="space-y-4">
          {#each release.highlights as highlight}
            <li
              class="group flex gap-4 text-sm leading-relaxed text-theme-text/90"
            >
              <span
                class="icon-[lucide--sparkles] mt-0.5 h-4 w-4 shrink-0 text-theme-primary opacity-60 transition-opacity group-hover:opacity-100"
              ></span>
              <span>{highlight}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>

  <!-- Footer -->
  <div
    class="shrink-0 border-t border-theme-border bg-theme-surface/50 px-8 py-6 text-center"
  >
    <button
      onclick={close}
      class="rounded-xl border border-theme-primary bg-theme-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-theme-bg transition-all shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)] hover:border-theme-secondary hover:bg-theme-secondary"
      type="button"
    >
      {hasUnseenMinorReleases ? "Acknowledge Updates" : "Done"}
    </button>
    <div
      class="mt-4 text-[9px] font-header uppercase tracking-[0.3em] text-theme-muted"
    >
      Archive synchronization protocols maintained
    </div>
  </div>
</ModalShell>
