import { aiClientManager } from "@codex/ai-engine";
import { createBiomeSuggestRunner } from "#lib/services/biome/biome-suggest-runner.js";
import { oracle } from "./oracle.svelte";
import { clipboardService } from "#lib/services/ClipboardService.js";
import {
  browserStorage,
  systemClock,
  systemIdGenerator,
} from "#lib/utils/runtime-deps.js";
import { BiomeExplorerStore } from "./biome-explorer.svelte";
import { discoveryPolicyStore } from "./ui/discovery-policy.svelte";

/** The Biome Explorer client store. Production wiring. */
export const biomeExplorer = new BiomeExplorerStore({
  storage: browserStorage,
  copyText: (text) => clipboardService.copyContent({ markdown: text }),
  isAiAllowed: () => !discoveryPolicyStore.aiDisabled,
  suggest: createBiomeSuggestRunner({
    aiClient: aiClientManager,
    settings: oracle,
  }),
  isVaultWritable: () => false,
  now: () => systemClock.now(),
  newId: () => systemIdGenerator.uuid(),
});
