import { z } from "zod";
import { FEEDBACK_AREAS } from "./area";

export const FEEDBACK_KINDS = ["problem", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_BROWSERS = [
  "chrome",
  "edge",
  "firefox",
  "safari",
  "samsung",
  "other",
] as const;
export type FeedbackBrowser = (typeof FEEDBACK_BROWSERS)[number];

export const FEEDBACK_SCREENS = ["narrow", "wide"] as const;
export type FeedbackScreen = (typeof FEEDBACK_SCREENS)[number];

export const FEEDBACK_ERROR_CODES = [
  "invalid",
  "forbidden_origin",
  "rate_limited",
  "in_progress",
  "unavailable",
  "misconfigured",
] as const;
export type FeedbackErrorCode = (typeof FEEDBACK_ERROR_CODES)[number];

/** Fixed user-facing messages. Upstream error text is never shown. */
export const FEEDBACK_ERROR_MESSAGES: Record<FeedbackErrorCode, string> = {
  invalid: "Please check the form and try again.",
  forbidden_origin: "Reports can't be sent from this site.",
  rate_limited: "You've sent several reports recently. Please try again later.",
  in_progress: "This report is already being sent.",
  unavailable: "Your report could not be sent right now. Please try again.",
  misconfigured:
    "Your report could not be sent right now. Please try again later.",
};

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FeedbackReportInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    submissionId: z.string().regex(UUID_V4),
    kind: z.enum(FEEDBACK_KINDS),
    description: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => {
        const length = [...s].length;
        return length >= 1 && length <= 4000;
      }, "description must be 1 to 4,000 characters"),
    contactEmail: z
      .string()
      .max(254)
      .optional()
      .transform((s) => (s?.trim() ? s.trim() : undefined))
      .refine(
        (s) => s === undefined || EMAIL.test(s),
        "contactEmail is malformed",
      ),
    meta: z
      .object({
        appVersion: z.string().max(32).regex(SEMVER),
        area: z.enum(FEEDBACK_AREAS),
        browser: z.enum(FEEDBACK_BROWSERS),
        screen: z.enum(FEEDBACK_SCREENS),
      })
      .strict(),
    website: z.string().max(0).optional(),
  })
  .strict();

/** What a client sends (the wire shape). */
export type FeedbackReportInput = z.input<typeof FeedbackReportInputSchema>;
/** What the worker holds after parsing: trimmed, normalised and bounded. */
export type ParsedFeedbackReport = z.output<typeof FeedbackReportInputSchema>;

/** Body limit enforced before parsing, in bytes. */
export const FEEDBACK_MAX_BODY_BYTES = 16 * 1024;
