<script lang="ts">
  let {
    kind,
    name = $bindable(),
    pasted = $bindable(),
    cardPlaceholder,
    placeholder,
  }: {
    kind: "table" | "deck";
    name: string;
    pasted: string;
    cardPlaceholder: string;
    placeholder: string;
  } = $props();
</script>

<label class="flex flex-col gap-1">
  <span
    class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
    >Name</span
  >
  <input
    class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-header text-sm text-theme-text focus:border-theme-primary focus:outline-none"
    bind:value={name}
    placeholder={kind === "deck" ? "Major Arcana" : "Wilderness encounters"}
    data-testid="import-name"
  />
</label>

<label class="flex flex-col gap-1">
  <span
    class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
    >{kind === "deck" ? "Paste your cards" : "Paste your table"}</span
  >
  {#if kind === "deck"}
    <span class="font-body text-micro text-theme-muted/80">
      One card per line: its name, then a tab, then what it means. A card with
      no meaning yet is fine.
    </span>
  {/if}
  <textarea
    rows="6"
    class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
    bind:value={pasted}
    placeholder={kind === "deck" ? cardPlaceholder : placeholder}
    data-testid="import-paste"
  ></textarea>
</label>
