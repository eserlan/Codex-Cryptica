<script lang="ts">
  import {
    approveAdventurePackage,
    type AdventureSourcePackage,
    type Provenance,
    type SectionAnchor,
  } from "@codex/adventure-engine";

  let {
    draft = $bindable(),
    onApprove,
    onCancel,
    approving = false,
    approveError = null,
  }: {
    draft: AdventureSourcePackage;
    onApprove: (
      approvedPackage: AdventureSourcePackage,
    ) => void | Promise<void>;
    onCancel: () => void;
    approving?: boolean;
    approveError?: string | null;
  } = $props();

  let localError = $state<string | null>(null);

  const isApproved = $derived(draft.status === "approved");
  const isLocked = $derived(isApproved || approving);
  const displayError = $derived(approveError ?? localError);
  const packageTitle = $derived(
    draft.sourceIdentity.title || draft.sourceIdentity.fileName,
  );

  function provenanceBadgeClass(provenance: Provenance): string {
    switch (provenance) {
      case "source-grounded":
        return "border-theme-primary/40 bg-theme-primary/10 text-theme-text";
      case "suggested":
        return "border-theme-accent/40 bg-theme-accent/10 text-theme-text";
      case "unresolved":
        return "border-theme-danger/50 bg-theme-danger/10 text-theme-text";
    }
  }

  function formatReadAloud(readAloud: SectionAnchor["readAloud"]): string[] {
    if (!readAloud) return [];
    return Array.isArray(readAloud) ? readAloud : [readAloud];
  }

  function toggleSecretVisibility(index: number): void {
    if (isLocked) return;
    draft = {
      ...draft,
      secrets: draft.secrets.map((secret, i) =>
        i === index ? { ...secret, gmOnly: !secret.gmOnly } : secret,
      ),
    };
  }

  function updateSceneSourceId(index: number, sourceId: string): void {
    if (isLocked) return;
    draft = {
      ...draft,
      scenes: draft.scenes.map((scene, i) =>
        i === index ? { ...scene, sourceId } : scene,
      ),
    };
  }

  function updateNpcSourceId(index: number, sourceId: string): void {
    if (isLocked) return;
    draft = {
      ...draft,
      npcs: draft.npcs.map((npc, i) =>
        i === index ? { ...npc, sourceId } : npc,
      ),
    };
  }

  function updateCluePrimarySourceId(
    index: number,
    primarySourceId: string,
  ): void {
    if (isLocked) return;
    draft = {
      ...draft,
      clues: draft.clues.map((clue, i) =>
        i === index ? { ...clue, primarySourceId } : clue,
      ),
    };
  }

  async function handleApprove(): Promise<void> {
    if (isLocked) return;
    localError = null;
    try {
      const approved = approveAdventurePackage($state.snapshot(draft));
      await onApprove(approved);
      draft = approved;
    } catch (error) {
      localError =
        error instanceof Error
          ? error.message
          : "Unable to approve this adventure package.";
    }
  }
</script>

{#snippet provenanceBadge(provenance: Provenance)}
  <span
    class="rounded-full border px-2 py-0.5 text-xs font-medium {provenanceBadgeClass(
      provenance,
    )}"
    aria-label={provenance}
  >
    {provenance}
  </span>
{/snippet}

