<script lang="ts">
  import { uiStore } from "$stores/ui.svelte";
  import { fade, fly } from "svelte/transition";
  import { VERSION } from "$lib/config";
  import releases from "../../content/changelog/releases.json";
  import { focusTrap } from "$lib/actions/focusTrap";

  // Calculate if there are unseen MINOR releases to determine the header title
  const hasUnseenMinorReleases = $derived.by(() => {
    if (!uiStore.lastSeenVersion) return true;
    const currentStoredMinor = parseInt(
      uiStore.lastSeenVersion.split(".")[1] || "0",
      10,
    );
    return releases.some((r) => {
      const releaseMinor = parseInt(r.version.split(".")[1] || "0", 10);
      return releaseMinor > currentStoredMinor;
    });
  });

  const close = () => {
    uiStore.markVersionAsSeen(VERSION);
    uiStore.showChangelog = false;
  };
</script>

{#if uiStore.showChangelog}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/80 z-[200] backdrop-blur-sm focus:outline-none"
    onclick={close}
    role="presentation"
    use:focusTrap={{ onEscape: close }}
    transition:fade
  >
    <div
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[85vh] max-h-[800px] bg-theme-bg border border-theme-border shadow-2xl rounded-lg overflow-hidden flex flex-col z-[201] font-body"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-heading"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      transition:fly={{ y: 20, duration: 300 }}
    >
      <!-- Header -->
      <div
        class="px-8 py-6 border-b border-theme-border flex justify-between items-center bg-theme-surface shrink-0"
        style="background-image: var(--bg-texture-overlay)"
      >
        <div>
          <h2
            id="changelog-heading"
            class="text-xl font-bold text-theme-text uppercase font-header tracking-widest"
          >
            {hasUnseenMinorReleases ? "What's New" : "Recent Updates"}
          </h2>
          <p
            class="text-[10px] text-theme-muted uppercase tracking-[0.2em] mt-1"
          >
            Codex Cryptica {VERSION}
            {!hasUnseenMinorReleases ? "(Up to Date)" : ""}
          </p>
        </div>
        <button
          onclick={close}
          class="text-theme-muted hover:text-theme-primary transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-theme-bg rounded"
          aria-label="Close"
        >
          <span class="icon-[lucide--x] w-5 h-5 md:w-6 md:h-6"></span>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
        {#each releases as release}
          <section>
            <div
              class="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 border-b border-theme-border/30 pb-2 gap-1 sm:gap-0"
            >
              <h3
                class="text-base font-bold text-theme-primary uppercase font-header tracking-widest"
              >
                {release.title}
              </h3>
              <span
                class="text-[10px] font-header text-theme-muted uppercase tracking-wider shrink-0"
              >
                v{release.version} // {release.date}
              </span>
            </div>

            <ul class="space-y-4">
              {#each release.highlights as highlight}
                <li
                  class="flex gap-4 text-sm text-theme-text/90 leading-relaxed group"
                >
                  <span
                    class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
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
        class="px-8 py-6 border-t border-theme-border bg-theme-surface/50 text-center shrink-0"
      >
        <button
          onclick={close}
          class="px-6 py-2 bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary transition-colors text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-theme-primary"
        >
          {hasUnseenMinorReleases ? "Acknowledge Updates" : "Done"}
        </button>
        <div
          class="mt-4 text-[9px] font-header text-theme-muted uppercase tracking-[0.3em]"
        >
          Archive synchronization protocols maintained
        </div>
      </div>
    </div>
  </div>
{/if}
