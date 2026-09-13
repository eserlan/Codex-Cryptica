<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import PublicLabelChip from "$lib/components/labels/PublicLabelChip.svelte";
  import ShareButton from "$lib/components/ShareButton.svelte";
  import { renderGeneratorMarkdown } from "$lib/components/seo/markdown-renderers";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import {
    generatorShareService,
    type GeneratorShareService,
  } from "$lib/services/sharing/GeneratorShareService";
  import {
    trackGeneratorShareClicked,
    trackGeneratorShareGenerateClicked,
    trackGeneratorShareLinkCopied,
    trackGeneratorShareOpened,
    trackGeneratorShareRemixClicked,
    trackGeneratorShareCompleted,
  } from "$lib/services/sharing/generator-share-tracking";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let share = $state<Awaited<ReturnType<GeneratorShareService["get"]>>>(null);
  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let revoking = $state(false);
  let revoked = $state(false);
  const cleanBase = base === "/" ? "" : base;

  const shareUrl = $derived(buildAbsoluteUrl(`/share/${data.shareId}`));
  const generatorUrl = $derived(
    share
      ? `${cleanBase}${share.metadata.generatorPath}`
      : `${cleanBase}/generators`,
  );
  const displayContent = $derived(
    share?.content.replace(/^# [^\n]+\n*/, "") ?? "",
  );

  onMount(() => {
    let active = true;
    void generatorShareService
      .get(data.shareId)
      .then((result) => {
        if (!active) return;
        share = result;
        if (result) {
          trackGeneratorShareOpened({
            generatorType: result.generatorId,
            source: "current_output",
            shareId: result.shareId,
          });
        } else {
          errorMessage = "This shared result is no longer available.";
        }
      })
      .catch(() => {
        if (active) errorMessage = "This shared result could not be loaded.";
      })
      .finally(() => {
        if (active) loading = false;
      });
    return () => {
      active = false;
    };
  });

  async function revokeShare() {
    if (!share || revoking) return;
    revoking = true;
    try {
      await generatorShareService.revoke(share.shareId);
      revoked = true;
      share = null;
    } catch {
      errorMessage = "This share could not be revoked from this device.";
    } finally {
      revoking = false;
    }
  }
</script>

<SeoHead
  title={share
    ? `${share.title} | Codex Cryptica`
    : "Shared RPG Result | Codex Cryptica"}
  description={share?.metadata.description ??
    "A shared RPG result created with Codex Cryptica."}
  canonicalUrl={shareUrl}
  image={share?.metadata.imageUrl ?? buildAbsoluteUrl("/og-image.png")}
  imageAlt={share
    ? `${share.title} — shared RPG result`
    : "Codex Cryptica shared RPG result"}
  robots="noindex, follow"
  type="article"
  publishedTime={share?.createdAt}
  jsonLd={[]}
/>

<main
  class="min-h-screen bg-theme-bg px-4 py-12 text-theme-text sm:px-6 sm:py-20"
  style:background-image="var(--bg-texture-overlay)"
>
  <article class="mx-auto max-w-3xl">
    <nav aria-label="Breadcrumb" class="mb-8">
      <a
        href="{cleanBase}/generators"
        class="inline-flex items-center gap-2 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Create your own
      </a>
    </nav>

    {#if loading}
      <div
        role="status"
        aria-live="polite"
        class="py-20 text-center text-theme-muted"
      >
        Loading shared result…
      </div>
    {:else if revoked}
      <section
        class="rounded-2xl border border-theme-border bg-theme-surface p-8 text-center shadow-sm"
      >
        <h1 class="font-header text-3xl font-bold text-theme-text">
          Share revoked
        </h1>
        <p class="mt-3 text-theme-muted">This result is no longer public.</p>
      </section>
    {:else if share}
      <header class="mb-10">
        <p
          class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
        >
          Shared {share.generatorId.replaceAll("-", " ")}
        </p>
        <h1
          class="font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
        >
          {share.title}
        </h1>
        {#if share.metadata.theme}
          <p class="mt-3 text-sm text-theme-muted">
            Theme: {share.metadata.theme}
          </p>
        {/if}
        {#if share.metadata.labels?.length}
          <div class="mt-4 flex flex-wrap gap-2">
            {#each share.metadata.labels as label (label)}
              <PublicLabelChip {label} />
            {/each}
          </div>
        {/if}
      </header>

      <section
        class="seo-md rounded-2xl border border-theme-border bg-theme-surface p-6 text-lg leading-relaxed shadow-md sm:p-10"
        aria-label="Shared generated result"
      >
        {@html renderGeneratorMarkdown(displayContent)}
      </section>

      <footer
        class="mt-8 flex flex-col gap-4 rounded-2xl border border-theme-border/70 bg-theme-surface/50 p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="font-header text-lg font-bold text-theme-text">
            Want to make your own?
          </p>
          <p class="mt-1 text-sm text-theme-muted">
            Create a fresh result or remix this one in Codex Cryptica.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            href={`${generatorUrl}?remix=${encodeURIComponent(share.shareId)}`}
            onclick={() =>
              trackGeneratorShareRemixClicked({
                generatorType: share!.generatorId,
                source: "current_output",
                shareId: share!.shareId,
              })}
            class="inline-flex items-center gap-2 rounded-lg bg-theme-primary px-4 py-2.5 font-header text-xs font-bold uppercase tracking-wider text-theme-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
          >
            Remix this
          </a>
          <a
            href={`${cleanBase}${share.metadata.generatorPath}`}
            onclick={() =>
              trackGeneratorShareGenerateClicked({
                generatorType: share!.generatorId,
                source: "current_output",
                shareId: share!.shareId,
              })}
            class="inline-flex items-center gap-2 rounded-lg border border-theme-primary/40 bg-theme-surface px-4 py-2.5 font-header text-xs font-bold uppercase tracking-wider text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
          >
            Generate your own
          </a>
          <ShareButton
            url={shareUrl}
            title={share.title}
            text={share.metadata.description}
            subjectLabel="this result"
            onShareClicked={() =>
              trackGeneratorShareClicked({
                generatorType: share!.generatorId,
                source: "shared_page",
              })}
            onShareCompleted={() =>
              trackGeneratorShareCompleted({
                generatorType: share!.generatorId,
                source: "shared_page",
              })}
            onLinkCopied={() =>
              trackGeneratorShareLinkCopied({
                generatorType: share!.generatorId,
                source: "shared_page",
              })}
          />
        </div>
      </footer>

      {#if generatorShareService.hasManagementToken(share.shareId)}
        <div class="mt-5 text-right">
          <button
            type="button"
            onclick={revokeShare}
            disabled={revoking}
            class="text-xs text-theme-muted underline decoration-theme-border underline-offset-4 hover:text-theme-danger disabled:opacity-60"
          >
            {revoking ? "Revoking…" : "Revoke this share"}
          </button>
        </div>
      {/if}
    {:else}
      <section
        class="rounded-2xl border border-theme-border bg-theme-surface p-8 text-center shadow-sm"
      >
        <h1 class="font-header text-3xl font-bold text-theme-text">
          Shared result unavailable
        </h1>
        <p class="mt-3 text-theme-muted">
          {errorMessage ?? "This link may be incorrect or expired."}
        </p>
      </section>
    {/if}

    {#if errorMessage && share}
      <p class="mt-4 text-sm text-theme-danger" role="alert">{errorMessage}</p>
    {/if}

    <p
      class="mt-10 text-center font-mono text-xs uppercase tracking-widest text-theme-muted/70"
    >
      Created with Codex Cryptica · Your campaign, your canon
    </p>
  </article>
</main>

<style>
  .seo-md :global(h2) {
    margin: 1.5rem 0 0.75rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 40%, transparent);
    padding-bottom: 0.25rem;
    font-family: var(--font-header);
    font-size: 1.25rem;
    font-weight: 700;
  }
  .seo-md :global(h3) {
    margin: 1rem 0 0.5rem;
    font-family: var(--font-header);
    font-size: 1.125rem;
    font-weight: 700;
    color: color-mix(in srgb, var(--color-primary) 65%, var(--color-text));
  }
  .seo-md :global(ul) {
    margin-left: 1rem;
    list-style: disc;
  }
  .seo-md :global(p) {
    margin-bottom: 0.75rem;
  }
</style>
