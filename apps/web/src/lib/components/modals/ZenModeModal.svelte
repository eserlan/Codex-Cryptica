<script lang="ts">
    import { uiStore } from "$lib/stores/ui.svelte";
    import { vault } from "$lib/stores/vault.svelte";
    import { fly, fade } from "svelte/transition";
    import { getIconClass } from "$lib/utils/icon";
    import { categories } from "$lib/stores/categories.svelte";
    import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
    import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
    import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
    import type { Entity } from "schema";
    import { marked } from "marked";
    import DOMPurify from "isomorphic-dompurify";

    let entityId = $derived(uiStore.zenModeEntityId);
    let entity = $derived(entityId ? vault.entities[entityId] : null);

    let isEditing = $state(false);
    let activeTab = $state<"overview" | "inventory">("overview");
    let showLightbox = $state(false);
    let scrollContainer = $state<HTMLDivElement>();

    // Edit State
    let editTitle = $state("");
    let editContent = $state("");
    let editLore = $state("");
    let editImage = $state("");
    let editDate = $state<Entity["date"]>();
    let editStartDate = $state<Entity["start_date"]>();
    let editEndDate = $state<Entity["end_date"]>();

    let resolvedImageUrl = $state("");
    let isCopied = $state(false);

    $effect(() => {
        if (entity?.image) {
            vault
                .resolveImagePath(entity.image)
                .then((url) => (resolvedImageUrl = url));
        } else {
            resolvedImageUrl = "";
        }
    });

    const handleCopy = async () => {
        if (!entity) return;

        try {
            // Pre-process WikiLinks: convert [[Link]] or [[Link|Label]] to <strong>Label</strong> for rich text
            const processedContent = (entity.content || "").replace(
                /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
                (_, target, label) => `<strong>${label || target}</strong>`,
            );
            const processedLore = (entity.lore || "").replace(
                /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
                (_, target, label) => `<strong>${label || target}</strong>`,
            );

            // Render Markdown
            const chronicleHtml = DOMPurify.sanitize(
                await marked.parse(processedContent),
            );
            const loreHtml = processedLore
                ? DOMPurify.sanitize(await marked.parse(processedLore))
                : "";

            let imageHtml = "";
            let imageBlob: Blob | null = null;

            if (resolvedImageUrl) {
                try {
                    const response = await fetch(resolvedImageUrl);
                    const originalBlob = await response.blob();

                    const img = new Image();
                    img.src = URL.createObjectURL(originalBlob);
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });

                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0);

                    // Get PNG as Blob for direct clipboard inclusion
                    imageBlob = await new Promise<Blob | null>((resolve) =>
                        canvas.toBlob(resolve, "image/png"),
                    );

                    // Use a placeholder src in HTML; browsers/Doc editors will resolve it
                    // from the image/png blob in the same ClipboardItem
                    imageHtml = `<img src="entity-image.png" alt="${entity.title}" style="max-width: 100%;" /><br/>`;

                    URL.revokeObjectURL(img.src);
                } catch (e) {
                    console.warn("Could not process image for copy", e);
                }
            }

            // Construct HTML Document
            const html = `
                <html>
                <body>
                    <h1 style="font-family: serif;">${entity.title}</h1>
                    ${imageHtml}
                    <h2 style="font-family: serif; color: #166534;">Chronicle</h2>
                    <div style="font-family: sans-serif; line-height: 1.6;">${chronicleHtml}</div>
                    ${
                        loreHtml
                            ? `<h2 style="font-family: serif; color: #92400e;">Deep Lore</h2>
                               <div style="font-family: sans-serif; line-height: 1.6; font-style: italic;">${loreHtml}</div>`
                            : ""
                    }
                </body>
                </html>
            `;

            // Construct Plain Text (convert WikiLinks to simple text)
            let text = `${entity.title}\n\n`;
            text += `CHRONICLE:\n${(entity.content || "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)}\n\n`;
            if (entity.lore) {
                text += `DEEP LORE:\n${entity.lore.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)}\n`;
            }

            const clipboardData: Record<string, Blob> = {
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([text], { type: "text/plain" }),
            };

            if (imageBlob) {
                clipboardData["image/png"] = imageBlob;
            }

            const data = [new ClipboardItem(clipboardData)];

            await navigator.clipboard.write(data);
            isCopied = true;
            setTimeout(() => (isCopied = false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
            // Fallback to plain text
            try {
                await navigator.clipboard.writeText(
                    `${entity.title}\n\n${(entity.content || "").replace(/[[ (.*?) ]]/g, "$1")}`,
                );
                isCopied = true;
                setTimeout(() => (isCopied = false), 2000);
            } catch (innerErr) {
                console.error("Total copy failure", innerErr);
            }
        }
    };

    const startEditing = () => {
        if (!entity) return;
        editTitle = entity.title;
        editContent = entity.content || "";
        editLore = entity.lore || "";
        editImage = entity.image || "";
        editDate = entity.date;
        editStartDate = entity.start_date;
        editEndDate = entity.end_date;
        isEditing = true;
    };

    const cancelEditing = () => {
        isEditing = false;
    };

    const saveChanges = async () => {
        if (!entity) return;
        try {
            await vault.updateEntity(entity.id, {
                title: editTitle,
                content: editContent,
                lore: editLore,
                image: editImage,
                date: editDate,
                start_date: editStartDate,
                end_date: editEndDate,
                type: entity.type,
            });
            isEditing = false;
        } catch (err) {
            console.error("Failed to save changes", err);
        }
    };

    const handleDelete = async () => {
        if (!entity) return;
        if (
            confirm(
                `Are you sure you want to permanently delete "${entity.title}"? This cannot be undone.`,
            )
        ) {
            try {
                await vault.deleteEntity(entity.id);
                isEditing = false;
                handleClose();
            } catch (err: any) {
                console.error("Failed to delete entity", err);
                alert(`Error: ${err.message}`);
            }
        }
    };

    const handleClose = () => {
        if (isEditing) {
            if (!confirm("Discard unsaved changes?")) return;
        }
        uiStore.closeZenMode();
        isEditing = false;
    };

    const navigateTo = (id: string) => {
        if (isEditing) {
            if (!confirm("Discard unsaved changes to navigate?")) return;
            isEditing = false;
        }
        uiStore.zenModeEntityId = id;
    };

    const getTemporalLabel = (type: string, field: "start" | "end") => {
        const t = (type || "").toLowerCase();
        if (field === "start") {
            if (
                ["npc", "creature", "character", "monster"].some((x) =>
                    t.includes(x),
                )
            )
                return "Born";
            if (
                ["faction", "location", "city", "organization", "guild"].some(
                    (x) => t.includes(x),
                )
            )
                return "Founded";
            if (
                ["item", "artifact", "object", "weapon"].some((x) =>
                    t.includes(x),
                )
            )
                return "Created";
            return "Started";
        }
        if (field === "end") {
            if (
                ["npc", "creature", "character", "monster"].some((x) =>
                    t.includes(x),
                )
            )
                return "Died";
            if (
                ["faction", "location", "city", "organization", "guild"].some(
                    (x) => t.includes(x),
                )
            )
                return "Dissolved";
            if (
                ["item", "artifact", "object", "weapon"].some((x) =>
                    t.includes(x),
                )
            )
                return "Destroyed";
            return "Ended";
        }
        return "Date";
    };

    const formatDate = (date: any) => {
        if (!date || date.year === undefined) return "";
        if (date.label) return date.label;
        let str = `${date.year}`;
        if (date.month !== undefined) str += `/${date.month}`;
        if (date.day !== undefined) str += `/${date.day}`;
        return str;
    };

    let allConnections = $derived.by(() => {
        if (!entity) return [];
        const outbound = entity.connections.map((c) => ({
            id: c.target,
            label: c.label || c.type,
            title: vault.entities[c.target]?.title || c.target,
            isOutbound: true,
        }));
        const inbound = (vault.inboundConnections[entity.id] || []).map(
            (item) => ({
                id: item.sourceId,
                label: item.connection.label || item.connection.type,
                title: vault.entities[item.sourceId]?.title || item.sourceId,
                isOutbound: false,
            }),
        );
        return [...outbound, ...inbound];
    });
