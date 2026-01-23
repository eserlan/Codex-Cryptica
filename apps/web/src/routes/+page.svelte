<script lang="ts">
    import { onMount } from "svelte";
    import { nodes, addNode } from "../store/graph-store";

    let worker: Worker | null = null;
    let mounted = true;
    let editorContent = "";

    onMount(() => {
        // Initialize worker
        worker = new Worker(new URL("../workers/sync.ts", import.meta.url), {
            type: "module",
        });

        worker.onmessage = (event) => {
            if (!mounted) return;
            console.log("Worker message:", event.data);
            if (event.data.type === "UPDATE_GRAPH") {
                // Update nodes in the graph
                event.data.nodes.forEach(addNode);
            }
        };

        return () => {
            mounted = false;
            worker?.terminate();
        };
    });

    const handleEditorChange = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        editorContent = target.value;
        worker?.postMessage({ type: "PARSE_CONTENT", content: editorContent });
    };
</script>

<main class="flex min-h-screen flex-col items-center justify-between p-24">
    <div
        class="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex"
    >
        <h1 class="text-4xl font-bold">Codex Arcana (Svelte)</h1>
    </div>

    <div class="grid grid-cols-2 gap-4 w-full h-[600px] mt-8">
        <div class="border p-4 bg-white shadow-sm rounded-lg">
            <h2 class="text-xl font-semibold mb-4">Editor</h2>
            <textarea
                class="w-full h-[500px] text-black p-4 border rounded"
                on:input={handleEditorChange}
                placeholder="Type [[Link]] here..."
            ></textarea>
        </div>
        <div class="border p-4 bg-gray-50 shadow-sm rounded-lg">
            <h2 class="text-xl font-semibold mb-4">
                Graph ({$nodes.length} nodes)
            </h2>
            <div id="cy" class="w-full h-[500px] bg-white border rounded"></div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        background-color: #f9fafb;
    }
</style>
