<script lang="ts">
  import {
    computeAdventureJsonHash,
    validateAdventureJson,
    type AdventureJsonV1,
    type Visibility,
  } from "@codex/adventure-engine";
  import AdventureImportReviewWorldSections from "./AdventureImportReviewWorldSections.svelte";
  import AdventureImportReviewPlaySections from "./AdventureImportReviewPlaySections.svelte";
  import AdventureImportReviewClueSections from "./AdventureImportReviewClueSections.svelte";
  import AdventureImportReviewSecrets from "./AdventureImportReviewSecrets.svelte";
  import AdventureImportReviewHeader from "./AdventureImportReviewHeader.svelte";
  import AdventureImportReviewUnresolved from "./AdventureImportReviewUnresolved.svelte";
  import AdventureImportReviewFactions from "./AdventureImportReviewFactions.svelte";
  import AdventureImportReviewEncounter from "./AdventureImportReviewEncounter.svelte";

  type VisibilityCollection =
    | "locations"
    | "actors"
    | "factions"
    | "scenes"
    | "encounters"
    | "clues"
    | "rumours"
    | "items";

  let {
    draft = $bindable(),
    experimentalOrigin = null,
    onApprove,
    onStartAdventure,
    onCancel,
    approving = false,
    approveError = null,
  }: {
    draft: AdventureJsonV1;
    experimentalOrigin?: "markdown" | "pdf" | null;
    onApprove: (approvedPackage: AdventureJsonV1) => void | Promise<void>;
    onStartAdventure?: (approvedPackage: AdventureJsonV1, hash: string) => void;
    onCancel: () => void;
    approving?: boolean;
    approveError?: string | null;
  } = $props();

  let localError = $state<string | null>(null);
  let approvedHash = $state<string | null>(null);
  let canonicalHash = $state<string>("");
  let hashRequestToken = 0;

  const isApproved = $derived(approvedHash !== null);
  const isLocked = $derived(isApproved || approving);
  const displayError = $derived(approveError ?? localError);

  $effect(() => {
    const snapshot = $state.snapshot(draft) as AdventureJsonV1;
    const token = ++hashRequestToken;
    void computeAdventureJsonHash(snapshot)
      .then((hash) => {
        if (token === hashRequestToken) {
          canonicalHash = hash;
        }
      })
      .catch(() => {
        if (token === hashRequestToken) {
          canonicalHash = "";
        }
      });
  });

  function toggleVisibility(
    collection: VisibilityCollection,
    index: number,
  ): void {
    if (isLocked) return;
    const items = draft[collection];
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const nextVis: Visibility =
        item.visibility === "gm-only" ? "player-visible" : "gm-only";
      return { ...item, visibility: nextVis };
    });
    draft = { ...draft, [collection]: next };
  }

  async function handleApprove(): Promise<void> {
    if (isLocked) return;
    localError = null;
    const snapshot = $state.snapshot(draft);
    const validation = validateAdventureJson(snapshot);
    if (!validation.ok) {
      localError = validation.errors.map((err) => err.message).join("; ");
      return;
    }
    try {
      const hash = await computeAdventureJsonHash(validation.value);
      await onApprove(validation.value);
      canonicalHash = hash;
      approvedHash = hash;
    } catch (error) {
      localError =
        error instanceof Error
          ? error.message
          : "Unable to approve this adventure package.";
    }
  }
</script>

<section
  class="mx-auto flex w-full max-w-5xl flex-col gap-6"
  aria-labelledby="adventure-import-review-heading"
  data-testid="adventure-import-review"
>
  <AdventureImportReviewHeader
    {draft}
    {experimentalOrigin}
    {canonicalHash}
    {isApproved}
  />

  <AdventureImportReviewUnresolved {draft} />

  <AdventureImportReviewWorldSections
    {draft}
    {isLocked}
    onToggleVisibility={toggleVisibility}
  />
  <AdventureImportReviewFactions
    {draft}
    {isLocked}
    onToggleVisibility={toggleVisibility}
  />
  <AdventureImportReviewPlaySections
    {draft}
    {isLocked}
    onToggleVisibility={toggleVisibility}
  />
  <AdventureImportReviewEncounter
    {draft}
    {isLocked}
    onToggleVisibility={toggleVisibility}
  />
  <AdventureImportReviewClueSections
    {draft}
    {isLocked}
    onToggleVisibility={toggleVisibility}
  />
  <AdventureImportReviewSecrets {draft} />

  <div
    role="region"
    aria-label="AI provider excerpt notice"
    class="rounded-xl border border-theme-primary/40 bg-theme-surface p-4 text-sm text-theme-text"
    data-testid="adventure-ai-notice"
  >
    <div class="flex items-start gap-3">
      <span
        class="icon-[lucide--shield-check] mt-0.5 h-5 w-5 shrink-0 text-theme-primary"
        aria-hidden="true"
      ></span>
      <div class="space-y-1">
        <p class="font-semibold text-theme-text">
          Vault storage and AI excerpts
        </p>
        <p class="leading-relaxed text-theme-text">
          Your original Adventure JSON file (or experimental Markdown/PDF
          source) stays on this device and is validated locally with zero AI
          calls. Only the approved Adventure JSON baseline is saved in your
          Vault. Imported packages are not currently included in Codex Cryptica
          Cloud Backup, even when you opt in to include adventure sessions.
          During play, bounded relevant excerpts (such as active scene text,
          read-aloud passages, and active NPC notes) may be sent to your
          selected Oracle AI provider.
        </p>
        <p
          class="leading-relaxed text-theme-text"
          data-testid="adventure-approval-scope"
        >
          Approving locks this reviewed baseline without claiming complete
          analysis, resolved ambiguities, or play readiness for every scene;
          unresolved items stay preserved for later review.
        </p>
      </div>
    </div>
  </div>

  {#if displayError}
    <div
      role="alert"
      class="rounded-lg border border-theme-danger/50 bg-theme-danger/10 p-3 text-sm text-theme-text"
      data-testid="adventure-approve-error"
    >
      {displayError}
    </div>
  {/if}

  {#if isApproved}
    <div
      role="status"
      aria-live="polite"
      class="rounded-lg border border-theme-primary/50 bg-theme-primary/10 p-3 text-sm font-medium text-theme-text"
      data-testid="adventure-approved-confirmation"
    >
      Reviewed baseline approved and locked in your Vault. Unresolved items
      remain preserved for later review.
    </div>
  {/if}

  <footer class="flex flex-wrap items-center justify-end gap-3 pb-4">
    <button
      type="button"
      data-testid="adventure-cancel-button"
      disabled={approving}
      onclick={onCancel}
      class="min-h-11 rounded-lg border border-theme-border bg-theme-surface px-4 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isApproved ? "Done" : "Cancel"}
    </button>
    {#if isApproved && onStartAdventure && approvedHash}
      <button
        type="button"
        data-testid="adventure-review-start-button"
        onclick={() =>
          onStartAdventure(
            $state.snapshot(draft) as AdventureJsonV1,
            approvedHash!,
          )}
        class="min-h-11 rounded-lg bg-theme-primary px-5 py-2 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      >
        Start adventure
      </button>
    {:else}
      <button
        type="button"
        data-testid="adventure-approve-button"
        disabled={isLocked}
        onclick={() => void handleApprove()}
        class="min-h-11 rounded-lg bg-theme-primary px-5 py-2 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {approving
          ? "Approving…"
          : isApproved
            ? "Approved"
            : "Approve Adventure"}
      </button>
    {/if}
  </footer>
</section>
