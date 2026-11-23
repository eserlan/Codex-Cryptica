<script lang="ts">
  import type { SessionEntity } from "generator-engine/session-hub-helpers";
  import LoreMergeModal from "#lib/components/modals/LoreMergeModal.svelte";
  import MonsterLabsSendingModal from "#lib/components/modals/MonsterLabsSendingModal.svelte";
  import type { useGeneratorRefinement } from "./use-generator-refinement.svelte";
  import type { useGeneratorHandoffs } from "./use-generator-handoffs.svelte";
  import type { useGeneratorClipboard } from "./use-generator-clipboard.svelte";
  import type { useGeneratorSharing } from "./use-generator-sharing.svelte";
  import { shouldReloadAfterLazyChunkRetry } from "../generator-output-reload.js";
  import LazyChunkFailure from "../LazyChunkFailure.svelte";
  import { saveGeneratorOutputForReload } from "../generator-output-reload.js";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

  let {
    recoveryKey = "",
    recoveryOutput = null,
    selectedHubEntity,
    onCloseHubEntity,
    refinement,
    handoffs,
    clipboard,
    sharing,
    reloadPage = () => window.location.reload(),
    loadEntityModalOverride,
  }: {
    recoveryKey?: string;
    recoveryOutput?: GeneratorOutput | null;
    selectedHubEntity: SessionEntity | null;
    onCloseHubEntity: () => void;
    refinement: ReturnType<typeof useGeneratorRefinement>;
    handoffs: ReturnType<typeof useGeneratorHandoffs>;
    clipboard: ReturnType<typeof useGeneratorClipboard>;
    sharing: ReturnType<typeof useGeneratorSharing>;
    reloadPage?: () => void;
    loadEntityModalOverride?: () => Promise<
      typeof import("../EntityDetailModal.svelte")
    >;
  } = $props();

  const monsterLabsFlow = $derived(handoffs.monsterLabsFlow);
  let entityModalRetry = $state(0);
  let refinementModalRetry = $state(0);
  let recoverySaveFailed = $state(false);
  let recoveryCopiedOutput = $state.raw<GeneratorOutput | null>(null);

  function reloadWithDraftPreserved() {
    if (
      recoveryOutput &&
      !saveGeneratorOutputForReload(recoveryKey, recoveryOutput)
    ) {
      recoverySaveFailed = true;
      return;
    }
    window.location.reload();
  }

  async function copyRecoveryOutput() {
    if (!recoveryOutput) return;
    const copiedOutput = recoveryOutput;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(copiedOutput, null, 2),
      );
      if (recoveryOutput === copiedOutput) {
        recoveryCopiedOutput = copiedOutput;
        recoverySaveFailed = false;
      }
    } catch {
      if (recoveryOutput === copiedOutput) {
        recoveryCopiedOutput = null;
        recoverySaveFailed = true;
      }
    }
  }

  function reloadAfterCopy() {
    if (recoveryCopiedOutput === recoveryOutput) reloadPage();
  }

  function loadEntityModal() {
    if (loadEntityModalOverride) return loadEntityModalOverride();
    return entityModalRetry === 0
      ? import("../EntityDetailModal.svelte")
      : import("../EntityDetailModal.svelte?retry");
  }

  function loadRefinementModal() {
    return refinementModalRetry === 0
      ? import("../GeneratorRefinementModal.svelte")
      : import("../GeneratorRefinementModal.svelte?retry");
  }
</script>

<!-- Modal loaders have independent retry/copy/reload states and keep selection mounted during recovery. -->
<!-- fallow-ignore-next-line complexity -->
{#if selectedHubEntity}
  {#key entityModalRetry}
    {#await loadEntityModal() then { default: EntityDetailModal }}
      <EntityDetailModal
        entity={selectedHubEntity}
        onClose={onCloseHubEntity}
        onCopy={clipboard.handleCopySessionEntity}
        onRefine={refinement.openForHubEntity}
        onPrepareShare={sharing.prepareSessionEntityShare}
        {...sharing.sessionDetailTracking}
      />
    {:catch}
      <LazyChunkFailure
        message="The entity details could not load."
        firstRetry={!shouldReloadAfterLazyChunkRetry(entityModalRetry)}
        copyFailed={recoverySaveFailed}
        copied={!!recoveryOutput && recoveryCopiedOutput === recoveryOutput}
        onRetry={() => (entityModalRetry += 1)}
        onCopy={copyRecoveryOutput}
        onReload={reloadWithDraftPreserved}
        onReloadCopied={reloadAfterCopy}
      />
    {/await}
  {/key}
{/if}

{#if refinement.open}
  {#key refinementModalRetry}
    {#await loadRefinementModal() then { default: GeneratorRefinementModal }}
      <GeneratorRefinementModal
        open={refinement.open}
        service={refinement.service}
        onAccept={refinement.accept}
        onCancel={refinement.cancel}
        onRequested={refinement.onRequested}
      />
    {:catch}
      <LazyChunkFailure
        message="The refinement dialog could not load."
        firstRetry={!shouldReloadAfterLazyChunkRetry(refinementModalRetry)}
        copyFailed={recoverySaveFailed}
        copied={!!recoveryOutput && recoveryCopiedOutput === recoveryOutput}
        onRetry={() => (refinementModalRetry += 1)}
        onCopy={copyRecoveryOutput}
        onReload={reloadWithDraftPreserved}
        onReloadCopied={reloadAfterCopy}
      />
    {/await}
  {/key}
{/if}

<LoreMergeModal />

<MonsterLabsSendingModal
  open={monsterLabsFlow.open}
  state={monsterLabsFlow.state}
  entityLabel={monsterLabsFlow.entityLabel}
  url={monsterLabsFlow.url}
  onConfirm={monsterLabsFlow.confirm}
  onOpen={monsterLabsFlow.close}
  onClose={monsterLabsFlow.close}
/>
