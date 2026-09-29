<script lang="ts">
  import {
    exportTemplatePackage,
    type EntityTemplate,
  } from "entity-template-engine";
  import {
    normalizeEntityTemplateLabels,
    toPublicEntityPackage,
    validateEntityTemplatePublishMetadata,
  } from "schema";
  import {
    entityTemplatePublishStore,
    type PublishMetadata,
  } from "$lib/stores/entity-templates/entity-template-publish-store.svelte";
  import EntityTemplatePreview from "$lib/components/settings/entity-templates/EntityTemplatePreview.svelte";
  import SharingHelpLink from "./SharingHelpLink.svelte";
  import PublishedTokenPanel from "./PublishedTokenPanel.svelte";
  import PublishDetailsFields from "./PublishDetailsFields.svelte";
  import PublishFeedback from "./PublishFeedback.svelte";

  let {
    template,
    mode = "publish",
    initial,
    store = entityTemplatePublishStore,
    onClose = () => {},
    onDone = () => {},
  }: {
    template: EntityTemplate;
    mode?: "publish" | "update";
    initial?: PublishMetadata;
    store?: Pick<typeof entityTemplatePublishStore, "publish" | "update">;
    onClose?: () => void;
    onDone?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let description = $state(initial?.description ?? "");
  // svelte-ignore state_referenced_locally
  let labelText = $state(initial?.labels.join(", ") ?? "");
  // svelte-ignore state_referenced_locally
  let displayName = $state(initial?.ownerDisplayName ?? "");
  let acknowledged = $state(false);
  let touched = $state(false);
  let sending = $state(false);
  let error = $state("");
  let result = $state<{
    listingId: string;
    token: string;
    linkSaved: boolean;
  } | null>(null);
  let updated = $state(false);

  const labels = $derived(
    normalizeEntityTemplateLabels(labelText.split(",").map((l) => l.trim())),
  );

  const bodyIssue = $derived.by(() => {
    const r = toPublicEntityPackage(
      exportTemplatePackage({
        name: template.name,
        entityType: template.entityType,
        markdown: template.markdown,
      }),
    );
    return r.ok ? "" : r.error;
  });

  const issues = $derived([
    ...(bodyIssue ? [bodyIssue] : []),
    ...validateEntityTemplatePublishMetadata({
      description,
      labels,
      ownerDisplayName: displayName,
    }).map((i) => i.message),
    ...(mode === "publish" && !acknowledged
      ? ["Confirm that you're happy for this template to be public."]
      : []),
  ]);

  const submitLabel = $derived(
    sending ? "Sending…" : mode === "publish" ? "Publish" : "Update listing",
  );

  const meta = (): PublishMetadata => ({
    description: description.trim(),
    labels,
    ownerDisplayName: displayName.trim() || undefined,
  });

  async function submit() {
    touched = true;
    if (issues.length || sending) return;
    sending = true;
    error = "";
    try {
      if (mode === "publish") {
        const r = await store.publish(template.id, meta());
        result = {
          listingId: r.listing.listingId,
          token: r.ownerToken,
          linkSaved: r.linkSaved,
        };
      } else {
        await store.update(template.id, meta());
        updated = true;
      }
      onDone();
    } catch (cause) {
      error =
        cause instanceof Error && cause.message
          ? cause.message
          : "Something went wrong. Please try again.";
    } finally {
      sending = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-auto rounded-xl border border-theme-border bg-theme-surface p-5"
    role="dialog"
    aria-modal="true"
    aria-labelledby="publish-entity-template-title"
  >
    <div class="flex items-center justify-between gap-4">
      <h2
        id="publish-entity-template-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        {mode === "publish" ? "Publish" : "Update"} “{template.name}”
      </h2>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        aria-label="Close"
        onclick={onClose}><span class="icon-[lucide--x] h-4 w-4"></span></button
      >
    </div>

    {#if result}
      <PublishedTokenPanel
        templateName={template.name}
        listingId={result.listingId}
        token={result.token}
        linkSaved={result.linkSaved}
        {onClose}
      />
    {:else if updated}
      <p class="text-sm text-theme-text" role="status">
        Updated. The listing now shows your latest text and details.
      </p>
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          onclick={onClose}>Done</button
        >
      </div>
    {:else}
      <p class="text-sm text-theme-muted">
        Publishing makes this template public. Anyone can read it, install it
        and adapt it. Only the name, type and text below are shared, never your
        notes. You can unpublish or delete it later.
        <SharingHelpLink />
      </p>

      <div class="space-y-1">
        <p class="text-xs font-bold text-theme-text">
          What will be shared: {template.entityType} template
        </p>
        <EntityTemplatePreview markdown={template.markdown} />
      </div>

      <PublishDetailsFields
        bind:description
        bind:labelText
        bind:displayName
        labelCount={labels.length}
      />

      {#if mode === "publish"}
        <label class="flex items-start gap-2 text-sm text-theme-text">
          <input type="checkbox" bind:checked={acknowledged} class="mt-1" />
          <span
            >I'm happy for this template to be public. I have the right to share
            it, and I allow others to copy, use and adapt it.</span
          >
        </label>
      {/if}

      <PublishFeedback issues={touched ? issues : []} {error} />

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text"
          onclick={onClose}>Cancel</button
        >
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg disabled:opacity-50"
          disabled={sending}
          onclick={submit}>{submitLabel}</button
        >
      </div>
    {/if}
  </div>
</div>
