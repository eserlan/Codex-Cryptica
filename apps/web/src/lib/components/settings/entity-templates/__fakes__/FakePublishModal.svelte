<script lang="ts">
  let { template, mode }: { template: { name: string }; mode: string } =
    $props();
</script>

<div data-testid="fake-publish-modal">{mode}:{template.name}</div>
