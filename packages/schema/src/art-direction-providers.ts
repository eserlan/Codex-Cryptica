/**
 * Art Direction v2 — provider adapters.
 *
 * Category and theme definitions are provider-neutral. Everything that varies
 * between image providers — how negatives are expressed, whether named artists
 * are permitted, how long a prompt may be — lives here and nowhere else.
 */

import type { ComposedImagePrompt } from "./art-direction-composer";

export type ImageProviderId = "gemini" | "cloudflare" | "custom";

/** How a provider accepts negative direction. */
export type NegativeFormat =
  /** A dedicated `negative_prompt` request field. */
  | "field"
  /** Inline `--no a, b, c` appended to the positive prompt. */
  | "inline"
  /** Inline prose, for providers with no negative support at all. */
  | "prose"
  /** Provider ignores negatives entirely; drop them. */
  | "none";

export interface ProviderCapabilities {
  id: ImageProviderId;
  negativeFormat: NegativeFormat;
  /** Maximum positive prompt length in characters. */
  maxPromptLength: number;
  /**
   * Whether named style lineages may be sent. Providers that reject named
   * artists get the reviewed name-free fallback instead.
   */
  allowsNamedStyles: boolean;
  /**
   * Whether film stock, lens, and camera-body syntax is understood. Providers
   * that ignore it waste prompt budget on it.
   */
  supportsCameraSyntax: boolean;
}

export const PROVIDER_CAPABILITIES: Record<
  ImageProviderId,
  ProviderCapabilities
> = {
  // Gemini image models take a single text prompt and have no negative field.
  gemini: {
    id: "gemini",
    negativeFormat: "prose",
    maxPromptLength: 4000,
    allowsNamedStyles: true,
    supportsCameraSyntax: true,
  },
  // Cloudflare Workers AI diffusion models accept `negative_prompt`.
  cloudflare: {
    id: "cloudflare",
    negativeFormat: "field",
    maxPromptLength: 2000,
    allowsNamedStyles: true,
    supportsCameraSyntax: true,
  },
  // OpenAI-compatible endpoints (Together and friends) accept `negative_prompt`.
  custom: {
    id: "custom",
    negativeFormat: "field",
    maxPromptLength: 2000,
    allowsNamedStyles: true,
    supportsCameraSyntax: true,
  },
};

export interface ProviderPayload {
  /** The positive prompt, already carrying inline negatives if applicable. */
  prompt: string;
  /** Populated only when the provider exposes a dedicated negative field. */
  negativePrompt?: string;
  /** True when the prompt had to be shortened to fit the provider limit. */
  truncated: boolean;
}

export function getProviderCapabilities(
  provider?: ImageProviderId,
): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider || "gemini"];
}

function capForProvider(
  prompt: string,
  maxLength: number,
): { prompt: string; truncated: boolean } {
  if (prompt.length <= maxLength) return { prompt, truncated: false };
  const hardCut = prompt.slice(0, maxLength);
  const lastBoundary = hardCut.lastIndexOf(". ");
  return {
    prompt:
      lastBoundary > maxLength * 0.6
        ? hardCut.slice(0, lastBoundary + 1)
        : hardCut.trimEnd(),
    truncated: true,
  };
}

/**
 * Formats a composed prompt for one provider.
 *
 * Negatives are attached in whichever form the provider understands; the
 * positive prompt is capped last so an inline negative block is never cut in
 * half.
 */
export function formatForProvider(
  composed: Pick<ComposedImagePrompt, "prompt" | "negativeTerms">,
  provider?: ImageProviderId,
): ProviderPayload {
  const capabilities = getProviderCapabilities(provider);
  const terms = composed.negativeTerms || [];

  if (terms.length === 0 || capabilities.negativeFormat === "none") {
    const capped = capForProvider(
      composed.prompt,
      capabilities.maxPromptLength,
    );
    return { prompt: capped.prompt, truncated: capped.truncated };
  }

  if (capabilities.negativeFormat === "field") {
    const capped = capForProvider(
      composed.prompt,
      capabilities.maxPromptLength,
    );
    return {
      prompt: capped.prompt,
      negativePrompt: terms.join(", "),
      truncated: capped.truncated,
    };
  }

  const suffix =
    capabilities.negativeFormat === "inline"
      ? ` --no ${terms.join(", ")}`
      : ` Avoid: ${terms.join(", ")}.`;

  // Reserve room for the negative block so capping never truncates it.
  const budget = Math.max(0, capabilities.maxPromptLength - suffix.length);
  const capped = capForProvider(composed.prompt, budget);

  return {
    prompt: `${capped.prompt}${suffix}`,
    truncated: capped.truncated,
  };
}
