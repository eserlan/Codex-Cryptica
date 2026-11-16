<script lang="ts">
  /**
   * Restore points (shared vault slice 12): the owner can roll the group back
   * to the state of an earlier day. Nothing is lost; what the day lacks goes to
   * the trash.
   */
  import { cloudBackupStore } from "#lib/stores/cloud-backup.svelte.js";
  import { trashEvictionNotice } from "#lib/stores/cloud-backup-types.js";

  let {
    vaultId,
    confirm,
  }: {
    vaultId: string;
    confirm: (options: {
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      isDangerous: boolean;
    }) => Promise<boolean>;
  } = $props();

  const rollback = cloudBackupStore.rollback;

  const points = $derived(
    rollback.loadedVaultId === vaultId ? rollback.points : [],
  );
  const loadState = $derived(rollback.loadState);
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeZone: "UTC",
  });

  $effect(() => {
    if (vaultId) void rollback.load(vaultId);
  });

  const dayLabel = (date: string) =>
    dateFormat.format(new Date(`${date}T00:00:00Z`));
  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;

  const empty = $derived(loadState === "ready" && points.length === 0);
  const listError = $derived(
    loadState === "failed"
      ? "Couldn't load restore points. Check your connection and press Refresh."
      : null,
  );

  const resultText = $derived.by(() => {
    const result = rollback.result;
    if (!result || rollback.resultVaultId !== vaultId) return null;
    const day = dayLabel(result.date);
    const messages = {
      rolledBack: `Rolled back to ${day}.`,
      matches: "This vault already matches that day.",
    } as const;
    return result.outcome in messages
      ? messages[result.outcome as keyof typeof messages]
      : null;
  });

  const errorText = $derived.by(() => {
    const result = rollback.result;
    if (!result || rollback.resultVaultId !== vaultId) return null;
    if (result.outcome === "changed") {
      return "The vault changed since you checked. Press Roll back again to see the new numbers.";
    }
    if (result.outcome === "gone")
      return "That restore point no longer exists.";
    return result.outcome === "failed"
      ? "Couldn't roll back. Nothing was changed. Try again later."
      : null;
  });

  const rollbackEvictionWarning = $derived.by(() => {
    const result = rollback.result;
    if (!result || rollback.resultVaultId !== vaultId) return null;
    if (result.outcome !== "rolledBack" || !result.trashEvicted) return null;
    return trashEvictionNotice(result.trashEvicted);
  });

  async function start(date: string) {
    const counts = await rollback.preview(vaultId, date);
    if (!counts) return;
    const evictionWarning = counts.trashEvicted
      ? ` This will push the shared trash past its 50 MB limit and remove restorable content early from ${plural(counts.trashEvicted.evictedCount, "older trash item", "older trash items")}.`
      : "";
    const message =
      `${plural(counts.changed, "item", "items")} will change, ` +
      `${counts.returning} will come back from the trash and ` +
      `${counts.trashed} will go to the trash. ` +
      "Everyone in the group gets these changes when they next sync. " +
      "Anything sent to the trash can be restored for up to 30 days, subject to the 50 MB trash limit." +
      evictionWarning;
    const accepted = await confirm({
      title: `Roll back to ${dayLabel(date)}?`,
      message,
      confirmLabel: "Roll back",
      cancelLabel: "Cancel",
      isDangerous: true,
    });
    if (accepted) await rollback.rollBack(vaultId, date, counts.revision);
  }

  const buttonClass =
    "min-h-11 border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-text transition-colors hover:text-theme-text disabled:opacity-50";
</script>

{#snippet row(point: { date: string; entityCount: number })}
  <li
    class="flex flex-wrap items-center justify-between gap-2 border border-theme-border px-3 py-2"
  >
    <div class="min-w-0">
      <p class="font-semibold">{dayLabel(point.date)}</p>
      <p class="text-xs">{plural(point.entityCount, "entity", "entities")}</p>
    </div>
    <button
      type="button"
      class={buttonClass}
      disabled={rollback.busyDate !== null}
      onclick={() => start(point.date)}
    >
      {rollback.busyDate === point.date ? "Working…" : "Roll back to this day"}
    </button>
  </li>
{/snippet}

{#if loadState !== "unsupported"}
  <div class="border-t border-theme-border pt-3 text-sm text-theme-text">
    <div class="flex items-center justify-between gap-2">
      <p class="font-semibold">Restore points</p>
      <button
        type="button"
        class="{buttonClass} inline-flex items-center gap-1"
        disabled={loadState === "loading"}
        aria-label={loadState === "loading"
          ? "Refreshing restore points"
          : "Refresh restore points"}
        onclick={() => rollback.load(vaultId)}
      >
        <span class="icon-[lucide--refresh-cw] h-4 w-4" aria-hidden="true"
        ></span>
        Refresh
      </button>
    </div>
    <p class="mt-1">
      Roll the whole group back to how the vault looked on an earlier day.
    </p>

    <p class="mt-2 empty:hidden" role="status">{resultText ?? ""}</p>
    {#if rollbackEvictionWarning}
      <div
        class="mt-2 flex items-start gap-2 border border-theme-warning/40 bg-theme-warning/10 px-3 py-2 text-xs text-theme-text"
      >
        <span
          class="icon-[lucide--alert-triangle] mt-0.5 h-4 w-4 shrink-0 text-theme-text"
          aria-hidden="true"
        ></span>
        <p>{rollbackEvictionWarning}</p>
      </div>
    {/if}
    <p class="mt-2 text-theme-danger empty:hidden" role="alert">
      {errorText ?? listError ?? ""}
    </p>

    {#if empty}
      <p class="mt-2">
        No restore points yet. One is kept for each day the group makes changes,
        for 30 days.
      </p>
    {/if}
    <ul class="mt-2 flex flex-col gap-2">
      {#each points as point (point.date)}
        {@render row(point)}
      {/each}
    </ul>
  </div>
{/if}
