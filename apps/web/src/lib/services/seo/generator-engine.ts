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
import { aiClientManager } from "@codex/ai-engine";
import { GeneratorEngineSpecialized } from "./generator-engine-specialized";
export class DefaultGeneratorEngine extends GeneratorEngineSpecialized {
  constructor(clientManager = aiClientManager) {
    super(clientManager);
  }
}
export const generatorEngine = new DefaultGeneratorEngine();
