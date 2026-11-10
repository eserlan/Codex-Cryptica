import { it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import * as prettier from "prettier";

const files = [
  "packages/adventure-engine/src/manual-world-time.ts",
  "packages/adventure-engine/src/scenario-collection.ts",
  "packages/adventure-engine/src/index.ts",
  "apps/web/src/lib/stores/oracle/adventure-scenarios.ts",
  "apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts",
  "apps/web/src/lib/components/oracle/adventure/AdventureSituationSettings.svelte",
  "packages/adventure-engine/tests/world-time.test.ts"
];
const root = fileURLToPath(new URL("../../../", import.meta.url));

it("temporary format output for CI review", async () => {
  for (const path of files) {
    const filepath = resolve(root, path);
    const config = await prettier.resolveConfig(filepath);
    const content = await readFile(filepath, "utf8");
    const formatted = await prettier.format(content, { ...config, filepath });
    console.log("CC_PREFORMAT_" + JSON.stringify({ path, content: formatted }));
  }
});
