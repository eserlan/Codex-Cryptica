<script lang="ts">
  import type { FeedbackKind } from "feedback-engine";
  import ModalShell from "#lib/components/ui/ModalShell.svelte";
  import { DISCORD_URL, GITHUB_URL } from "#lib/config/index.js";
  import type { FeedbackDialogStore } from "#lib/stores/ui/feedback-dialog.svelte.js";

  let { store }: { store: FeedbackDialogStore } = $props();

  const KINDS: { value: FeedbackKind; label: string }[] = [
    { value: "problem", label: "Something isn't working" },
    { value: "idea", label: "I have an idea" },
    { value: "other", label: "Something else" },
  ];
  const MAX_DESCRIPTION = 4000;

  const remaining = $derived(
    MAX_DESCRIPTION - [...store.draft.description].length,
  );
  const sending = $derived(store.status === "sending");
  const canSend = $derived(!sending && store.draft.description.trim() !== "");

  function waitText(seconds: number | undefined): string {
    if (!seconds) return "later";
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const failureText = $derived.by(() => {
    switch (store.failure) {
      case "offline":
        return "You seem to be offline. Your text is kept. Reconnect and try again.";
      case "rate_limited":
        return `You've sent several reports recently. Try again ${waitText(store.retryAfterSeconds)}. Your text is kept.`;
      case "invalid":
        return "Please check the form and try again. Your text is kept.";
      default:
        return "We couldn't send your report just now. Your text is kept. Try again, or tell us on Discord or GitHub.";
    }
  });
</script>

<ModalShell
  open={store.isOpen}
  onClose={() => store.close()}
  labelledBy="feedback-title"
  describedBy="feedback-intro"
  maxWidthClass="max-w-md"
  class="rounded-lg border border-theme-border bg-theme-surface p-5 text-theme-text"
>
  <div class="flex flex-col gap-4" aria-busy={sending}>
    <header class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 id="feedback-title" class="text-base font-bold">
          Report a problem or send feedback
        </h2>
        <p id="feedback-intro" class="text-xs text-theme-muted">
          Tell the maintainer what went wrong or what would help. Nothing is
          sent until you press Send.
        </p>
      </div>
      <button
        type="button"
        class="rounded p-1 text-theme-muted hover:text-theme-primary"
        aria-label="Close"
        onclick={() => store.close()}
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </header>

    {#if store.status === "sent"}
      <div role="status" class="flex flex-col gap-3">
        <p class="text-sm">
          Thanks. Your reference is <strong class="font-mono"
            >{store.reference}</strong
          >. Keep it if you want to ask about this report later.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-on-primary"
            onclick={() => store.sendAnother()}
          >
            Send another
          </button>
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-1.5 text-xs"
            onclick={() => store.close()}
          >
            Close
          </button>
        </div>
      </div>
    {:else}
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 text-xs font-bold text-theme-muted"
          >What kind of feedback is this?</legend
        >
        {#each KINDS as kind (kind.value)}
          <label class="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="feedback-kind"
              value={kind.value}
              checked={store.draft.kind === kind.value}
              onchange={() => store.setKind(kind.value)}
            />
            {kind.label}
          </label>
        {/each}
      </fieldset>

      <div class="flex flex-col gap-1">
        <label
          for="feedback-description"
          class="text-xs font-bold text-theme-muted">Description</label
        >
        <p id="feedback-description-help" class="text-xs text-theme-muted">
          {#if store.draft.kind === "problem"}
            What were you trying to do? What happened?
          {:else}
            What would help? Describe it in your own words.
          {/if}
        </p>
        <textarea
          id="feedback-description"
          class="min-h-28 w-full rounded border border-theme-border bg-theme-bg p-2 text-sm"
          maxlength={MAX_DESCRIPTION}
          aria-describedby="feedback-description-help feedback-remaining"
          disabled={sending}
          value={store.draft.description}
          oninput={(e) => store.setDescription(e.currentTarget.value)}
        ></textarea>
        <p
          id="feedback-remaining"
          class="text-right text-micro text-theme-muted"
          aria-live="polite"
        >
          {remaining} characters left
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label for="feedback-email" class="text-xs font-bold text-theme-muted"
          >Email (optional)</label
        >
        <input
          id="feedback-email"
          type="email"
          autocomplete="email"
          class="w-full rounded border border-theme-border bg-theme-bg p-2 text-sm"
          aria-describedby="feedback-email-help"
          disabled={sending}
          value={store.draft.contactEmail}
          oninput={(e) => store.setContactEmail(e.currentTarget.value)}
        />
        <p id="feedback-email-help" class="text-xs text-theme-muted">
          Used only to reply about this report. It is stored with the report.
        </p>
      </div>

      <details class="rounded border border-theme-border p-3 text-xs" open>
        <summary class="cursor-pointer font-bold">What is sent</summary>
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
          <dt class="text-theme-muted">App version</dt>
          <dd>{store.disclosed.appVersion}</dd>
          <dt class="text-theme-muted">Area</dt>
          <dd>{store.disclosed.area}</dd>
          <dt class="text-theme-muted">Browser</dt>
          <dd>{store.disclosed.browser}</dd>
          <dt class="text-theme-muted">Screen</dt>
          <dd>{store.disclosed.screen}</dd>
        </dl>
        <p class="mt-3 text-theme-muted">
          Each report is stored as a private issue on GitHub. Only the
          maintainer and people they grant access can read it. It is deleted
          after 180 days, or sooner if you quote your reference. Recognisable
          secrets, such as keys and passwords, are removed. Nothing from your
          campaign is sent.
        </p>
      </details>

      {#if store.status === "failed"}
        <div
          role="alert"
          class="rounded border border-theme-danger p-3 text-xs text-theme-danger"
        >
          <p>{failureText}</p>
          <div class="mt-2 flex flex-wrap gap-3 text-theme-text">
            <a
              class="underline"
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer">Discord</a
            >
            <a
              class="underline"
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer">GitHub</a
            >
          </div>
        </div>
      {/if}

      <div class="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs"
          onclick={() => store.close()}
        >
          Cancel
        </button>
        {#if store.status === "failed"}
          <button
            type="button"
            class="rounded border border-theme-primary px-3 py-1.5 text-xs font-bold text-theme-primary"
            disabled={sending}
            onclick={() => store.retry()}
          >
            Try again
          </button>
        {/if}
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-on-primary disabled:opacity-50"
          disabled={!canSend}
          onclick={() => store.submit()}
        >
          {sending ? "Sending…" : "Send report"}
        </button>
      </div>
    {/if}
  </div>
</ModalShell>
