import fs from "node:fs";
import path from "node:path";

function slug(str: string): string {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function convertThreadWeaverToCif(inputPath: string, outputPath?: string) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const net = raw.networkData || {};
  const characters = net.characters || [];
  const factions = net.factions || [];
  const settlements = net.settlements || [];

  const entities: any[] = [];
  const relationships: any[] = [];
  const entityKeyMap = new Set<string>();
  const relKeyMap = new Set<string>();

  // 1. Settlements -> Location Entities
  for (const s of settlements) {
    const key = `location-${s.id}`;
    entityKeyMap.add(key);
    entities.push({
      key,
      kind: "location",
      title: s.name,
      summary: s.description,
      content: {
        format: "markdown",
        body: `${s.description}\n\n## Overview\n- **Type**: ${s.type}\n- **Population**: ${s.population}\n- **Nation**: ${s.nation}`,
      },
      labels: ["location", s.type, s.nation].filter(Boolean),
      source: { id: s.id },
    });
  }

  // 2. Factions -> Faction Entities
  for (const f of factions) {
    const key = `faction-${slug(f.name)}`;
    entityKeyMap.add(key);
    const hqKey = f.headquarters ? `location-${f.headquarters}` : undefined;

    entities.push({
      key,
      kind: "faction",
      title: f.name,
      summary: `Short goal: ${f.shortGoal}. Long goal: ${f.longGoal}.`,
      content: {
        format: "markdown",
        body: `## Tenet\n${f.tenet}\n\n## Details\n- **Color**: ${f.color}\n- **Structure**: ${f.structure_type}\n- **Multi-settlement**: ${f.multi_settlement}\n- **Headquarters**: ${f.headquarters || "None"}\n\n## Secret\n${f.secret}\n\n## Rumour\n${f.rumour}\n\n## Identifier\n${f.identifier}`,
      },
      labels: ["faction", f.structure_type].filter(Boolean),
      parent: hqKey && entityKeyMap.has(hqKey) ? hqKey : undefined,
      source: { id: slug(f.name) },
    });
  }

  // 3. Characters -> Character Entities
  for (const c of characters) {
    const key = `character-${c.id}`;
    entityKeyMap.add(key);
    const settKey =
      c.settlement && c.settlement.id ? `location-${c.settlement.id}` : undefined;

    entities.push({
      key,
      kind: "character",
      title: c.name,
      summary: `Role: ${c.role} (${c.faction}). Personality: ${c.personality}.`,
      content: {
        format: "markdown",
        body: `## Overview\n- **Faction**: ${c.faction} (Tier ${c.factionTier})\n- **Role**: ${c.role}\n- **Personality**: ${c.personality}\n- **Motivation**: ${c.motivation}\n- **Flaw**: ${c.flaw}\n\n## Appearance & Voice\n- **Appearance**: ${c.appearanceHook}\n- **Voice & Manner**: ${c.voiceManner}\n\n## Personality & Voice\n- Temperament: ${c.personality}\n- Mannerisms: ${c.voiceManner}\n- Motivated by ${c.motivation}\n- Flaw: ${c.flaw}\n\n## Secret\n${c.secret}\n\n## Rumour\n${c.rumour}`,
      },
      labels: ["character", c.role, c.faction].filter(Boolean),
      parent: settKey && entityKeyMap.has(settKey) ? settKey : undefined,
      source: { id: String(c.id) },
    });
  }

  function addRel(
    from: string,
    to: string,
    kind: string,
    label?: string,
    directed = true,
  ) {
    if (!from || !to || !entityKeyMap.has(from) || !entityKeyMap.has(to)) return;
    if (from === to) return;
    const relKey = `rel-${from}-${to}-${kind}`;
    if (relKeyMap.has(relKey)) return;
    relKeyMap.add(relKey);

    relationships.push({
      key: relKey,
      from,
      to,
      kind,
      label,
      directed,
    });
  }

  // Character -> Character & Faction & Location relationships
  for (const c of characters) {
    const cKey = `character-${c.id}`;

    if (c.faction) {
      const fKey = `faction-${slug(c.faction)}`;
      addRel(cKey, fKey, "member", `${c.role} (Tier ${c.factionTier})`, true);
    }

    if (c.settlement && c.settlement.id) {
      const sKey = `location-${c.settlement.id}`;
      addRel(cKey, sKey, "located_in", `Resident of ${c.settlement.name}`, true);
    }

    if (Array.isArray(c.relationships)) {
      for (const r of c.relationships) {
        const targetKey = `character-${r.characterId}`;
        const k = slug(r.type) || "related";
        addRel(cKey, targetKey, k, `${r.type} (Sentiment: ${r.sentiment})`, true);
      }
    }

    if (Array.isArray(c.wants)) {
      for (const w of c.wants) {
        let targetKey: string | undefined;
        if (w.fromType === "faction") targetKey = `faction-${slug(w.fromName)}`;
        else if (w.fromType === "character") targetKey = `character-${w.fromId}`;
        else if (w.fromType === "settlement") targetKey = `location-${w.fromId}`;

        if (targetKey) {
          addRel(cKey, targetKey, "wants", `Wants: ${w.what}`, true);
        }
      }
    }
  }

  // Faction links & cells
  for (const f of factions) {
    const fKey = `faction-${slug(f.name)}`;

    if (Array.isArray(f.outwardLinks)) {
      for (const l of f.outwardLinks) {
        addRel(
          fKey,
          `faction-${slug(l.target)}`,
          slug(l.type) || "related",
          l.type,
          true,
        );
      }
    }

    if (Array.isArray(f.emergentLinks)) {
      for (const l of f.emergentLinks) {
        addRel(
          fKey,
          `faction-${slug(l.target)}`,
          slug(l.type) || "related",
          `Emergent: ${l.type}`,
          true,
        );
      }
    }

    if (Array.isArray(f.cells)) {
      for (const cell of f.cells) {
        if (cell.local_leader_id !== undefined) {
          addRel(
            fKey,
            `character-${cell.local_leader_id}`,
            "cell_leader",
            `Cell Leader (${cell.cell_status})`,
            true,
          );
        }
      }
    }
  }

  // Settlement links
  for (const s of settlements) {
    const sKey = `location-${s.id}`;
    if (Array.isArray(s.outwardLinks)) {
      for (const l of s.outwardLinks) {
        addRel(
          sKey,
          `location-${l.target}`,
          slug(l.type) || "related",
          `${l.type} (Sentiment: ${l.sentiment})`,
          true,
        );
      }
    }
  }

  const cifPackage = {
    format: "codex-world-interchange",
    version: "1.0",
    source: {
      system: "thread-weaver",
      worldKey: raw.generator?.seed || "thread-weaver-campaign",
      exportedAt: raw.exportedAt || new Date().toISOString(),
    },
    world: {
      title: "Thread Weaver Campaign World",
      summary: `Thread Weaver campaign network with ${characters.length} characters, ${factions.length} factions, and ${settlements.length} settlements.`,
      labels: ["thread-weaver", "campaign"],
    },
    entities,
    relationships,
    assets: [],
  };

  const targetPath =
    outputPath || inputPath.replace(/\.json$/, ".cif.json");
  fs.writeFileSync(targetPath, JSON.stringify(cifPackage, null, 2), "utf8");
  return { targetPath, cifPackage };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.log("Usage: bun scripts/convert-twe-to-cif.ts <input_json_path> [output_cif_json_path]");
    process.exit(1);
  }
  const { targetPath, cifPackage } = convertThreadWeaverToCif(args[0], args[1]);
  console.log(`Successfully converted ${cifPackage.entities.length} entities and ${cifPackage.relationships.length} relationships to ${targetPath}`);
}
