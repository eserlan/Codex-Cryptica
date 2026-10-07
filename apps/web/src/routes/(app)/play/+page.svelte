<script lang="ts">
  import PlayPage from "$lib/components/solo/PlayPage.svelte";
</script>

<!-- Tailwind provides this utility; Fallow cannot resolve generated v4 classes here. -->
<!-- fallow-ignore-next-line css-broken-reference -->
<div
  class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-theme-bg"
  data-testid="play-workspace"
>
  <PlayPage />
</div>
