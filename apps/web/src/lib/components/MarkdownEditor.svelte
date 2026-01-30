<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import { Markdown } from "tiptap-markdown";

    import { Table } from "@tiptap/extension-table";
    import { TableRow } from "@tiptap/extension-table-row";
    import { TableCell } from "@tiptap/extension-table-cell";
    import { TableHeader } from "@tiptap/extension-table-header";
    import { EmbedExtension } from "./editor/EmbedExtension";

    let {
        content = "",
        editable = true,
        onUpdate,
    }: {
        content: string;
        editable?: boolean;
        onUpdate?: (markdown: string) => void;
    } = $props();

    let element: HTMLDivElement;
    let editor: Editor | null = null;

    onMount(() => {
        editor = new Editor({
            element: element,
            extensions: [
                StarterKit,
                Markdown.configure({
                    html: true, // Allow HTML fallback for complex nodes (like tables without headers)
                    transformPastedText: false,
                    transformCopiedText: true,
                }),
                Table.configure({
                    resizable: true,
                }),
                TableRow,
                TableHeader,
                TableCell,
                EmbedExtension,
            ],
            editorProps: {
                attributes: {
                    class: "prose prose-invert max-w-none focus:outline-none min-h-[100px] font-sans text-lg leading-relaxed text-gray-200",
                },
            },
            content: content,
            editable: editable,
            onUpdate: ({ editor }) => {
                const markdown = (editor.storage as any).markdown.getMarkdown();
                if (onUpdate) {
                    onUpdate(markdown);
                }
            },
        });
    });

    export function insertEmbed(src: string) {
        editor?.commands.insertContent({
            type: "embedWidget",
            attrs: { src },
        });
    }

    $effect(() => {
        if (
            editor &&
            content !== undefined &&
            (editor.storage as any).markdown.getMarkdown() !== content
        ) {
            // Only update if content has changed to avoid loop
            editor.commands.setContent(content);
        }
    });

    $effect(() => {
        if (editor && editor.isEditable !== editable) {
            editor.setEditable(editable);
        }
    });

    onDestroy(() => {
        if (editor) {
            editor.destroy();
        }
    });
</script>

<div
    bind:this={element}
    class="tiptap-editor-wrapper"
    class:readonly={!editable}
></div>

<style>
    .tiptap-editor-wrapper {
        min-height: 200px;
        background: #0a0a0a;
        color: #d1d5db;
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: 4px;
        padding: 1rem;
        overflow-y: auto;
    }

    .tiptap-editor-wrapper.readonly {
        border-color: transparent;
        background: transparent;
        padding: 0;
    }

    :global(.ProseMirror) {
        outline: none;
    }

    :global(.ProseMirror table) {
        border-collapse: collapse;
        margin: 1rem 0;
        overflow: hidden;
        width: 100%;
    }

    :global(.ProseMirror td),
    :global(.ProseMirror th) {
        min-width: 1em;
        border: 1px solid #374151; /* gray-700 */
        padding: 8px 12px;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;
    }

    :global(.ProseMirror th) {
        font-weight: 700;
        text-align: left;
        background-color: rgba(21, 128, 61, 0.2); /* green-700/20 */
        color: #4ade80; /* green-400 */
        border-color: #166534; /* green-800 */
    }

    :global(.ProseMirror h1),
    :global(.ProseMirror h2),
    :global(.ProseMirror h3) {
        color: #4ade80; /* green-400 */
        font-weight: 700;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
    }

    :global(.ProseMirror h1) {
        font-size: 1.5em;
    }
    :global(.ProseMirror h2) {
        font-size: 1.25em;
    }
    :global(.ProseMirror h3) {
        font-size: 1.1em;
    }

    :global(.ProseMirror .selectedCell:after) {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        background: rgba(74, 222, 128, 0.1); /* green-400/10 */
        pointer-events: none;
    }

    :global(.ProseMirror p.is-editor-empty:first-child::before) {
        color: #6b7280;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
    }
</style>
