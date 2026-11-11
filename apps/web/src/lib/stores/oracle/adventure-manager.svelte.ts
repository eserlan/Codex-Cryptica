import { AdventureState } from "./adventure-state.svelte";
import { AdventureRuntime } from "./adventure-runtime";
import {
  resolveAdventureDependencies,
  type AdventureManagerDependencies,
} from "./adventure-dependencies";
import { AdventureOpening } from "./adventure-opening";
import { AdventureLifecycle } from "./adventure-lifecycle";
import { AdventureActions } from "./adventure-actions";
import { AdventureRolls } from "./adventure-rolls";
import { AdventureTools } from "./adventure-tools";
import type { AdventureScenarios } from "./adventure-scenarios";
export type { AdventureManagerDependencies } from "./adventure-dependencies";
export { hasCommittedOpening } from "./adventure-session";

/** Compatibility facade: one reactive state, composed focused workflows. */
export class AdventureManager extends AdventureState {
  private readonly runtime: AdventureRuntime;
  private readonly opening: AdventureOpening;
  private readonly lifecycle: AdventureLifecycle;
  private readonly actions: AdventureActions;
  private readonly rolls: AdventureRolls;
  private readonly tools: AdventureTools;
  private readonly scenarios: AdventureScenarios;

  constructor(dependencies: AdventureManagerDependencies = {}) {
    super();
    this.runtime = new AdventureRuntime(
      this,
      resolveAdventureDependencies(dependencies),
    );
    this.opening = new AdventureOpening(this.runtime);
    this.rolls = new AdventureRolls(this.runtime);
    this.lifecycle = new AdventureLifecycle(this.runtime, () =>
      this.resolveRoll(),
    );
    this.actions = new AdventureActions(this.runtime);
    this.tools = new AdventureTools(this.runtime);
    this.scenarios = this.runtime.scenarios;
  }

  setWorldEntryRumourGenerator(
    generator: Parameters<AdventureRuntime["background"]["setGenerator"]>[0],
  ): void {
    this.runtime.background.setGenerator(generator);
  }

  start(
    ...args: Parameters<AdventureOpening["start"]>
  ): ReturnType<AdventureOpening["start"]> {
    return this.opening.start(...args);
  }

  retryOpening(): Promise<void> {
    return this.opening.retryOpening();
  }

  open(
    ...args: Parameters<AdventureLifecycle["open"]>
  ): ReturnType<AdventureLifecycle["open"]> {
    return this.lifecycle.open(...args);
  }

  tryTakeControl(
    ...args: Parameters<AdventureLifecycle["tryTakeControl"]>
  ): ReturnType<AdventureLifecycle["tryTakeControl"]> {
    return this.lifecycle.tryTakeControl(...args);
  }

  openActive(
    ...args: Parameters<AdventureLifecycle["openActive"]>
  ): ReturnType<AdventureLifecycle["openActive"]> {
    return this.lifecycle.openActive(...args);
  }

  switchTo(
    ...args: Parameters<AdventureLifecycle["switchTo"]>
  ): ReturnType<AdventureLifecycle["switchTo"]> {
    return this.lifecycle.switchTo(...args);
  }

  end(
    ...args: Parameters<AdventureLifecycle["end"]>
  ): ReturnType<AdventureLifecycle["end"]> {
    return this.lifecycle.end(...args);
  }

  close(
    ...args: Parameters<AdventureLifecycle["close"]>
  ): ReturnType<AdventureLifecycle["close"]> {
    return this.lifecycle.close(...args);
  }

  forceEnd(
    ...args: Parameters<AdventureLifecycle["forceEnd"]>
  ): ReturnType<AdventureLifecycle["forceEnd"]> {
    return this.lifecycle.forceEnd(...args);
  }

  resumeArchived(
    ...args: Parameters<AdventureLifecycle["resumeArchived"]>
  ): ReturnType<AdventureLifecycle["resumeArchived"]> {
    return this.lifecycle.resumeArchived(...args);
  }

