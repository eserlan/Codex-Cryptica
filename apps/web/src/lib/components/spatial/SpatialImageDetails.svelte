<script lang="ts">
  import type { TileDetails } from "map-engine";

  let {
    details,
    disabled = false,
    onChange,
  }: {
    details: TileDetails;
    disabled?: boolean;
    onChange: (updates: Partial<TileDetails>) => void;
  } = $props();
</script>

<section
  class="space-y-3 rounded-xl border border-theme-primary/20 bg-theme-bg/50 p-3"
  aria-labelledby="spatial-image-details-heading"
>
  <h4
    id="spatial-image-details-heading"
    class="text-[10px] font-bold uppercase tracking-widest text-theme-primary"
  >
    Room details
  </h4>
  {#each [["description", "Description"], ["encounter", "Encounter"], ["contents", "Contents"], ["notes", "Notes"]] as [field, label] (field)}
    <label class="block space-y-1.5">
      <span
        class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
        >{label}</span
      >
      <textarea
        value={details[field as keyof TileDetails]}
        {disabled}
        rows={field === "notes" ? 3 : 2}
        oninput={(event) => onChange({ [field]: event.currentTarget.value })}
        class="w-full resize-y rounded-lg border border-theme-border bg-theme-surface px-2.5 py-2 text-sm text-theme-text outline-none focus:border-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
      ></textarea>
    </label>
  {/each}
</section>
