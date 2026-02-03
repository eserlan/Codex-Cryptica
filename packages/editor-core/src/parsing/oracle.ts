export interface OracleParseResult {
    chronicle: string;
    lore: string;
    wasSplit: boolean;
    method: 'markers' | 'heuristic' | 'none';
    title?: string;
    type?: string;
    image?: string;
    thumbnail?: string;
    connections?: (string | { target: string, label?: string })[];
    wikiLinks?: { target: string, type: string, strength: number, label?: string }[];
}

/**
 * Parses the raw response from the Oracle AI to separate
 * the short "Chronicle" summary from the detailed "Lore".
 *
 * Strategies:
 * 1. Explicit Markers: Looks for "## Chronicle" and "## Lore" (case-insensitive).
 * 2. Heuristic: If no markers, assumes the first paragraph is the Chronicle
 *    and the rest is Lore.
 */
export function parseOracleResponse(text: string): OracleParseResult {
    if (!text || !text.trim()) {
        return { chronicle: "", lore: "", wasSplit: false, method: 'none' };
    }

    // Attempt JSON parse first (for structured responses)
    try {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            // Find JSON in potential markdown-wrapped text
            const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                // If it's a single object matching our schema
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    if (data.title || data.content) {
                        return {
                            chronicle: data.chronicle || "",
                            lore: data.content || data.lore || "",
                            wasSplit: !!(data.chronicle && (data.content || data.lore)),
                            method: 'none', // JSON is direct
                            title: data.title,
                            type: normalizeType(data.type),
                            image: data.image || data.imageUrl || data.imageURL || data.frontmatter?.image,
                            thumbnail: data.thumbnail || data.thumb || data.frontmatter?.thumbnail,
                            connections: data.detectedLinks || data.connections || [],
                            wikiLinks: extractWikiLinks(data.content || data.lore || "")
                        };
                    }
                }
            }
        }
    } catch {
        // Fall back to text parsing
    }

    // Cache wiki links early to avoid redundant regex calls
    const wikiLinks = extractWikiLinks(text);

    // Strategy 1: Explicit Markers
    // Broaden regex to include markdown bold, headers, and simple "Label:" at start of line
    // We use a non-global regex but with 'i' and 'm' flags.
    const chronicleMarkerRegex = /^(?:#+\s*|\*\*|__)?Chronicle\b(?:\*\*|__|:|\s)*:?\s*/im;
    const loreMarkerRegex = /^(?:#+\s*|\*\*|__)?Lore\b(?:\*\*|__|:|\s)*:?\s*/im;
    const nameMarkerRegex = /^(?:#+\s*|\*\*|__)?(?:Name|Title)\b(?:\*\*|__|:|\s)*:?\s*/im;
    const typeMarkerRegex = /^(?:#+\s*|\*\*|__)?(?:Type|Category)\b(?:\*\*|__|:|\s)*:?\s*/im;
    const imageMarkerRegex = /^(?:#+\s*|\*\*|__)?(?:ImageURL|ImageUrl|Image)\b(?:\*\*|__|:|\s)*:?\s*/im;
    const thumbMarkerRegex = /^(?:#+\s*|\*\*|__)?(?:Thumbnail|Thumb)\b(?:\*\*|__|:|\s)*:?\s*/im;
    const connMarkerRegex = /^(?:#+\s*|\*\*|__)?(?:Connections|Related|Links)\b(?:\*\*|__|:|\s)*:?\s*/im;

    const hasChronicle = chronicleMarkerRegex.test(text);
    const hasLore = loreMarkerRegex.test(text);

    let extractedTitle: string | undefined;
    let extractedType: string | undefined;
    let extractedImage: string | undefined;
    let extractedThumbnail: string | undefined;
    let extractedConnections: (string | { target: string, label?: string })[] = [];

    if (hasChronicle || hasLore) {
        let chronicle = "";
        let lore = "";

        const lines = text.split('\n');
        let currentSection: 'chronicle' | 'lore' | 'preamble' | 'title' | 'type' = 'preamble';
        const chronicleBuffer: string[] = [];
        const loreBuffer: string[] = [];
        const preambleBuffer: string[] = [];

        for (const line of lines) {
            const cronMatch = line.match(chronicleMarkerRegex);
            const loreMatch = line.match(loreMarkerRegex);
            const nameMatch = line.match(nameMarkerRegex);
            const typeMatch = line.match(typeMarkerRegex);
            const imageMatch = line.match(imageMarkerRegex);
            const thumbMatch = line.match(thumbMarkerRegex);
            const connMatch = line.match(connMarkerRegex);

            if (nameMatch) {
                extractedTitle = line.substring(nameMatch[0].length).trim();
                continue;
            }
            if (typeMatch) {
                extractedType = line.substring(typeMatch[0].length).trim().toLowerCase();
                continue;
            }
            if (imageMatch) {
                extractedImage = line.substring(imageMatch[0].length).trim();
                continue;
            }
            if (thumbMatch) {
                extractedThumbnail = line.substring(thumbMatch[0].length).trim();
                continue;
            }
            if (connMatch) {
                const connStr = line.substring(connMatch[0].length).trim();
                // Handle comma-separated or simple list
                extractedConnections = connStr.split(',').map(s => s.trim()).filter(Boolean);
                continue;
            }
            if (cronMatch) {
                currentSection = 'chronicle';
                const content = line.substring(cronMatch[0].length).trim();
                if (content) chronicleBuffer.push(content);
                continue;
            }
            if (loreMatch) {
                currentSection = 'lore';
                const content = line.substring(loreMatch[0].length).trim();
                if (content) loreBuffer.push(content);
                continue;
            }

            if (currentSection === 'chronicle') {
                chronicleBuffer.push(line);
            } else if (currentSection === 'lore') {
                loreBuffer.push(line);
            } else {
                preambleBuffer.push(line);
            }
        }

        // Preamble handling:
        // If we have preamble and a lore section but no chronicle section, 
        // preamble is likely intended as the chronicle.
        if (preambleBuffer.length > 0 && loreBuffer.length > 0 && chronicleBuffer.length === 0) {
            chronicle = preambleBuffer.join('\n').trim();
        } else {
            chronicle = chronicleBuffer.join('\n').trim();
        }

        lore = loreBuffer.join('\n').trim();

        // If no explicit title found, try to use preamble if it's very short (1 line) 
        // OR if it's the chronicle's first line.
        if (!extractedTitle) {
            if (preambleBuffer.length === 1 && preambleBuffer[0].length < 100) {
                extractedTitle = preambleBuffer[0];
            } else if (chronicleBuffer.length > 0 && chronicleBuffer[0].length < 100) {
                // Often the first line of chronicle is the name
                // (But only if we didn't already use preamble as chronicle)
                // For now let's be conservative.
            }
        }

        // If lore is still empty but we have preamble/chronicle, 
        // and the text was very long, maybe we missed a split? 
        // (Actually the logic above handles explicit headers).

        // If we only found ONE marker and the other is empty, we still "split"
        // so the user sees the smart apply button.
        const wasSplit = (chronicle !== "" && lore !== "") || (hasChronicle || hasLore);

        return {
            chronicle,
            lore,
            wasSplit,
            method: 'markers',
            title: extractedTitle,
            type: normalizeType(extractedType),
            image: extractedImage,
            thumbnail: extractedThumbnail,
            connections: extractedConnections,
            wikiLinks
        };
    }

    // Strategy 2: Heuristic (Paragraph split)
    // Fallback to single newline split if double newline doesn't exist but text is long
    let parts = text.split(/\n\s*\n/);
    if (parts.length === 1 && text.length > 300) {
        // Try splitting by the first sentence or first line if it looks like a headline/summary
        const lines = text.split('\n');
        if (lines.length > 1) {
            const firstLine = lines[0];
            // If the first line is very long, it's not a title but likely just the start of a paragraph
            if (firstLine.length > 150) {
                const sentenceEnd = firstLine.indexOf('. ');
                if (sentenceEnd !== -1 && sentenceEnd < 150) {
                    // Split at the first sentence if it's short enough
                    parts = [
                        firstLine.substring(0, sentenceEnd + 1),
                        firstLine.substring(sentenceEnd + 2) + '\n' + lines.slice(1).join('\n')
                    ];
                } else {
                    // Truncate at 150 chars but keep original text in lore
                    parts = [firstLine.substring(0, 150) + '...', text];
                }
            } else {
                parts = [firstLine, lines.slice(1).join('\n')];
            }
        }
    }

    if (parts.length > 1) {
        const chronicle = parts[0].trim();
        const lore = parts.slice(1).join('\n\n').trim();

        // Guess title from first line if it's very short
        if (chronicle.length < 50 && !chronicle.includes('.')) {
            extractedTitle = chronicle;
        }

        return {
            chronicle,
            lore,
            wasSplit: true,
            method: 'heuristic',
            title: extractedTitle,
            type: guessType(text),
            wikiLinks
        };
    }
    // Fallback: Everything is Lore (safer than everything being Chronicle)
    return {
        chronicle: "",
        lore: text.trim(),
        wasSplit: false,
        method: 'none',
        type: guessType(text),
        wikiLinks
    };
}

function normalizeType(raw?: string): string | undefined {
    if (!raw) return undefined;
    const t = raw.toLowerCase();
    if (t.includes('person') || t.includes('npc') || t.includes('character')) return 'character';
    if (t.includes('place') || t.includes('location') || t.includes('settlement')) return 'location';
    if (t.includes('faction') || t.includes('guild') || t.includes('group') || t.includes('organization')) return 'faction';
    if (t.includes('item') || t.includes('artifact') || t.includes('weapon') || t.includes('object')) return 'item';
    if (t.includes('event') || t.includes('history') || t.includes('war')) return 'event';
    if (t.includes('creature') || t.includes('monster') || t.includes('beast')) return 'creature';
    if (t.includes('note') || t.includes('lore')) return 'note';
    return undefined;
}

function guessType(text: string): string | undefined {
    const t = text.toLowerCase();
    // Simple keyword based guessing
    if (t.includes(' faction ') || t.includes(' guild ') || t.includes(' organization ')) return 'faction';
    if (t.includes(' citizen ') || t.includes(' ruler ') || t.includes(' warrior ')) return 'character';
    if (t.includes(' located ') || t.includes(' mountain ') || t.includes(' city ')) return 'location';
    if (t.includes(' artifact ') || t.includes(' forged ') || t.includes(' relic ')) return 'item';
    return undefined;
}

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function extractWikiLinks(content: string): { target: string, type: string, strength: number, label?: string }[] {
    const matches = content.matchAll(WIKI_LINK_REGEX);
    const connections: { target: string, type: string, strength: number, label?: string }[] = [];

    for (const match of matches) {
        const target = match[1].trim();
        const label = match[2]?.trim();
        const targetId = target.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

        connections.push({
            target: targetId,
            type: "related_to",
            strength: 1.0,
            label: label || target,
        });
    }
    return connections;
}
