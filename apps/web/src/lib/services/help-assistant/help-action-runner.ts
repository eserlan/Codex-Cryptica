import {
  validateAction,
  type GuidanceAction,
  type GuidanceStep,
  type HelpContext,
} from "help-engine";
import type { DestinationId } from "help-engine";
import type { HelpSurfaceRegistry } from "$lib/stores/help-assistant/help-surface.svelte";
import type { HelpHighlightService } from "./help-highlight.svelte";

export interface HelpActionRunnerDeps {
  surfaces: Pick<HelpSurfaceRegistry, "entityDetail">;
  highlight: Pick<HelpHighlightService, "show">;
  context: () => HelpContext;
  helpIds: () => ReadonlySet<string>;
  goto: (path: string) => void | Promise<void>;
  destinationPath: (destination: DestinationId) => string;
  openHelp: (helpId: string) => void;
  /** Opens the generator workflow, on the chosen generator when one is given. */
  openGenerator: (generatorId?: string) => void;
  /** Resolves true once `check` passes, or false after `ms`. */
  waitFor: (check: () => boolean, ms: number) => Promise<boolean>;
}

const TARGET_WAIT_MS = 1000;

/**
 * Runs a guide the user has accepted. It only ever moves the user around and
 * points at things: go somewhere, open help, open a tab, open the generator,
 * highlight a control. None of those touch vault content, and this module has
 * no dependency that could. It checks the guide against the current screen
 * again before starting, because the screen may have changed since the offer.
 */
export class HelpActionRunner {
  constructor(private readonly deps: HelpActionRunnerDeps) {}

  /** Returns true when at least the first step ran. */
  async run(action: GuidanceAction): Promise<boolean> {
    const valid = validateAction(action, this.deps.context(), {
      helpIds: this.deps.helpIds(),
    });
    if (!valid) return false;

    const first = await this.step(valid);
    if (first && valid.then) await this.step(valid.then);
    return first;
  }

  private async step(step: GuidanceStep): Promise<boolean> {
    switch (step.type) {
      case "navigate":
        await this.deps.goto(this.deps.destinationPath(step.to));
        return true;
      case "openHelp":
        this.deps.openHelp(step.helpId);
        return true;
      case "openGenerator":
        this.deps.openGenerator(step.generatorId);
        return true;
      case "openPanel": {
        const surface = this.deps.surfaces.entityDetail;
        if (!surface) return false;
        surface.openTab(step.panel === "status-tab" ? "status" : "connections");
        return true;
      }
      case "highlight": {
        // The control may only mount after the previous step (a tab opening).
        let shown = false;
        await this.deps.waitFor(() => {
          shown = this.deps.highlight.show(step.target, step.label);
          return shown;
        }, TARGET_WAIT_MS);
        return shown;
      }
    }
  }
}
