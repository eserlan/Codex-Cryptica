import {
  emptySessionPrepSteps,
  hasSessionPrepContent,
  sessionPrepTitle,
  toRunSheetMarkdown,
  toSessionPrepLore,
  type SessionPrep,
} from "generator-engine";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { SessionPrepService } from "$lib/services/seo/session-prep-service";

/**
 * With AI on, drafts any empty steps first. If that fails but the GM has
 * written enough to build from, the run sheet is built from their steps and
 * flagged as a fallback; otherwise the AI error reaches the GM.
 */
export async function buildSessionPrep(
  prep: SessionPrep,
  { useAI, service }: { useAI: boolean; service: SessionPrepService },
): Promise<{ prep: SessionPrep; output: GeneratorOutput }> {
  const wantsDraft =
    useAI &&
    hasSessionPrepContent(prep) &&
    emptySessionPrepSteps(prep).length > 0;
  if (!wantsDraft) return { prep, output: toSessionPrepOutput(prep) };

  try {
    const drafted = await service.draft(prep);
    return { prep: drafted, output: toSessionPrepOutput(drafted) };
  } catch (error) {
    if (!toRunSheetMarkdown(prep)) throw error;
    return { prep, output: toSessionPrepOutput(prep, { aiFallback: true }) };
  }
}

export const SESSION_PREP_KIND = "session-prep";

/** Builds the run sheet the layout shows, copies and saves to a vault. */
export function toSessionPrepOutput(
  prep: SessionPrep,
  options: { aiFallback?: boolean } = {},
): GeneratorOutput {
  const content = toRunSheetMarkdown(prep);
  if (!content) {
    throw new Error(
      "Fill in at least one step, or turn on AI to draft the steps from your hook.",
    );
  }
  return {
    type: "note",
    kind: SESSION_PREP_KIND,
    title: sessionPrepTitle(prep),
    summary: "A one-page run sheet. Prepared situations, not a scene order.",
    content,
    lore: toSessionPrepLore(prep),
    labels: [],
    status: "draft",
    ...(options.aiFallback ? { aiFallback: true } : {}),
  };
}
