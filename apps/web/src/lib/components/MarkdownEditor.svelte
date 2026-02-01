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
                    class: "prose max-w-none focus:outline-none min-h-[100px] font-sans text-lg leading-relaxed text-theme-text",
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
        background: var(--color-theme-bg);
        color: var(--color-theme-text);
        border: 1px solid var(--color-theme-border);
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
        border: 1px solid var(--color-theme-border);
        padding: 8px 12px;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;
    }

    :global(.ProseMirror th) {
        font-weight: 700;
        text-align: left;
        background-color: color-mix(
            in srgb,
            var(--color-theme-primary),
            transparent 80%
        );
        color: var(--color-theme-primary);
        border-color: var(--color-theme-border);
    }

    :global(.ProseMirror h1),
    :global(.ProseMirror h2),
    :global(.ProseMirror h3) {
        color: var(--color-theme-primary);
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
        background: color-mix(
            in srgb,
            var(--color-theme-primary),
            transparent 90%
        );
        pointer-events: none;
    }

    :global(.ProseMirror p.is-editor-empty:first-child::before) {
        color: var(--color-theme-muted);
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
    }
</style>
