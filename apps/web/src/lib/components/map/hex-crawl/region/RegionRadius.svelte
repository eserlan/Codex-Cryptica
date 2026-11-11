<script lang="ts">
  import { REGION_MAX_RADIUS, REGION_MIN_RADIUS } from "hex-crawl-engine";

  let {
    radius,
    onChange,
  }: { radius: number; onChange: (radius: number) => void } = $props();
</script>

<label class="block space-y-1">
  <span class="text-micro font-bold uppercase tracking-widest text-theme-muted"
    >Radius: {radius}</span
  >
  <input
    type="range"
    class="h-11 w-full"
    min={REGION_MIN_RADIUS}
    max={REGION_MAX_RADIUS}
    value={radius}
    oninput={(event) => onChange(Number(event.currentTarget.value))}
  />
</label>
