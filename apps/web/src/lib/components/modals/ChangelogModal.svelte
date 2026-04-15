<script lang="ts">
  import { uiStore } from "$stores/ui.svelte";
  import { fade, scale } from "svelte/transition";
  import { VERSION } from "$lib/config";
  import releases from "../../content/changelog/releases.json";

  let previousActiveElement: HTMLElement | null = null;
  let dialogElement = $state<HTMLElement>();
  let closeButton = $state<HTMLButtonElement>();

  // Only treat a new minor version as "new" for the auto-prompt and header copy.
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

  $effect(() => {
    if (!uiStore.showChangelog) return;

    previousActiveElement = document.activeElement as HTMLElement;

    const timeout = window.setTimeout(() => {
      if (closeButton) {
        closeButton.focus();
      } else {
        dialogElement?.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      previousActiveElement?.focus();
      previousActiveElement = null;
    };
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      return;
    }

    if (e.key !== "Tab" || !dialogElement) return;

    const focusables = dialogElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0] as HTMLElement | undefined;
    const last = focusables[focusables.length - 1] as HTMLElement | undefined;

    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
</script>

{#if uiStore.showChangelog}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    onclick={close}
    transition:fade={{ duration: 200 }}
  >
    <div
      bind:this={dialogElement}
      class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface font-body shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-heading"
      tabindex="-1"
      onkeydown={handleKeydown}
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 250, start: 0.95 }}
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
          <p
            class="mt-1 text-[10px] text-theme-muted uppercase tracking-[0.2em]"
          >
            Codex Cryptica {VERSION}
            {!hasUnseenMinorReleases ? "(Up to Date)" : ""}
          </p>
        </div>
        <button
          bind:this={closeButton}
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
    </div>
  </div>
{/if}
