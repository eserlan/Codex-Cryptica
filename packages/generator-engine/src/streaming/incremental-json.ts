/**
 * Incrementally scans a *growing* JSON-object string buffer and reports
 * top-level fields as soon as they're complete (#2423), so a generator UI
 * can render `name`/`title`/`summary` etc. while later fields are still
 * streaming in — without ever treating a partial/unbalanced buffer as valid
 * JSON. Only depth-1 keys of the outermost object are inspected; nested
 * object/array values are never partially parsed, only reported once their
 * matching brace/bracket closes.
 *
 * This is deliberately separate from `extractJsonObject` (apps/web's
 * ai-generator-gateway.ts), which operates once on a *complete* string —
 * final validation must still run `extractJsonObject`/`JSON.parse` against
 * the fully accumulated text; fields reported here are UI-only and never
 * substitute for that.
 */

export interface IncrementalJsonField {
  key: string;
  value: unknown;
}

/**
 * Creates a scanner bound to one generation's growing buffer. Call `scan()`
 * with the *entire* buffer so far each time more text arrives; it returns
 * only the fields that became complete since the last call (already-emitted
 * keys are never reported twice, even if the same key coincidentally
 * reappears deeper in a malformed response).
 */
export function createIncrementalJsonScanner() {
  const emittedKeys = new Set<string>();

  return function scan(buffer: string): IncrementalJsonField[] {
    const fields: IncrementalJsonField[] = [];

    const objStart = buffer.indexOf("{");
    if (objStart === -1) return fields;

    const len = buffer.length;
    let i = objStart + 1;

    const skipWhitespace = () => {
      while (i < len && /\s/.test(buffer[i]!)) i++;
    };

    while (i < len) {
      skipWhitespace();
      if (i >= len) break;
      if (buffer[i] === "}") break;
      if (buffer[i] === ",") {
        i++;
        continue;
      }
      if (buffer[i] !== '"') {
        // Not at the start of a key — either malformed input or we've
        // drifted out of sync. Stop rather than risk misreading anything.
        break;
      }

      // --- key ---
      const keyStart = i;
      i++;
      let keyEnd = -1;
      while (i < len) {
        if (buffer[i] === "\\") {
          i += 2;
          continue;
        }
        if (buffer[i] === '"') {
          keyEnd = i;
          break;
        }
        i++;
      }
      if (keyEnd === -1) return fields; // key string not yet closed

      const rawKey = buffer.slice(keyStart, keyEnd + 1);
      i = keyEnd + 1;
      skipWhitespace();
      if (i >= len || buffer[i] !== ":") return fields; // colon not arrived yet
      i++;
      skipWhitespace();
      if (i >= len) return fields;

      // --- value ---
      const valueStart = i;
      let valueEnd = -1;

      if (buffer[i] === "{" || buffer[i] === "[") {
        const openChar = buffer[i];
        const closeChar = openChar === "{" ? "}" : "]";
        let depth = 0;
        let inStr = false;
        for (; i < len; i++) {
          const ch = buffer[i];
          if (inStr) {
            if (ch === "\\") {
              i++;
              continue;
            }
            if (ch === '"') inStr = false;
            continue;
          }
          if (ch === '"') {
            inStr = true;
            continue;
          }
          if (ch === openChar) depth++;
          else if (ch === closeChar) {
            depth--;
            if (depth === 0) {
              valueEnd = i;
              i++;
              break;
            }
          }
        }
        if (valueEnd === -1) return fields; // unbalanced so far — incomplete
      } else if (buffer[i] === '"') {
        i++;
        let closed = false;
        for (; i < len; i++) {
          if (buffer[i] === "\\") {
            i++;
            continue;
          }
          if (buffer[i] === '"') {
            closed = true;
            break;
          }
        }
        if (!closed) return fields;
        valueEnd = i;
        i++;
      } else {
        // number / true / false / null: scan until the next unescaped
        // comma or closing brace at this depth.
        let j = i;
        while (j < len && buffer[j] !== "," && buffer[j] !== "}") j++;
        if (j >= len) return fields; // terminator not seen yet — incomplete
        valueEnd = j - 1;
        i = j;
      }

      const rawValue = buffer.slice(valueStart, valueEnd + 1).trim();

      let key: string;
      let value: unknown;
      try {
        key = JSON.parse(rawKey);
        value = JSON.parse(rawValue);
      } catch {
        // Scanning logic above should keep this in sync with real JSON
        // grammar, but bail safely rather than emit a garbage field.
        return fields;
      }

      if (!emittedKeys.has(key)) {
        emittedKeys.add(key);
        fields.push({ key, value });
      }

      skipWhitespace();
      if (i < len && buffer[i] === ",") {
        i++;
        continue;
      }
      if (i < len && buffer[i] === "}") break;
    }

    return fields;
  };
}