</script>

<svelte:window
    onkeydown={(e) => {
        if (!uiStore.showZenMode || showLightbox) return;

        // Don't intercept if focus is in an input, textarea, or other interactive elements
        if (
            document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "TEXTAREA" ||
            document.activeElement?.closest('[role="combobox"]')
        )
            return;

        if (e.key === "Escape") {
            handleClose();
        } else if (!isEditing && scrollContainer) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                scrollContainer.scrollBy({ top: 150, behavior: "auto" });
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                scrollContainer.scrollBy({ top: -150, behavior: "auto" });
            }
        }
    }}
/>

{#if uiStore.showZenMode && entity}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md"
        transition:fade={{ duration: 200 }}
        onclick={handleClose}
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entity-modal-title"
            tabindex="-1"
            class="w-full max-w-6xl h-[90vh] bg-theme-bg border border-theme-border shadow-2xl flex flex-col overflow-hidden relative"
            style:border-radius="var(--theme-border-radius)"
            style:border-width="var(--theme-border-width)"
            style:box-shadow="var(--theme-glow)"
            transition:fly={{ y: 20, duration: 300 }}
            onclick={(e) => e.stopPropagation()}
        >
            <!-- Decorative Corners -->
            <div
                class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-theme-primary/30 rounded-tl-lg pointer-events-none"
            ></div>
            <div
                class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-theme-primary/30 rounded-tr-lg pointer-events-none"
            ></div>
            <div
                class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-theme-primary/30 rounded-bl-lg pointer-events-none"
            ></div>
            <div
                class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-theme-primary/30 rounded-br-lg pointer-events-none"
            ></div>

            <!-- Header -->
            <header
                class="px-6 py-4 border-b border-theme-border bg-theme-surface flex justify-between items-start shrink-0"
            >
                <div class="flex-1 mr-8">
                    <div class="flex items-center gap-3 mb-1">
                        <span
                            class="{getIconClass(
                                categories.getCategory(entity.type)?.icon,
                            )} text-theme-primary w-5 h-5"
                        ></span>
                        <span
                            class="text-[10px] font-bold tracking-widest text-theme-primary uppercase"
                            >{entity.type}</span
                        >
                    </div>
                    {#if isEditing}
                        <input
                            type="text"
                            bind:value={editTitle}
                            class="bg-theme-bg border border-theme-primary text-theme-text px-3 py-1 focus:outline-none focus:border-theme-primary font-serif font-bold text-3xl w-full placeholder-theme-muted rounded"
                            placeholder="Entity Title"
                        />
                    {:else}
                        <h1
                            id="entity-modal-title"
                            data-testid="entity-title"
                            class="text-3xl md:text-4xl font-serif font-bold text-theme-text tracking-wide"
                        >
                            {entity.title}
                        </h1>
                    {/if}
                </div>

                <div class="flex items-center gap-3">
                    {#if !isEditing}
                        <button
                            onclick={handleCopy}
                            class="px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-xs font-bold tracking-widest"
                            title="Copy Content"
                        >
                            {#if isCopied}
                                <span
                                    class="icon-[lucide--check] w-4 h-4 text-theme-primary"
                                ></span>
                            {:else}
                                <span class="icon-[lucide--copy] w-4 h-4"
                                ></span>
                            {/if}
                        </button>
                    {/if}

                    {#if !isEditing && !vault.isGuest}
                        <button
                            onclick={startEditing}
                            class="px-4 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
                        >
                            <span class="icon-[lucide--edit-2] w-3 h-3"></span>
                            EDIT
                        </button>
                    {:else if isEditing}
                        <button
                            onclick={cancelEditing}
                            class="px-4 py-1.5 text-theme-muted hover:text-theme-text text-xs font-bold rounded tracking-widest transition"
                        >
                            CANCEL
                        </button>
                        <button
                            onclick={saveChanges}
                            class="px-4 py-1.5 bg-theme-primary hover:bg-theme-secondary text-theme-bg text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
                        >
                            <span class="icon-[lucide--save] w-3 h-3"></span>
                            SAVE
                        </button>
                    {/if}

                    <div class="w-px h-6 bg-theme-border mx-1"></div>

                    <button
                        onclick={handleClose}
                        class="text-theme-muted hover:text-theme-primary transition p-2 hover:bg-theme-primary/10 rounded"
                        aria-label="Close"
                    >
                        <span class="icon-[lucide--x] w-6 h-6"></span>
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <div
                class="flex gap-8 px-8 border-b border-theme-border bg-theme-surface shrink-0"
            >
                <button
                    class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 {activeTab ===
                    'overview'
                        ? 'text-theme-primary border-theme-primary'
                        : 'text-theme-muted border-transparent hover:text-theme-text'}"
                    onclick={() => (activeTab = "overview")}
                >
                    OVERVIEW
                </button>
                <button
                    class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 {activeTab ===
                    'inventory'
                        ? 'text-theme-primary border-theme-primary'
                        : 'text-theme-muted border-transparent hover:text-theme-text'}"
                    onclick={() => (activeTab = "inventory")}
                >
                    INVENTORY
                </button>
            </div>

            <!-- Main Body -->
            <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                {#if activeTab === "overview"}
                    <!-- Left Sidebar (Image & Meta) -->
                    <div
                        class="w-full md:w-80 lg:w-96 border-r border-theme-border p-6 overflow-y-auto custom-scrollbar bg-theme-surface"
                    >
                        <!-- Labels -->
                        {#if entity.labels && entity.labels.length > 0}
                            <div class="flex flex-wrap gap-1.5 mb-6">
                                {#each entity.labels as label}
                                    <LabelBadge {label} />
                                {/each}
                            </div>
                        {/if}

                        <!-- Image -->
                        <div class="mb-6">
                            {#if isEditing}
                                <div class="mb-4">
                                    <label
                                        class="block text-[10px] text-theme-secondary font-bold mb-1"
                                        for="zen-entity-image-url"
                                        >IMAGE URL</label
                                    >
                                    <input
                                        id="zen-entity-image-url"
                                        type="text"
                                        bind:value={editImage}
                                        class="bg-theme-bg border border-theme-border text-theme-text px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary w-full placeholder-theme-muted rounded"
                                        placeholder="https://..."
                                    />
                                </div>
                            {:else if entity.image}
                                <button
                                    onclick={() => (showLightbox = true)}
                                    class="w-full rounded-lg border border-theme-border overflow-hidden relative group cursor-pointer hover:border-theme-primary transition block shadow-lg bg-theme-bg/50"
                                >
                                    <img
                                        src={resolvedImageUrl}
                                        alt={entity.title}
                                        class="w-full h-auto max-h-[500px] object-contain opacity-90 group-hover:opacity-100 transition mx-auto"
                                    />
                                    <div
                                        class="absolute bottom-2 right-2 bg-theme-bg/70 text-theme-primary text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                                    >
                                        Zoom
                                    </div>
                                </button>
                            {:else}
                                <div
                                    class="w-full aspect-square rounded-lg border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 text-theme-muted bg-theme-primary/5"
                                >
                                    <span
                                        class="icon-[lucide--image] w-12 h-12 opacity-50"
                                    ></span>
                                    <span
                                        class="text-[10px] font-bold uppercase"
                                        >No Image</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <!-- Connections List -->
                        <div class="space-y-4">
                            <h3
                                class="text-xs font-bold text-theme-secondary uppercase tracking-widest border-b border-theme-border pb-2"
                            >
                                Connections
                            </h3>
                            {#if allConnections.length > 0}
                                <div class="space-y-2">
                                    {#each allConnections as conn}
                                        <button
                                            onclick={() => navigateTo(conn.id)}
                                            class="w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-theme-border hover:bg-theme-primary/10 transition text-left group"
                                        >
                                            <span
                                                class="w-1.5 h-1.5 rounded-full {conn.isOutbound
                                                    ? 'bg-theme-primary'
                                                    : 'bg-blue-500'}"
                                            ></span>
                                            <div class="flex-1 min-w-0">
                                                <div
                                                    class="text-[11px] text-theme-muted uppercase font-mono"
                                                >
                                                    {conn.label}
                                                </div>
                                                <div
                                                    class="text-sm font-bold text-theme-text group-hover:text-theme-primary truncate transition"
                                                >
                                                    {conn.title}
                                                </div>
                                            </div>
                                            <span
                                                class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:text-theme-primary opacity-0 group-hover:opacity-100 transition"
                                            ></span>
                                        </button>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-xs text-theme-muted italic">
                                    No known connections.
                                </p>
                            {/if}
                        </div>

                        {#if isEditing && !vault.isGuest}
                            <div class="mt-8 pt-8 border-t border-theme-border">
                                <button
                                    onclick={handleDelete}
                                    class="w-full border border-red-900/30 text-red-800 hover:text-red-500 hover:border-red-600 hover:bg-red-950/30 text-xs font-bold px-4 py-2 rounded tracking-widest transition flex items-center justify-center gap-2"
                                >
                                    <span class="icon-[lucide--trash-2] w-3 h-3"
                                    ></span>
                                    DELETE ENTITY
                                </button>
                            </div>
                        {/if}
                    </div>

                    <!-- Right Content (Temporal & Chronicle & Lore) -->
                    <div
                        bind:this={scrollContainer}
                        class="flex-1 p-8 overflow-y-auto custom-scrollbar bg-theme-bg"
                    >
                        <div class="max-w-3xl mx-auto space-y-12">
                            <!-- Temporal Data -->
                            {#if isEditing}
                                <div
                                    class="bg-theme-surface p-4 rounded border border-theme-border"
                                >
                                    <h3
                                        class="text-xs font-bold text-theme-secondary uppercase tracking-widest mb-4"
                                    >
                                        Timeline Configuration
                                    </h3>
                                    <div
                                        class="grid grid-cols-1 lg:grid-cols-2 gap-6"
                                    >
                                        <TemporalEditor
                                            bind:value={editStartDate}
                                            label={getTemporalLabel(
                                                entity.type,
                                                "start",
                                            )}
                                        />
                                        <TemporalEditor
                                            bind:value={editEndDate}
                                            label={getTemporalLabel(
                                                entity.type,
                                                "end",
                                            )}
                                        />
                                    </div>
                                </div>
                            {:else if entity.start_date || entity.end_date}
                                <div
                                    class="flex flex-wrap gap-8 p-4 bg-theme-primary/5 border border-theme-border rounded"
                                >
                                    {#if entity.start_date}
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] text-theme-secondary font-bold tracking-widest mb-1 uppercase"
                                                >{getTemporalLabel(
                                                    entity.type,
                                                    "start",
                                                )}</span
                                            >
                                            <span
                                                class="text-lg font-mono text-theme-primary"
                                                >{formatDate(
                                                    entity.start_date,
                                                )}</span
                                            >
                                        </div>
                                    {/if}
                                    {#if entity.end_date}
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] text-theme-secondary font-bold tracking-widest mb-1 uppercase"
                                                >{getTemporalLabel(
                                                    entity.type,
                                                    "end",
                                                )}</span
                                            >
                                            <span
                                                class="text-lg font-mono text-theme-primary"
                                                >{formatDate(
                                                    entity.end_date,
                                                )}</span
                                            >
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- Chronicle -->
                            <div>
                                <h2
                                    class="text-xl font-serif font-bold text-theme-primary mb-4 flex items-center gap-2 border-b border-theme-border pb-2"
                                >
                                    <span
                                        class="icon-[lucide--book-open] w-5 h-5"
                                    ></span>
                                    Chronicle
                                </h2>
                                {#if isEditing}
                                    <MarkdownEditor
                                        content={editContent}
                                        editable={true}
                                        onUpdate={(md) => (editContent = md)}
                                    />
                                {:else}
                                    <div class="prose-container">
                                        <MarkdownEditor
                                            content={entity.content ||
                                                "No records found."}
                                            editable={false}
                                        />
                                    </div>
                                {/if}
                            </div>

                            <!-- Deep Lore -->
                            <div>
                                <h2
                                    class="text-xl font-serif font-bold text-theme-accent mb-4 flex items-center gap-2 border-b border-theme-border pb-2"
                                >
                                    <span class="icon-[lucide--scroll] w-5 h-5"
                                    ></span>
                                    Deep Lore & Secrets
                                </h2>
                                {#if isEditing}
                                    <MarkdownEditor
                                        content={editLore}
                                        editable={true}
                                        onUpdate={(md) => (editLore = md)}
                                    />
                                {:else}
                                    <div
                                        class="bg-theme-accent/5 border border-theme-border p-6 rounded-lg min-h-[100px] prose-container"
                                    >
                                        <MarkdownEditor
                                            content={entity.lore ||
                                                "No deep lore recorded."}
                                            editable={false}
                                        />
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {:else if activeTab === "inventory"}
                    <div
                        class="flex-1 p-8 flex items-center justify-center text-theme-muted font-mono text-sm italic"
                    >
                        Inventory system initialization pending...
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- Lightbox -->
    {#if showLightbox && entity.image}
        <button
            class="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
            onclick={() => (showLightbox = false)}
            transition:fade={{ duration: 200 }}
        >
            <img
                src={resolvedImageUrl}
                alt={entity.title}
                class="max-w-full max-h-full object-contain shadow-2xl rounded"
            />
        </button>
    {/if}
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: #000;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #15803d33;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #15803d66;
    }
</style>
