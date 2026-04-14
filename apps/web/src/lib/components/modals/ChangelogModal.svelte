<script lang="ts">
  import { uiStore } from "$stores/ui.svelte";
  import { fade, fly } from "svelte/transition";
  import { VERSION } from "$lib/config";
  import releases from "../../content/changelog/releases.json";

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

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  const displayEntries = $derived(entries.length > 0 ? entries : [releases[0]]);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if uiStore.showChangelog}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/80 z-[200] backdrop-blur-sm"
    onclick={close}
    role="presentation"
    transition:fade
  ></div>

  <div
    class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-theme-bg border border-theme-border shadow-2xl rounded-lg overflow-hidden flex flex-col z-[201] font-body"
    role="dialog"
    aria-modal="true"
    aria-labelledby="changelog-heading"
    transition:fly={{ y: 20, duration: 300 }}
  >
    <!-- Header -->
    <div
      class="px-8 py-6 border-b border-theme-border flex justify-between items-center bg-theme-surface"
      style="background-image: var(--bg-texture-overlay)"
    >
      <div>
        <h2
          id="changelog-heading"
          class="text-xl font-bold text-theme-text uppercase font-header tracking-widest"
        >
          {entries.length > 0 ? "What's New" : "Recent Updates"}
        </h2>
        <p class="text-[10px] text-theme-muted uppercase tracking-[0.2em] mt-1">
          Codex Cryptica {VERSION}
          {entries.length === 0 ? "(Up to Date)" : ""}
        </p>
      </div>
      <button
        onclick={close}
        class="text-theme-muted hover:text-theme-primary transition-colors"
        aria-label="Close"
      >
        <span class="icon-[lucide--x] w-6 h-6"></span>
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
      {#each displayEntries as release}
        <section>
          <div
            class="flex items-baseline justify-between mb-4 border-b border-theme-border/30 pb-2"
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
                class="flex gap-3 text-sm text-theme-text/80 leading-relaxed group"
              >
                <span
                  class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
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
      class="px-8 py-6 border-t border-theme-border bg-theme-surface/50 text-center"
    >
      <button
        onclick={close}
        class="px-12 py-3 bg-theme-primary text-black font-bold uppercase font-header tracking-widest text-xs hover:bg-theme-primary/80 transition-all active:scale-95 shadow-[0_0_15px_var(--color-accent-primary)]"
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
{/if}
