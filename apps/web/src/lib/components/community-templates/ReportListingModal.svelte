<script lang="ts">
  import { onMount } from "svelte";
  import { ENTITY_TEMPLATE_LISTING_LIMITS } from "schema";
  import type { EntityTemplateReportInput } from "schema";
  import { publicEntityTemplateDirectoryService } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
  import { entityTemplatePublishRegistry } from "$lib/stores/publishing/entity-template-publish-registry";

  let {
    listingId,
    title,
    report = (id: string, input: EntityTemplateReportInput) =>
      publicEntityTemplateDirectoryService.reportEntityTemplate(id, input),
    hasReported = (id: string) => entityTemplatePublishRegistry.hasReported(id),
    markReported = (id: string) =>
      entityTemplatePublishRegistry.markReported(id),
    onClose = () => {},
  }: {
    listingId: string;
    title: string;
    report?: (id: string, input: EntityTemplateReportInput) => Promise<void>;
    hasReported?: (id: string) => Promise<boolean>;
    markReported?: (id: string) => Promise<void>;
    onClose?: () => void;
  } = $props();

  const REASONS: {
    value: EntityTemplateReportInput["reason"];
    label: string;
  }[] = [
    { value: "inappropriate", label: "Inappropriate or offensive" },
    { value: "copied-without-permission", label: "Copied without permission" },
    { value: "spam", label: "Spam or misleading" },
    { value: "other", label: "Something else" },
  ];

  type Step = "form" | "sending" | "done" | "already";
  let step = $state<Step>("form");
  let reason = $state<EntityTemplateReportInput["reason"] | "">("");
  let details = $state("");
  let error = $state("");

  onMount(async () => {
    try {
      if (await hasReported(listingId)) step = "already";
    } catch {
      // Not knowing is fine: the server also refuses duplicates.
    }
  });

  async function send() {
    if (step === "sending") return;
    if (!reason) {
      error = "Choose a reason for the report.";
      return;
    }
    step = "sending";
    error = "";
    try {
      await report(listingId, {
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      await markReported(listingId).catch(() => {});
      step = "done";
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code === "already_reported") {
        await markReported(listingId).catch(() => {});
        step = "already";
        return;
      }
      error =
        cause instanceof Error && cause.message
          ? cause.message
          : "Could not send the report.";
      step = "form";
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="w-full max-w-md space-y-4 rounded-xl border border-theme-border bg-theme-surface p-5"
    role="dialog"
    aria-modal="true"
    aria-labelledby="report-listing-title"
  >
    <div class="flex items-center justify-between gap-4">
      <h2
        id="report-listing-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Report “{title}”
      </h2>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        aria-label="Close"
        onclick={onClose}><span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span></button
      >
    </div>

    {#if step === "done"}
      <p class="text-sm text-theme-text" role="status">
        Thanks. Your report has been sent and will be looked at.
      </p>
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          onclick={onClose}>Done</button
        >
      </div>
    {:else if step === "already"}
      <p class="text-sm text-theme-text" role="status">
        You've already reported this. Thanks, it's already with us.
      </p>
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          onclick={onClose}>Close</button
        >
      </div>
    {:else}
      <fieldset class="space-y-2" disabled={step === "sending"}>
        <legend class="text-sm text-theme-muted">What's wrong with it?</legend>
        {#each REASONS as option (option.value)}
          <label class="flex items-center gap-2 text-sm text-theme-text">
            <input
              type="radio"
              name="report-reason"
              value={option.value}
              bind:group={reason}
            />
            {option.label}
          </label>
        {/each}
      </fieldset>
      <div>
        <label class="text-sm text-theme-text" for="report-details"
          >More detail (optional)</label
        >
        <textarea
          id="report-details"
          bind:value={details}
          rows="3"
          maxlength={ENTITY_TEMPLATE_LISTING_LIMITS.reportDetailsMax}
          class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
        ></textarea>
      </div>
      {#if error}<p class="text-sm text-theme-danger" role="alert">
          {error}
        </p>{/if}
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text"
          onclick={onClose}>Cancel</button
        >
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg disabled:opacity-50"
          disabled={step === "sending"}
          onclick={send}
          >{step === "sending" ? "Sending…" : "Send report"}</button
        >
      </div>
    {/if}
  </div>
</div>
