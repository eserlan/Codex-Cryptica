<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import { projectTemplatePackage } from "@codex/stat-sheet-engine";
  import {
    publishBatch,
    type PublishBatchResult,
  } from "$lib/services/publishing/publish-batch";
  import { publicTemplateDirectoryService } from "$lib/services/publishing/PublicTemplateDirectoryService";

  type PublishDraft = {
    template: StatSheetTemplate;
    description: string;
    system: string;
    category: string;
    ownerDisplayName: string;
  };
  type PublishedTemplate = Awaited<
    ReturnType<typeof publicTemplateDirectoryService.publishTemplate>
  >;

  let {
    templates,
    onClose = () => {},
    onPublished = () => {},
  } = $props<{
    templates: StatSheetTemplate[];
    onClose?: () => void;
    onPublished?: (listingId: string, ownerToken: string) => void;
  }>();

  // This dialog mounts for one explicit selection and owns editable public
  // metadata until it is closed.
  // svelte-ignore state_referenced_locally
  let draftList = $state<PublishDraft[]>(
    $state.snapshot(templates).map((template: StatSheetTemplate) => ({
      template,
      description: template.description ?? "",
      system: template.category ? "" : "Homebrew",
      category: template.category ?? "",
      ownerDisplayName: "",
    })),
  );
  let acknowledged = $state(false);
  let isPublishing = $state(false);
  let wasCancelled = $state(false);
  let results = $state<Record<string, PublishBatchResult<PublishedTemplate>>>(
    {},
  );
  let activeController: AbortController | undefined;

  const failedIds = $derived.by(() => {
    const ids: string[] = [];
    for (const key in results) {
      if (!Object.prototype.hasOwnProperty.call(results, key)) continue;
      const result = results[key];
      if (result.status === "failed") ids.push(result.id);
    }
    return ids;
  });

  const successCount = $derived.by(() => {
    let count = 0;
    for (const key in results) {
      if (!Object.prototype.hasOwnProperty.call(results, key)) continue;
      const result = results[key];
      if (result.status === "success") {
        count++;
      }
    }
    return count;
  });

  function packageFor(draft: PublishDraft) {
    return projectTemplatePackage(draft.template, {
      description: draft.description.trim() || undefined,
      system: draft.system.trim() || undefined,
      category: draft.category || undefined,
    });
  }

  async function publish(ids = draftList.map((draft) => draft.template.id)) {
    if (!acknowledged || isPublishing) return;
    wasCancelled = false;
    isPublishing = true;
    activeController = new AbortController();
    const selected = draftList.filter((draft) =>
      ids.includes(draft.template.id),
    );

    await publishBatch(
      selected.map((draft) => ({ id: draft.template.id, value: draft })),
      (draft, signal) =>
        publicTemplateDirectoryService.publishTemplate({
          package: packageFor(draft),
          ownerDisplayName: draft.ownerDisplayName.trim() || undefined,
          signal,
        }),
      {
        signal: activeController.signal,
        onResult: (result) => {
          results = { ...results, [result.id]: result };
          if (result.status === "success") {
            onPublished(
              result.value.listing.listingId,
              result.value.ownerToken,
            );
          }
        },
      },
    );
    isPublishing = false;
    activeController = undefined;
  }

  function cancelPublishing() {
    wasCancelled = true;
    activeController?.abort();
  }

  function resultFor(templateId: string) {
    return results[templateId];
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
>
  <div
    class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-theme-border bg-theme-surface p-5"
    role="dialog"
    aria-modal="true"
    aria-labelledby="publish-template-title"
    aria-busy={isPublishing}
  >
    <div class="flex items-center justify-between gap-4">
      <h2
        id="publish-template-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Share {draftList.length === 1
          ? "template"
          : `${draftList.length} templates`}
      </h2>
      <button
        type="button"
        aria-label="Close publish dialog"
        onclick={onClose}
        disabled={isPublishing}
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>
    <p class="mt-2 text-sm text-theme-muted">
      Review the exact public layout and details for every template. Entity
      values, campaign notes, vault identifiers, and assets stay local.
    </p>

    <div class="mt-5 space-y-4">
      {#each draftList as draft (draft.template.id)}
        {@const result = resultFor(draft.template.id)}
        {@const templatePackage = packageFor(draft)}
        <section
          class="rounded-lg border border-theme-border p-4"
          data-testid="template-publish-draft"
        >
          <h3 class="font-header text-base font-bold text-theme-text">
            {draft.template.name}
          </h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label
              class="text-xs font-bold uppercase tracking-wide text-theme-muted"
              for={`${draft.template.id}-description`}
            >
              Description
            </label>
            <input
              id={`${draft.template.id}-description`}
              name="description"
              bind:value={draft.description}
              disabled={isPublishing || result?.status === "success"}
              class="-mt-2 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
            />
            <label
              class="text-xs font-bold uppercase tracking-wide text-theme-muted"
              for={`${draft.template.id}-system`}
            >
              Game system
            </label>
            <input
              id={`${draft.template.id}-system`}
              name="system"
              bind:value={draft.system}
              placeholder="Homebrew"
              disabled={isPublishing || result?.status === "success"}
              class="-mt-2 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
            />
            <label
              class="text-xs font-bold uppercase tracking-wide text-theme-muted"
              for={`${draft.template.id}-category`}
            >
              Entity category
            </label>
            <select
              id={`${draft.template.id}-category`}
              name="category"
              bind:value={draft.category}
              disabled={isPublishing || result?.status === "success"}
              class="-mt-2 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
            >
              <option value="">None</option><option value="character"
                >Character</option
              ><option value="npc">NPC</option><option value="location"
                >Location</option
              ><option value="faction">Faction</option><option value="item"
                >Item</option
              ><option value="ship">Ship</option>
            </select>
            <label
              class="text-xs font-bold uppercase tracking-wide text-theme-muted"
              for={`${draft.template.id}-creator`}
            >
              Public display name (optional)
            </label>
            <input
              id={`${draft.template.id}-creator`}
              name="creator"
              bind:value={draft.ownerDisplayName}
              disabled={isPublishing || result?.status === "success"}
              class="-mt-2 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
            />
          </div>
          <details class="mt-4 rounded border border-theme-border p-3">
            <summary class="cursor-pointer text-sm font-bold text-theme-text"
              >Fields shared ({templatePackage.template.fields.length})</summary
            >
            <ul class="mt-2 grid gap-1 text-sm text-theme-muted sm:grid-cols-2">
              {#each templatePackage.template.fields as field (field.id)}
                <li>
                  {field.label} <span class="text-xs">({field.type})</span>
                </li>
              {/each}
            </ul>
          </details>
          {#if result?.status === "failed"}
            <p class="mt-3 text-sm text-red-400" role="alert">
              {result.error.message}
            </p>
          {:else if result?.status === "success"}
            <div
              class="mt-3 rounded border border-theme-primary/40 bg-theme-primary/10 p-3 text-sm text-theme-text"
            >
              <p class="font-bold">Published</p>
              <p class="mt-1 text-xs text-theme-muted">
                Save this management key to update or unpublish this listing
                after browser data is cleared.
              </p>
              <code class="mt-2 block break-all rounded bg-theme-bg p-2 text-xs"
                >{result.value.ownerToken}</code
              >
              <button
                type="button"
                class="mt-2 rounded border border-theme-border px-3 py-1 text-xs"
                onclick={() =>
                  navigator.clipboard?.writeText(result.value.ownerToken)}
                >Copy key</button
              >
            </div>
          {/if}
        </section>
      {/each}
    </div>

    {#if wasCancelled}<p class="mt-4 text-sm text-theme-muted" role="status">
        Publishing stopped. Completed templates remain published; queued
        templates were not sent.
      </p>{/if}
    {#if failedIds.length > 0}<p class="mt-4 text-sm text-red-400" role="alert">
        {failedIds.length} template{failedIds.length === 1 ? "" : "s"} could not be
        published.
      </p>{/if}

    {#if successCount === 0}
      <label class="mt-5 flex gap-2 text-sm text-theme-text">
        <input
          type="checkbox"
          bind:checked={acknowledged}
          disabled={isPublishing}
        />
        I understand {draftList.length} template{draftList.length === 1
          ? ""
          : "s"} will be publicly discoverable.
      </label>
    {/if}
    <div class="mt-5 flex flex-wrap justify-end gap-2">
      {#if isPublishing}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm"
          onclick={cancelPublishing}>Stop publishing</button
        >
      {:else}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm"
          onclick={onClose}>{successCount > 0 ? "Done" : "Cancel"}</button
        >
        {#if failedIds.length > 0}
          <button
            type="button"
            class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
            onclick={() => publish(failedIds)}>Retry failed templates</button
          >
        {:else if successCount === 0}
          <button
            type="button"
            class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg disabled:opacity-50"
            disabled={!acknowledged}
            onclick={() => publish()}
            >Publish {draftList.length === 1 ? "template" : "templates"}</button
          >
        {/if}
      {/if}
    </div>
  </div>
</div>
