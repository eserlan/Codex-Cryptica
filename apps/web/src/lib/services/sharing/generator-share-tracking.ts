import { trackEvent } from "$lib/services/analytics/zaraz-analytics";

export type GeneratorShareSource =
  "current_output" | "session_hub_detail" | "shared_page";

export interface GeneratorShareEventInput {
  generatorType: string;
  source: GeneratorShareSource;
}

function properties(input: GeneratorShareEventInput) {
  return {
    generator_type: input.generatorType,
    source: input.source,
  };
}

export function trackGeneratorShareCreated(input: GeneratorShareEventInput) {
  trackEvent("generator_share_created", properties(input));
}

export function trackGeneratorShareLinkCopied(input: GeneratorShareEventInput) {
  trackEvent("generator_share_link_copied", properties(input));
}

export function trackGeneratorShareClicked(input: GeneratorShareEventInput) {
  trackEvent("generator_share_clicked", properties(input));
}

export function trackGeneratorShareCompleted(input: GeneratorShareEventInput) {
  trackEvent("generator_share_completed", properties(input));
}

export function trackGeneratorShareOpened(
  input: GeneratorShareEventInput & { shareId: string },
) {
  trackEvent("generator_share_opened", {
    ...properties(input),
    share_id: input.shareId,
  });
}

export function trackGeneratorShareRemixClicked(
  input: GeneratorShareEventInput & { shareId: string },
) {
  trackEvent("generator_share_remix_clicked", {
    ...properties(input),
    share_id: input.shareId,
  });
}

export function trackGeneratorShareGenerateClicked(
  input: GeneratorShareEventInput & { shareId: string },
) {
  trackEvent("generator_share_generate_clicked", {
    ...properties(input),
    share_id: input.shareId,
  });
}
