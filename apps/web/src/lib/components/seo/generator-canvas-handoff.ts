import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import { PENDING_DELVE_CANVAS_KEY } from "#lib/services/seo/pending-delve-transfer.js";

export interface GeneratorCanvasHandoffDependencies {
  storeTransfer: (key: string, transfer: unknown) => void;
  unregisterDevelopmentServiceWorkers: (
    isDevelopment: boolean,
  ) => Promise<void>;
  isDevelopment: boolean;
  navigate: () => Promise<void>;
  navigateInDevelopment: () => void;
}

/** Persist a generated canvas and open it, clearing stale service workers in development. */
export async function handoffGeneratorToCanvas(
  data: GeneratorOutput,
  buildTransfer: (data: GeneratorOutput) => unknown,
  dependencies: GeneratorCanvasHandoffDependencies,
): Promise<void> {
  const transfer = buildTransfer(data);
  dependencies.storeTransfer(PENDING_DELVE_CANVAS_KEY, transfer);
  await dependencies.unregisterDevelopmentServiceWorkers(
    dependencies.isDevelopment,
  );

  if (dependencies.isDevelopment) {
    dependencies.navigateInDevelopment();
    return;
  }

  await dependencies.navigate();
}
