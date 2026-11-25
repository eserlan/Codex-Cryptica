<script lang="ts">
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
  import BusinessFallbackNote from "./BusinessFallbackNote.svelte";
  import LazyChunkFailure from "./LazyChunkFailure.svelte";
  import {
    saveGeneratorOutputForReload,
    shouldReloadAfterLazyChunkRetry,
  } from "./generator-output-reload.js";

  let retryAttempt = $state(0);
  let recoveryCopyState = $state<"idle" | "copied" | "failed">("idle");
  let recoveryCopyOutput = $state.raw<GeneratorOutput | null>(null);

  function loadPointCrawlPanel() {
    return retryAttempt === 0
      ? import("./PointCrawlRefinePanel.svelte")
      : import("./PointCrawlRefinePanel.svelte?retry");
  }

  function loadBusinessPanel() {
    return retryAttempt === 0
      ? import("./BusinessRefinePanel.svelte")
      : import("./BusinessRefinePanel.svelte?retry");
  }

  let {
    slug,
    recoveryKey = slug,
    output,
    useAI,
    onReplace,
    saveOutput = saveGeneratorOutputForReload,
    reloadPage = () => window.location.reload(),
    loadOneShotOverride = undefined,
  }: {
    slug: string;
    recoveryKey?: string;
    output: GeneratorOutput;
    useAI: boolean;
    onReplace: (output: GeneratorOutput) => void;
    saveOutput?: typeof saveGeneratorOutputForReload;
    reloadPage?: () => void;
    loadOneShotOverride?: () => Promise<
      typeof import("./OneShotRefinePanel.svelte")
    >;
  } = $props();

  function loadOneShotPanel() {
    if (loadOneShotOverride) return loadOneShotOverride();
    return retryAttempt === 0
      ? import("./OneShotRefinePanel.svelte")
      : import("./OneShotRefinePanel.svelte?retry");
  }

  $effect(() => {
    const currentOutput = output;
    if (recoveryCopyOutput !== currentOutput) recoveryCopyState = "idle";
  });

  function reloadWithOutputPreserved() {
    if (saveOutput(recoveryKey, output)) reloadPage();
    else {
      recoveryCopyOutput = output;
      recoveryCopyState = "failed";
    }
  }

  async function copyOutputForRecovery() {
    const copiedOutput = output;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(copiedOutput, null, 2),
      );
      if (output === copiedOutput) {
        recoveryCopyOutput = copiedOutput;
        recoveryCopyState = "copied";
      }
    } catch {
      if (output === copiedOutput) {
        recoveryCopyOutput = copiedOutput;
        recoveryCopyState = "failed";
      }
    }
  }
</script>

{#snippet refinementFailure()}
  <LazyChunkFailure
    message="The refinement tools could not load."
    firstRetry={!shouldReloadAfterLazyChunkRetry(retryAttempt)}
    copyFailed={recoveryCopyOutput === output && recoveryCopyState === "failed"}
    copied={recoveryCopyOutput === output && recoveryCopyState === "copied"}
    onRetry={() => (retryAttempt += 1)}
    onCopy={copyOutputForRecovery}
    onReload={reloadWithOutputPreserved}
    onReloadCopied={reloadPage}
    reloadLabel="Reload to recover"
  />
{/snippet}

<!-- Refinement panels have separate async loaders and recovery states; their conditional branches are covered by GeneratorPageOutputExtras tests. -->
<!-- fallow-ignore-next-line complexity -->
{#if slug === "one-shot-adventure-generator"}
  {#key retryAttempt}
    {#await loadOneShotPanel() then { default: OneShotRefinePanel }}
      <OneShotRefinePanel {output} {useAI} {onReplace} />
    {:catch}
      {@render refinementFailure()}
    {/await}
  {/key}
{:else if slug === "point-crawl"}
  {#key retryAttempt}
    {#await loadPointCrawlPanel() then { default: PointCrawlRefinePanel }}
      <PointCrawlRefinePanel {output} {useAI} {onReplace} />
    {:catch}
      {@render refinementFailure()}
    {/await}
  {/key}
{:else if slug === "business" && output.business}
  <BusinessFallbackNote
    fallbackSections={output.business.fallbackSections}
    warnings={output.business.warnings}
  />
  {#key retryAttempt}
    {#await loadBusinessPanel() then { default: BusinessRefinePanel }}
      <BusinessRefinePanel
        business={output.business}
        {useAI}
        onReplaceOutput={onReplace}
      />
    {:catch}
      {@render refinementFailure()}
    {/await}
  {/key}
{/if}
