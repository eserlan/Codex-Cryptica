<script lang="ts">
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import AdventureProvisionalFacts from "./AdventureProvisionalFacts.svelte";
  import AdventureSituationsDialog from "./AdventureSituationsDialog.svelte";
  let {
    manager,
    existingTitles,
    onAddProvisionalFact,
    onAddAllProvisionalFacts,
    inToolsSheet = false,
    focusElement,
    onAction,
  }: {
    manager: AdventureManager;
    existingTitles: string[];
    onAddProvisionalFact: (fact: ProvisionalFact) => Promise<void>;
    onAddAllProvisionalFacts?: (facts: ProvisionalFact[]) => Promise<void>;
    inToolsSheet?: boolean;
    focusElement?: HTMLElement;
    onAction?: () => void;
  } = $props();
</script>

<AdventureProvisionalFacts
  variant={inToolsSheet ? "sheet" : "header"}
  overlayHost={inToolsSheet ? focusElement : undefined}
  facts={manager.session?.provisionalFacts ?? []}
  dismissedIds={manager.session?.dismissedProvisionalFactIds ?? []}
  onDismiss={(ids) => manager.dismissDiscoveries(ids).then(() => {})}
  canDismiss={!manager.readOnly &&
    manager.phase !== "generating" &&
    !manager.session?.pendingRoll}
  {existingTitles}
  onAdd={onAddProvisionalFact}
  onAddAll={onAddAllProvisionalFacts}
/>
<AdventureSituationsDialog
  variant={inToolsSheet ? "sheet" : "header"}
  overlayHost={inToolsSheet ? focusElement : undefined}
  {manager}
  onAction={inToolsSheet ? onAction : undefined}
/>
