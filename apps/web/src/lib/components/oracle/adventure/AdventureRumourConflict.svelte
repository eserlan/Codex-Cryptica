<script lang="ts">
  let {
    kind,
    readOnly,
    archiving,
    pendingRoll,
    error,
    onAdd,
    onContinue,
    onCancel,
    onArchive,
  }: {
    kind: "rumour" | "adventure";
    readOnly: boolean;
    archiving: boolean;
    pendingRoll: boolean;
    error: string | null;
    onAdd: () => void;
    onContinue: () => void;
    onCancel: () => void;
    onArchive: () => void;
  } = $props();
</script>

<section
  class="rounded-md border border-theme-border bg-theme-surface p-3"
  data-testid="existing-adventure-conflict-choice"
>
  <h3 class="text-sm font-semibold text-theme-text">
    {kind === "adventure"
      ? "A prepared adventure is ready"
      : "A rumour can join this adventure"}
  </h3>
  <p class="mt-1 text-xs text-theme-text">
    {kind === "adventure"
      ? "Add it to your current adventure, keep playing, or cancel and return to the prepared adventure."
      : "Add it as a known situation, keep playing, or cancel and return to the six rumours."}
  </p>
  <div class="mt-3 flex flex-wrap gap-2">
    <button
      type="button"
      class="rounded-md border border-theme-primary px-3 py-2 text-sm text-theme-text disabled:opacity-50"
      disabled={readOnly || pendingRoll}
      onclick={onAdd}>Add to current adventure</button
    >
    <button
      type="button"
      class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text"
      onclick={onContinue}>Continue current adventure</button
    >
    <button
      type="button"
      class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text"
      onclick={onCancel}>Cancel</button
    >
    <button
      type="button"
      class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text disabled:opacity-50"
      disabled={archiving || readOnly}
      onclick={onArchive}
      data-testid="archive-active-for-selection"
      >{archiving
        ? "Archiving…"
        : kind === "adventure"
          ? "Archive and start adventure"
          : "Archive and start rumour"}</button
    >
  </div>
  {#if readOnly}<p class="mt-2 text-xs text-theme-text">
      This tab is read-only. Switch to the controlling tab to add or archive.
    </p>{/if}
  {#if pendingRoll}<p class="mt-2 text-xs text-theme-text">
      Resolve or dismiss the pending roll before adding a situation.
    </p>{/if}
  {#if error}<p role="alert" class="mt-2 text-xs text-theme-danger">
      {error}
    </p>{/if}
</section>
