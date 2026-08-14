<script lang="ts">
  import SourceWorkspace from "$lib/components/random/SourceWorkspace.svelte";
  import CardEditor from "$lib/components/random/CardEditor.svelte";
</script>

<svelte:head>
  <title>Codex Cryptica | Card Decks</title>
</svelte:head>

<SourceWorkspace
  kind="deck"
  heading="Card Decks"
  icon="icon-[lucide--layers]"
  emptyBody="Decks live in your vault as plain files, and their discard pile travels with them. Make one, add a few cards, and draw."
>
  {#snippet editor({ source, diagnostics, onChange, onRename })}
    <CardEditor {source} {diagnostics} {onChange} {onRename} />
  {/snippet}
</SourceWorkspace>
