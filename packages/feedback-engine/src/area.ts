/**
 * Every value a report may carry: a closed list, so no path or ID can ever be
 * stored. It mirrors the app's help areas (apps/web tests keep the two in step)
 * plus the places only reports come from.
 */
export const FEEDBACK_AREAS = [
  "entity-detail",
  "graph",
  "session-hub",
  "tables",
  "generators",
  "canvas",
  "map",
  "import",
  "settings",
  "session-journal",
  "entity-reports",
  "chronology",
  "session-prep",
  "tabletop",
  "help",
  "public-generators",
  "public-tools",
  "public-site",
  "other",
] as const;

export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export interface AreaInput {
  pathname: string;
  surface: "app" | "public";
  vttActive?: boolean;
  /** An area the caller already knows, such as the generators dialog. */
  helpArea?: string;
}

const isValid = (value: string | undefined): value is FeedbackArea =>
  value !== undefined && (FEEDBACK_AREAS as readonly string[]).includes(value);

/**
 * Maps the current page to one feedback area. Only enum values are returned:
 * the pathname is read, never stored, so no segment, query or fragment can leak.
 */
export function feedbackAreaFor(input: AreaInput): FeedbackArea {
  if (isValid(input.helpArea)) return input.helpArea;
  const path = input.pathname.split(/[?#]/)[0] ?? "";
  if (input.surface === "public") {
    if (path.startsWith("/generators")) return "public-generators";
    if (path.startsWith("/tools")) return "public-tools";
    return "public-site";
  }
  if (path.startsWith("/map") && input.vttActive) return "tabletop";
  if (path.startsWith("/map")) return "map";
  return "other";
}
