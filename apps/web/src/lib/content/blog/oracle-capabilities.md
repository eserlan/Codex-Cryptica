---
id: oracle-capabilities
slug: oracle-capabilities
title: "Your AI Co-GM: A Complete Guide to the Lore Oracle's Superpowers"
description: "From instant dice rolls to AI-powered story tension analysis and image generation, discover every command the Lore Oracle has to offer and how to use them to run richer sessions."
keywords:
  [
    "AI Dungeon Master Tools",
    "RPG AI Assistant",
    "Lore Oracle Guide",
    "World Building AI",
    "Tabletop RPG Tools",
    "AI Story Generator",
    "Campaign Management",
    "D&D AI Tools",
  ]
publishedAt: 2026-03-22T15:00:00Z
---

![Lore Oracle Interface](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-capabilities-hero.png)

You're mid-session. Your players just cornered an NPC you invented on the spot, demanded to know his backstory, and are now asking for a portrait. Thirty years of lore, a dice roll, an improvised family tree, and a generated image—in thirty seconds. That's not sorcery. That's the **Lore Oracle**.

The Oracle is the AI engine embedded directly in your Codex. It's not a chatbot you open in another tab. It lives inside your world, has read every note you've ever written, and is ready to act on them the moment you type `/`. This guide covers every capability—from the deterministic utilities that work offline to the AI-powered commands that transform your sessions.

---

## **Restricted Mode vs. AI-Powered Mode**

Before diving into commands, it's important to understand the Oracle's two states:

- **Restricted Mode (Lite Mode)** — This global toggle in **Settings > Intelligence** turns the AI engine off. In this mode, natural language chat, `/plot`, and `/draw` are disabled. Utility commands like `/roll`, `/create`, and `/connect` still work instantly and offline.
- **AI-Powered Mode** — When Lite Mode is off and a Gemini API key is active (either your personal key or system-provided shared access), the Oracle is **Online**. This unlocks full natural language reasoning, narrative analysis, and image generation using our most advanced model.

---

## **Utility Commands: Always Available**

These commands are deterministic, instant, and work even in **Restricted Mode**. When the Oracle is online, you can trigger them from chat using slash commands.

### **`/roll` — The Built-In Dice Tower**

Never leave your Codex to roll dice again.

```
/roll 1d20
/roll 2d6+3
/roll 4d6kh3
```

The Oracle's dice engine understands standard RPG notation, including advantage, disadvantage, keep-highest, and keep-lowest modifiers. Every roll is logged to a persistent **Roll History**, so you can review the carnage long after the session ends.

![Oracle Dice Roll](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-roll-command.png)

**Why use it?**

- Zero context-switching. Your players roll, you immediately respond.
- Fair, cryptographically randomized results—no loaded dice.
- Full history log for contested roll disputes.

---

### **`/create` — Spawn Entities Instantly**

When you invent a new NPC mid-session, don't fumble through a menu. Just tell the Oracle.

```
/create "Mira Valdris" as "Character"
/create "The Shattered Crown" as "Item"
/create "The Iron Compact" as "Faction"
```

Supported entity types include **Character**, **NPC**, **Faction**, **Location**, **Item**, **Event**, and **Concept**. The entity is created instantly, added to your vault and graph, and ready for you to fill in the details after the session.

![Oracle Create Entity](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-create-command.png)

**Why use it?**

- Session improvisation becomes permanent world-building.
- No interruption to narrative flow.
- Entities appear immediately in the Knowledge Graph.

---

### **`/connect` — Wire Up Your World**

Relationships are the lifeblood of world-building. The `/connect` command creates a labeled edge between any two entities in your vault.

```
/connect "Mira Valdris" owes a debt to "The Iron Compact"
/connect "The Shattered Crown" last seen at "The Vault of Ash"
```

The text between the two quoted entity names becomes the relationship label visible on the graph edge. It's fast, precise, and permanent.

![Oracle Connect Entities](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-connect-command.png)

**Why use it?**

- Capture relationship dynamics exactly as they emerge in play.
- The labeled edge becomes part of your world's documented history.
- No clicking through menus—one line, one connection.

---

### **`/merge` — Consolidate Duplicate Lore**

Six sessions in, you realize you have "Harkon the Grey," "Harkon," and "The Grey Wizard" all as separate entities. The `/merge` command fixes that.

```
/merge "Harkon" into "Harkon the Grey"
```

The source entity's connections are transferred to the target, and the duplicate is removed. Your graph stays clean without losing any relationship data.

**Why use it?**

- Tidy up the inevitable duplicate notes from fast-moving sessions.
- Connections and references are preserved during the merge.
- Works offline with no AI assistance required.

---

### **`/help` and `/clear`**

- **`/help`** — Displays the full command reference directly in the chat. Your in-session cheat sheet.
- **`/clear`** — Wipes the current chat history and starts a fresh conversation. Useful when switching context between major plot threads.

---

## **AI-Powered Commands: Your Co-GM Online**

These commands require the Oracle to be in **AI-Powered Mode** with an active API key. They transform the Oracle from a utility tool into a genuine creative collaborator.

---

### **Natural Language Chat — Your World's Expert**

The Oracle's most powerful mode is the simplest to use: just talk.

The Oracle doesn't just chat. It performs **Retrieval-Augmented Generation (RAG)**: before answering, it searches your vault for the most relevant entities, loads their full lore, and uses that context to respond. It knows your world—not a generic fantasy world.

