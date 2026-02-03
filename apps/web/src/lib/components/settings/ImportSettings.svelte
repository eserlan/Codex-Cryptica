<script lang="ts">
    import { oracle } from "$lib/stores/oracle.svelte";
    import { vault } from "$lib/stores/vault.svelte";
    import { uiStore } from "$lib/stores/ui.svelte";
    import ImportDropzone from "$lib/features/importer/ImportDropzone.svelte";
    import ReviewList from "$lib/features/importer/ReviewList.svelte";
    import {
        TextParser,
        DocxParser,
        JsonParser,
        OracleAnalyzer,
    } from "@codex/importer";
    import type { DiscoveredEntity } from "@codex/importer";
    import { sanitizeId } from "$lib/utils/markdown";

    let step = $state<"upload" | "processing" | "review" | "complete">(
        "upload",
    );

    $effect(() => {
        uiStore.isImporting = step === "processing" || step === "review";
        
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (step === "processing") {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            uiStore.isImporting = false;
        };
    });

    let statusMessage = $state("");
    let discoveredEntities = $state<DiscoveredEntity[]>([]);
    let extractedAssets = new Map<string, any>(); // filename -> asset

    const parsers = [
        new TextParser(),
        new DocxParser(),
        new JsonParser(),
        // new PdfParser()
    ];

    const handleFiles = async (files: File[]) => {
        if (!oracle.apiKey && !import.meta.env.VITE_SHARED_GEMINI_KEY) {
            alert("Oracle API Key required for intelligent import.");
            return;
        }

        step = "processing";
        const analyzer = new OracleAnalyzer(
            oracle.apiKey || import.meta.env.VITE_SHARED_GEMINI_KEY,
        );

        discoveredEntities = [];
        extractedAssets.clear();

        const signal = uiStore.abortSignal;

        for (const file of files) {
            if (signal.aborted) break;

            const parser = parsers.find((p) => p.accepts(file));
            if (!parser) {
                console.error(`No parser for ${file.name}`);
                continue;
            }

            try {
                statusMessage = `Parsing ${file.name}...`;
                const result = await parser.parse(file);
                
                // Store assets for dimension lookups later
                result.assets.forEach(asset => {
                    extractedAssets.set(asset.placementRef, asset);
                });

                if (signal.aborted) break;

                statusMessage = `Analyzing ${file.name} with Oracle...`;
                const analysis = await analyzer.analyze(result.text, {
                    onProgress: (current, total) => {
                        statusMessage = `Analyzing ${file.name} with Oracle (Chunk ${current}/${total})...`;
                    }
                });

                if (signal.aborted) break;

                discoveredEntities = [
                    ...discoveredEntities,
                    ...analysis.entities,
                ];
            } catch (err: any) {
                console.error(`Failed to process ${file.name}:`, err);
            }
        }

        if (signal.aborted) {
            step = "upload";
            discoveredEntities = [];
            return;
        }

        step = "review";
    };

    const handleSave = async (toSave: DiscoveredEntity[]) => {
        step = "processing";
        statusMessage = `Finalizing ${toSave.length} entities...`;

        const signal = uiStore.abortSignal;

        const mapType = (type: string) => {
            const t = type.toLowerCase();
            if (t === "character") return "character";
            if (["location", "item", "event", "faction", "note"].includes(t))
                return t;
            return "note";
        };

        const batchData: Parameters<typeof vault.batchCreateEntities>[0] = [];
        
        for (const entity of toSave) {
            if (signal.aborted) break;

            const title = entity.suggestedTitle;
            const entityId = sanitizeId(title);
            const type = mapType(entity.suggestedType) as any;
            
            // Check for image metadata in extracted assets
            const imgRef = entity.frontmatter.image;
            let width = entity.frontmatter.width;
            let height = entity.frontmatter.height;
            let imagePath = entity.frontmatter.image;
            let thumbnailPath = entity.frontmatter.thumbnail;

            if (imgRef && extractedAssets.has(imgRef)) {
                const asset = extractedAssets.get(imgRef);
                width = width || asset.width;
                height = height || asset.height;

                try {
                    const saved = await vault.saveImportedAsset(asset.blob, entityId, asset.originalName);
                    imagePath = saved.image;
                    thumbnailPath = saved.thumbnail;
                } catch (err) {
                    console.error("Failed to save imported asset:", err);
                }
            }

            batchData.push({
                type,
                title,
                initialData: {
                    content: entity.chronicle || entity.content,
                    lore: entity.lore,
                    labels: entity.frontmatter.labels || [],
                    metadata: {
                        width: typeof width === 'number' ? width : undefined,
                        height: typeof height === 'number' ? height : undefined,
                    },
                    image: imagePath,
                    thumbnail: thumbnailPath,
                    connections: (entity.detectedLinks || []).map((link) => {
                        const targetName = typeof link === 'string' ? link : link.target;
                        const label = typeof link === 'string' ? link : (link.label || link.target);
                        return {
                            target: sanitizeId(targetName),
                            label: label,
                            type: "related_to",
                            strength: 1,
                        };
                    }),
                }
            });
        }

        if (signal.aborted) {
            step = "review";
            return;
        }

        try {
            await vault.batchCreateEntities(batchData);
            step = "complete";
        } catch (err) {
            console.error("Batch import failed:", err);
            alert("Failed to save imported entities. Check console for details.");
            step = "review";
            return;
        }

        setTimeout(() => {
            step = "upload";
            discoveredEntities = [];
        }, 3000);
    };
