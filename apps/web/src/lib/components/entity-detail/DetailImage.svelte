<script lang="ts">
    import type { Entity } from "schema";
    import { vault } from "$lib/stores/vault.svelte";
    import { oracle } from "$lib/stores/oracle.svelte";
    import { fade } from "svelte/transition";

    let { entity, isEditing, editImage = $bindable() } = $props<{
        entity: Entity;
        isEditing: boolean;
        editImage: string;
    }>();

    let resolvedImageUrl = $state("");
    let showLightbox = $state(false);
    let isDraggingOver = $state(false);

    $effect(() => {
        const imagePath = entity?.image;
        let stale = false;

        if (imagePath) {
            vault.resolveImageUrl(imagePath).then((url) => {
                if (!stale && entity?.image === imagePath) {
                    resolvedImageUrl = url;
                }
            });
        } else {
            resolvedImageUrl = "";
        }

        return () => {
            stale = true;
        };
    });

    const handleDragOver = (e: DragEvent) => {
        if (vault.isGuest) return;
        e.preventDefault();
        if (
            e.dataTransfer?.types.includes("application/codex-image-id") ||
            e.dataTransfer?.types.includes("Files")
        ) {
            isDraggingOver = true;
            e.dataTransfer.dropEffect = "copy";
        }
    };

    const handleDragLeave = () => {
        if (vault.isGuest) return;
        isDraggingOver = false;
    };

    const handleDrop = async (e: DragEvent) => {
        if (vault.isGuest) return;
        e.preventDefault();
        isDraggingOver = false;

        if (!entity) return;

        const messageId = e.dataTransfer?.getData("application/codex-image-id");
        if (messageId) {
            const message = oracle.messages.find((m) => m.id === messageId);
            if (message?.imageBlob) {
                try {
                    await vault.saveImageToVault(message.imageBlob, entity.id);
                } catch (err) {
                    console.error("Failed to save dropped image", err);
                    alert("Failed to archive dropped image.");
                }
            }
        } else if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
                try {
                    await vault.saveImageToVault(file, entity.id);
                } catch (err) {
                    console.error("Failed to save dropped external file", err);
                    alert("Failed to save external image.");
                }
            }
        }
    };
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape") {
            if (showLightbox) showLightbox = false;
        }
    }}
/>

<div
    class="relative {isDraggingOver
        ? 'ring-2 ring-purple-500 ring-offset-4 ring-offset-black bg-purple-500/10'
        : ''} transition-all rounded-lg"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="region"
    aria-label="Image drop zone"
>
    {#if isEditing}
        <div class="mb-4 px-4 md:px-6">
            <label
                class="block text-[10px] text-theme-secondary font-bold mb-1"
                for="entity-image-url">IMAGE URL</label
            >
            <input
                id="entity-image-url"
                type="text"
                bind:value={editImage}
                class="bg-theme-bg border border-theme-border text-theme-text px-2 py-1 text-xs focus:outline-none focus:border-theme-primary w-full placeholder-theme-muted/50"
                placeholder="https://..."
            />
        </div>
    {:else if entity.image}
        <div class="px-4 md:px-6">
            <button
                onclick={() => (showLightbox = true)}
                class="mb-4 w-full rounded border border-theme-border overflow-hidden relative group cursor-pointer hover:border-theme-primary transition block shadow-inner bg-theme-bg/30"
            >
                <img
                    src={resolvedImageUrl}
                    alt={entity.title}
                    class="w-full h-auto max-h-48 md:max-h-80 object-contain opacity-90 group-hover:opacity-100 transition mx-auto"
                />
                <div
                    class="absolute bottom-2 right-2 bg-theme-surface text-theme-primary text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                >
                    Click to enlarge
                </div>
            </button>
        </div>
    {:else}
        <div class="px-4 md:px-6">
            <div
                class="mb-4 w-full h-24 md:h-32 rounded border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 text-theme-muted hover:border-theme-primary transition"
            >
                <span
                    class="icon-[lucide--image] w-6 h-6 md:w-8 md:h-8 opacity-20"
                ></span>
                <span class="text-[9px] font-bold uppercase opacity-40"
                    >No Image</span
                >
            </div>
        </div>
    {/if}

    {#if isDraggingOver}
        <div
            class="absolute inset-0 bg-purple-600/20 backdrop-blur-sm flex items-center justify-center rounded-lg pointer-events-none"
            transition:fade
        >
            <div class="flex flex-col items-center gap-2">
                <span
                    class="icon-[lucide--download-cloud] w-8 h-8 text-purple-400 animate-bounce"
                ></span>
                <span class="text-[10px] font-bold text-purple-300 tracking-widest"
                    >DROP TO ARCHIVE</span
                >
            </div>
        </div>
    {/if}
</div>

{#if showLightbox && entity.image}
    <button
        class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out"
        onclick={() => (showLightbox = false)}
        transition:fade={{ duration: 200 }}
    >
        <img
            src={resolvedImageUrl}
            alt={entity.title}
            crossorigin="anonymous"
            class="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300"
        />
    </button>
{/if}
