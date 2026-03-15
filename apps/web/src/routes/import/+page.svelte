<script lang="ts">
  import ImportSettings from "$lib/components/settings/ImportSettings.svelte";
</script>

<svelte:head>
  <title>Codex Cryptica | Archive Importer</title>
</svelte:head>

<div class="min-h-screen bg-theme-bg p-4 md:p-8 w-full font-body flex flex-col">
  <div class="mb-8 border-b border-theme-border pb-6 shrink-0">
    <div class="flex items-center gap-4 mb-4">
      <div
        class="w-10 h-10 md:w-12 md:h-12 bg-theme-primary/10 rounded-xl flex items-center justify-center text-theme-primary"
      >
        <span class="icon-[lucide--folder-input] w-5 h-5 md:w-6 md:h-6"></span>
      </div>
      <div>
        <h1
          class="text-xl md:text-2xl font-bold text-theme-text uppercase font-header tracking-[0.2em]"
        >
          Archive Importer
        </h1>
        <p
          class="text-[10px] md:text-xs text-theme-muted uppercase font-mono tracking-widest mt-1"
        >
          Automatically organize your notes into the archive
        </p>
      </div>
    </div>

    <p
      class="text-sm md:text-base text-theme-text/70 leading-relaxed max-w-4xl"
    >
      Bring your existing campaign notes, lore bibles, or JSON exports into the
      Codex. The Oracle will automatically analyze and break down large
      documents into distinct entities while extracting embedded imagery.
    </p>
  </div>

  <div class="flex-1 flex flex-col min-h-0">
    <ImportSettings isStandalone={true} />
  </div>

  <footer
    class="mt-4 text-center text-[10px] text-theme-muted/40 uppercase font-header tracking-widest shrink-0"
  >
    Secured Connection // Your data is safe and local
  </footer>
</div>

<style>
  @reference "../../app.css";
</style>
