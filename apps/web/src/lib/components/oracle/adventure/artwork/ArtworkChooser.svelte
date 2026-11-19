<script lang="ts">
  import { tick } from "svelte";
  let {
    options,
    readOnly = false,
    keep,
    choose,
    dismiss,
    restore,
  }: {
    options: readonly { id: string; label: string; credit: string }[];
    readOnly?: boolean;
    keep: () => Promise<boolean>;
    choose: (id: string) => Promise<boolean>;
    dismiss: () => Promise<boolean>;
    restore: () => Promise<boolean>;
  } = $props();
  let open = $state(false);
  let busy = $state(false);
  let error = $state(false);
  let trigger = $state<HTMLButtonElement>();
  async function close() {
    open = false;
    error = false;
    await tick();
    trigger?.focus();
  }
  async function run(action: () => Promise<boolean>, closeOnSuccess = false) {
    if (busy || readOnly) return;
    busy = true;
    error = false;
    try {
      if (!(await action())) error = true;
      else if (closeOnSuccess) {
        busy = false;
        await close();
      }
    } catch {
      error = true;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (open && event.key === "Escape" && !busy) void close();
  }}
/>
<div class="space-y-2 text-sm text-theme-text">
  <div class="flex flex-wrap gap-2" aria-label="Illustration controls">
    <button
      type="button"
      class="min-h-10 rounded-md border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={readOnly || busy}
      onclick={() => void run(keep)}>Keep</button
    >
    <button
      type="button"
      bind:this={trigger}
      class="min-h-10 rounded-md border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={readOnly || busy}
      aria-expanded={open}
      onclick={() => {
        open = !open;
        error = false;
      }}>Choose another</button
    >
    <button
      type="button"
      class="min-h-10 rounded-md border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={readOnly || busy}
      onclick={() => void run(dismiss)}>Dismiss</button
    >
    <button
      type="button"
      class="min-h-10 rounded-md border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={readOnly || busy}
      onclick={() => void run(restore)}>Restore automatic</button
    >
  </div>
  {#if open}
    <div class="rounded-md border border-theme-border p-3">
      <p>Choose an illustration</p>
      {#if options.length}
        <ul class="space-y-1">
          {#each options as option (option.id)}
            <li>
              <button
                type="button"
                class="min-h-10 text-left underline focus-visible:outline-2 focus-visible:outline-theme-primary"
                disabled={busy || readOnly}
                onclick={() => void run(() => choose(option.id), true)}
                >{option.label}</button
              ><span class="ml-2 text-xs">{option.credit}</span>
            </li>
          {/each}
        </ul>
      {:else}<p class="text-xs">
          No other illustrations are available for this place.
        </p>{/if}
      <button
        type="button"
        class="min-h-10 underline focus-visible:outline-2 focus-visible:outline-theme-primary"
        disabled={busy}
        onclick={() => void close()}>Cancel</button
      >
    </div>
  {/if}
  {#if error}<p role="status">
      Could not save that choice. Please try again.
    </p>{/if}
</div>
