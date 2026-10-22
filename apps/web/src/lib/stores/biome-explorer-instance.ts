import { aiClientManager } from "@codex/ai-engine";
import { createBiomeSuggestRunner } from "$lib/services/biome/biome-suggest-runner";
import { oracle } from "./oracle.svelte";
import { clipboardService } from "$lib/services/ClipboardService";
import {
  createWebBiomeVaultGateway,
  type BiomeVaultLike,
} from "$lib/services/biome/biome-vault-gateway";
import {
  browserStorage,
  systemClock,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";
import { BiomeExplorerStore } from "./biome-explorer.svelte";
import { discoveryPolicyStore } from "./ui/discovery-policy.svelte";
import { vault } from "./vault.svelte";

/** The Biome Explorer for the active vault. Production wiring. */
export const biomeExplorer = new BiomeExplorerStore({
  vault: createWebBiomeVaultGateway(vault as unknown as BiomeVaultLike),
  storage: browserStorage,
  copyText: (text) => clipboardService.copyContent({ markdown: text }),
  isAiAllowed: () => !discoveryPolicyStore.aiDisabled,
  suggest: createBiomeSuggestRunner({
    aiClient: aiClientManager,
    settings: oracle,
  }),
  isVaultWritable: () => vault.isInitialized && !vault.isGuest,
  now: () => systemClock.now(),
  newId: () => systemIdGenerator.uuid(),
});
