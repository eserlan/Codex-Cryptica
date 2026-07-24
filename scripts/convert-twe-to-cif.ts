import fs from "node:fs";
import path from "node:path";

function slug(str: string): string {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  return str.length > 0 ? str : fallback;
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
    const sId = cleanText(s.id, "unknown");
    const name = cleanText(s.name, sId || "Unnamed Settlement");
    const key = `location-${sId}`;
    entityKeyMap.add(key);

    const type = cleanText(s.type, "Settlement");
    const population = s.population !== undefined && s.population !== null ? s.population : "Unknown";
    const nation = cleanText(s.nation, "Uncharted Region");
    const description = cleanText(s.description, "No description recorded.");

    entities.push({
      key,
      kind: "location",
      title: name,
      summary: description,
      content: {
        format: "markdown",
        body: `${description}\n\n## Overview\n- **Type**: ${type}\n- **Population**: ${population}\n- **Nation**: ${nation}`,
      },
      labels: ["location", type, nation].filter((l) => l && l !== "Uncharted Region" && l !== "Settlement" ? true : Boolean(l)),
      source: { id: sId },
    });
  }

  // 2. Factions -> Faction Entities
  for (const f of factions) {
    const name = cleanText(f.name, "Unnamed Faction");
    const key = `faction-${slug(name)}`;
    entityKeyMap.add(key);

    const shortGoal = cleanText(f.shortGoal, "No short-term goal recorded.");
    const longGoal = cleanText(f.longGoal, "No long-term goal recorded.");
    const tenet = cleanText(f.tenet, "No tenet recorded.");
    const color = cleanText(f.color, "#888888");
    const structure = cleanText(f.structure_type, "faction");
    const headquarters = cleanText(f.headquarters);
    const hqKey = headquarters ? `location-${headquarters}` : undefined;
    const secret = cleanText(f.secret, "No secret recorded.");
    const rumour = cleanText(f.rumour, "No rumour recorded.");
    const identifier = cleanText(f.identifier, "No identifier recorded.");

    entities.push({
      key,
      kind: "faction",
      title: name,
      summary: `Short goal: ${shortGoal}. Long goal: ${longGoal}.`,
      content: {
        format: "markdown",
        body: `## Tenet\n${tenet}\n\n## Details\n- **Color**: ${color}\n- **Structure**: ${structure}\n- **Multi-settlement**: ${Boolean(f.multi_settlement)}\n- **Headquarters**: ${headquarters || "None"}\n\n## Secret\n${secret}\n\n## Rumour\n${rumour}\n\n## Identifier\n${identifier}`,
      },
      labels: ["faction", structure].filter(Boolean),
      parent: hqKey && entityKeyMap.has(hqKey) ? hqKey : undefined,
      source: { id: slug(name) },
    });
  }

  // 3. Characters -> Character Entities
  for (const c of characters) {
    const cId = c.id !== undefined && c.id !== null ? String(c.id) : "unknown";
    const name = cleanText(c.name, `Character ${cId}`);
    const key = `character-${cId}`;
    entityKeyMap.add(key);

    const faction = cleanText(c.faction, "Independent");
    const role = cleanText(c.role, "Wanderer");
    const personality = cleanText(c.personality, "Unspecified");
    const motivation = cleanText(c.motivation, "Unspecified goals");
    const flaw = cleanText(c.flaw, "None recorded");
    const appearanceHook = cleanText(c.appearanceHook, "Unremarkable appearance");
    const voiceManner = cleanText(c.voiceManner, "Standard speech and demeanor");
    const secret = cleanText(c.secret, "No secret recorded.");
    const rumour = cleanText(c.rumour, "No rumour recorded.");
    const factionTier = c.factionTier ?? 1;

    const settId = c.settlement && c.settlement.id ? cleanText(c.settlement.id) : undefined;
    const settKey = settId ? `location-${settId}` : undefined;

    entities.push({
      key,
      kind: "character",
      title: name,
      summary: `Role: ${role} (${faction}). Personality: ${personality}.`,
      content: {
        format: "markdown",
        body: `## Overview\n- **Faction**: ${faction} (Tier ${factionTier})\n- **Role**: ${role}\n- **Personality**: ${personality}\n- **Motivation**: ${motivation}\n- **Flaw**: ${flaw}\n\n## Appearance & Voice\n- **Appearance**: ${appearanceHook}\n- **Voice & Manner**: ${voiceManner}\n\n## Secret\n${secret}\n\n## Rumour\n${rumour}`,
      },
      labels: ["character", role, faction].filter(Boolean),
      parent: settKey && entityKeyMap.has(settKey) ? settKey : undefined,
      source: { id: cId },
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
    const cId = c.id !== undefined && c.id !== null ? String(c.id) : "unknown";
    const cKey = `character-${cId}`;

    const faction = cleanText(c.faction);
    if (faction && faction !== "Independent") {
      const fKey = `faction-${slug(faction)}`;
      const role = cleanText(c.role, "Member");
      const tier = c.factionTier ?? 1;
      addRel(cKey, fKey, "member", `${role} (Tier ${tier})`, true);
    }

    const settId = c.settlement && c.settlement.id ? cleanText(c.settlement.id) : undefined;
    if (settId) {
      const sKey = `location-${settId}`;
      const settName = c.settlement.name ? cleanText(c.settlement.name) : "Settlement";
      addRel(cKey, sKey, "located_in", `Resident of ${settName}`, true);
    }

    if (Array.isArray(c.relationships)) {
      for (const r of c.relationships) {
        if (r.characterId === undefined || r.characterId === null) continue;
        const targetKey = `character-${r.characterId}`;
        const rType = cleanText(r.type, "related");
        const k = slug(rType) || "related";
        const sentiment = r.sentiment !== undefined && r.sentiment !== null ? ` (Sentiment: ${r.sentiment})` : "";
        addRel(cKey, targetKey, k, `${rType}${sentiment}`, true);
      }
    }

    if (Array.isArray(c.wants)) {
      for (const w of c.wants) {
        let targetKey: string | undefined;
        if (w.fromType === "faction" && w.fromName) targetKey = `faction-${slug(w.fromName)}`;
        else if (w.fromType === "character" && w.fromId !== undefined) targetKey = `character-${w.fromId}`;
        else if (w.fromType === "settlement" && w.fromId) targetKey = `location-${w.fromId}`;

        if (targetKey) {
          const what = cleanText(w.what, "unspecified desire");
          addRel(cKey, targetKey, "wants", `Wants: ${what}`, true);
        }
      }
    }
  }

  // Faction links & cells
  for (const f of factions) {
    const name = cleanText(f.name);
    if (!name) continue;
    const fKey = `faction-${slug(name)}`;

    if (Array.isArray(f.outwardLinks)) {
      for (const l of f.outwardLinks) {
        if (!l.target) continue;
        const lType = cleanText(l.type, "related");
        addRel(
          fKey,
          `faction-${slug(l.target)}`,
          slug(lType) || "related",
          lType,
          true,
        );
      }
    }

    if (Array.isArray(f.emergentLinks)) {
      for (const l of f.emergentLinks) {
        if (!l.target) continue;
        const lType = cleanText(l.type, "related");
        addRel(
          fKey,
          `faction-${slug(l.target)}`,
          slug(lType) || "related",
          `Emergent: ${lType}`,
          true,
        );
      }
    }

    if (Array.isArray(f.cells)) {
      for (const cell of f.cells) {
        if (cell.local_leader_id !== undefined && cell.local_leader_id !== null) {
          const status = cleanText(cell.cell_status, "active");
          addRel(
            fKey,
            `character-${cell.local_leader_id}`,
            "cell_leader",
            `Cell Leader (${status})`,
            true,
          );
        }
      }
    }
  }

  // Settlement links
  for (const s of settlements) {
    const sId = cleanText(s.id);
    if (!sId) continue;
    const sKey = `location-${sId}`;
    if (Array.isArray(s.outwardLinks)) {
      for (const l of s.outwardLinks) {
        if (!l.target) continue;
        const lType = cleanText(l.type, "related");
        const sentiment = l.sentiment !== undefined && l.sentiment !== null ? ` (Sentiment: ${l.sentiment})` : "";
        addRel(
          sKey,
          `location-${l.target}`,
          slug(lType) || "related",
          `${lType}${sentiment}`,
          true,
        );
      }
    }
  }

  const rawSeed = raw.generator && raw.generator.seed ? cleanText(raw.generator.seed) : "";
  const cifPackage = {
    format: "codex-world-interchange",
    version: "1.0",
    source: {
      system: "thread-weaver",
      worldKey: rawSeed || "thread-weaver-campaign",
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
