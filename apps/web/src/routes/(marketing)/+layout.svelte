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
        "Interactive Maps",
        "Knowledge Graphs",
        "Temporal Timelines"
      ],
      "storageRequirements": "Origin Private File System (OPFS)",
      "softwareVersion": "2026.1"
    }
  </script>
</svelte:head>

{@render children()}
