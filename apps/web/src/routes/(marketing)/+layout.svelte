<script lang="ts">
  import "../../app.css";
  let { children } = $props();
</script>

<svelte:head>
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Codex Cryptica",
      "applicationCategory": "Tabletop RPG Utility",
      "operatingSystem": "Web, Local-First",
      "featureList": [
        "AI Lore Oracle",
        "Interactive Knowledge Graphs",
        "Tactical Map Mode",
        "Spatial Canvas & Flowcharts",
        "Era-based Timelines",
        "Local-First Privacy",
        "Google Drive Syncing"
      ],
      "storageRequirements": "Origin Private File System (OPFS)",
      "softwareVersion": "0.10.3"
    }
  </script>
</svelte:head>

{@render children()}
