<script lang="ts">
  import SourceWorkspace from "$lib/components/random/SourceWorkspace.svelte";
  import TableEditor from "$lib/components/random/TableEditor.svelte";
</script>

<svelte:head>
  <title>Codex Cryptica | Random Tables</title>
</svelte:head>

<SourceWorkspace
  kind="table"
  heading="Random Tables"
  icon="icon-[lucide--list-tree]"
  emptyBody="Tables live in your vault as plain files. Make one, add a few entries, and roll it."
  allowImport
>
  {#snippet editor({ source, diagnostics, onChange, onRename })}
    <TableEditor {source} {diagnostics} {onChange} {onRename} />
  {/snippet}
</SourceWorkspace>