> _"Who are the most dangerous political figures in the Ironwall province?"_
>
> _"What would be the most likely reason the Crimson Veil would target a scholar?"_
>
> _"Help me write a monologue for Harkon the Grey that hints at his secret without revealing it."_

![Oracle Natural Language Chat](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-chat-example.png)

**Why use it?**

- Brainstorm plot hooks, NPC motivations, and faction dynamics.
- Get in-character descriptions and dialogue tailored to your lore.
- The more notes you've written, the smarter and more specific it becomes.

---

### **`/plot` — Narrative Tension Analyst**

The `/plot` command is your dramatic friction engine. Give it an entity name, and the Oracle will analyze its connections to reveal the hidden rivalries, secrets, and risks that define that entity's story arc.

```
/plot Harkon the Grey
/plot tensions at The Shattered Crown
```

The Oracle doesn't invent drama—it **excavates** it from the connections and lore already in your vault. It returns structured dramatic hooks: antagonists, exposed vulnerabilities, hidden alliances, and narrative powder kegs.

![Oracle Plot Analysis](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-plot-command.png)

**Best practice**: Use the Knowledge Graph's **filters and labels** to help you choose which entity to run `/plot` on. For example, filter to your "active" entities—those labeled `#Session-Active` or belonging to a specific faction—then pick one of those entities as the `/plot` target so the Oracle stays focused on the parts of your world that are currently in play.

---

### **`/draw` — Your In-Session Art Department**

Generate visual artwork without leaving your Codex. The `/draw` command (also `/image`) invokes the image generation engine to create artwork for any subject in your world.

```
/draw a shadowy figure in a ruined throne room, oil painting
/draw Harkon the Grey in robes of storm-grey velvet, portrait style
/image the volcanic caldera of Mount Ashenveil at dusk
```

The generated image is saved to your vault, linked to the relevant entity, and available for use at the table immediately.

![Oracle Image Generation](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-draw-command.png)

**Why use it?**

- Visual props deepen player immersion instantly.
- No art skills required—just describe what you see in your mind.
- Images are stored locally in your vault, not in the cloud.

---

### **AI-Guided Wizards: `/connect oracle` and `/merge oracle`**

These are the Oracle's collaboration modes for complex decisions.

**`/connect oracle`** — Instead of specifying a connection manually, let the Oracle analyze your vault and propose a set of meaningful connections you may have missed. It acts as a second-brain review of your world's relationship map.

**`/merge oracle`** — When you're not sure which entities should be consolidated, the Oracle reviews your duplicates and near-duplicates and suggests the most coherent merge targets. It explains its reasoning for each proposed merge.

**Why use them?**

- Discover non-obvious connections in large vaults.
- Avoid losing lore during merges by getting AI-reviewed recommendations.
- Ideal for post-session cleanup sessions when your vault has grown complex.

---

## **Combining the Oracle with Your Workflow**

The Oracle's commands are not isolated tools—they compose into a workflow.

### **The Improv-to-Lore Pipeline**

1. During the session, fire `/create "Zareth Voss" as "NPC"` the moment you invent him.
2. Wire up his relationships: `/connect "Zareth Voss" blackmails "The Iron Compact"`.
3. After the session, run `/plot Zareth Voss` to generate next session's dramatic hook from what you've already written.
4. Run `/draw Zareth Voss, menacing merchant in a fur-lined coat` and pin the image to his entity card.

You started the session with an improvised name. You ended with a fully documented, visually realized villain.

### **The Deep Prep Workflow**

1. Label your active campaign entities with `#Act-Two`.
2. Filter the graph by `#Act-Two`.
3. Use natural language chat: _"Based on the Act Two entities, what unresolved threads are most likely to escalate?"_
4. Run `/plot` on the identified flashpoint entity to see the dramatic friction map.

The Oracle knows your world. The more you give it, the more it gives back.

---

## **Summary: Your Oracle Command Reference**

| Command                         | Mode                   | What it Does                    |
| ------------------------------- | ---------------------- | ------------------------------- |
| `/roll 2d6+3`                   | Any (incl. Restricted) | Rolls dice with formula support |
| `/create "Name" as "Type"`      | Any (incl. Restricted) | Creates a new vault entity      |
| `/connect "A" relationship "B"` | Any (incl. Restricted) | Creates a labeled relationship  |
| `/merge "A" into "B"`           | Any (incl. Restricted) | Merges entity A into B          |
| `/help`                         | Any (incl. Restricted) | Displays command reference      |
| `/clear`                        | Any (incl. Restricted) | Clears chat history             |
| Natural language chat           | AI-Powered             | RAG-powered world Q&A           |
| `/plot [entity]`                | AI-Powered             | Story tension analysis          |
| `/draw [subject]`               | AI-Powered             | AI image generation             |
| `/connect oracle`               | AI-Powered             | AI-guided connection proposals  |
| `/merge oracle`                 | AI-Powered             | AI-guided merge suggestions     |

---

The Lore Oracle isn't here to replace your creativity. It's here to keep up with it. From the instant a name appears at the table to the moment you're building next session's arc, the Oracle is the engine that ensures nothing falls through the cracks.

**Ready to meet your co-GM?** Open the Oracle from the sidebar in any vault and type `/help` to get started.

_For more on how to build a richer world, read our guide on [Supercharged Discovery: Mastering Filters and Labels](/blog/supercharged-discovery)._
