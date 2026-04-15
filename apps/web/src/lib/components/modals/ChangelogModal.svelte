<script lang="ts">
  import { uiStore } from "$stores/ui.svelte";
  import { fade, scale } from "svelte/transition";
  import { VERSION } from "$lib/config";
  import releases from "../../content/changelog/releases.json";

  let previousActiveElement: HTMLElement | null = null;
  let dialogElement = $state<HTMLElement>();
  let closeButton = $state<HTMLButtonElement>();

  const entries = $derived(
    releases.filter((r) => {
      if (!uiStore.lastSeenVersion) return true;
      return compareVersions(r.version, uiStore.lastSeenVersion) > 0;
    }),
  );

  function compareVersions(v1: string, v2: string) {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

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

  const displayEntries = $derived(entries.length > 0 ? entries : [releases[0]]);
</script>

{#if uiStore.showChangelog}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    onclick={close}
    transition:fade={{ duration: 200 }}
  >
    <div
      bind:this={dialogElement}
      class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface font-body shadow-2xl"
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
        class="flex items-center justify-between border-b border-theme-border bg-theme-surface px-8 py-6"
        style="background-image: var(--bg-texture-overlay)"
      >
        <div>
          <h2
            id="changelog-heading"
            class="text-xl font-bold text-theme-text uppercase font-header tracking-widest"
          >
            {entries.length > 0 ? "What's New" : "Recent Updates"}
          </h2>
          <p
            class="mt-1 text-[10px] text-theme-muted uppercase tracking-[0.2em]"
          >
            Codex Cryptica {VERSION}
            {entries.length === 0 ? "(Up to Date)" : ""}
          </p>
        </div>
        <button
          bind:this={closeButton}
          onclick={close}
          class="text-theme-muted hover:text-theme-primary transition-colors"
          aria-label="Close"
          type="button"
        >
          <span class="icon-[lucide--x] w-6 h-6"></span>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
        {#each displayEntries as release}
          <section>
            <div
              class="mb-4 flex items-baseline justify-between border-b border-theme-border/30 pb-2"
            >
              <h3
                class="text-sm font-bold text-theme-primary uppercase font-header tracking-widest"
              >
                {release.title}
              </h3>
              <span
                class="text-[10px] font-header text-theme-muted uppercase tracking-wider"
              >
                v{release.version} // {release.date}
              </span>
            </div>

            <ul class="space-y-3">
              {#each release.highlights as highlight}
                <li
                  class="group flex gap-3 text-sm leading-relaxed text-theme-text/80"
                >
                  <span
                    class="icon-[lucide--sparkles] w-4 h-4 shrink-0 text-theme-primary opacity-50 transition-opacity group-hover:opacity-100"
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
        class="border-t border-theme-border bg-theme-surface/50 px-8 py-6 text-center"
      >
        <button
          onclick={close}
          class="rounded-xl border border-theme-primary bg-theme-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-theme-bg transition-all hover:border-theme-secondary hover:bg-theme-secondary shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)]"
          type="button"
        >
          {entries.length > 0 ? "Acknowledge Updates" : "Return to Codex"}
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
