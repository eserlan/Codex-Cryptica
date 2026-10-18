<script lang="ts">
  import { type Editor } from "@tiptap/core";

  /** Row/column/table controls, shown while the caret is inside a table. */
  let { editor }: { editor: Editor } = $props();
</script>

<div class="flex gap-0.5">
  <button
    type="button"
    onclick={() => editor.chain().focus().addRowBefore().run()}
    class="toolbar-btn"
    title="Add Row Above"
    aria-label="Add Row Above"
  >
    <span class="icon-[lucide--arrow-up-to-line] w-4 h-4" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().addRowAfter().run()}
    class="toolbar-btn"
    title="Add Row Below"
    aria-label="Add Row Below"
  >
    <span class="icon-[lucide--arrow-down-to-line] w-4 h-4" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().deleteRow().run()}
    class="toolbar-btn"
    title="Delete Row"
    aria-label="Delete Row"
  >
    <span class="icon-[lucide--rows-3] w-4 h-4" aria-hidden="true"></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().addColumnBefore().run()}
    class="toolbar-btn"
    title="Add Column Left"
    aria-label="Add Column Left"
  >
    <span class="icon-[lucide--arrow-left-to-line] w-4 h-4" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().addColumnAfter().run()}
    class="toolbar-btn"
    title="Add Column Right"
    aria-label="Add Column Right"
  >
    <span class="icon-[lucide--arrow-right-to-line] w-4 h-4" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().deleteColumn().run()}
    class="toolbar-btn"
    title="Delete Column"
    aria-label="Delete Column"
  >
    <span class="icon-[lucide--columns-3] w-4 h-4" aria-hidden="true"></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleHeaderRow().run()}
    class="toolbar-btn"
    title="Toggle Header Row"
    aria-label="Toggle Header Row"
  >
    <span class="icon-[lucide--table-properties] w-4 h-4" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().deleteTable().run()}
    class="toolbar-btn"
    title="Delete Table"
    aria-label="Delete Table"
  >
    <span class="icon-[lucide--trash-2] w-4 h-4" aria-hidden="true"></span>
  </button>
</div>
