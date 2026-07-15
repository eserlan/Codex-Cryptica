export type ApiErrorType =
  "offline" | "rate-limit" | "quota" | "safety" | "unknown";

export interface ClassifiedError {
  type: ApiErrorType;
  message: string;
}

export function classifyApiError(err: unknown): ClassifiedError {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      type: "offline",
      message: "You appear to be offline. Generation is unavailable.",
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  const explicitRateLimitMessage = extractExplicitRateLimitMessage(msg);
  if (explicitRateLimitMessage) {
    return {
      type: "rate-limit",
      message: explicitRateLimitMessage,
    };
  }
  if (/429|rate.?limit/i.test(msg)) {
    return {
      type: "rate-limit",
      message: "Generation limit reached. Please wait a moment.",
    };
  }
  if (/quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return {
      type: "quota",
      message: "Generation quota reached. Try again later.",
    };
  }
  if (/safety|block/i.test(msg)) {
    return {
      type: "safety",
      message: "The Oracle cannot process this request due to safety policies.",
    };
  }
  return { type: "unknown", message: "Generation failed. Please try again." };
}

function extractExplicitRateLimitMessage(message: string): string | null {
  const dailyLimitMatch = message.match(
    /(Daily image generation limit exceeded\.[\s\S]*)$/i,
  );
  return dailyLimitMatch?.[1]?.trim() || null;
}
