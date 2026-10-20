import type { FeedbackBrowser, FeedbackScreen } from "./contract";

export interface NavigatorLike {
  userAgentData?: { brands?: Array<{ brand: string }> };
  userAgent?: string;
}

const BRAND_RULES: Array<[RegExp, FeedbackBrowser]> = [
  [/Microsoft Edge/i, "edge"],
  [/Samsung Internet/i, "samsung"],
  [/Firefox/i, "firefox"],
  [/Google Chrome|Chromium/i, "chrome"],
];

/** Browser family only, never a version or a full user agent string. */
export function browserFamily(nav: NavigatorLike): FeedbackBrowser {
  for (const { brand } of nav.userAgentData?.brands ?? []) {
    for (const [pattern, family] of BRAND_RULES)
      if (pattern.test(brand)) return family;
  }
  const ua = nav.userAgent ?? "";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\/|Chromium/.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

/** Narrow under 640 CSS pixels, as the rest of the app uses for its phone layout. */
export function screenClass(width: number): FeedbackScreen {
  return width < 640 ? "narrow" : "wide";
}
