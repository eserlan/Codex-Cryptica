<script lang="ts">
  import SoloMenu from "./SoloMenu.svelte";

  let {
    label,
    testId,
    disabled = false,
    reason = null,
  }: {
    label: string;
    testId: string;
    disabled?: boolean;
    reason?: string | null;
  } = $props();
</script>

<SoloMenu {label} {testId} {disabled} {reason}>
  <p>Menu body</p>
</SoloMenu>
