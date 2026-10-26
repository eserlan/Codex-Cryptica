import type { Entity } from "schema";
import { oracle } from "$lib/stores/oracle.svelte";
import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";
import { upsertMarkdownSection } from "$lib/utils/markdown";
import {
  buildPersonalityPrompt,
  parsePersonalityResponse,
} from "generator-engine";
import { buildRelatedEntityContext } from "@codex/oracle-engine";
import { personalitySectionTitle } from "./generate-personality";

function formatEntityContext(
  content: string,
  lore: string,
  related: ReturnType<typeof buildRelatedEntityContext>,
): string {
  const parts: string[] = [];
  if (content.trim())
    parts.push(`Existing character description:\n${content.trim()}`);
  if (lore.trim()) parts.push(`Existing GM notes:\n${lore.trim()}`);
  if (related.length) {
    const relatedBlock = related
      .map((r) => `- ${r.title} (${r.relation || r.type}): ${r.summary}`)
      .join("\n");
    parts.push(`Related entities:\n${relatedBlock}`);
  }
  return parts.join("\n\n");
}

/**
 * Richer, structured personality profile for an existing Character entity.
 * Reuses the public Personality generator's prompt/parsing (#2529) instead of
 * the simple free-text bullets from generate-personality.ts, but writes into
 * the same "Personality & Voice" lore section so Character Chat's gate
 * (guest-chat-executor.ts) keeps working with no changes there.
 */
export async function generatePersonalityProfile(params: {
  entity: Entity;
  editContent: string;
  getEditLore: () => string | undefined;
  setEditLore: (lore: string) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
}): Promise<boolean> {
  const {
    entity,
    editContent,
    getEditLore,
    setEditLore,
    setGenerating,
    setError,
  } = params;

  setGenerating(true);
  setError(null);

  try {
    if (!oracle.textGeneration.generateResponse) {
      setError(
        "AI generation is unavailable. Add personality rules manually before saving.",
      );
      return false;
    }

    const currentContent = editContent || entity.content || "";
    const currentLore = getEditLore() || entity.lore || "";

    const related = buildRelatedEntityContext({
      entity: {
        id: entity.id,
        title: entity.title,
        content: currentContent,
        lore: currentLore,
        connections: entity.connections,
      },
      incoming: { chronicle: currentContent, lore: currentLore },
      vault: oracle.vault,
      getConsolidatedContext: (candidate) =>
        candidate.content?.trim() ||
        oracle.contextRetrieval.getConsolidatedContext(candidate),
    });

    const entityContext = formatEntityContext(
      currentContent,
      currentLore,
      related,
    );

    const { systemInstruction, userMessage, resolved } = buildPersonalityPrompt(
      {},
      entityContext,
    );

    let fullText = "";
    const handleUpdate = (partial: string) => {
      fullText = partial;
    };

    await oracle.textGeneration.generateResponse(
      oracle.effectiveApiKey || "",
      userMessage,
      [],
      "",
      oracle.modelName || "gemini-3-flash-preview",
      oracleBridge.isReady ? Comlink.proxy(handleUpdate) : handleUpdate,
      false,
      [],
      { systemInstructionOverride: systemInstruction },
    );

    if (!fullText.trim()) {
      setError(
        "AI generation failed. Add personality rules manually before saving.",
      );
      return false;
    }

    const result = parsePersonalityResponse(fullText, resolved);
    const combined = [result.content, result.lore].filter(Boolean).join("\n\n");
    if (!combined.trim()) {
      setError(
        "AI generation failed. Add personality rules manually before saving.",
      );
      return false;
    }

    setEditLore(
      upsertMarkdownSection(currentLore, personalitySectionTitle, combined),
    );
    return true;
  } catch (err) {
    console.error("Failed to generate personality profile:", err);
    setError(
      "AI generation failed. Add personality rules manually before saving.",
    );
    return false;
  } finally {
    setGenerating(false);
  }
}