  destroy(
    ...args: Parameters<AdventureLifecycle["destroy"]>
  ): ReturnType<AdventureLifecycle["destroy"]> {
    return this.lifecycle.destroy(...args);
  }

  submitAction(
    ...args: Parameters<AdventureActions["submitAction"]>
  ): ReturnType<AdventureActions["submitAction"]> {
    return this.actions.submitAction(...args);
  }

  submitSuggestedAction(
    ...args: Parameters<AdventureActions["submitSuggestedAction"]>
  ): ReturnType<AdventureActions["submitSuggestedAction"]> {
    return this.actions.submitSuggestedAction(...args);
  }

  recordRollOutcome(
    ...args: Parameters<AdventureRolls["recordRollOutcome"]>
  ): ReturnType<AdventureRolls["recordRollOutcome"]> {
    return this.rolls.recordRollOutcome(...args);
  }

  rollCodexDice(
    ...args: Parameters<AdventureRolls["rollCodexDice"]>
  ): ReturnType<AdventureRolls["rollCodexDice"]> {
    return this.rolls.rollCodexDice(...args);
  }

  resolveRoll(
    ...args: Parameters<AdventureRolls["resolveRoll"]>
  ): ReturnType<AdventureRolls["resolveRoll"]> {
    return this.rolls.resolveRoll(...args);
  }

  cancel(
    ...args: Parameters<AdventureRolls["cancel"]>
  ): ReturnType<AdventureRolls["cancel"]> {
    return this.rolls.cancel(...args);
  }

  dismissRoll(
    ...args: Parameters<AdventureRolls["dismissRoll"]>
  ): ReturnType<AdventureRolls["dismissRoll"]> {
    return this.rolls.dismissRoll(...args);
  }

  submitCorrection(
    ...args: Parameters<AdventureTools["submitCorrection"]>
  ): ReturnType<AdventureTools["submitCorrection"]> {
    return this.tools.submitCorrection(...args);
  }

  addDicePreset(
    ...args: Parameters<AdventureTools["addDicePreset"]>
  ): ReturnType<AdventureTools["addDicePreset"]> {
    return this.tools.addDicePreset(...args);
  }

  removeDicePreset(
    ...args: Parameters<AdventureTools["removeDicePreset"]>
  ): ReturnType<AdventureTools["removeDicePreset"]> {
    return this.tools.removeDicePreset(...args);
  }

  addResourceCounter(
    ...args: Parameters<AdventureTools["addResourceCounter"]>
  ): ReturnType<AdventureTools["addResourceCounter"]> {
    return this.tools.addResourceCounter(...args);
  }

  adjustResourceCounter(
    ...args: Parameters<AdventureTools["adjustResourceCounter"]>
  ): ReturnType<AdventureTools["adjustResourceCounter"]> {
    return this.tools.adjustResourceCounter(...args);
  }

  removeResourceCounter(
    ...args: Parameters<AdventureTools["removeResourceCounter"]>
  ): ReturnType<AdventureTools["removeResourceCounter"]> {
    return this.tools.removeResourceCounter(...args);
  }

  addScenario(...args: Parameters<AdventureScenarios["add"]>) {
    return this.scenarios.add(...args);
  }

  focusScenario(...args: Parameters<AdventureScenarios["focus"]>) {
    return this.scenarios.focus(...args);
  }

  setScenarioStatus(...args: Parameters<AdventureScenarios["status"]>) {
    return this.scenarios.status(...args);
  }

  advanceWorldTime(...args: Parameters<AdventureScenarios["advanceTime"]>) {
    return this.scenarios.advanceTime(...args);
  }

  recordScenarioTheory(
    ...args: Parameters<AdventureScenarios["recordTheory"]>
  ) {
    return this.scenarios.recordTheory(...args);
  }
}

export const adventureManager = new AdventureManager();
