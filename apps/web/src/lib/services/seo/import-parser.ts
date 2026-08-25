import {
  parseWaExport,
  type ParsedAsset,
  type ParsedEntity,
  type ParsedRelationship,
} from "./wa-parser";
import {
  convertThreadWeaverJsonToCif,
  parseKankaExportZip,
  parseScabardExport,
} from "@codex/importer";

const KNOWN_ENTITY_TYPES: ParsedEntity["type"][] = [
  "character",
  "creature",
  "location",
  "item",
  "event",
  "faction",
  "quest",
  "species",
  "note",
];

function toKnownType(value: string | undefined): ParsedEntity["type"] {
  const lower = (value ?? "").toLowerCase();
  return (KNOWN_ENTITY_TYPES as string[]).includes(lower)
    ? (lower as ParsedEntity["type"])
    : "note";
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// Parses Obsidian vault files (.md)
export async function parseObsidianFiles(
  files: File[],
): Promise<ParsedEntity[]> {
  const mdFiles = files.filter((f) => f.name.endsWith(".md"));
  if (mdFiles.length === 0) {
    throw new Error(
      "No Markdown (.md) files found. Please select or drop markdown files.",
    );
  }

  const parsed: ParsedEntity[] = [];
  for (const file of mdFiles) {
    const text = await file.text();
    let title = file.name.replace(/\.md$/, "");
    let content = text;
    let type: ParsedEntity["type"] = "note";
    const labels = ["obsidian-import"];

    // Simple Frontmatter Extraction
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      content = text.slice(fmMatch[0].length).trim();
      const lines = fmMatch[1].split("\n");
      for (const line of lines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line
            .slice(colonIdx + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "");
          if (key === "title") title = val;
          if (key === "type") {
            const cleanType = val.toLowerCase();
            if (
              [
                "character",
                "creature",
                "location",
                "item",
                "event",
                "faction",
                "note",
              ].includes(cleanType)
            ) {
              type = cleanType as ParsedEntity["type"];
            }
          }
          if (key === "tags" || key === "labels") {
            const tags = val
              .replaceAll("[", "")
              .replaceAll("]", "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            labels.push(...tags);
          }
        }
      }
    }

    parsed.push({ type, title, content, labels });
  }
  return parsed;
}

// Parses JSON formats client-side
export async function parseJsonExport(
  file: File,
  slug: string,
): Promise<ParsedEntity[]> {
  if (slug === "kanka-json") {
    const pkg = await parseKankaExportZip(file);
    const titlesByRef = new Map(
      pkg.entityDrafts.map((draft) => [
        `kanka:${draft.sourceType ?? "note"}:${draft.sourceId}`,
        draft.title,
      ]),
    );
    const relationshipsByRef = new Map<string, ParsedRelationship[]>();
    for (const relationship of pkg.relationshipDrafts) {
      const targetTitle = titlesByRef.get(relationship.toRef);
      if (!targetTitle) continue;
      const relationships = relationshipsByRef.get(relationship.fromRef) ?? [];
      relationships.push({
        title: targetTitle,
        type: relationship.type,
        ...(relationship.label ? { label: relationship.label } : {}),
      });
      relationshipsByRef.set(relationship.fromRef, relationships);
    }

    const assetsByRef = new Map<string, ParsedAsset[]>();
    for (const asset of pkg.assetDrafts) {
      if (!asset.bytes) continue;
      const bytes =
        asset.bytes instanceof Blob
          ? new Uint8Array(await asset.bytes.arrayBuffer())
          : asset.bytes;
      const dataUrl = bytesToDataUrl(bytes, asset.mimeType);
      const assets = assetsByRef.get(asset.placementRef) ?? [];
      assets.push({
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        dataUrl,
      });
      assetsByRef.set(asset.placementRef, assets);
    }

    const parsed = pkg.entityDrafts.map((draft) => {
      const discoverySource = `kanka:${draft.sourceType ?? "note"}:${draft.sourceId}`;
      const relationships = relationshipsByRef.get(discoverySource);
      const references = relationships?.map(
        (relationship) => relationship.title,
      );
      const parentReference = draft.parentRef
        ? titlesByRef.get(draft.parentRef)
        : undefined;
      const assets = assetsByRef.get(discoverySource);
      return {
        type: toKnownType(draft.sourceType),
        title: draft.title,
        content: draft.content || draft.lore || "",
        labels: draft.labels ?? [],
        discoverySource,
        metadata: draft.metadata,
        ...(references && references.length > 0
          ? { references: [...new Set(references)] }
          : {}),
        ...(relationships && relationships.length > 0 ? { relationships } : {}),
        ...(parentReference ? { parentReference } : {}),
        ...(assets && assets.length > 0 ? { assets } : {}),
      };
    });
    if (parsed.length === 0) {
      throw new Error("No importable entries found in the Kanka export ZIP.");
    }
    return parsed;
  }

  const text = await file.text();
  const data = JSON.parse(text);
  const parsed: ParsedEntity[] = [];

  if (slug === "world-anvil-export") {
    parsed.push(...parseWaExport(data));
  } else if (slug === "legendkeeper-json") {
    // LegendKeeper JSON schema
    const pages =
      data.pages ||
      data.documents ||
      (Array.isArray(data) ? data : Object.values(data));
    for (const item of pages) {
      if (!item || typeof item !== "object") continue;
      const title = item.name || item.title || "Untitled Page";
      const rawContent = item.content || item.blocks || "";
      const body =
        typeof rawContent === "string"
          ? rawContent
          : JSON.stringify(rawContent);

      parsed.push({
        type: "note",
        title,
        content: body,
        labels: ["legendkeeper-import"],
      });
    }
  } else if (slug === "thread-weaver") {
    const cif = convertThreadWeaverJsonToCif(data);
    for (const e of cif.entities) {
      parsed.push({
        type: toKnownType(e.kind),
        title: e.title,
        content: e.content?.body ?? e.summary ?? "",
        labels: e.labels ?? [],
      });
    }
  } else if (slug === "scabard") {
    const pkg = parseScabardExport(data);
    for (const draft of pkg.entityDrafts) {
      parsed.push({
        type: toKnownType(draft.sourceType),
        title: draft.title,
        content: draft.content || draft.lore || "",
        labels: draft.labels ?? [],
      });
    }
  }

  if (parsed.length === 0) {
    throw new Error(
      "No importable articles or pages found in the JSON backup.",
    );
  }
  return parsed;
}

// Helper to recursively fetch files from entries
export async function traverseEntry(entry: any): Promise<File[]> {
  if (entry?.isFile) {
    return new Promise((resolve) =>
      entry.file((file: File) => resolve([file])),
    );
  }
  if (entry?.isDirectory) {
    const reader = entry.createReader();
    const files: File[] = [];
    // readEntries yields at most ~100 entries per call; keep reading until an
    // empty batch signals the directory is exhausted.
    for (;;) {
      const batch: any[] = await new Promise((resolve) =>
        reader.readEntries(resolve),
      );
      if (batch.length === 0) break;
      const nested = await Promise.all(batch.map((e) => traverseEntry(e)));
      files.push(...nested.flat());
    }
    return files;
  }
  return [];
}
