import {
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
} from "./schemas";
import {
  formatAdventureJsonExcerpts,
  type AdventureJsonExcerpt,
} from "./adventure-json/retrieval";
import type { DirectorRecoveryReason, ResolvedSourceExcerpt } from "./types";

export interface PromptDirectorMeta {
  enabled: boolean;
  omittedByBudget: boolean;
  truncatedByBudget: boolean;
  focusedScenarioId?: string;
  recoveryReason: DirectorRecoveryReason;
  requestedDevelopmentKind?: string;
}

/** The most the two rendered package blocks may take in the prompt. */
export const MAX_ADVENTURE_PACKAGE_PROMPT_CHARS = 6_000;
/** Upper bound for the system behavior prompt so combined worldEntry + scenarios never truncate. */
export const MAX_BEHAVIOR_PROMPT_CHARS = 20_000;

const PACKAGE_PLAYER_SAFE_KEY = "Adventure package (player-safe source)";
const PACKAGE_GM_ONLY_KEY = "GM-ONLY adventure package";

export interface PromptAdventurePackage {
  playerSafe: AdventureJsonExcerpt[];
  gmOnly: AdventureJsonExcerpt[];
}

export interface PromptBudgetInput {
  behavior: string;
  state: string;
  input: string;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  transcript: string;
  adventurePackage?: PromptAdventurePackage;
  directorMeta?: PromptDirectorMeta;
}

export interface PromptBudgetResult {
  behavior: string;
  state: string;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  transcript: string;
  serialized: string;
  includedSourceIds: string[];
  directorMeta?: PromptDirectorMeta;
  [PACKAGE_PLAYER_SAFE_KEY]?: string;
  [PACKAGE_GM_ONLY_KEY]?: string;
}

function trimText(value: string, limit: number): string {
  return value.length <= limit
    ? value
    : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function parseJsonPayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function trimExcerpts(
  excerpts: ResolvedSourceExcerpt[],
  contentLimit: number,
  loreLimit: number,
): ResolvedSourceExcerpt[] {
  let contentRemaining = contentLimit;
  let loreRemaining = loreLimit;
  return excerpts.flatMap((excerpt) => {
    if (contentRemaining <= 0) return [];
    const content = trimText(excerpt.content, contentRemaining);
    contentRemaining -= content.length;
    const lore = excerpt.lore
      ? trimText(excerpt.lore, loreRemaining)
      : undefined;
    loreRemaining -= lore?.length ?? 0;
    return [{ ...excerpt, content, ...(lore && { lore }) }];
  });
}

/**
 * Cheap pre-cut: an excerpt renders at least as long as its text, so excerpts
 * past this many characters of text can never fit.
 */
function withinTextBound(
  excerpts: AdventureJsonExcerpt[],
  min: number,
): AdventureJsonExcerpt[] {
  let total = 0;
  let count = 0;
  for (const excerpt of excerpts) {
    total += excerpt.text.length;
    if (total > MAX_ADVENTURE_PACKAGE_PROMPT_CHARS && count >= min) break;
    count += 1;
  }
  return excerpts.slice(0, count);
}

interface RenderedPackage {
  playerSafe: string;
  gmOnly: string;
}

function render(
  playerSafe: AdventureJsonExcerpt[],
  gmOnly: AdventureJsonExcerpt[],
): RenderedPackage {
  return {
    playerSafe: playerSafe.length
      ? formatAdventureJsonExcerpts(playerSafe, PACKAGE_PLAYER_SAFE_KEY)
      : "",
    gmOnly: gmOnly.length
      ? formatAdventureJsonExcerpts(gmOnly, PACKAGE_GM_ONLY_KEY)
      : "",
  };
}

function fits(rendered: RenderedPackage): boolean {
  return (
    rendered.playerSafe.length + rendered.gmOnly.length <=
    MAX_ADVENTURE_PACKAGE_PROMPT_CHARS
  );
}

/** The largest count from `min` to `max` for which `fitsAt` holds. */
function largestFit(
  max: number,
  min: number,
  fitsAt: (count: number) => boolean,
): number {
  let low = min;
  let high = max;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fitsAt(mid)) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * Renders both package lists within MAX_ADVENTURE_PACKAGE_PROMPT_CHARS. Whole
 * excerpts go from the end of gmOnly first, then from the end of playerSafe;
 * a lone focus excerpt that is still too long has its text trimmed.
 */
function renderPackage(
  playerSafe: AdventureJsonExcerpt[],
  gmOnly: AdventureJsonExcerpt[],
): RenderedPackage {
  const player = withinTextBound(playerSafe, 1);
  const gm = withinTextBound(gmOnly, 0);
  if (fits(render(player, gm))) return render(player, gm);
  const keepGm = largestFit(gm.length, 0, (n) =>
    fits(render(player, gm.slice(0, n))),
  );
  if (keepGm > 0 || fits(render(player, []))) {
    return render(player, gm.slice(0, keepGm));
  }
  const kept = player.slice(
    0,
    largestFit(player.length, 1, (n) => fits(render(player.slice(0, n), []))),
  );
  if (fits(render(kept, []))) return render(kept, []);
  const focus = kept[0]!;
  const trimmed = (n: number) => [
    { ...focus, text: `${focus.text.slice(0, n)}…` },
  ];
  const keepChars = largestFit(focus.text.length, 0, (n) =>
    fits(render(trimmed(n), [])),
  );
  return render(trimmed(keepChars), []);
}

export function allocatePromptBudget(
  input: PromptBudgetInput,
): PromptBudgetResult {
  if (input.state.length > MAX_SERIALIZED_STATE_CHARS) {
    throw new Error("state-budget-exceeded");
  }
  const result = {
    behavior: trimText(input.behavior, MAX_BEHAVIOR_PROMPT_CHARS),
    state: input.state,
    anchors: trimExcerpts(input.anchors, 24_000, 8_000),
    relevant: trimExcerpts(input.relevant, 12_000, 6_000),
    transcript: trimText(input.transcript, 8_000),
  };
  const adventurePackage = input.adventurePackage
    ? renderPackage(
        input.adventurePackage.playerSafe,
        input.adventurePackage.gmOnly,
      )
    : undefined;
  const packageKeys = {
    ...(adventurePackage?.playerSafe
      ? { [PACKAGE_PLAYER_SAFE_KEY]: adventurePackage.playerSafe }
      : {}),
    ...(adventurePackage?.gmOnly
      ? { [PACKAGE_GM_ONLY_KEY]: adventurePackage.gmOnly }
      : {}),
  };
  const serialized = JSON.stringify({
    ...packageKeys,
    state: parseJsonPayload(result.state),
    anchors: result.anchors,
    relevant: result.relevant,
    transcript: parseJsonPayload(result.transcript),
    // The current player action and roll result are authoritative. Trimming
    // serialized JSON here can cut them off after a long adventure premise.
    input: JSON.parse(input.input) as unknown,
  });
  if (serialized.length > MAX_GENERATION_INPUT_CHARS)
    throw new Error("generation-budget-exceeded");
  return {
    ...result,
    ...packageKeys,
    serialized,
    includedSourceIds: [...result.anchors, ...result.relevant].map(
      (source) => source.recordId,
    ),
    ...(input.directorMeta ? { directorMeta: input.directorMeta } : {}),
  };
}