{#snippet sectionAnchorSelect(
  id: string,
  labelText: string,
  ariaLabel: string,
  value: string,
  onSelect: (nextValue: string) => void,
)}
  <div class="flex flex-wrap items-center gap-2 pt-1">
    <label for={id} class="text-xs font-medium text-theme-text">
      {labelText}
    </label>
    <select
      {id}
      aria-label={ariaLabel}
      class="min-h-9 max-w-full rounded-md border border-theme-border bg-theme-surface px-2.5 py-1 text-sm text-theme-text disabled:cursor-not-allowed disabled:opacity-60"
      {value}
      disabled={isLocked}
      onchange={(event) => onSelect(event.currentTarget.value)}
    >
      {#each draft.sections as section (section.sourceId)}
        <option value={section.sourceId}>
          {section.title} ({section.sourceId})
        </option>
      {/each}
    </select>
  </div>
{/snippet}

{#snippet ambiguitiesSection()}
  {#if draft.ambiguities.length > 0}
    <section
      class="space-y-3 rounded-xl border border-theme-danger/40 bg-theme-surface p-5"
      aria-labelledby="review-ambiguities-heading"
      data-testid="review-ambiguities"
    >
      <h2
        id="review-ambiguities-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        Ambiguities ({draft.ambiguities.length})
      </h2>
      <ul class="space-y-2">
        {#each draft.ambiguities as ambiguity (ambiguity.id)}
          <li
            class="flex flex-col gap-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-mono text-xs font-semibold text-theme-text">
                {ambiguity.code}
              </span>
              {@render provenanceBadge(ambiguity.provenance)}
            </div>
            <p class="text-theme-text">{ambiguity.message}</p>
            {#if ambiguity.context}
              <p class="text-xs text-theme-text">{ambiguity.context}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{/snippet}

{#snippet sectionsSection()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-sections-heading"
    data-testid="review-sections"
  >
    <h2
      id="review-sections-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Sections ({draft.sections.length})
    </h2>
    {#if draft.sections.length === 0}
      <p class="text-sm text-theme-text">No sections extracted.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.sections as section (section.sourceId)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded border border-theme-border px-1.5 py-0.5 font-mono text-xs text-theme-text"
                >
                  H{section.level}
                </span>
                <span class="font-semibold text-theme-text">
                  {section.title}
                </span>
                <span class="font-mono text-xs text-theme-text">
                  {section.sourceId}
                </span>
              </div>
              {@render provenanceBadge(section.provenance)}
            </div>
            {#each formatReadAloud(section.readAloud) as excerpt}
              <blockquote
                class="border-l-2 border-theme-primary/50 pl-3 text-sm italic text-theme-text"
              >
                {excerpt}
              </blockquote>
            {/each}
            {#if section.body}
              <p class="whitespace-pre-line text-sm text-theme-text">
                {section.body}
              </p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet scenesSection()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-scenes-heading"
    data-testid="review-scenes"
  >
    <h2
      id="review-scenes-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Scenes ({draft.scenes.length})
    </h2>
    {#if draft.scenes.length === 0}
      <p class="text-sm text-theme-text">No scenes extracted.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.scenes as scene, index (`${scene.sourceId}-${index}`)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-semibold text-theme-text">{scene.title}</span>
              {@render provenanceBadge(scene.provenance)}
            </div>
            {#if scene.conditions.length > 0}
              <p class="text-xs text-theme-text">
                Conditions: {scene.conditions.join("; ")}
              </p>
            {/if}
            {@render sectionAnchorSelect(
              `scene-section-${index}`,
              "Section anchor",
              `Assign section for scene ${scene.title}`,
              scene.sourceId,
              (val) => updateSceneSourceId(index, val),
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet npcsSection()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-npcs-heading"
    data-testid="review-npcs"
  >
    <h2
      id="review-npcs-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      NPCs ({draft.npcs.length})
    </h2>
    {#if draft.npcs.length === 0}
      <p class="text-sm text-theme-text">No NPCs extracted.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.npcs as npc, index (`${npc.name}-${index}`)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-semibold text-theme-text">{npc.name}</span>
              {@render provenanceBadge(npc.provenance)}
            </div>
            {#if npc.motivation}
              <p class="text-sm text-theme-text">
                Motivation: {npc.motivation}
              </p>
            {/if}
            {@render sectionAnchorSelect(
              `npc-section-${index}`,
              "Section anchor",
              `Assign section for NPC ${npc.name}`,
              npc.sourceId,
              (val) => updateNpcSourceId(index, val),
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet cluesSection()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-clues-heading"
    data-testid="review-clues"
  >
    <h2
      id="review-clues-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Clues ({draft.clues.length})
    </h2>
    {#if draft.clues.length === 0}
      <p class="text-sm text-theme-text">No clues extracted.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.clues as clue, index (`${clue.primarySourceId}-${index}`)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm font-medium text-theme-text">
                {clue.clue}
              </span>
              {@render provenanceBadge(clue.provenance)}
            </div>
            {#if clue.alternativeSourceId}
              <p class="text-xs text-theme-text">
                Alternative anchor:
                <span class="font-mono">{clue.alternativeSourceId}</span>
              </p>
            {/if}
            {@render sectionAnchorSelect(
              `clue-section-${index}`,
              "Primary section",
              `Assign section for clue ${index + 1}`,
              clue.primarySourceId,
              (val) => updateCluePrimarySourceId(index, val),
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet encountersSection()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-encounters-heading"
    data-testid="review-encounters"
  >
    <h2
      id="review-encounters-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Encounters ({draft.encounters.length})
    </h2>
    {#if draft.encounters.length === 0}
      <p class="text-sm text-theme-text">No encounters extracted.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.encounters as encounter, index (`${encounter.sourceId}-${index}`)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-semibold text-theme-text">
                {encounter.title ?? encounter.sourceId}
              </span>
              {@render provenanceBadge(encounter.provenance)}
            </div>
            {#if encounter.description}
              <p class="text-sm text-theme-text">{encounter.description}</p>
            {/if}
            {#if encounter.alternativeSolutions.length > 0}
              <ul class="space-y-1 pl-4 text-xs text-theme-text">
                {#each encounter.alternativeSolutions as alt}
                  <li>
                    <strong>{alt.method}:</strong>
                    {alt.description}
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet secretsSection()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-secrets-heading"
    data-testid="review-secrets"
  >
    <h2
      id="review-secrets-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Secrets ({draft.secrets.length})
    </h2>
    {#if draft.secrets.length === 0}
      <p class="text-sm text-theme-text">No secrets extracted.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.secrets as secret, index (secret.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-mono text-xs text-theme-text">
                {secret.sourceId}
              </span>
              {@render provenanceBadge(secret.provenance)}
            </div>
            <p class="text-sm text-theme-text">{secret.text}</p>
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span
                class="text-xs font-medium text-theme-text"
                data-testid="secret-classification-{index}"
              >
                {secret.gmOnly ? "GM-only" : "Player-visible"}
              </span>
              <button
                type="button"
                data-testid="secret-toggle-{index}"
                aria-pressed={secret.gmOnly}
                aria-label="Toggle visibility for secret {index + 1}"
                disabled={isLocked}
                onclick={() => toggleSecretVisibility(index)}
                class="min-h-9 rounded-md border border-theme-border bg-theme-surface px-3 py-1.5 text-xs font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {secret.gmOnly ? "Make player-visible" : "Make GM-only"}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

<section
  class="mx-auto flex w-full max-w-5xl flex-col gap-6"
  aria-labelledby="adventure-import-review-heading"
  data-testid="adventure-import-review"
>
  <header
    class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-theme-border bg-theme-surface p-5"
  >
    <div class="min-w-0 space-y-1.5">
      <p
        class="text-xs font-semibold uppercase tracking-widest text-theme-text"
      >
        Imported Adventure Review
      </p>
      <h1
        id="adventure-import-review-heading"
        class="font-header text-2xl font-semibold text-theme-text"
      >
        {packageTitle}
      </h1>
      <p class="text-xs text-theme-text">
        File: <span class="font-mono">{draft.sourceIdentity.fileName}</span>
      </p>
      <p class="text-xs text-theme-text">
        SHA-256:
        <span class="break-all font-mono" data-testid="adventure-package-hash">
          {draft.documentHash}
        </span>
      </p>
    </div>

    <div class="flex items-center gap-2" aria-live="polite">
      <span
        data-testid="adventure-package-status"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold {isApproved
          ? 'border-theme-primary/50 bg-theme-primary/15 text-theme-text'
          : 'border-theme-border bg-theme-bg text-theme-text'}"
      >
        <span
          class={isApproved
            ? "icon-[lucide--lock] h-3.5 w-3.5"
            : "icon-[lucide--file-edit] h-3.5 w-3.5"}
          aria-hidden="true"
        ></span>
        {isApproved ? "Approved" : "Draft"}
      </span>
    </div>
  </header>

  {@render ambiguitiesSection()}
  {@render sectionsSection()}
  {@render scenesSection()}
  {@render npcsSection()}
  {@render cluesSection()}
  {@render encountersSection()}
  {@render secretsSection()}

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
          Local storage and AI excerpts
        </p>
        <p class="leading-relaxed text-theme-text">
          Your adventure file and approved package stay strictly local in your
          Vault on this device. During play, only relevant excerpts (such as
          active scene text, read-aloud passages, and active NPC notes) are sent
          to your chosen Oracle AI provider.
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
      Adventure approved and locked as an immutable baseline in your Vault.
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
    <button
      type="button"
      data-testid="adventure-approve-button"
      disabled={isLocked}
      onclick={() => void handleApprove()}
      class="min-h-11 rounded-lg bg-theme-primary px-5 py-2 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {approving ? "Approving…" : isApproved ? "Approved" : "Approve Adventure"}
    </button>
  </footer>
</section>
