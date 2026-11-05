<script lang="ts">
  // Test stand-in for the date picker: one button picks a year-only date.
  let {
    // eslint-disable-next-line no-useless-assignment
    value = $bindable(),
    label = "",
  }: { value?: unknown; label?: string } = $props();
</script>

<button
  type="button"
  data-testid="stub-pick-year"
  onclick={() =>
    (value = { year: 618, precision: "year", calendarRevision: 1 })}
  >{label}</button
>
