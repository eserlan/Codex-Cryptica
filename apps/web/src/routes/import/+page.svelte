<script lang="ts">
  import ImportSettings from "$lib/components/settings/ImportSettings.svelte";
</script>

<svelte:head>
  <title>Codex Cryptica | Archive Ingestion</title>
</svelte:head>

<div class="min-h-screen bg-theme-bg p-6 lg:p-12 max-w-5xl mx-auto font-body">
  <div class="mb-12 border-b border-theme-border pb-8">
    <div class="flex items-center gap-4 mb-4">
      <div
        class="w-12 h-12 bg-theme-primary/10 rounded-xl flex items-center justify-center text-theme-primary"
      >
        <span class="icon-[lucide--folder-input] w-6 h-6"></span>
      </div>
      <div>
        <h1
          class="text-2xl font-bold text-theme-text uppercase font-header tracking-[0.2em]"
        >
          Archive Ingestion
        </h1>
        <p
          class="text-xs text-theme-muted uppercase font-mono tracking-widest mt-1"
        >
          Intelligent document fragmentation & protocol update
        </p>
      </div>
    </div>

    <p class="text-sm text-theme-text/70 leading-relaxed max-w-2xl">
      Bring your existing campaign notes, lore bibles, or JSON exports into the
      Codex. The Oracle will automatically analyze and fragment monolithic
      documents into distinct entities while extracting embedded imagery.
    </p>
  </div>

  <div
    class="bg-theme-surface/30 border border-theme-border p-8 rounded-2xl shadow-xl"
  >
    <ImportSettings />
  </div>

  <footer
    class="mt-12 text-center text-[10px] text-theme-muted/40 uppercase font-header tracking-widest"
  >
    Secured Connection // Sovereign Data Protocol Active
  </footer>
</div>

<style>
  @reference "../../../app.css";
</style>
