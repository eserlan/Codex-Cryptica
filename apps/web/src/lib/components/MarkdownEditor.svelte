<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import { Markdown } from "tiptap-markdown";
    import Link from "@tiptap/extension-link";
    import { BubbleMenu } from "@tiptap/extension-bubble-menu";

    import { Table } from "@tiptap/extension-table";
    import { TableRow } from "@tiptap/extension-table-row";
    import { TableCell } from "@tiptap/extension-table-cell";
    import { TableHeader } from "@tiptap/extension-table-header";
    import { EmbedExtension } from "./editor/EmbedExtension";
    
    import EditorToolbar from "./editor/EditorToolbar.svelte";
    import EditorBubbleMenu from "./editor/EditorBubbleMenu.svelte";
    
    import { mount, unmount } from "svelte";

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
    let editor = $state<Editor | null>(null);
    let bubbleMenuComponent: ReturnType<typeof mount> | undefined; 
    let isZenMode = $state(false);

    const toggleZenMode = () => {
        isZenMode = !isZenMode;
    };

    onMount(() => {
        const menuDom = document.createElement('div');
        
        editor = new Editor({
            element: element,
            extensions: [
                StarterKit,
                Markdown.configure({
                    html: true,
                    transformPastedText: false,
                    transformCopiedText: true,
                }),
                Table.configure({ resizable: true }),
                TableRow, TableHeader, TableCell,
                EmbedExtension,
                Link.configure({ openOnClick: false, autolink: true }),
                BubbleMenu.configure({
                    element: menuDom,
                    pluginKey: 'bubbleMenu',
                }),
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
                if (onUpdate) onUpdate(markdown);
            },
        });

        try {
             bubbleMenuComponent = mount(EditorBubbleMenu, {
                target: menuDom,
                props: { editor }
             });
        } catch (e) {
            console.error("Failed to mount Bubble Menu", e);
        }
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
            editor.commands.setContent(content);
        }
    });

    $effect(() => {
        if (editor && editor.isEditable !== editable) {
            editor.setEditable(editable);
        }
    });

    onDestroy(() => {
        if (bubbleMenuComponent) {
            try {
                unmount(bubbleMenuComponent);
            } catch (e) {
                console.warn(
                    "Failed to unmount bubble menu",
                    { error: e, component: bubbleMenuComponent }
                );
            }
        }
        if (editor) {
            editor.destroy();
        }
    });
</script>

<div class="markdown-editor-container flex flex-col relative w-full h-full" class:zen-mode={isZenMode}>
    <!-- Fixed Toolbar at the top -->
    {#if editable && editor}
        <EditorToolbar {editor} {isZenMode} onToggleZenMode={toggleZenMode} />
    {/if}

    <div
        bind:this={element}
        class="tiptap-editor-wrapper flex-1"
        class:readonly={!editable}
    ></div>
</div>

<style>
    .markdown-editor-container {
        /* Default state */
        transition: all 0.2s ease-in-out;
    }

    /* Zen Mode State - applied via class toggle in EditorToolbar logic */
    :global(.markdown-editor-container.zen-mode) {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 50;
        background-color: var(--color-theme-bg);
        padding: 2rem;
    }
    
    :global(.markdown-editor-container.zen-mode .tiptap-editor-wrapper) {
        max-width: 800px;
        margin: 0 auto;
        height: 100%;
        border: none;
        background: transparent;
    }

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
        height: 100%;
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