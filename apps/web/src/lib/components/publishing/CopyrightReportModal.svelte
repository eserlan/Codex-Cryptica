<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";
  import {
    copyrightReportService,
    type CopyrightReportReceipt,
    type CopyrightReportSubmission,
  } from "$lib/services/publishing/CopyrightReportService";
  import { getCopyrightReportTurnstileToken } from "$lib/services/publishing/turnstile";

  interface Props {
    open: boolean;
    vaultUrl?: string;
    onClose: () => void;
    deps?: {
      submitReport?: (
        payload: CopyrightReportSubmission,
      ) => Promise<CopyrightReportReceipt>;
      getTurnstileToken?: () => Promise<string>;
    };
  }

  let { open, vaultUrl = "", onClose, deps }: Props = $props();

  let inputVaultUrl = $state("");
  let reporterContact = $state("");
  let rightsHolder = $state("");
  let material = $state("");
  let details = $state("");
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let receipt = $state<CopyrightReportReceipt | null>(null);

  $effect(() => {
    if (open && !inputVaultUrl && vaultUrl) {
      inputVaultUrl = vaultUrl;
    }
  });

  function handleModalClose() {
    receipt = null;
    errorMessage = null;
    isSubmitting = false;
    onClose();
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!inputVaultUrl.trim() || !reporterContact.trim()) {
      errorMessage = "Please enter both the Vault URL and your contact email.";
      return;
    }

    isSubmitting = true;
    errorMessage = null;

    try {
      const tokenGetter =
        deps?.getTurnstileToken ?? getCopyrightReportTurnstileToken;
      const turnstileToken = await tokenGetter();

      const submitter =
        deps?.submitReport ??
        ((p: CopyrightReportSubmission) =>
          copyrightReportService.submitReport(p));

      const result = await submitter({
        vaultUrl: inputVaultUrl.trim(),
        reporterContact: reporterContact.trim(),
        rightsHolder: rightsHolder.trim(),
        material: material.trim(),
        details: details.trim(),
        turnstileToken,
      });

      receipt = result;
    } catch (err) {
      errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while submitting your report.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<ModalShell
  {open}
  onClose={handleModalClose}
  labelledBy="copyright-report-title"
  describedBy="copyright-report-desc"
  maxWidthClass="max-w-xl"
>
  <div class="space-y-6">
    <div>
      <h2
        id="copyright-report-title"
        class="flex items-center gap-2 font-header text-xl font-bold text-theme-text"
      >
        <span class="icon-[lucide--shield-alert] h-5 w-5 text-theme-primary"
        ></span>
        <span>Report Copyright Concern</span>
      </h2>
      <p id="copyright-report-desc" class="mt-1 text-sm text-theme-text/70">
        Use this form to notify the Codex Cryptica operator of unauthorized or
        infringing material published in a public world vault.
      </p>
    </div>

    {#if receipt}
      <div
        class="rounded-lg border border-theme-border/60 bg-theme-surface/60 p-6 space-y-4 text-center"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-theme-primary/20 text-theme-primary"
        >
          <span class="icon-[lucide--check-circle-2] h-6 w-6"></span>
        </div>
        <h3 class="font-header text-lg font-bold text-theme-text">
          Report Received
        </h3>
        <p class="text-sm text-theme-text/80 leading-relaxed">
          Your copyright concern has been received and will be reviewed by our
          moderation team. We will contact you at the email provided if
          additional information is required.
        </p>
        <div
          class="rounded bg-theme-base/50 p-3 text-left text-xs font-mono text-theme-text/70 space-y-1"
        >
          <div>
            <span class="font-bold text-theme-text">Report ID:</span>
            {receipt.reportId}
          </div>
          <div>
            <span class="font-bold text-theme-text">Received:</span>
            {new Date(receipt.receivedAt).toLocaleString()}
          </div>
        </div>
        <div class="pt-2">
          <button
            type="button"
            onclick={handleModalClose}
            class="rounded-md bg-theme-primary px-5 py-2 font-bold text-theme-base hover:bg-theme-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="space-y-4">
        {#if errorMessage}
          <div
            class="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
          >
            <span
              class="icon-[lucide--alert-triangle] mt-0.5 h-4 w-4 flex-shrink-0"
            ></span>
            <span>{errorMessage}</span>
          </div>
        {/if}

        <div>
          <label
            for="report-vault-url"
            class="block text-xs font-bold uppercase tracking-wider text-theme-text/80 mb-1"
          >
            Vault URL <span class="text-theme-primary">*</span>
          </label>
          <input
            id="report-vault-url"
            type="url"
            required
            bind:value={inputVaultUrl}
            placeholder="https://codexcryptica.com/guest/..."
            class="w-full rounded-md border border-theme-border bg-theme-base px-3 py-2 text-sm text-theme-text placeholder-theme-text/40 focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
          />
        </div>

        <div>
          <label
            for="report-contact-email"
            class="block text-xs font-bold uppercase tracking-wider text-theme-text/80 mb-1"
          >
            Your Contact Email <span class="text-theme-primary">*</span>
          </label>
          <input
            id="report-contact-email"
            type="email"
            required
            bind:value={reporterContact}
            placeholder="name@example.com"
            class="w-full rounded-md border border-theme-border bg-theme-base px-3 py-2 text-sm text-theme-text placeholder-theme-text/40 focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
          />
          <p class="mt-1 text-[11px] text-theme-text/50">
            We will never display your email publicly. Used solely for
            verification and follow-up.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              for="report-rights-holder"
              class="block text-xs font-bold uppercase tracking-wider text-theme-text/80 mb-1"
            >
              Rights Holder (Optional)
            </label>
            <input
              id="report-rights-holder"
              type="text"
              bind:value={rightsHolder}
              placeholder="e.g., Acme Publishing Inc."
              class="w-full rounded-md border border-theme-border bg-theme-base px-3 py-2 text-sm text-theme-text placeholder-theme-text/40 focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
            />
          </div>

          <div>
            <label
              for="report-material"
              class="block text-xs font-bold uppercase tracking-wider text-theme-text/80 mb-1"
            >
              Infringing Material (Optional)
            </label>
            <input
              id="report-material"
              type="text"
              bind:value={material}
              placeholder="e.g., Chapter 4 text / cover art"
              class="w-full rounded-md border border-theme-border bg-theme-base px-3 py-2 text-sm text-theme-text placeholder-theme-text/40 focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
            />
          </div>
        </div>

        <div>
          <label
            for="report-details"
            class="block text-xs font-bold uppercase tracking-wider text-theme-text/80 mb-1"
          >
            Additional Details (Optional)
          </label>
          <textarea
            id="report-details"
            rows="3"
            bind:value={details}
            placeholder="Please specify how the material infringes or where it is located within the vault..."
            class="w-full rounded-md border border-theme-border bg-theme-base px-3 py-2 text-sm text-theme-text placeholder-theme-text/40 focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
          ></textarea>
        </div>

        <div
          class="flex items-center justify-end gap-3 pt-4 border-t border-theme-border/40"
        >
          <button
            type="button"
            onclick={handleModalClose}
            disabled={isSubmitting}
            class="rounded-md px-4 py-2 text-sm font-bold text-theme-text/70 hover:bg-theme-surface hover:text-theme-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            class="inline-flex items-center gap-2 rounded-md bg-theme-primary px-5 py-2 text-sm font-bold text-theme-base hover:bg-theme-primary/90 transition-colors disabled:opacity-50"
          >
            {#if isSubmitting}
              <span class="icon-[lucide--loader-2] h-4 w-4 animate-spin"></span>
              <span>Submitting...</span>
            {:else}
              <span class="icon-[lucide--send] h-4 w-4"></span>
              <span>Submit Report</span>
            {/if}
          </button>
        </div>
      </form>
    {/if}
  </div>
</ModalShell>
