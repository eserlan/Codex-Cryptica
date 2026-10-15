/** Public compatibility facade for campaign draft generation and saving. */
export {
  composeDraftVaultFields,
  type GeneratorVaultGateway,
  type CampaignGeneratorServiceDeps,
  DraftSaveError,
} from "./campaign-generator-service-core";
export {
  LanguageGenerationError,
  assertValidLanguageFallback,
} from "./campaign-generator-language";
export { parseConnections } from "./campaign-connections";
import { CampaignGeneratorPersistenceService } from "./campaign-generator-service-persistence";

export class CampaignGeneratorService extends CampaignGeneratorPersistenceService {}

export const campaignGeneratorService = new CampaignGeneratorService();
