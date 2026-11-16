<script lang="ts">
  import {
    computeAdventureJsonHash,
    validateAdventureJson,
    type AdventureJsonV1,
    type EpistemicStatus,
    type SourceReference,
    type Visibility,
  } from "@codex/adventure-engine";

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

  function epistemicBadgeClass(status: EpistemicStatus): string {
    switch (status) {
      case "explicit":
        return "border-theme-primary/40 bg-theme-primary/10 text-theme-text";
      case "inferred":
        return "border-theme-accent/40 bg-theme-accent/10 text-theme-text";
      case "ambiguous":
      case "unresolved":
        return "border-theme-danger/50 bg-theme-danger/10 text-theme-text";
    }
  }

  function formatSourceRef(ref: SourceReference | undefined): string | null {
    if (!ref) return null;
    const parts: string[] = [];
    if (ref.page !== undefined) {
      if (ref.pageEnd !== undefined && ref.pageEnd > ref.page) {
        parts.push(`pp. ${ref.page}–${ref.pageEnd}`);
      } else {
        parts.push(`p. ${ref.page}`);
      }
    }
    if (ref.chapter) parts.push(ref.chapter);
    if (ref.section) parts.push(ref.section);
    if (ref.anchor) parts.push(`#${ref.anchor}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  function formatReadAloud(readAloud: string | string[] | undefined): string[] {
    if (!readAloud) return [];
    return Array.isArray(readAloud) ? readAloud : [readAloud];
  }

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

{#snippet epistemicBadge(status: EpistemicStatus)}
  <span
    class="rounded-full border px-2 py-0.5 text-xs font-medium {epistemicBadgeClass(
      status,
    )}"
    aria-label={status}
  >
    {status}
  </span>
{/snippet}

{#snippet sourceCitation(ref: SourceReference | undefined)}
  {@const formatted = formatSourceRef(ref)}
  {#if formatted}
    <span
      class="rounded border border-theme-border px-1.5 py-0.5 font-mono text-xs text-theme-text"
      data-testid="entity-source-ref"
    >
      {formatted}
    </span>
  {/if}
{/snippet}

{#snippet visibilityControls(
  collection: VisibilityCollection,
  index: number,
  visibility: Visibility,
  label: string,
)}
  <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
    <span
      class="text-xs font-medium text-theme-text"
      data-testid="{collection}-visibility-{index}"
    >
      {visibility === "gm-only" ? "GM-only" : "Player-visible"}
    </span>
    <button
      type="button"
      data-testid="{collection}-visibility-toggle-{index}"
      aria-pressed={visibility === "gm-only"}
      aria-label="Toggle visibility for {label}"
      disabled={isLocked}
      onclick={() => toggleVisibility(collection, index)}
      class="min-h-9 rounded-md border border-theme-border bg-theme-surface px-3 py-1.5 text-xs font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {visibility === "gm-only" ? "Make player-visible" : "Make GM-only"}
    </button>
  </div>
{/snippet}

{#snippet reviewHeader()}
  <header
    class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-theme-border bg-theme-surface p-5"
  >
    <div class="min-w-0 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <p
          class="text-xs font-semibold uppercase tracking-widest text-theme-text"
        >
          Adventure JSON Review
        </p>
        {#if experimentalOrigin}
          <span
            class="rounded-full border border-theme-border px-2 py-0.5 text-xs font-medium text-theme-text"
            data-testid="adventure-experimental-origin"
          >
            Experimental {experimentalOrigin === "pdf" ? "PDF" : "Markdown"}
            import
          </span>
        {/if}
      </div>
      <h1
        id="adventure-import-review-heading"
        class="font-header text-2xl font-semibold text-theme-text"
      >
        {draft.title}
      </h1>
      <p class="text-xs text-theme-text">
        Package ID: <span class="font-mono">{draft.id}</span> · Version:
        <span class="font-mono">{draft.version}</span> · Format:
        <span class="font-mono">{draft.formatVersion}</span>
      </p>
      <p class="text-xs text-theme-text">
        Canonical SHA-256:
        <span class="break-all font-mono" data-testid="adventure-package-hash">
          {canonicalHash || "Computing…"}
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
{/snippet}

{#snippet reviewMetadata()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-metadata-heading"
    data-testid="review-metadata"
  >
    <h2
      id="review-metadata-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Premise and Source
    </h2>
    {#if draft.description}
      <p class="text-sm text-theme-text">{draft.description}</p>
    {/if}
    <div class="grid gap-3 sm:grid-cols-2">
      <div
        class="space-y-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wide text-theme-text"
        >
          Background
        </p>
        <p class="text-theme-text">{draft.premise.background || "—"}</p>
      </div>
      <div
        class="space-y-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wide text-theme-text"
        >
          Hook
        </p>
        <p class="text-theme-text">{draft.premise.hook || "—"}</p>
      </div>
    </div>
    <dl class="grid gap-2 text-xs text-theme-text sm:grid-cols-2">
      <div>
        <dt class="font-semibold">Source title</dt>
        <dd>{draft.source.title}</dd>
      </div>
      {#if draft.source.authors && draft.source.authors.length > 0}
        <div>
          <dt class="font-semibold">Authors</dt>
          <dd>{draft.source.authors.join(", ")}</dd>
        </div>
      {/if}
      {#if draft.source.publisher}
        <div>
          <dt class="font-semibold">Publisher</dt>
          <dd>{draft.source.publisher}</dd>
        </div>
      {/if}
      {#if draft.source.publishedDate}
        <div>
          <dt class="font-semibold">Published</dt>
          <dd>{draft.source.publishedDate}</dd>
        </div>
      {/if}
      {#if draft.source.license}
        <div>
          <dt class="font-semibold">Licence</dt>
          <dd>{draft.source.license}</dd>
        </div>
      {/if}
      {#if draft.source.url}
        <div>
          <dt class="font-semibold">URL</dt>
          <dd class="break-all font-mono">{draft.source.url}</dd>
        </div>
      {/if}
      {#if draft.source.documentHash}
        <div class="sm:col-span-2">
          <dt class="font-semibold">Source document hash</dt>
          <dd class="break-all font-mono">{draft.source.documentHash}</dd>
        </div>
      {/if}
      {#if draft.system}
        <div>
          <dt class="font-semibold">System</dt>
          <dd>{draft.system.name}</dd>
        </div>
      {/if}
      {#if draft.premise.theme && draft.premise.theme.length > 0}
        <div>
          <dt class="font-semibold">Themes</dt>
          <dd>{draft.premise.theme.join(", ")}</dd>
        </div>
      {/if}
      {#if draft.premise.tone}
        <div>
          <dt class="font-semibold">Tone</dt>
          <dd>{draft.premise.tone}</dd>
        </div>
      {/if}
    </dl>
  </section>
{/snippet}

{#snippet reviewUnresolved()}
  <section
    class="space-y-3 rounded-xl border border-theme-danger/40 bg-theme-surface p-5"
    aria-labelledby="review-unresolved-heading"
    data-testid="review-unresolved"
  >
    <h2
      id="review-unresolved-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Unresolved ({draft.unresolved.length})
    </h2>
    <ul class="space-y-2">
      {#each draft.unresolved as item (item.id)}
        <li
          class="flex flex-col gap-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-semibold text-theme-text">
                {item.code}
              </span>
              {#if item.relatedEntityId}
                <span class="font-mono text-xs text-theme-text">
                  ({item.relatedEntityId})
                </span>
              {/if}
              {@render sourceCitation(item.sourceRef)}
            </div>
            {@render epistemicBadge(item.epistemicStatus)}
          </div>
          <p class="text-theme-text">{item.message}</p>
          {#if item.context}
            <p class="text-xs text-theme-text">{item.context}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

{#snippet reviewLocations()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-locations-heading"
    data-testid="review-locations"
  >
    <h2
      id="review-locations-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Locations ({draft.locations.length})
    </h2>
    {#if draft.locations.length === 0}
      <p class="text-sm text-theme-text">No locations in this module.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.locations as loc, index (loc.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-theme-text">{loc.name}</span>
                <span class="font-mono text-xs text-theme-text">{loc.id}</span>
                {@render sourceCitation(loc.sourceRef)}
              </div>
              {@render epistemicBadge(loc.epistemicStatus)}
            </div>
            <p class="text-sm text-theme-text">{loc.summary}</p>
            {@render visibilityControls(
              "locations",
              index,
              loc.visibility,
              `location ${loc.name}`,
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet reviewActors()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-actors-heading"
    data-testid="review-actors"
  >
    <h2
      id="review-actors-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Actors ({draft.actors.length})
    </h2>
    {#if draft.actors.length === 0}
      <p class="text-sm text-theme-text">No actors in this module.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.actors as actor, index (actor.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-theme-text">{actor.name}</span>
                {#if actor.role}
                  <span class="text-xs text-theme-text">({actor.role})</span>
                {/if}
                {@render sourceCitation(actor.sourceRef)}
              </div>
              {@render epistemicBadge(actor.epistemicStatus)}
            </div>
            <p class="text-sm text-theme-text">{actor.summary}</p>
            {#if actor.motivation}
              <p class="text-xs text-theme-text">
                Motivation: {actor.motivation}
              </p>
            {/if}
            {@render visibilityControls(
              "actors",
              index,
              actor.visibility,
              `actor ${actor.name}`,
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet reviewFactions()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-factions-heading"
    data-testid="review-factions"
  >
    <h2
      id="review-factions-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Factions ({draft.factions.length})
    </h2>
    <ul class="space-y-3">
      {#each draft.factions as faction, index (faction.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-theme-text">{faction.name}</span>
              {@render sourceCitation(faction.sourceRef)}
            </div>
            {@render epistemicBadge(faction.epistemicStatus)}
          </div>
          <p class="text-sm text-theme-text">{faction.summary}</p>
          {@render visibilityControls(
            "factions",
            index,
            faction.visibility,
            `faction ${faction.name}`,
          )}
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

{#snippet reviewScenes()}
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
      <p class="text-sm text-theme-text">No scenes in this module.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.scenes as scene, index (scene.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-theme-text">{scene.title}</span>
                <span class="font-mono text-xs text-theme-text">{scene.id}</span
                >
                {@render sourceCitation(scene.sourceRef)}
              </div>
              {@render epistemicBadge(scene.epistemicStatus)}
            </div>
            <p class="text-sm text-theme-text">{scene.summary}</p>
            {#each formatReadAloud(scene.readAloud) as excerpt}
              <blockquote
                class="border-l-2 border-theme-primary/50 pl-3 text-sm italic text-theme-text"
              >
                {excerpt}
              </blockquote>
            {/each}
            {#if scene.conditions && scene.conditions.length > 0}
              <p class="text-xs text-theme-text">
                Conditions: {scene.conditions.join("; ")}
              </p>
            {/if}
            {@render visibilityControls(
              "scenes",
              index,
              scene.visibility,
              `scene ${scene.title}`,
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet reviewEncounters()}
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
      <p class="text-sm text-theme-text">No encounters in this module.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.encounters as encounter, index (encounter.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-theme-text">
                  {encounter.title ?? encounter.id}
                </span>
                {@render sourceCitation(encounter.sourceRef)}
              </div>
              {@render epistemicBadge(encounter.epistemicStatus)}
            </div>
            <p class="text-sm text-theme-text">{encounter.description}</p>
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
            {@render visibilityControls(
              "encounters",
              index,
              encounter.visibility,
              `encounter ${encounter.title ?? encounter.id}`,
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet reviewClues()}
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
      <p class="text-sm text-theme-text">No clues in this module.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.clues as clue, index (clue.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs text-theme-text">{clue.id}</span>
                {@render sourceCitation(clue.sourceRef)}
              </div>
              {@render epistemicBadge(clue.epistemicStatus)}
            </div>
            <p class="text-sm text-theme-text">{clue.text}</p>
            {@render visibilityControls(
              "clues",
              index,
              clue.visibility,
              `clue ${index + 1}`,
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet reviewRumours()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-rumours-heading"
    data-testid="review-rumours"
  >
    <h2
      id="review-rumours-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Rumours ({draft.rumours.length})
    </h2>
    <ul class="space-y-3">
      {#each draft.rumours as rumour, index (rumour.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs text-theme-text">
                {rumour.truth}
              </span>
              {@render sourceCitation(rumour.sourceRef)}
            </div>
            {@render epistemicBadge(rumour.epistemicStatus)}
          </div>
          <p class="text-sm text-theme-text">{rumour.text}</p>
          {@render visibilityControls(
            "rumours",
            index,
            rumour.visibility,
            `rumour ${index + 1}`,
          )}
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

{#snippet reviewItems()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-items-heading"
    data-testid="review-items"
  >
    <h2
      id="review-items-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Items ({draft.items.length})
    </h2>
    <ul class="space-y-3">
      {#each draft.items as item, index (item.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-theme-text">{item.name}</span>
              {@render sourceCitation(item.sourceRef)}
            </div>
            {@render epistemicBadge(item.epistemicStatus)}
          </div>
          <p class="text-sm text-theme-text">{item.summary}</p>
          {@render visibilityControls(
            "items",
            index,
            item.visibility,
            `item ${item.name}`,
          )}
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

{#snippet reviewSecrets()}
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
      <p class="text-sm text-theme-text">No secrets in this module.</p>
    {:else}
      <ul class="space-y-3">
        {#each draft.secrets as secret, index (secret.id)}
          <li
            class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs text-theme-text">
                  {secret.id}
                </span>
                {@render sourceCitation(secret.sourceRef)}
              </div>
              {@render epistemicBadge(secret.epistemicStatus)}
            </div>
            <p class="text-sm text-theme-text">{secret.text}</p>
            <div class="flex items-center gap-2 pt-1">
              <span
                class="inline-flex items-center gap-1 text-xs font-medium text-theme-text"
                data-testid="secret-classification-{index}"
              >
                <span class="icon-[lucide--lock] h-3.5 w-3.5" aria-hidden="true"
                ></span>
                GM-only (locked)
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet reviewEndings()}
  <section
    class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-endings-heading"
    data-testid="review-endings"
  >
    <h2
      id="review-endings-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Endings ({draft.endings.length})
    </h2>
    <ul class="space-y-3">
      {#each draft.endings as ending (ending.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-theme-text">
                {ending.title ?? ending.id}
              </span>
              {@render sourceCitation(ending.sourceRef)}
            </div>
            {@render epistemicBadge(ending.epistemicStatus)}
          </div>
          <p class="text-sm text-theme-text">{ending.description}</p>
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

{#snippet reviewFooter()}
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
{/snippet}

<section
  class="mx-auto flex w-full max-w-5xl flex-col gap-6"
  aria-labelledby="adventure-import-review-heading"
  data-testid="adventure-import-review"
>
  {@render reviewHeader()}
  {@render reviewMetadata()}
  {#if draft.unresolved.length > 0}
    {@render reviewUnresolved()}
  {/if}
  {@render reviewLocations()}
  {@render reviewActors()}
  {#if draft.factions.length > 0}
    {@render reviewFactions()}
  {/if}
  {@render reviewScenes()}
  {@render reviewEncounters()}
  {@render reviewClues()}
  {#if draft.rumours.length > 0}
    {@render reviewRumours()}
  {/if}
  {#if draft.items.length > 0}
    {@render reviewItems()}
  {/if}
  {@render reviewSecrets()}
  {#if draft.endings.length > 0}
    {@render reviewEndings()}
  {/if}
  {@render reviewFooter()}
</section>
