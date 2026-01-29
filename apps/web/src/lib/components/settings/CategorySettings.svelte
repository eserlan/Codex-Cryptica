<script lang="ts">
    import { categories } from "$lib/stores/categories.svelte";
    import { sanitizeId } from "$lib/utils/markdown";
    import { fade, scale } from "svelte/transition";

    let newLabel = $state("");
    let newColor = $state("#60a5fa");
    let newIcon = $state("icon-[lucide--circle]");

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
        if (!newLabel.trim()) return;
        const id = sanitizeId(newLabel);
        if (categories.getCategory(id)) {
            alert("Category already exists");
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

    const getIconClass = (iconStr: string | undefined) => {
        if (!iconStr) return "icon-[lucide--circle]";
        const parts = iconStr.split(":");
        if (parts.length === 2) return `icon-[${parts[0]}--${parts[1]}]`;
        return iconStr.startsWith("icon-") ? iconStr : `icon-[lucide--circle]`;
    };
</script>

<div class="space-y-6">
    <!-- Category List -->
    <div class="space-y-1">
        {#each categories.list as cat (cat.id)}
            <div
                class="flex items-center gap-3 p-1.5 rounded-md hover:bg-white/5 transition-colors group"
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
                        categories.updateCategory(cat.id, {
                            label: e.currentTarget.value,
                        })}
                    class="flex-1 bg-transparent border-0 text-sm font-medium text-gray-200 focus:text-purple-400 focus:outline-none transition-colors py-0.5 px-0"
                />

                <!-- Icon Trigger -->
                <button
                    onclick={() => openPicker(cat.id)}
                    class="w-8 h-8 flex items-center justify-center bg-black/40 border border-purple-900/20 rounded hover:border-purple-500/50 transition-all text-purple-400"
                    title="Change Icon"
                >
                    <span class="{getIconClass(cat.icon)} w-4 h-4"></span>
                </button>

                <!-- Delete -->
                <button
                    onclick={() => categories.removeCategory(cat.id)}
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
    <div class="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20">
        <div class="flex items-center gap-3">
            <input
                type="color"
                bind:value={newColor}
                class="w-6 h-6 bg-transparent border border-purple-500/30 p-0.5 cursor-pointer rounded-full shrink-0"
            />
            <input
                type="text"
                bind:value={newLabel}
                placeholder="New category..."
                class="flex-1 bg-black/50 border border-purple-900/30 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500 placeholder-purple-900/40"
                onkeydown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
                onclick={() => openPicker("new")}
                class="w-9 h-9 flex items-center justify-center bg-black/50 border border-purple-900/30 rounded hover:border-purple-500/50 transition-all text-purple-400 shrink-0"
                title="Select Icon"
            >
                <span class="{getIconClass(newIcon)} w-5 h-5"></span>
            </button>
            <button
                onclick={handleAdd}
                disabled={!newLabel.trim()}
                class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded text-[10px] tracking-widest disabled:opacity-30 transition-all shrink-0"
            >
                ADD
            </button>
        </div>
    </div>

    <!-- Reset Section -->
    <div class="pt-4 border-t border-purple-900/20">
        <button
            onclick={() => categories.resetToDefaults()}
            class="w-full py-2 bg-purple-900/10 border border-purple-900/30 text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 rounded text-[10px] font-bold tracking-widest transition-all flex items-center justify-center gap-2"
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
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
        onclick={() => (isPickerOpen = false)}
        transition:fade={{ duration: 150 }}
    >
        <div
            class="bg-[#0c0c0c] border border-purple-500/30 rounded-xl shadow-2xl w-full max-w-sm p-6"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ start: 0.95, duration: 200 }}
        >
            <div class="flex justify-between items-center mb-4">
                <h5
                    class="text-[10px] font-bold text-purple-400 uppercase tracking-widest"
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
                        class="aspect-square flex items-center justify-center rounded border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-all"
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
        background: #7e22ce;
        border-radius: 2px;
    }
</style>
