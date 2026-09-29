<script lang="ts">
  let { detail }: { detail: { title: string } | null } = $props();
</script>

<div data-testid="fake-detail">{detail ? detail.title : "unavailable"}</div>
