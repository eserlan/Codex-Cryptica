<script lang="ts">
  import type { SessionEntity } from "generator-engine";
  import SaveToCodexModal from "../SaveToCodexModal.svelte";
  import EntityDetailModal from "../EntityDetailModal.svelte";
  import GeneratorRefinementModal from "../GeneratorRefinementModal.svelte";
  import LoreMergeModal from "$lib/components/modals/LoreMergeModal.svelte";
  import MonsterLabsSendingModal from "$lib/components/modals/MonsterLabsSendingModal.svelte";
  import type { useGeneratorSave } from "./use-generator-save.svelte";
  import type { useGeneratorRefinement } from "./use-generator-refinement.svelte";
  import type { useGeneratorHandoffs } from "./use-generator-handoffs.svelte";
  import type { useGeneratorClipboard } from "./use-generator-clipboard.svelte";
  import type { useGeneratorSharing } from "./use-generator-sharing.svelte";

  let {
    selectedHubEntity,
    onCloseHubEntity,
    save,
    refinement,
    handoffs,
    clipboard,
    sharing,
  }: {
    selectedHubEntity: SessionEntity | null;
    onCloseHubEntity: () => void;
    save: ReturnType<typeof useGeneratorSave>;
    refinement: ReturnType<typeof useGeneratorRefinement>;
    handoffs: ReturnType<typeof useGeneratorHandoffs>;
    clipboard: ReturnType<typeof useGeneratorClipboard>;
    sharing: ReturnType<typeof useGeneratorSharing>;
  } = $props();

  const monsterLabsFlow = $derived(handoffs.monsterLabsFlow);
</script>

<SaveToCodexModal
  open={save.showSaveModal}
  redirectQuery={save.redirectQuery}
  onConfirm={save.confirmSaveRedirect}
  onCancel={save.cancelSaveModal}
/>

<EntityDetailModal
  entity={selectedHubEntity}
  onClose={onCloseHubEntity}
  onCopy={clipboard.handleCopySessionEntity}
  onRefine={refinement.openForHubEntity}
  onPrepareShare={sharing.prepareSessionEntityShare}
  {...sharing.sessionDetailTracking}
/>

<GeneratorRefinementModal
  open={refinement.open}
  service={refinement.service}
  onAccept={refinement.accept}
  onCancel={refinement.cancel}
  onRequested={refinement.onRequested}
/>

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
