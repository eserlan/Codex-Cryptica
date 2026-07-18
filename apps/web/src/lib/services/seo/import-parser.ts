import { parseWaExport, cleanHtml, type ParsedEntity } from "./wa-parser";

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
  const text = await file.text();
  const data = JSON.parse(text);
  const parsed: ParsedEntity[] = [];

  if (slug === "world-anvil-export") {
    parsed.push(...parseWaExport(data));
  } else if (slug === "kanka-json") {
    // Kanka campaign exports
    const entities =
      data.entities || (Array.isArray(data) ? data : Object.values(data));
    for (const item of entities) {
      if (!item || typeof item !== "object") continue;
      const title = item.name || "Untitled Entity";
      const body = cleanHtml(
        item.entry || item.entry_parsed || item.history || "",
      );
      let type: ParsedEntity["type"] = "note";
      const kankaType = String(item.type || "").toLowerCase();
      if (kankaType === "character") type = "character";
      else if (kankaType === "location") type = "location";
      else if (kankaType === "item") type = "item";
      else if (kankaType === "organisation" || kankaType === "faction")
        type = "faction";

      parsed.push({
        type,
        title,
        content: body,
        labels: ["kanka-import", kankaType].filter(Boolean),
      });
    }
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
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file: File) => resolve([file]));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const read = () => {
        reader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) {
            resolve([]);
          } else {
            const promises = entries.map((e) => traverseEntry(e));
            const res = await Promise.all(promises);
            resolve(res.flat());
          }
        });
      };
      read();
    } else {
      resolve([]);
    }
  });
}
