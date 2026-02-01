<script lang="ts">
    import { categories } from "$lib/stores/categories.svelte";
    import { sanitizeId } from "$lib/utils/markdown";
    import { getIconClass } from "$lib/utils/icon";
    import { fade, scale } from "svelte/transition";

    let newLabel = $state("");
    let newColor = $state("#60a5fa");
    let newIcon = $state("icon-[lucide--circle]");
    let errorMessage = $state("");

    // Icon Picker State
    let isPickerOpen = $state(false);
    let activeTargetId = $state<string | "new" | null>(null);

    const selectableIcons = [
        "icon-[lucide--user]",
        "icon-[lucide--users]",
        "icon-[lucide--map-pin]",
        "icon-[lucide--map]",
        "icon-[lucide--mountain]",
        "icon-[lucide--castle]",
        "icon-[lucide--landmark]",
        "icon-[lucide--swords]",
        "icon-[lucide--shield]",
        "icon-[lucide--scroll]",
        "icon-[lucide--book]",
        "icon-[lucide--book-open]",
        "icon-[lucide--gem]",
        "icon-[lucide--coins]",
        "icon-[lucide--package]",
        "icon-[lucide--flask-conical]",
        "icon-[lucide--skull]",
        "icon-[lucide--ghost]",
        "icon-[lucide--flame]",
        "icon-[lucide--zap]",
        "icon-[lucide--star]",
        "icon-[lucide--heart]",
        "icon-[lucide--paw-print]",
        "icon-[lucide--bug]",
        "icon-[lucide--leaf]",
        "icon-[lucide--eye]",
        "icon-[lucide--brain]",
        "icon-[lucide--key]",
        "icon-[lucide--lock]",
        "icon-[lucide--clock]",
        "icon-[lucide--calendar]",
        "icon-[lucide--compass]",
        "icon-[lucide--anchor]",
        "icon-[lucide--flag]",
        "icon-[lucide--briefcase]",
        "icon-[lucide--hammer]",
    ];

    const openPicker = (targetId: string | "new") => {
        activeTargetId = targetId;
        isPickerOpen = true;
    };

    const selectIcon = (icon: string) => {
        if (activeTargetId === "new") {
            newIcon = icon;
        } else if (activeTargetId) {
            categories.updateCategory(activeTargetId, { icon });
        }
        isPickerOpen = false;
        activeTargetId = null;
    };

    const handleAdd = () => {
        errorMessage = "";
        if (!newLabel.trim()) return;
        const id = sanitizeId(newLabel);
        if (categories.getCategory(id)) {
            errorMessage = "Category already exists";
            return;
        }
        categories.addCategory({
            id,
            label: newLabel.trim(),
            color: newColor,
            icon: newIcon,
        });
        newLabel = "";
        newIcon = "icon-[lucide--circle]";
    };

    const handleLabelUpdate = (id: string, value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            // Revert to current value by forcing a re-render
            const cat = categories.getCategory(id);
            if (cat) {
                categories.updateCategory(id, { label: cat.label });
            }
            return;
        }
        categories.updateCategory(id, { label: trimmed });
    };
</script>

