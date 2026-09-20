import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * FR-016: the public Idea Developer uses only the idea the visitor submits.
 * It must not import the vault, the vault registry or any account store.
 */
const root = resolve(__dirname, "../..");
const roots = [
  join(root, "services/idea-developer"),
  join(root, "components/idea-developer"),
];
const files = [join(root, "stores/idea-developer.svelte.ts")];

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    return /\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name)
      ? [path]
      : [];
  });
}

const FORBIDDEN = [
  /stores\/vault(?:[./"']|$)/,
  /stores\/vault-registry/,
  /stores\/auth/,
  /vault-engine/,
  /\$lib\/stores\/(?:cloud|account|session)(?!-hub)/,
];

describe("Idea Developer does not read vault or account data (FR-016)", () => {
  const sources = [...roots.flatMap(collect), ...files];

  it("finds the files it is meant to check", () => {
    expect(sources.length).toBeGreaterThanOrEqual(5);
  });

  it.each(sources.map((s) => [s.replace(root, "")]))(
    "%s imports nothing from the vault or account stores",
    (relative) => {
      const path = join(root, relative);
      const text = readFileSync(path, "utf8");
      const imports = text.match(/from\s+["'][^"']+["']/g) ?? [];
      for (const line of imports) {
        for (const pattern of FORBIDDEN) {
          expect(line, `${relative}: ${line}`).not.toMatch(pattern);
        }
      }
    },
  );
});
