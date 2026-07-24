---
id: thread-weaver-import
title: Importing from Thread Weaver
description: Bring a Thread Weaver campaign export straight into your vault — characters, factions, and settlements included.
icon: icon-[lucide--file-json-2]
rank: 8
tags: ["import", "cif", "thread weaver"]
---

# Importing from Thread Weaver

[Thread Weaver Engine](https://ambiancearchitect.itch.io/thread-weaver-engine) is a standalone campaign generator that builds out characters, factions, and settlements along with the relationships between them. Codex Cryptica can bring one of its exports straight into your vault.

## How it works

1. Export your campaign from Thread Weaver Engine as a `.json` file.
2. Drop that file into Codex Cryptica's importer — the same **Import** button used for everything else.
3. The file is recognized automatically and converted to entities in your browser. Nothing is uploaded anywhere; the conversion happens entirely on your device.
4. Review the discovered characters, factions, and settlements — along with the relationships between them — before anything is written to your vault.

You don't need to run any separate conversion step. If you already have a converted `.cif.json` from an older export, that still works too — Codex Cryptica recognizes both.

## What comes across

- **Settlements** become **Locations**, with population, nation, and any faction cells operating there noted in their lore.
- **Factions** become **Factions**, with their goals, structure, secrets, and rumours, linked to their headquarters settlement.
- **Characters** become **Characters**, with their role, personality, motivations, and faction membership, linked to their home settlement.
- Relationships — faction membership, residency, character-to-character ties, wants, and inter-faction links — are all carried over as connections between entities.

## Re-importing

Re-importing a later export from the same campaign matches existing entries by their stable identity, not by title — so you can update, skip, or create per entry and see exactly what changed, the same as any other CIF import.
