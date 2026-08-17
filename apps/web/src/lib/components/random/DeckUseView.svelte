<script lang="ts">
  import type { RandomSource } from "random-source-engine";
  import SourceHeading from "./SourceHeading.svelte";
  import DeckView from "./DeckView.svelte";

  /**
   * A deck as it is used at the table (issue 2258).
   *
   * `DeckView` already had a read-only shape — omitting `onChange` drops the
   * spread editor and keeps the dealing — so play is that shape, and nothing
   * here can rewrite a card. Drawing still writes, but to the deck's draw
   * state rather than to the authored file, which is why the discard pile
   * survives a reload without the deck itself changing.
   */
  let { source }: { source: RandomSource } = $props();
</script>

<div class="flex flex-col gap-4" data-testid="deck-use-view">
  <SourceHeading {source} />

  <DeckView deck={source} />
</div>

<style>
  @reference "../../../app.css";
</style>
