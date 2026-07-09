import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

function extractMarkdownSection(markdown: string | undefined, title: string) {
  if (!markdown?.trim()) return "";
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(
      `(?:^|\\n)##\\s+${escapedTitle}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
      "i",
    ),
  );
  return match?.[1]?.trim() || "";
}

function stripMarkdownSections(markdown: string | undefined, titles: string[]) {
  let result = markdown || "";
  for (const title of titles) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(
        `(?:^|\\n)##\\s+${escapedTitle}\\s*\\n[\\s\\S]*?(?=\\n##\\s+|$)`,
        "gi",
      ),
      "\n",
    );
  }
  return result.trim();
}

function buildReverseIndex(
  entities: Record<string, any>,
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const [id, entity] of Object.entries(entities)) {
    for (const conn of entity.connections || []) {
      if (!index.has(conn.target)) index.set(conn.target, new Set());
      index.get(conn.target)!.add(id);
    }
  }
  return index;
}

/**
 * Collects all entities within `maxHops` hops of either the guest or the NPC
 * (treating every edge as bidirectional) and formats them as an adjacency list.
 *
 * The AI uses this graph to determine the relationship between the two characters
 * and calibrate its response — tone, warmth, and what information to share.
 */
function buildRelationshipGraph(
  guestCharacter: any | null,
  npc: any,
  entities: Record<string, any>,
  reverseIndex: Map<string, Set<string>>,
  maxHops = 2,
): string {
  const relevant = new Set<string>();
  const expand = (startId: string) => {
    relevant.add(startId);
    let frontier = new Set([startId]);
    for (let h = 0; h < maxHops; h++) {
      const next = new Set<string>();
      for (const id of frontier) {
        for (const c of entities[id]?.connections || []) {
          if (!relevant.has(c.target)) {
            relevant.add(c.target);
            next.add(c.target);
          }
        }
        for (const rid of reverseIndex.get(id) || []) {
          if (!relevant.has(rid)) {
            relevant.add(rid);
            next.add(rid);
          }
        }
      }
      frontier = next;
    }
  };

  expand(npc.id);
  if (guestCharacter) expand(guestCharacter.id);

  // Render adjacency list — guest first, NPC second, rest alphabetically
  const others = [...relevant]
    .filter((id) => id !== npc.id && id !== guestCharacter?.id)
    .sort((a, b) =>
      (entities[a]?.title ?? "").localeCompare(entities[b]?.title ?? ""),
    );

  const ordered = [
    ...(guestCharacter ? [guestCharacter.id] : []),
    npc.id,
    ...others,
  ];

  const lines: string[] = [];
  for (const id of ordered) {
    const entity = entities[id];
    if (!entity) continue;
    const marker =
      id === npc.id ? " [YOU]" : id === guestCharacter?.id ? " [GUEST]" : "";
    lines.push(`${entity.title} (${entity.type})${marker}:`);

    const connLines: string[] = [];
    // Forward connections (this entity → target)
    for (const conn of entity.connections || []) {
      if (!relevant.has(conn.target)) continue;
      const target = entities[conn.target];
      if (!target) continue;
      const targetMarker =
        conn.target === npc.id
          ? " [YOU]"
          : conn.target === guestCharacter?.id
            ? " [GUEST]"
            : "";
      const label = conn.label ? ` "${conn.label}"` : "";
      connLines.push(
        `  → ${conn.type}${label}: ${target.title} (${target.type})${targetMarker}`,
      );
    }
    // Reverse connections (other entities in scope → this entity)
    for (const srcId of reverseIndex.get(id) || []) {
      if (!relevant.has(srcId)) continue;
      const src = entities[srcId];
      if (!src) continue;
      const conn = src.connections?.find((c: any) => c.target === id);
      if (!conn) continue;
      const srcMarker =
        srcId === npc.id
          ? " [YOU]"
          : srcId === guestCharacter?.id
            ? " [GUEST]"
            : "";
      const label = conn.label ? ` "${conn.label}"` : "";
      connLines.push(
        `  ← ${conn.type}${label}: ${src.title} (${src.type})${srcMarker}`,
      );
    }

    lines.push(
      ...(connLines.length > 0 ? connLines : ["  (no connections in scope)"]),
    );
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Builds a knowledge summary of what the NPC plausibly knows about connected entities.
 * BFS from the NPC only (not the guest) — this is the NPC's world knowledge, not the guest's.
 * Direct connections (1-hop) get up to 300 chars; 2-hop get up to 150 chars.
 */
async function buildWorldKnowledge(
  npc: any,
  entities: Record<string, any>,
  reverseIndex: Map<string, Set<string>>,
  maxHops = 2,
): Promise<string> {
  // Track hop distance from the NPC for each reachable entity
  const hopDistance = new Map<string, number>([[npc.id, 0]]);
  let frontier = new Set([npc.id]);

  for (let h = 1; h <= maxHops; h++) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const c of entities[id]?.connections || []) {
        if (!hopDistance.has(c.target)) {
          hopDistance.set(c.target, h);
          next.add(c.target);
        }
      }
      for (const rid of reverseIndex.get(id) || []) {
        if (!hopDistance.has(rid)) {
          hopDistance.set(rid, h);
          next.add(rid);
        }
      }
    }
    frontier = next;
  }

  // Group by hop distance, sort alphabetically within each group
  const byHop = new Map<number, Array<{ id: string; entity: any }>>();
  for (const [id, hop] of hopDistance) {
    if (id === npc.id) continue;
    const entity = entities[id];
    if (!entity) continue;
    if (!byHop.has(hop)) byHop.set(hop, []);
    byHop.get(hop)!.push({ id, entity });
  }
  for (const group of byHop.values()) {
    group.sort((a, b) => a.entity.title.localeCompare(b.entity.title));
  }

  if (byHop.size === 0) return "";

  const LEVEL_META: Record<
    number,
    { label: string; note: string; limit: number }
  > = {
    1: {
      label: "First-level knowledge (direct — know personally)",
      note: "Speak about these from direct experience. You may express opinions, recall specifics, and show personal familiarity.",
      limit: 300,
    },
    2: {
      label:
        "Second-level knowledge (indirect — know by reputation or through others)",
      note: "Your knowledge here is secondhand — filtered through your direct contacts, heard by reputation, or inferred. Express appropriate uncertainty; avoid claiming firsthand experience.",
      limit: 150,
    },
  };

  const lines: string[] = [];
  for (const hop of [...byHop.keys()].sort()) {
    const meta = LEVEL_META[hop] ?? {
      label: `${hop}-hop connections`,
      note: "Very distant — treat as rumour or hearsay at best.",
      limit: 100,
    };
    lines.push(`${meta.label}:`);
    lines.push(`  (${meta.note})`);
    for (const { entity } of byHop.get(hop)!) {
      const raw = (entity.content || "").replace(/\s+/g, " ").trim();
      const summary = !raw
        ? "(no public summary)"
        : raw.length > meta.limit
          ? raw.slice(0, meta.limit) + "…"
          : raw;
      lines.push(`- ${entity.title} (${entity.type}): ${summary}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function resolveGuestCharacter(
  intent: OracleIntent,
  context: OracleExecutionContext,
) {
  const guestCharacterId =
    intent.data?.guestCharacterId ||
    (context as any).guestCharacterId ||
    context.vault?.guestCharacterId;
  if (!guestCharacterId || guestCharacterId === intent.entityId) return null;
  return context.vault?.entities?.[guestCharacterId] || null;
}

/**
 * Executes guest-character in-character chats enforcing lore visibility boundaries.
 */
export class GuestChatExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  constructor(
    clock?: import("../runtime").Clock,
    idGenerator?: import("../runtime").IdGenerator,
  ) {
    super(clock, idGenerator);
  }


  private isExecuting = false;

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    if (this.isExecuting) {
      await context.chatHistory.addMessage({
        id: this.idGenerator.uuid(),
        role: "system",
        content:
          "The Character is already processing a request. Please wait for the current action to complete.",
      });
      return;
    }

    const query = intent.query!;
    const characterId = intent.entityId;

    if (!query.trim()) return;

    this.isExecuting = true;
    try {
      await this.executeWithStack(intent, context, async () => {
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_STARTED,
          payload: { intent },
        });

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "user",
            content: query,
          });
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content:
              "You are currently offline. Character chat is temporarily suspended.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        // Skip if the caller already pre-inserted this user message (e.g. guest-chat store)
        const lastHistoryMsg =
          context.chatHistory.messages.at?.(-1) ??
          context.chatHistory.messages[context.chatHistory.messages.length - 1];
        if (
          lastHistoryMsg?.role !== "user" ||
          lastHistoryMsg?.content !== query
        ) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "user",
            content: query,
          });
        }

        if (context.aiDisabled) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content: "❌ AI features are disabled. Guest chat is unavailable.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        // Validate character availability
        const character = context.vault.entities[characterId || ""];
        if (
          !character ||
          character.type !== "character" ||
          !character.guestChatConfig?.isEnabled
        ) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content: "❌ This character is no longer available for guest chat.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        const personalityAndVoice =
          extractMarkdownSection(character.lore, "Personality & Voice") ||
          character.guestChatConfig.extraInstructions?.trim() ||
          "";
        if (!personalityAndVoice) {
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
            role: "system",
            content: "❌ This character is no longer available for guest chat.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        const assistantMsg: ChatMessage = {
          id: this.idGenerator.uuid(),
          role: "assistant",
          content: "",
          type: "text",
        };
        await context.chatHistory.addMessage(assistantMsg);

        const handlePartialResponse = (partial: string) => {
          assistantMsg.content = partial;
          void context.chatHistory.updateMessage?.(
            assistantMsg.id,
            { content: partial },
            false, // skip persistence during streaming
          );
          onPartialResponse?.(partial);
        };

        const publicLore = character.content || "";
        const knowledgeAndExpertise =
          extractMarkdownSection(character.lore, "Knowledge & Expertise") ||
          "No explicit knowledge profile. Infer cautiously from public background and direct connections only.";
        const otherPrivateLore = stripMarkdownSections(character.lore, [
          "Personality & Voice",
          "Knowledge & Expertise",
        ]);
        const guestCharacter = resolveGuestCharacter(intent, context);
        const allEntities = context.vault.entities || {};
        const reverseIndex = buildReverseIndex(allEntities);
        const relationshipGraph = buildRelationshipGraph(
          guestCharacter,
          character,
          allEntities,
          reverseIndex,
        );
        const worldKnowledge = await buildWorldKnowledge(
          character,
          allEntities,
          reverseIndex,
        );

        let privateNotes = "";
        if (
          character.guestChatConfig?.contextScope === "hybrid" &&
          otherPrivateLore
        ) {
          privateNotes = `[HIDDEN PRIVATE LORE — not for direct quotation. Reveal only what your relationship with the guest justifies:\n${otherPrivateLore}]`;
        }

        const systemInstruction = `
OUTPUT FORMAT — ABSOLUTE: Your entire response is spoken dialogue only. Begin with the first word ${character.title} says aloud. End with the last word they say. Do not write anything that is not speech — no action text ("I reach for…", "my knuckles whiten"), no internal thoughts, no scene description, no stage directions, no emotes. Paragraph breaks are allowed for readability. If it would not come out of the character's mouth, cut it.

You are roleplaying as the NPC "${character.title}".
Your background: ${publicLore}

PERSONALITY & VOICE (use this to shape tone, word choice, rhythm, and emotional register of the spoken words — these are calibration rules for how the character sounds, not things to describe or enact in the response):
${personalityAndVoice}

KNOWLEDGE & EXPERTISE (always apply as knowledge boundaries):
${knowledgeAndExpertise}
${worldKnowledge ? `\nWORLD KNOWLEDGE (public information about entities you are connected to — infer from this what you plausibly know about the world):\n${worldKnowledge}\n` : ""}
GUEST IDENTITY: ${guestCharacter ? `"${guestCharacter.title}"` : "Unknown visitor"}

RELATIONSHIP GRAPH (entities within 2 hops of either party — use this to determine how you know the guest):
${relationshipGraph}

${privateNotes}

RULES:
1. Always speak in character.
2. Always use PERSONALITY & VOICE for tone, rhythm, word choice, and behavior.
3. Use KNOWLEDGE & EXPERTISE to enforce what this character plausibly knows. Do not become omniscient.
4. Use the RELATIONSHIP GRAPH to determine your relationship with the guest: how well you know them, how warm or guarded to be, and what you would plausibly share. Connection types, labels, and shared group membership all carry meaning.
5. For private lore: calibrate what to share based on your relationship — a trusted close contact gets relevant details; an acquaintance or community member gets hints; a stranger gets deflection; a rival or enemy gets misdirection or lies.
6. NEVER quote or directly expose HIDDEN PRIVATE LORE. Reveal only what your relationship with this guest justifies.
7. Keep answers short and relevant to the user's inquiry.
`.trim();

        const apiKey = context.effectiveApiKey || "";
        await context.textGeneration.generateResponse(
          apiKey,
          query,
          context.chatHistory.messages.slice(0, -1), // exclude the placeholder assistantMsg
          "", // no expanded search/rag context needed
          context.modelName,
          handlePartialResponse,
          context.isDemoMode,
          [],
          {
            requestId: assistantMsg.id,
            vaultId: context.vaultId,
            systemInstructionOverride: systemInstruction,
          },
        );

        // Final persistence update
        const finalMsgs = (await context.chatHistory.getMessages?.()) ?? [
          ...context.chatHistory.messages,
        ];
        const assistantMsgIndex = finalMsgs.findIndex(
          (m: any) => m.id === assistantMsg.id,
        );
        if (assistantMsgIndex !== -1) {
          finalMsgs[assistantMsgIndex].entityId = characterId;
        }
        await context.chatHistory.setMessages(finalMsgs);

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      });
    } catch (err: any) {
      console.error("[GuestChatExecutor] Execution failed:", err);
      await context.chatHistory.addMessage({
        id: this.idGenerator.uuid(),
        role: "system",
        content: `❌ Generation failed: ${err.message || err}`,
      });
    } finally {
      this.isExecuting = false;
    }
  }
}
