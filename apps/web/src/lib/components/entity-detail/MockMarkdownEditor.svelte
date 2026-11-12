<script lang="ts">
  let {
    content = "",
    editable = false,
  }: {
    content?: string;
    editable?: boolean;
  } = $props();
</script>

<div data-testid={editable ? "mock-editor-editable" : "mock-editor-readonly"}>
  {content}
</div>
