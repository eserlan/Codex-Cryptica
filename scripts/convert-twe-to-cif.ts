import fs from "node:fs";

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
  const characters: any[] = net.characters || [];
  const factions: any[] = net.factions || [];
  const settlements: any[] = net.settlements || [];

  // Build lookup maps for wiki-style [[Title]] cross-referencing
  const settlementMap = new Map<string, { id: string; name: string; key: string }>();
  for (const s of settlements) {
    const sId = cleanText(s.id, "unknown");
    const name = cleanText(s.name, sId);
    const key = `location-${sId}`;
    settlementMap.set(sId, { id: sId, name, key });
  }

  const factionMap = new Map<string, { name: string; key: string }>();
  for (const f of factions) {
    const name = cleanText(f.name, "Unnamed Faction");
    const key = `faction-${slug(name)}`;
    factionMap.set(name, { name, key });
    factionMap.set(slug(name), { name, key });
  }

  const characterMap = new Map<string, { id: string; name: string; key: string }>();
  for (const c of characters) {
    const cId = c.id !== undefined && c.id !== null ? String(c.id) : "unknown";
    const name = cleanText(c.name, `Character ${cId}`);
    const key = `character-${cId}`;
    characterMap.set(cId, { id: cId, name, key });
  }

  const entities: any[] = [];
  const relationships: any[] = [];
  const entityKeySet = new Set<string>();
  const relKeySet = new Set<string>();

  // 1. Settlements -> Location Entities
  for (const s of settlements) {
    const sId = cleanText(s.id, "unknown");
    const name = cleanText(s.name, sId || "Unnamed Settlement");
    const key = `location-${sId}`;
    entityKeySet.add(key);

    const type = cleanText(s.type, "Settlement");
    const population = s.population !== undefined && s.population !== null ? s.population : "Unknown";
    const nation = cleanText(s.nation, "Uncharted Region");
    const description = cleanText(s.description, "No description recorded.");

    // Find cells operating in this settlement
    const cellLines: string[] = [];
    for (const f of factions) {
      if (Array.isArray(f.cells)) {
        for (const cell of f.cells) {
          if (cleanText(cell.settlement_id) === sId) {
            const fName = cleanText(f.name, "Faction");
            const leaderName = cell.local_leader_id !== undefined ? characterMap.get(String(cell.local_leader_id))?.name : undefined;
            const leaderLink = leaderName ? `[[${leaderName}]]` : "Unassigned";
            const status = cleanText(cell.cell_status, "active");
            cellLines.push(`- **[[${fName}]]**: Led by ${leaderLink} (*${status} cell*)`);
          }
        }
      }
    }

    const cellSection = cellLines.length > 0
      ? `\n\n## Active Faction Cells\n${cellLines.join("\n")}`
      : "";

    entities.push({
      key,
      kind: "location",
      title: name,
      summary: description,
      content: {
        format: "markdown",
        body: `${description}\n\n## Overview\n- **Type**: ${type}\n- **Population**: ${population}\n- **Nation**: ${nation}${cellSection}`,
      },
      labels: ["location", type, nation].filter((l) => l && l !== "Uncharted Region" && l !== "Settlement" ? true : Boolean(l)),
      source: { id: sId },
    });
  }

  // 2. Factions -> Faction Entities
  for (const f of factions) {
    const name = cleanText(f.name, "Unnamed Faction");
    const key = `faction-${slug(name)}`;
    entityKeySet.add(key);

    const shortGoal = cleanText(f.shortGoal, "No short-term goal recorded.");
    const longGoal = cleanText(f.longGoal, "No long-term goal recorded.");
    const tenet = cleanText(f.tenet, "No tenet recorded.");
    const color = cleanText(f.color, "#888888");
    const structure = cleanText(f.structure_type, "faction");
    const secret = cleanText(f.secret, "No secret recorded.");
    const rumour = cleanText(f.rumour, "No rumour recorded.");
    const identifier = cleanText(f.identifier, "No identifier recorded.");

    const hqId = cleanText(f.headquarters);
    const hqSettlement = hqId ? settlementMap.get(hqId) : undefined;
    const hqLink = hqSettlement ? `[[${hqSettlement.name}]]` : "None";

    const cellLines: string[] = [];
    if (Array.isArray(f.cells)) {
      for (const cell of f.cells) {
        const sName = cell.settlement_id ? settlementMap.get(cleanText(cell.settlement_id))?.name : undefined;
        const sLink = sName ? `[[${sName}]]` : cleanText(cell.settlement_name, "Settlement");
        const leaderName = cell.local_leader_id !== undefined ? characterMap.get(String(cell.local_leader_id))?.name : undefined;
        const leaderLink = leaderName ? `[[${leaderName}]]` : "Unassigned";
        const status = cleanText(cell.cell_status, "active");
        const strengthPct = typeof cell.strength === "number" ? ` (${Math.round(cell.strength * 100)}% strength)` : "";
        cellLines.push(`- **${sLink}**: Leader ${leaderLink} (*${status}*${strengthPct})`);
      }
    }

    const cellSection = cellLines.length > 0
      ? `\n\n## Cells & Footholds\n${cellLines.join("\n")}`
      : "";

    entities.push({
      key,
      kind: "faction",
      title: name,
      summary: `Short goal: ${shortGoal}. Long goal: ${longGoal}.`,
      content: {
        format: "markdown",
        body: `## Tenet\n${tenet}\n\n## Details\n- **Color**: ${color}\n- **Structure**: ${structure}\n- **Multi-settlement**: ${Boolean(f.multi_settlement)}\n- **Headquarters**: ${hqLink}\n- **Short-Term Goal**: ${shortGoal}\n- **Long-Term Goal**: ${longGoal}${cellSection}\n\n## Secret\n${secret}\n\n## Rumour\n${rumour}\n\n## Identifier\n${identifier}`,
      },
      labels: ["faction", structure].filter(Boolean),
      parent: hqSettlement ? hqSettlement.key : undefined,
      source: { id: slug(name) },
    });
  }

  // 3. Characters -> Character Entities
  for (const c of characters) {
    const cId = c.id !== undefined && c.id !== null ? String(c.id) : "unknown";
    const name = cleanText(c.name, `Character ${cId}`);
    const key = `character-${cId}`;
    entityKeySet.add(key);

    const factionName = cleanText(c.faction, "Independent");
    const factionObj = factionMap.get(factionName) || factionMap.get(slug(factionName));
    const factionLink = factionObj ? `[[${factionObj.name}]]` : factionName;

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
    const settObj = settId ? settlementMap.get(settId) : undefined;
    const settLink = settObj ? `[[${settObj.name}]]` : (c.settlement?.name ? cleanText(c.settlement.name) : "Unassigned");

    const wantLines: string[] = [];
    if (Array.isArray(c.wants)) {
      for (const w of c.wants) {
        let targetLink: string | undefined;
        if (w.fromType === "faction" && w.fromName) {
          const fObj = factionMap.get(cleanText(w.fromName)) || factionMap.get(slug(cleanText(w.fromName)));
          targetLink = fObj ? `[[${fObj.name}]]` : cleanText(w.fromName);
        } else if (w.fromType === "character" && w.fromId !== undefined) {
          const cTarget = characterMap.get(String(w.fromId));
          targetLink = cTarget ? `[[${cTarget.name}]]` : `Character ${w.fromId}`;
        } else if (w.fromType === "settlement" && w.fromId) {
          const sTarget = settlementMap.get(cleanText(w.fromId));
          targetLink = sTarget ? `[[${sTarget.name}]]` : cleanText(w.fromName || w.fromId);
        }

        const what = cleanText(w.what, "unspecified desire");
        if (targetLink) {
          wantLines.push(`- Wants *${what}* from ${targetLink}`);
        } else {
          wantLines.push(`- Wants *${what}*`);
        }
      }
    }

    const wantSection = wantLines.length > 0
      ? `\n\n## Desires & Agendas\n${wantLines.join("\n")}`
      : "";

    entities.push({
      key,
      kind: "character",
      title: name,
      summary: `Role: ${role} (${factionName}). Personality: ${personality}.`,
      content: {
        format: "markdown",
        body: `## Overview\n- **Faction**: ${factionLink} (Tier ${factionTier})\n- **Role**: ${role}\n- **Home Settlement**: ${settLink}\n- **Personality**: ${personality}\n- **Motivation**: ${motivation}\n- **Flaw**: ${flaw}${wantSection}\n\n## Appearance & Voice\n- **Appearance**: ${appearanceHook}\n- **Voice & Manner**: ${voiceManner}\n\n## Secret\n${secret}\n\n## Rumour\n${rumour}`,
      },
      labels: ["character", role, factionName].filter((l) => l && l !== "Independent" ? true : Boolean(l)),
      parent: settObj ? settObj.key : undefined,
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
    if (!from || !to || !entityKeySet.has(from) || !entityKeySet.has(to)) return;
    if (from === to) return;
    const relKey = `rel-${from}-${to}-${kind}`;
    if (relKeySet.has(relKey)) return;
    relKeySet.add(relKey);

    relationships.push({
      key: relKey,
      from,
      to,
      kind,
      label,
      directed,
    });
  }

  // 4. Relationships Mapping

  // Faction Headquarters -> Settlement
  for (const f of factions) {
    const fName = cleanText(f.name);
    if (!fName) continue;
    const fKey = `faction-${slug(fName)}`;
    const hqId = cleanText(f.headquarters);
    if (hqId && settlementMap.has(hqId)) {
      const sKey = `location-${hqId}`;
      addRel(fKey, sKey, "headquarters", "Headquarters", true);
    }
  }

  // Characters -> Factions, Settlements, Characters, Wants
  for (const c of characters) {
    const cId = c.id !== undefined && c.id !== null ? String(c.id) : "unknown";
    const cKey = `character-${cId}`;

    const factionName = cleanText(c.faction);
    if (factionName && factionName !== "Independent") {
      const fObj = factionMap.get(factionName) || factionMap.get(slug(factionName));
      if (fObj) {
        const role = cleanText(c.role, "Member");
        const tier = c.factionTier ?? 1;
        addRel(cKey, fObj.key, "member", `${role} (Tier ${tier})`, true);
      }
    }

    const settId = c.settlement && c.settlement.id ? cleanText(c.settlement.id) : undefined;
    if (settId && settlementMap.has(settId)) {
      const sKey = `location-${settId}`;
      const sObj = settlementMap.get(settId);
      addRel(cKey, sKey, "located_in", `Resident of ${sObj?.name || "Settlement"}`, true);
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
        if (w.fromType === "faction" && w.fromName) {
          const fObj = factionMap.get(cleanText(w.fromName)) || factionMap.get(slug(cleanText(w.fromName)));
          if (fObj) targetKey = fObj.key;
        } else if (w.fromType === "character" && w.fromId !== undefined) {
          targetKey = `character-${w.fromId}`;
        } else if (w.fromType === "settlement" && w.fromId) {
          targetKey = `location-${cleanText(w.fromId)}`;
        }

        if (targetKey) {
          const what = cleanText(w.what, "unspecified desire");
          addRel(cKey, targetKey, "wants", `Wants: ${what}`, true);
        }
      }
    }
  }

  // Factions -> Outward, Emergent, Cells
  for (const f of factions) {
    const name = cleanText(f.name);
    if (!name) continue;
    const fKey = `faction-${slug(name)}`;

    if (Array.isArray(f.outwardLinks)) {
      for (const l of f.outwardLinks) {
        if (!l.target) continue;
        const targetObj = factionMap.get(cleanText(l.target)) || factionMap.get(slug(cleanText(l.target)));
        if (targetObj) {
          const lType = cleanText(l.type, "related");
          addRel(fKey, targetObj.key, slug(lType) || "related", lType, true);
        }
      }
    }

    if (Array.isArray(f.emergentLinks)) {
      for (const l of f.emergentLinks) {
        if (!l.target) continue;
        const targetObj = factionMap.get(cleanText(l.target)) || factionMap.get(slug(cleanText(l.target)));
        if (targetObj) {
          const lType = cleanText(l.type, "related");
          addRel(fKey, targetObj.key, slug(lType) || "related", `Emergent: ${lType}`, true);
        }
      }
    }

    if (Array.isArray(f.cells)) {
      for (const cell of f.cells) {
        const sId = cleanText(cell.settlement_id);
        if (sId && settlementMap.has(sId)) {
          addRel(fKey, `location-${sId}`, "cell_presence", `Cell in ${settlementMap.get(sId)?.name}`, true);
        }
        if (cell.local_leader_id !== undefined && cell.local_leader_id !== null) {
          const status = cleanText(cell.cell_status, "active");
          addRel(fKey, `character-${cell.local_leader_id}`, "cell_leader", `Cell Leader (${status})`, true);
        }
      }
    }
  }

  // Settlement -> Settlement links
  for (const s of settlements) {
    const sId = cleanText(s.id);
    if (!sId) continue;
    const sKey = `location-${sId}`;
    if (Array.isArray(s.outwardLinks)) {
      for (const l of s.outwardLinks) {
        if (!l.target) continue;
        const targetId = cleanText(l.target);
        if (settlementMap.has(targetId)) {
          const lType = cleanText(l.type, "related");
          const sentiment = l.sentiment !== undefined && l.sentiment !== null ? ` (Sentiment: ${l.sentiment})` : "";
          addRel(sKey, `location-${targetId}`, slug(lType) || "related", `${lType}${sentiment}`, true);
        }
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

  const targetPath = outputPath || inputPath.replace(/\.json$/, ".cif.json");
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
