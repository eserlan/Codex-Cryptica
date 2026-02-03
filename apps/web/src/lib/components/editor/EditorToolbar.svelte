<script lang="ts">
    import { type Editor } from "@tiptap/core";
    import { onMount, onDestroy } from "svelte";

    let { editor, isZenMode, onToggleZenMode } = $props<{ 
        editor: Editor | null,
        isZenMode: boolean,
        onToggleZenMode: () => void 
    }>();

    // Use a reactive trigger to force re-evaluation when the editor state changes
    let updateTrigger = $state(0);

    // Derived states for active formatting
    let isBold = $derived.by(() => {
        void updateTrigger; // Subscribe
        return editor?.isActive("bold") ?? false;
    });
    let isItalic = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("italic") ?? false;
    });
    let isStrike = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("strike") ?? false;
    });
    let isCode = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("code") ?? false;
    });
    let isH1 = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("heading", { level: 1 }) ?? false;
    });
    let isH2 = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("heading", { level: 2 }) ?? false;
    });
    let isH3 = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("heading", { level: 3 }) ?? false;
    });
    let isBulletList = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("bulletList") ?? false;
    });
    let isOrderedList = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("orderedList") ?? false;
    });
    let isBlockquote = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("blockquote") ?? false;
    });
    let isLink = $derived.by(() => {
        void updateTrigger;
        return editor?.isActive("link") ?? false;
    });

    const toggleZenMode = () => {
        onToggleZenMode();
    };

    const setLink = () => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const handleKeydown = (e: KeyboardEvent) => {
        // Toggle Zen Mode on Escape if active, but do not block other handlers/defaults
        if (e.key === "Escape" && isZenMode && !e.defaultPrevented) {
            e.preventDefault();
            toggleZenMode();
        }
        // Toggle Zen Mode on Cmd+Shift+F
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
            e.preventDefault();
            toggleZenMode();
        }
    };

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
        
        // Listen for editor selection changes to update the trigger
        // This is less frequent than 'transaction' and prevents input lag while typing
        editor?.on("selectionUpdate", () => {
            updateTrigger++;
        });
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
        editor?.off("selectionUpdate");
    });
</script>

{#if editor}
    <div class="editor-toolbar flex flex-wrap gap-1 p-2 bg-[#0a0a0a] border-b border-green-900/30 sticky top-0 z-40">
        <!-- Basic Formatting -->
        <div class="flex gap-0.5">
            <button
                onclick={() => editor.chain().focus().toggleBold().run()}
                class="toolbar-btn {isBold ? 'active' : ''}"
                title="Bold (Cmd+B)"
            >
                <span class="icon-[lucide--bold] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleItalic().run()}
                class="toolbar-btn {isItalic ? 'active' : ''}"
                title="Italic (Cmd+I)"
            >
                <span class="icon-[lucide--italic] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleStrike().run()}
                class="toolbar-btn {isStrike ? 'active' : ''}"
                title="Strike"
            >
                <span class="icon-[lucide--strikethrough] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleCode().run()}
                class="toolbar-btn {isCode ? 'active' : ''}"
                title="Code (Cmd+E)"
            >
                <span class="icon-[lucide--code] w-4 h-4"></span>
            </button>
        </div>

        <div class="w-px bg-green-900/30 mx-1"></div>

        <!-- Headings -->
        <div class="flex gap-0.5">
            <button
                onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                class="toolbar-btn {isH1 ? 'active' : ''}"
                title="Heading 1"
            >
                <span class="icon-[lucide--heading-1] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                class="toolbar-btn {isH2 ? 'active' : ''}"
                title="Heading 2"
            >
                <span class="icon-[lucide--heading-2] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                class="toolbar-btn {isH3 ? 'active' : ''}"
                title="Heading 3"
            >
                <span class="icon-[lucide--heading-3] w-4 h-4"></span>
            </button>
        </div>

        <div class="w-px bg-green-900/30 mx-1"></div>

        <!-- Lists & Structure -->
        <div class="flex gap-0.5">
            <button
                onclick={() => editor.chain().focus().toggleBulletList().run()}
                class="toolbar-btn {isBulletList ? 'active' : ''}"
                title="Bullet List"
            >
                <span class="icon-[lucide--list] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleOrderedList().run()}
                class="toolbar-btn {isOrderedList ? 'active' : ''}"
                title="Ordered List"
            >
                <span class="icon-[lucide--list-ordered] w-4 h-4"></span>
            </button>
            <button
                onclick={() => editor.chain().focus().toggleBlockquote().run()}
                class="toolbar-btn {isBlockquote ? 'active' : ''}"
                title="Blockquote"
            >
                <span class="icon-[lucide--quote] w-4 h-4"></span>
            </button>
        </div>

        <div class="w-px bg-green-900/30 mx-1"></div>

        <!-- Insertions -->
        <div class="flex gap-0.5">
            <button
                onclick={setLink}
                class="toolbar-btn {isLink ? 'active' : ''}"
                title="Link"
            >
                <span class="icon-[lucide--link] w-4 h-4"></span>
            </button>
        </div>

        <div class="flex-1"></div>

        <!-- Utility -->
        <div class="flex gap-1">
            {#if isZenMode}
                <button
                    onclick={toggleZenMode}
                    class="px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-500/50 transition-all uppercase tracking-widest bg-red-900/10 rounded"
                    title="Exit Zen Mode (Esc)"
                >
                    <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
                    Close Zen Mode
                </button>
                <div class="w-px bg-green-900/30 mx-1"></div>
            {/if}

            <button
                onclick={toggleZenMode}
                class="toolbar-btn {isZenMode ? 'active' : ''}"
                title={isZenMode ? "Exit Zen Mode (Esc)" : "Zen Mode (Cmd+Shift+F)"}
            >
                {#if isZenMode}
                    <span class="icon-[lucide--minimize] w-4 h-4"></span>
                {:else}
                    <span class="icon-[lucide--maximize] w-4 h-4"></span>
                {/if}
            </button>
        </div>
    </div>
{/if}

<style>
    .toolbar-btn {
        padding: 0.375rem; /* p-1.5 */
        border-radius: 0.25rem; /* rounded */
        color: rgba(21, 128, 61, 0.7); /* text-green-700/70 */
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .toolbar-btn:hover {
        color: #4ade80; /* hover:text-green-400 */
        background-color: rgba(20, 83, 45, 0.2); /* hover:bg-green-900/20 */
    }
    
    .toolbar-btn.active {
        color: #4ade80; /* text-green-400 */
        background-color: rgba(20, 83, 45, 0.4); /* bg-green-900/40 */
    }
</style>