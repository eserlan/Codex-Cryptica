/**
 * Extract the first balanced JSON object from a model reply, tolerating JSON
 * fences, leading prose and trailing text. Explicit array and string envelopes
 * are returned intact so callers can validate their expected response shape.
 * This extracts a candidate; callers remain responsible for parsing and
 * validating it.
 */
export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const candidate = selectCandidate(trimmed);

  if (isArrayOrStringEnvelope(candidate)) return candidate;
  return extractBalancedObject(candidate);
}

function selectCandidate(trimmed: string): string {
  const fenced = findSupportedFence(trimmed);
  if (fenced !== undefined) return fenced;

  if (trimmed.startsWith("{") || isArrayOrStringEnvelope(trimmed)) {
    return trimmed;
  }
  return stripSurroundingJsonFence(trimmed);
}

function isArrayOrStringEnvelope(value: string): boolean {
  return value.startsWith("[") || value.startsWith('"');
}

function extractBalancedObject(candidate: string): string {
  const start = candidate.indexOf("{");
  if (start === -1) return candidate;

  const state: JsonObjectScanState = {
    depth: 0,
    inString: false,
    escaped: false,
  };

  for (let index = start; index < candidate.length; index++) {
    if (advanceJsonObjectScan(candidate[index], state)) {
      return candidate.slice(start, index + 1);
    }
  }

  return candidate.slice(start);
}

interface JsonObjectScanState {
  depth: number;
  inString: boolean;
  escaped: boolean;
}

function advanceJsonObjectScan(
  character: string,
  state: JsonObjectScanState,
): boolean {
  if (state.inString) {
    if (state.escaped) state.escaped = false;
    else if (character === "\\") state.escaped = true;
    else if (character === '"') state.inString = false;
    return false;
  }

  if (character === '"') {
    state.inString = true;
    return false;
  }
  if (character === "{") {
    state.depth++;
    return false;
  }
  if (character !== "}") return false;

  state.depth--;
  return state.depth === 0;
}

function findSupportedFence(raw: string): string | undefined {
  const fences =
    /^[ \t]*```[ \t]*(json)?[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*(?:\r?\n|$)/gim;
  const match = fences.exec(raw);
  return match?.[2]?.trim();
}

function stripSurroundingJsonFence(raw: string): string {
  const jsonOpening = /^```json(?:[ \t]*\r?\n|[ \t]+)/i;
  const plainOpening = /^```[ \t]*\r?\n/;
  if (jsonOpening.test(raw)) {
    return raw
      .replace(jsonOpening, "")
      .replace(/\r?\n?```[ \t]*$/, "")
      .trim();
  }
  if (plainOpening.test(raw)) {
    return raw
      .replace(plainOpening, "")
      .replace(/\r?\n?```[ \t]*$/, "")
      .trim();
  }
  return raw;
}
