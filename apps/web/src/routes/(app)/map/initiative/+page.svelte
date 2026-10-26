<script lang="ts">
  import InitiativePanel from "$lib/components/vtt/InitiativePanel.svelte";
</script>

<svelte:head>
  <title>Codex Cryptica | Initiative</title>
</svelte:head>

<div
  class="min-h-full shrink-0 w-full bg-theme-bg p-2 flex items-start justify-center"
>
  <InitiativePanel showPopoutButton={false} compact={true} />
</div>
