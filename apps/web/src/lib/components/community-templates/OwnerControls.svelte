<script lang="ts">
  import { onMount } from "svelte";
  import type { EntityTemplate } from "entity-template-engine";
  import OwnerRecoverForm from "./OwnerRecoverForm.svelte";
  import {
    entityTemplatePublishStore,
    type RecoverResult,
  } from "$lib/stores/entity-templates/entity-template-publish-store.svelte";

  type Store = Pick<
    typeof entityTemplatePublishStore,
    | "hasOwnerToken"
    | "ownerStatus"
    | "unpublishListing"
    | "republishListing"
    | "deleteListing"
    | "recover"
    | "relink"
    | "installCopyAndLink"
  >;

  let {
    listingId,
    store = entityTemplatePublishStore,
    onUpdate,
    onChanged = () => {},
  }: {
    listingId: string;
    store?: Store;
    /** Opens the update form. Only offered when a local template is linked. */
    onUpdate?: () => void;
    onChanged?: (
      change: "unpublished" | "republished" | "deleted" | "recovered",
    ) => void;
  } = $props();

  type Phase = "checking" | "recover" | "owner" | "deleted";
  let phase = $state<Phase>("checking");
  let status = $state<"active" | "unpublished">("active");
  let busy = $state(false);
  let error = $state("");
  let confirmingDelete = $state(false);
  let token = $state("");
  let choose = $state<EntityTemplate[] | null>(null);
  let none = $state(false);

  async function load() {
    error = "";
    try {
      if (await store.hasOwnerToken(listingId)) {
        status = await store.ownerStatus(listingId);
        phase = "owner";
      } else {
        phase = "recover";
      }
    } catch (cause) {
      error = message(cause);
      phase = "recover";
    }
  }

  const message = (cause: unknown) =>
    cause instanceof Error && cause.message
      ? cause.message
      : "Something went wrong. Please try again.";

  async function act(work: () => Promise<void>) {
    if (busy) return;
    busy = true;
    error = "";
    try {
      await work();
    } catch (cause) {
      error = message(cause);
    } finally {
      busy = false;
    }
  }

  const unpublish = () =>
    act(async () => {
      await store.unpublishListing(listingId);
      status = "unpublished";
      onChanged("unpublished");
    });

  const republish = () =>
    act(async () => {
      await store.republishListing(listingId);
      status = "active";
      onChanged("republished");
    });

  const remove = () =>
    act(async () => {
      await store.deleteListing(listingId);
      confirmingDelete = false;
      phase = "deleted";
      onChanged("deleted");
    });

  const recover = () =>
    act(async () => {
      const r: RecoverResult = await store.recover(listingId, token);
      if (r.status === "linked") {
        status = r.listing.status;
        phase = "owner";
        onChanged("recovered");
      } else if (r.status === "choose") {
        choose = r.candidates;
      } else {
        none = true;
      }
    });

  const pick = (templateId: string) =>
    act(async () => {
      await store.relink(listingId, templateId);
      choose = null;
      await load();
      onChanged("recovered");
    });

  const installCopy = () =>
    act(async () => {
      await store.installCopyAndLink(listingId);
      none = false;
      await load();
      onChanged("recovered");
    });

  onMount(load);

  const button =
    "rounded border border-theme-border px-3 py-2 text-sm text-theme-text hover:border-theme-primary disabled:opacity-50";
</script>

<section
  class="space-y-3 rounded-lg border border-theme-border bg-theme-surface p-4"
  data-testid="owner-controls"
>
  {#if phase === "checking"}
    <p class="text-sm text-theme-muted" role="status">
      Checking owner controls…
    </p>
  {:else if phase === "deleted"}
    <p class="text-sm text-theme-text" role="status">
      This listing was deleted. Your local template was not changed.
    </p>
  {:else if phase === "owner"}
    <h2 class="text-sm font-bold text-theme-text">Your listing</h2>
    <p class="text-xs text-theme-muted">
      {status === "active"
        ? "This listing is public."
        : "This listing is unpublished, so only you can see it."}
    </p>
    <div class="flex flex-wrap gap-2">
      {#if onUpdate}
        <button type="button" class={button} disabled={busy} onclick={onUpdate}
          >Update</button
        >
      {/if}
      {#if status === "active"}
        <button type="button" class={button} disabled={busy} onclick={unpublish}
          >Unpublish</button
        >
      {:else}
        <button type="button" class={button} disabled={busy} onclick={republish}
          >Republish</button
        >
      {/if}
      <button
        type="button"
        class={button}
        disabled={busy}
        onclick={() => (confirmingDelete = true)}>Delete permanently</button
      >
    </div>
    {#if confirmingDelete}
      <div
        class="rounded border border-theme-border bg-theme-bg p-3"
        role="alertdialog"
        aria-label="Confirm delete"
      >
        <p class="text-sm text-theme-text">
          Delete this listing permanently? It and its template text are removed
          from the directory. Your own template is not changed. This can't be
          undone.
        </p>
        <div class="mt-3 flex gap-2">
          <button type="button" class={button} disabled={busy} onclick={remove}
            >Yes, delete permanently</button
          >
          <button
            type="button"
            class={button}
            disabled={busy}
            onclick={() => (confirmingDelete = false)}>Cancel</button
          >
        </div>
      </div>
    {/if}
  {:else}
    <OwnerRecoverForm
      {busy}
      {choose}
      {none}
      bind:token
      onRecover={recover}
      onPick={pick}
      onInstallCopy={installCopy}
    />
  {/if}
  {#if error}
    <p class="text-sm text-theme-danger" role="alert">{error}</p>
  {/if}
</section>
