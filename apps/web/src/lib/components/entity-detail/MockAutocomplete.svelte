<script lang="ts">
  let {
    value = $bindable(""),
    // eslint-disable-next-line no-useless-assignment
    selectedId = $bindable(null),
    id,
    ariaLabel,
  } = $props<{
    value?: string;
    selectedId?: string | null;
    id?: string;
    ariaLabel?: string;
  }>();

  // When value changes, simulate selection of target-1
  $effect(() => {
    if (value) {
      selectedId = "target-1";
    } else {
      selectedId = null;
    }
  });
</script>

<input {id} aria-label={ariaLabel} bind:value data-testid="mock-autocomplete" />
