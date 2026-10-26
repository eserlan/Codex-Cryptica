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

  // When value changes, simulate selection of corresponding test entity ID
  $effect(() => {
    if (value) {
      const lower = value.toLowerCase();
      if (lower === "entity child") {
        selectedId = "entity-child";
      } else if (lower === "child entity") {
        selectedId = "child-entity";
      } else if (lower === "entity 1") {
        selectedId = "entity-1";
      } else if (lower === "parent entity") {
        selectedId = "parent-entity";
      } else {
        selectedId = "target-1";
      }
    } else {
      selectedId = null;
    }
  });
</script>

<input {id} aria-label={ariaLabel} bind:value data-testid="mock-autocomplete" />
