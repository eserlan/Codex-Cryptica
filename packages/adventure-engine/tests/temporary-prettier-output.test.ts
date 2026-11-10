import { it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import * as prettier from "prettier";

const files = [
  "packages/adventure-engine/src/cross-scenario-causality.ts",
  "packages/adventure-engine/src/types.ts",
  "packages/adventure-engine/src/scenario-schemas.ts",
  "packages/adventure-engine/src/schemas.ts",
  "packages/adventure-engine/src/index.ts",
  "packages/adventure-engine/tests/cross-scenario-causality.test.ts"
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