</script>

<div class="space-y-4">
    <h3 class="text-xs font-bold text-theme-primary uppercase tracking-widest">
        Archive Ingestion
    </h3>
    <p class="text-[13px] text-theme-text/70 leading-relaxed">
        Import existing documents, lore bibles, or JSON data. The Oracle will
        automatically fragment monolithic files into distinct entities and
        extract embedded art.
    </p>

    {#if !oracle.isEnabled}
        <div
            class="p-4 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-3"
        >
            <span
                class="icon-[lucide--alert-triangle] w-5 h-5 text-red-400 shrink-0 mt-0.5"
            ></span>
            <div class="flex flex-col gap-1">
                <span
                    class="text-xs font-bold text-red-400 uppercase tracking-wider"
                    >Oracle Connection Required</span
                >
                <p class="text-[11px] text-red-400/80 leading-tight">
                    Intelligent ingestion requires an active Gemini API key.
                    Please configure your access in the
                    <button
                        class="underline hover:text-red-300"
                        onclick={() =>
                            (uiStore.activeSettingsTab = "intelligence")}
                        >Intelligence</button
                    > tab.
                </p>
            </div>
        </div>
    {/if}

    <div
        class="bg-theme-surface border border-theme-border p-4 rounded-lg min-h-[200px] flex flex-col justify-center"
    >
        {#if step === "upload"}
            <ImportDropzone onFileSelect={handleFiles} />
        {:else if step === "processing"}
            <div class="flex flex-col items-center gap-4 py-8">
                <div
                    class="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"
                ></div>
                <p
                    class="text-xs font-mono text-theme-primary uppercase animate-pulse"
                >
                    {statusMessage}
                </p>
            </div>
        {:else if step === "review"}
            <ReviewList
                entities={discoveredEntities}
                onSave={handleSave}
                onCancel={() => (step = "upload")}
            />
        {:else if step === "complete"}
            <div
                class="flex flex-col items-center gap-2 py-8 text-theme-primary"
            >
                <span class="icon-[lucide--check-circle] w-12 h-12"></span>
                <p class="text-xs font-bold uppercase tracking-widest">
                    Import Successful
                </p>
                <p class="text-[11px] text-theme-muted uppercase font-mono">
                    Archive updated
                </p>
            </div>
        {/if}
    </div>
</div>
