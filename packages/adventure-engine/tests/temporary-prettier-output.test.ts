import { it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import * as prettier from "prettier";

const files = [
  "apps/web/src/lib/components/oracle/adventure/AdventureKnownSituation.svelte",
  "apps/web/src/lib/components/oracle/adventure/AdventureKnownSituations.svelte",
  "apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.svelte",
  "apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.test.ts"
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
