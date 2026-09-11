<script lang="ts">
  import type { RandomSource } from "random-source-engine";
  import SourceHeading from "./SourceHeading.svelte";
  import DeckView from "./DeckView.svelte";
  import { DeckService } from "random-source-engine";
  import { deckService, randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";

  /**
   * A deck as it is used at the table (issue 2258).
   *
   * `DeckView` already had a read-only shape — omitting `onChange` drops the
   * spread editor and keeps the dealing — so play is that shape, and nothing
   * here can rewrite a card. Drawing still writes, but to the deck's draw
   * state rather than to the authored file, which is why the discard pile
   * survives a reload without the deck itself changing.
   */
  let {
    source,
    service = deckService,
    sources = randomSources,
    history = diceHistory,
    session = mapSession,
    addToChat,
    revealArt = true,
    copyText,
  }: {
    source: RandomSource;
    service?: DeckService;
    sources?: RandomSourceStore;
    history?: DiceHistoryStore;
    session?: typeof mapSession;
    addToChat?: (text: string) => Promise<void>;
    /** Passed through to `DeckView`: off where a full-screen reveal intrudes. */
    revealArt?: boolean;
    copyText?: (text: string) => Promise<void>;
  } = $props();
</script>

<div class="flex flex-col gap-4" data-testid="deck-use-view">
  <SourceHeading {source} />

  <DeckView
    deck={source}
    {service}
    {sources}
    {history}
    {session}
    {revealArt}
    {...addToChat ? { addToChat } : {}}
    {...copyText ? { copyText } : {}}
  />
</div>

<style>
  @reference "../../../app.css";
</style>
