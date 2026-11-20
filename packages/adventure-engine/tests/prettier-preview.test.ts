import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { format, resolveConfig } from "prettier";
import { test } from "vitest";

// Temporary formatting probe, removed before the PR is ready.
test("format-preview", async () => {
  const files = [
    ["SOURCE", "../src/dialogue-pacing.ts"],
    ["TEST", "./dialogue-pacing.test.ts"],
  ] as const;
  for (const [key, relative] of files) {
    const path = resolve(import.meta.dir, relative);
    const source = readFileSync(path, "utf8");
    const options = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...options, filepath: path });
    console.log(`FORMAT_PREVIEW_${key}=${Buffer.from(formatted).toString("base64")}`);
  }
  throw new Error("Remove formatting preview after collecting output");
});
