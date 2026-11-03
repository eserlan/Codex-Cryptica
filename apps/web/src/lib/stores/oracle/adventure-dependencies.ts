import type { AdventureTurnGenerationService } from "@codex/ai-engine";
import {
  adventureControlAuthority,
  type AdventureControlAuthority,
} from "#lib/services/adventure/adventure-control-lease.js";
import {
  adventureControlCoordinator,
  type AdventureControlCoordinator,
} from "#lib/services/adventure/adventure-control-coordinator.js";
import {
  adventureSessionRepository,
  type AdventureSessionRepository,
} from "#lib/services/adventure/adventure-session-repository.js";
import {
  adventureContextService,
  type AdventureContextService,
} from "#lib/services/adventure/adventure-context-service.js";
import { diceEngine as defaultDiceEngine } from "dice-engine";
import { systemIdGenerator } from "#lib/utils/runtime-deps.js";
import {
  defaultGenerationService,
  clearDefaultGenerationInteraction,
  confirmDefaultGenerationInteraction,
} from "./adventure-generation.svelte";
export interface AdventureManagerDependencies {
  repository?: AdventureSessionRepository;
  generation?: Pick<AdventureTurnGenerationService, "generate">;
  clearGenerationInteraction?: (sessionId: string) => Promise<void>;
  confirmGenerationInteraction?: (sessionId: string) => Promise<void>;
  context?: AdventureContextService;
  authority?: AdventureControlAuthority;
  coordinator?: AdventureControlCoordinator;
  now?: () => string;
  dice?: Pick<typeof defaultDiceEngine, "evaluate">;
  idGenerator?: () => string;
}

export function resolveAdventureDependencies({
  repository = adventureSessionRepository,
  generation = defaultGenerationService(),
  clearGenerationInteraction = clearDefaultGenerationInteraction,
  confirmGenerationInteraction = confirmDefaultGenerationInteraction,
  context = adventureContextService,
  authority = adventureControlAuthority,
  coordinator = adventureControlCoordinator,
  now = () => new Date().toISOString(),
  dice = defaultDiceEngine,
  idGenerator = systemIdGenerator.uuid,
}: AdventureManagerDependencies = {}): Required<AdventureManagerDependencies> {
  return {
    repository,
    generation,
    clearGenerationInteraction,
    confirmGenerationInteraction,
    context,
    authority,
    coordinator,
    now,
    dice,
    idGenerator,
  };
}
