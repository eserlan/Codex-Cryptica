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
import { GeneratorEngineMystery } from "./generator-engine-mystery";
export { GeneratorEngineMystery } from "./generator-engine-mystery";
export class DefaultGeneratorEngine extends GeneratorEngineMystery {
  constructor(clientManager = aiClientManager) {
    super(clientManager);
  }
}
export const generatorEngine = new DefaultGeneratorEngine();
