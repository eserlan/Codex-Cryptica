export {
  nameTable,
  type GeneratorOutput,
  pickFrom,
  getRandomItems,
  generateName,
} from "./generator-helpers";
export { GeneratorEngineBase } from "./generator-engine-base";
export { GeneratorEngineCore } from "./generator-engine-core";
export { GeneratorEngineWorldbuilding } from "./generator-engine-worldbuilding";
import { GeneratorEngineMystery } from "./generator-engine-mystery";
import { createLazyAIClientManager } from "#lib/services/lazy-ai-client-manager.js";
export { GeneratorEngineMystery } from "./generator-engine-mystery";
export class DefaultGeneratorEngine extends GeneratorEngineMystery {
  constructor(clientManager = createLazyAIClientManager()) {
    super(clientManager);
  }
}
export const generatorEngine = new DefaultGeneratorEngine();