<div class="space-y-6">
    <!-- Category List -->
    <div class="space-y-1">
        {#each categories.list as cat (cat.id)}
            <div
                class="flex items-center gap-3 p-1.5 rounded-md hover:bg-theme-primary/5 transition-colors group"
                data-testid="category-row-{cat.id}"
            >
                <!-- Color -->
                <input
                    type="color"
                    value={cat.color}
                    oninput={(e) =>
                        categories.updateCategory(cat.id, {
                            color: e.currentTarget.value,
                        })}
                    class="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer rounded-full overflow-hidden shrink-0"
                />

                <!-- Label -->
                <input
                    type="text"
                    value={cat.label}
                    onchange={(e) =>
                        handleLabelUpdate(cat.id, e.currentTarget.value)}
                    class="flex-1 bg-transparent border-0 text-sm font-medium text-theme-text focus:text-theme-primary focus:outline-none transition-colors py-0.5 px-0"
                />

                <!-- Icon Trigger -->
                <button
                    onclick={() => openPicker(cat.id)}
                    class="w-8 h-8 flex items-center justify-center bg-theme-bg/30 border border-theme-border rounded hover:border-theme-primary transition-all text-theme-primary"
                    title="Change Icon"
                >
                    <span class="{getIconClass(cat.icon)} w-4 h-4"></span>
                </button>

                <!-- Delete -->
                <button
                    onclick={() => {
                        if (
                            confirm(
                                `Delete category "${cat.label}"? Entities using this category will fallback to default style.`,
                            )
                        ) {
                            categories.removeCategory(cat.id);
                        }
                    }}
                    class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all p-1"
                    aria-label="Delete category {cat.label}"
                    title="Delete Category"
                >
                    <span class="icon-[lucide--trash-2] w-4 h-4"></span>
                </button>
            </div>
        {/each}
    </div>

    <!-- Create Section -->
    <div
        class="bg-theme-primary/5 p-4 rounded-lg border border-theme-primary/20"
    >
        <div class="flex items-center gap-3">
            <input
                type="color"
                bind:value={newColor}
                class="w-6 h-6 bg-transparent border border-theme-primary/30 p-0.5 cursor-pointer rounded-full shrink-0"
            />
            <input
                type="text"
                bind:value={newLabel}
                placeholder="New category..."
                class="flex-1 bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-sm text-theme-text focus:outline-none focus:border-theme-primary placeholder-theme-muted"
                onkeydown={(e) => e.key === "Enter" && handleAdd()}
                onfocus={() => (errorMessage = "")}
            />
            <button
                onclick={() => openPicker("new")}
                class="w-9 h-9 flex items-center justify-center bg-theme-surface border border-theme-border rounded hover:border-theme-primary transition-all text-theme-primary shrink-0"
                title="Select Icon"
            >
                <span class="{getIconClass(newIcon)} w-5 h-5"></span>
            </button>
            <button
                onclick={handleAdd}
                disabled={!newLabel.trim()}
                class="px-3 py-1.5 bg-theme-primary hover:bg-theme-secondary text-theme-bg font-bold rounded text-xs tracking-widest disabled:opacity-30 transition-all shrink-0"
            >
                ADD
            </button>
        </div>
        {#if errorMessage}
            <div class="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                <span class="icon-[lucide--alert-circle] w-3 h-3"></span>
                {errorMessage}
            </div>
        {/if}
    </div>

    <!-- Reset Section -->
    <div class="pt-4 border-t border-theme-border">
        <button
            onclick={() => categories.resetToDefaults()}
            class="w-full py-2 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-theme-bg rounded text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2"
        >
            <span class="icon-[lucide--refresh-cw] w-3 h-3"></span>
            RESET TO DEFAULTS
        </button>
    </div>
</div>

{#if isPickerOpen}
    <!-- Sub-modal for Icon Selection -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
        onclick={() => (isPickerOpen = false)}
        transition:fade={{ duration: 150 }}
    >
        <div
            class="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-sm p-6"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ start: 0.95, duration: 200 }}
        >
            <div class="flex justify-between items-center mb-4">
                <h5
                    class="text-[10px] font-bold text-theme-primary uppercase tracking-widest"
                >
                    Glyph Library
                </h5>
                <button
                    onclick={() => (isPickerOpen = false)}
                    class="text-gray-500 hover:text-white">✕</button
                >
            </div>

            <div
                class="grid grid-cols-6 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"
            >
                {#each selectableIcons as icon}
                    <button
                        onclick={() => selectIcon(icon)}
                        class="aspect-square flex items-center justify-center rounded border border-theme-border hover:border-theme-primary/50 hover:bg-theme-primary/10 text-theme-muted hover:text-theme-primary transition-all"
                        title={icon}
                    >
                        <span class="{getIconClass(icon)} w-5 h-5"></span>
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--color-accent-primary);
        border-radius: 2px;
    }
</style>
