import type { Entity } from "schema";
import { oracle } from "$lib/stores/oracle.svelte";
import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";
import { upsertMarkdownSection } from "$lib/utils/markdown";

export const personalitySectionTitle = "Personality & Voice";

export async function generatePersonality(params: {
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

    const prompt = `Create only personality and voice notes for "${entity.title}".

Use this character context:
${editContent || entity.content || "No public character description yet."}

Private GM notes for tone only:
${getEditLore() || entity.lore || "None"}

Return only markdown for a "${personalitySectionTitle}" section body.
Use 3-5 concise bullets.
Cover temperament, conversational habits, speech rhythm, word choice, and at least one in-character behavior rule.
Do not write a full character profile.
Do not include a heading, preamble, summary, stat block, lore rewrite, secrets, or unrelated biography.`;

    let generatedText = "";
    const handlePartial = (partial: string) => {
      generatedText = partial.trim();
      setEditLore(
        upsertMarkdownSection(
          getEditLore() || entity.lore || "",
          personalitySectionTitle,
          generatedText,
        ),
      );
    };

    await oracle.textGeneration.generateResponse(
      oracle.effectiveApiKey || "",
      prompt,
      [],
      "",
      oracle.modelName || "gemini-3-flash-preview",
      oracleBridge.isReady ? Comlink.proxy(handlePartial) : handlePartial,
      false,
      [],
      {
        systemInstructionOverride:
          "You write only concise markdown personality and voice notes for tabletop RPG characters. Never rewrite the full character.",
      },
    );
    return !!generatedText.trim();
  } catch (err) {
    console.error("Failed to generate personality instructions:", err);
    setError(
      "AI generation failed. Add personality rules manually before saving.",
    );
    return false;
  } finally {
    setGenerating(false);
  }
}
