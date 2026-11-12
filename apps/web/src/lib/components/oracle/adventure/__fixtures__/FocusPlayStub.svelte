<script lang="ts">
  import type { ProvisionalFact } from "@codex/adventure-engine";

  let {
    onAddAllProvisionalFacts,
  }: {
    onAddAllProvisionalFacts: (facts: ProvisionalFact[]) => Promise<void>;
  } = $props();

  const testFacts: ProvisionalFact[] = [
    {
      id: "fact-one",
      kind: "person",
      name: "First Discovery",
      summary: "A person found in the adventure.",
      introducedOnTurnId: "turn-one",
      visibility: "player-visible",
    },
    {
      id: "fact-two",
      kind: "place",
      name: "Second Discovery",
      summary: "A place found in the adventure.",
      introducedOnTurnId: "turn-one",
      visibility: "player-visible",
    },
  ];

  async function addAll(): Promise<void> {
    try {
      await onAddAllProvisionalFacts(testFacts);
    } catch {
      // The production panel renders errors; this stub only drives the callback.
    }
  }
</script>

<div data-testid="adventure-play-surface">
  <button
    type="button"
    data-testid="test-add-all-discoveries"
    onclick={() => void addAll()}
  >
    Add test discoveries
  </button>
</div>
