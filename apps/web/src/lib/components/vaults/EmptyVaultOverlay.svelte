<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { fade, scale } from "svelte/transition";
  import { Plus, FolderInput, Sparkles } from "lucide-svelte";

  let { onCreateNew } = $props<{ onCreateNew: () => void }>();

  function handleImport() {
    uiStore.openSettings("vault", "ingestion");
  }
</script>

<div
  class="absolute inset-0 z-20 flex items-center justify-center p-6 bg-theme-bg/40 backdrop-blur-[2px]"
  transition:fade={{ duration: 400 }}
>
  <div
    class="max-w-md w-full bg-theme-surface/90 border border-theme-border rounded-2xl p-8 md:p-12 shadow-2xl text-center space-y-8 relative overflow-hidden"
    transition:scale={{ duration: 400, start: 0.95 }}
    style:box-shadow="var(--theme-glow)"
  >
    <!-- Decorative background elements -->
    <div
      class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-primary to-transparent opacity-50"
    ></div>
    <div
      class="absolute -top-24 -left-24 w-48 h-48 bg-theme-primary/5 rounded-full blur-3xl"
    ></div>
    <div
      class="absolute -bottom-24 -right-24 w-48 h-48 bg-theme-accent/5 rounded-full blur-3xl"
    ></div>

    <div class="space-y-4 relative z-10">
      <div
        class="w-20 h-20 bg-theme-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group transition-transform hover:scale-110 duration-500"
      >
        <Sparkles class="w-10 h-10 text-theme-primary animate-pulse" />
      </div>

      <h2
        class="text-2xl md:text-3xl font-bold text-theme-text uppercase font-header tracking-widest leading-tight"
      >
        The Archive is Silent
      </h2>
      <p
        class="text-sm md:text-base text-theme-muted leading-relaxed font-body"
      >
        Begin your chronicle by transmuting your existing notes or forging a new
        entity from the void.
      </p>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
      <button
        onclick={onCreateNew}
        class="flex-1 px-6 py-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-xs rounded-lg hover:bg-theme-secondary transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 group"
      >
        <Plus class="w-4 h-4 transition-transform group-hover:rotate-90" />
        New Entity
      </button>

      <button
        onclick={handleImport}
        class="flex-1 px-6 py-4 border border-theme-primary/50 text-theme-primary font-bold uppercase font-header tracking-[0.2em] text-xs rounded-lg hover:bg-theme-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2 group"
      >
        <FolderInput
          class="w-4 h-4 transition-transform group-hover:-translate-y-1"
        />
        Import Archive
      </button>
    </div>

    <div class="pt-4 relative z-10">
      <p
        class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
      >
        Codex Protocol v{themeStore.activeTheme.id === "fantasy"
          ? "1.0"
          : "2.4"} // Initialization Ready
      </p>
    </div>
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
