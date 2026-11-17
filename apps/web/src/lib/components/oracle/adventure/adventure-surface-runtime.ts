import type { WorldCalendar } from "chronology-engine";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import type { VaultStore } from "#lib/stores/vault.svelte.js";
import {
  adventureContextService,
  type AdventureSourceResolver,
} from "#lib/services/adventure/adventure-context-service.js";
import { configureAdventureRepository } from "#lib/services/adventure/configure-adventure-repository.js";
import { createAdventureBackgroundRequest } from "#lib/services/adventure/adventure-background-request.js";
import { createCampaignGeneratorService } from "#lib/components/generators/campaign-generator-service.js";

type SurfaceVault = Pick<
  VaultStore,
  | "activeVaultId"
  | "allEntities"
  | "entities"
  | "loadEntityContent"
  | "serviceRegistry"
  | "getSpecificVaultHandle"
>;
type RumourPolicy = { isEnabled: boolean; isAvailable: boolean };

interface RuntimeDependencies {
  getCalendar: () => WorldCalendar;
  getRumourPolicy: () => RumourPolicy;
  getTheme: () => string;
  contextService?: Pick<typeof adventureContextService, "setResolver">;
  configureRepository?: typeof configureAdventureRepository;
  createGenerator?: (
    getPolicy: () => RumourPolicy,
  ) => Pick<ReturnType<typeof createCampaignGeneratorService>, "generateDraft">;
}

function createSourceResolver(
  vault: SurfaceVault,
  getCalendar: () => WorldCalendar,
): AdventureSourceResolver {
  function requireVault(vaultId: string): void {
    if (vault.activeVaultId !== vaultId) throw new Error("vault-not-open");
  }

  async function loadRecord(vaultId: string, recordId: string) {
    await vault.loadEntityContent(recordId);
    requireVault(vaultId);
    const entity = vault.entities[recordId];
    if (!entity) return null;
    return {
      id: entity.id,
      title: entity.title,
      type: entity.type,
      text: entity.content,
      lore: entity.lore || undefined,
      connections: entity.connections,
      visibility: entity.visibility,
      start_date: entity.start_date,
      end_date: entity.end_date,
      date: entity.date,
    };
  }

  return {
    async getWorldSnapshot(vaultId) {
      requireVault(vaultId);
      return { entities: vault.allEntities, calendar: getCalendar() };
    },
    async getById(vaultId, recordId) {
      requireVault(vaultId);
      return loadRecord(vaultId, recordId);
    },
    async search(vaultId, query, limit) {
      requireVault(vaultId);
      if (!query.trim()) return [];
      const services = await vault.serviceRegistry.ensureInitialized();
      const matches = await services.search.search(query, { limit });
      requireVault(vaultId);
      const records = await Promise.all(
        matches.map((match) => loadRecord(vaultId, match.id)),
      );
      return records.filter((record): record is NonNullable<typeof record> =>
        Boolean(record?.text.trim()),
      );
    },
  };
}

/** Bind the shared repositories, context and background generation to this surface. */
export function configureAdventureSurfaceRuntime(
  vault: SurfaceVault,
  manager: Pick<AdventureManager, "setWorldEntryRumourGenerator">,
  {
    getCalendar,
    getRumourPolicy,
    getTheme,
    contextService = adventureContextService,
    configureRepository = configureAdventureRepository,
    createGenerator = createCampaignGeneratorService,
  }: RuntimeDependencies,
): void {
  configureRepository(vault);
  const generator = createGenerator(getRumourPolicy);
  manager.setWorldEntryRumourGenerator(async (session, signal, context) => {
    signal?.throwIfAborted();
    const policy = getRumourPolicy();
    const request = createAdventureBackgroundRequest(
      session,
      context,
      policy.isEnabled && policy.isAvailable,
      getTheme(),
    );
    const generated = await generator.generateDraft(request, signal);
    if (!generated.content || !generated.lore)
      throw new Error("rumour-generator-output-missing");
    return {
      title: generated.title,
      content: generated.content,
      lore: generated.lore,
    };
  });
  contextService.setResolver(createSourceResolver(vault, getCalendar));
}
