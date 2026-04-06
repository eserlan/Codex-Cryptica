<script lang="ts">
    import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";

    let content = "# Initial Content";
    let output = "";
    let editorComponent: any;

    const handleUpdate = (markdown: string) => {
        output = markdown;
    };

    const insertEmbed = () => {
        if (editorComponent && editorComponent.insertEmbed) {
            editorComponent.insertEmbed("https://example.com/demo-content");
        }
    };
</script>

<div class="test-container p-4">
    <h1 class="text-xl mb-4">Markdown Editor Test Harness</h1>

    <div class="mb-8" data-testid="editor-container">
        <MarkdownEditor
            {content}
            onUpdate={handleUpdate}
            bind:this={editorComponent}
        />
    </div>

    <button
        data-testid="insert-embed-btn"
        class="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onclick={insertEmbed}
    >
        Insert Embed
    </button>

    <div class="output-section">
        <h2 class="text-lg">Output:</h2>
        <pre
            data-testid="markdown-output"
            class="bg-gray-900 p-4 text-white whitespace-pre-wrap">{output}</pre>
    </div>
</div>
