import {
  applyMilestone,
  backStep,
  currentStep,
  exitJourney,
  JOURNEYS,
  journeyForGoal,
  parseProgress,
  resumeJourney,
  returnToCurrent,
  serializeProgress,
  skipStep,
  startJourney,
  stepInstruction,
  stepPosition,
  stepState,
  type Goal,
  type JourneyDefinition,
  type JourneyId,
  type JourneyProgress,
  type Milestone,
  type MilestoneContext,
} from "onboarding-journey-engine";
import { SHELL_CONTROL_IDS, type GuidanceAction } from "help-engine";
import type { Clock, StorageLike } from "$lib/utils/runtime-deps";

export const JOURNEY_KEY_PREFIX = "codex-onboarding-journey:";
export const JOURNEY_SESSION_KEY = "codex-onboarding-journey-active";

export interface JourneyStoreDeps {
  /** Device storage for progress, one record per vault. */
  storage: StorageLike;
  /** Browser-session storage for the "card was showing" marker (reload rule). */
  sessionStorage: StorageLike;
  clock: Clock;
  /** The screen area Cif's context reports ("graph" completes the graph step). */
  area: () => string;
  /** Runs a "Show me" guide; false means "show the written instructions". */
  runGuide: (
    action: GuidanceAction,
    options: { extraAvailable: readonly string[]; signal?: AbortSignal },
  ) => Promise<boolean>;
  /** The vault's category ids. */
  categoryIds: () => readonly string[];
  /** True when Cif can answer (flag on, AI not disabled). */
  askCifAvailable: () => boolean;
  /** Opens Cif and asks a quick prompt. The only path here that sends a request. */
  askCif: (prompt: string) => void;
  tour: { readonly activeTour: unknown; skipTour(): void };
}

interface SessionMarker {
  vaultId: string;
  journeyId: JourneyId;
}

/**
 * Runs guided-setup journeys for the active vault (spec 175). It owns the
 * card's state and the progress record; the engine owns the rules. Nothing
 * here can change the vault: "Show me" goes through Cif's guide runner, and
 * Back, Skip and Exit only change what the card shows.
 */
export class JourneyStore {
  /** Progress for the active vault's journey, shown or not. */
  progress = $state<JourneyProgress | null>(null);
  /** The card is on screen (running or showing its finish state). */
  visible = $state(false);
  collapsed = $state(false);
  /** "Show me" could not run, so the written instructions are showing. */
  showingFallback = $state(false);
  /** Polite announcement for screen readers. */
  announcement = $state("");

  private vaultId: string | null = null;
  private showMeController: AbortController | null = null;

  constructor(private readonly deps: JourneyStoreDeps) {}

  get definition(): JourneyDefinition | null {
    return this.progress ? JOURNEYS[this.progress.journeyId] : null;
  }

  /** The journey card is showing, which holds other first-run prompts. */
  get active(): boolean {
    return this.visible && this.progress !== null;
  }

  get running(): boolean {
    return this.progress?.outcome === "running";
  }

  get step() {
    const def = this.definition;
    return def && this.progress ? currentStep(this.progress, def) : null;
  }

  get instruction(): string {
    const step = this.step;
    if (!step) return "";
    return this.showingFallback
      ? step.fallback
      : stepInstruction(step, this.context());
  }

  get position() {
    const def = this.definition;
    return def && this.progress
      ? stepPosition(this.progress, def)
      : { index: 0, total: 0 };
  }

  /** The step on the card is one Back moved to, not the first one not done. */
  get viewingEarlier(): boolean {
    return !!this.progress?.viewing;
  }

  get stepDone(): boolean {
    const step = this.step;
    return (
      !!step && !!this.progress && stepState(this.progress, step.id) !== "open"
    );
  }

  get canAskCif(): boolean {
    return !!this.step?.quickPrompt && this.deps.askCifAvailable();
  }

  /** Guided setup for this vault is finished or was consciously left (spec 176). */
  get setupEnded(): boolean {
    const outcome = this.progress?.outcome;
    return outcome === "finished" || outcome === "exited";
  }

  /** An exited, unfinished journey Getting Started can continue. */
  get canContinue(): boolean {
    return this.progress?.outcome === "exited";
  }

  /**
   * Loads the record for a vault. A journey still marked running only comes
   * back on screen when this browser session showed it (clarification Q4);
   * otherwise it pauses as exited and Getting Started offers Continue.
   */
  load(vaultId: string | null): void {
    this.cancelShowMe();
    this.vaultId = vaultId;
    this.visible = false;
    this.collapsed = false;
    this.showingFallback = false;
    this.progress = vaultId ? this.read(vaultId) : null;
    if (!vaultId || !this.progress || this.progress.outcome !== "running") {
      return;
    }
    const marker = this.readMarker();
    if (
      marker?.vaultId === vaultId &&
      marker.journeyId === this.progress.journeyId
    ) {
      this.visible = true;
      this.syncScreen();
    } else {
      this.commit(exitJourney(this.progress));
    }
  }

  /** Starts a goal's journey from its first step, ending a tour or another journey. */
  start(goal: Goal): void {
    if (!this.vaultId) return;
    if (this.deps.tour.activeTour) this.deps.tour.skipTour();
    const def = journeyForGoal(goal);
    this.show(startJourney(def, this.deps.clock.now()));
    this.announce(`Guided setup started: ${def.title}.`);
  }

  /** Continues an exited journey from its first step not done. */
  resume(): void {
    if (!this.progress || this.progress.outcome !== "exited") return;
    if (this.deps.tour.activeTour) this.deps.tour.skipTour();
    this.show(resumeJourney(this.progress));
  }

  /** Starts the vault's journey (or another goal's) again from the beginning. */
  startOver(goal?: Goal): void {
    const target = goal ?? (this.definition ? this.definition.goal : null);
    if (target) this.start(target);
  }

  apply(milestone: Milestone): void {
    if (!this.active || !this.running) return;
    this.transition(
      applyMilestone(
        this.progress!,
        this.definition!,
        milestone,
        this.context(),
      ),
    );
  }

  /** Applies the graph "state" milestone when the graph is showing (research R3). */
  syncScreen(): void {
    if (!this.active || !this.running) return;
    if (this.deps.area() !== "graph") return;
    this.transition(
      applyMilestone(
        this.progress!,
        this.definition!,
        { kind: "screen", area: "graph", at: this.deps.clock.now() },
        this.context(),
      ),
      false,
    );
  }

  skip(): void {
    if (!this.active) return;
    this.transition(skipStep(this.progress!, this.definition!));
  }

  back(): void {
    if (!this.active) return;
    this.transition(backStep(this.progress!, this.definition!));
  }

  returnToCurrent(): void {
    if (!this.active) return;
    this.transition(returnToCurrent(this.progress!));
  }

  /** Stops guidance at once. Progress is kept for Getting Started. */
  exit(): void {
    if (!this.progress) return;
    this.commit(exitJourney(this.progress));
    this.hide();
    this.announce("Guided setup stopped.");
  }

  /** A tour started (Help replay): the journey stops, as on Exit (FR-016). */
  tourStarted(): void {
    if (this.active && this.running) this.exit();
  }

  /** Closes the finish card. */
  done(): void {
    this.hide();
  }

  async showMe(): Promise<void> {
    const step = this.step;
    const journeyId = this.progress?.journeyId;
    if (!step?.showMe || !journeyId || !this.active || !this.running) return;
    await this.runShowMe(step.showMe, journeyId, step.id);
  }

  private async runShowMe(
    action: GuidanceAction,
    journeyId: JourneyId,
    stepId: string,
  ): Promise<void> {
    this.cancelShowMe();
    const controller = new AbortController();
    this.showMeController = controller;
    const ran = await this.deps.runGuide(action, {
      extraAvailable: SHELL_CONTROL_IDS,
      signal: controller.signal,
    });
    if (!this.isCurrentShowMe(controller, journeyId, stepId)) return;
    this.showMeController = null;
    if (!ran) {
      this.showingFallback = true;
      this.announce(this.step?.fallback ?? "");
    }
  }

  askCif(): void {
    const prompt = this.step?.quickPrompt;
    if (prompt && this.canAskCif) this.deps.askCif(prompt);
  }

  /** Runs the finish card's single suggestion, then closes the card. */
  async runNext(): Promise<void> {
    const next = this.definition?.finish.next;
    this.hide();
    if (next)
      await this.deps.runGuide(next, { extraAvailable: SHELL_CONTROL_IDS });
  }

  private context(): MilestoneContext {
    return { availableCategories: new Set(this.deps.categoryIds()) };
  }

  private show(progress: JourneyProgress): void {
    this.cancelShowMe();
    this.commit(progress);
    this.visible = true;
    this.collapsed = false;
    this.showingFallback = false;
    this.writeMarker();
    this.syncScreen();
  }

  private hide(): void {
    this.cancelShowMe();
    this.visible = false;
    this.collapsed = false;
    this.showingFallback = false;
    this.removeMarker();
  }

  private transition(next: JourneyProgress, syncAfter = true): void {
    const prev = this.progress;
    if (!prev || next === prev) return;
    const def = this.definition!;
    this.prepareTransition(prev, next, def);
    this.commit(next);
    this.announceChange(prev, next);
    if (syncAfter && next.outcome !== "finished") this.syncScreen();
  }

  /** Says what changed, for screen readers: a finish, or a step that was done. */
  private announceChange(prev: JourneyProgress, next: JourneyProgress): void {
    const def = this.definition!;
    if (next.outcome === "finished") {
      this.removeMarker();
      this.announce(`Guided setup finished. ${def.finish.message}`);
      return;
    }
    if (next.completed.length === prev.completed.length) return;
    const now = currentStep(next, def);
    this.announce(
      `Step done.${now ? ` Next: ${stepInstruction(now, this.context())}` : ""}`,
    );
  }

  private announce(text: string): void {
    this.announcement = text;
  }

  private cancelShowMe(): void {
    this.showMeController?.abort();
    this.showMeController = null;
  }

  private isCurrentShowMe(
    controller: AbortController,
    journeyId: JourneyId | undefined,
    stepId: string | undefined,
  ): boolean {
    return (
      this.showMeController === controller &&
      this.active &&
      this.running &&
      this.progress?.journeyId === journeyId &&
      this.step?.id === stepId
    );
  }

  private prepareTransition(
    prev: JourneyProgress,
    next: JourneyProgress,
    def: JourneyDefinition,
  ): void {
    const stepChanged =
      currentStep(next, def)?.id !== currentStep(prev, def)?.id;
    if (stepChanged || next.outcome !== prev.outcome) this.cancelShowMe();
    if (stepChanged) this.showingFallback = false;
  }

  private commit(progress: JourneyProgress): void {
    this.progress = progress;
    if (!this.vaultId) return;
    try {
      this.deps.storage.setItem(
        JOURNEY_KEY_PREFIX + this.vaultId,
        serializeProgress(progress),
      );
    } catch {
      // Storage full or blocked: the journey keeps running for this session.
    }
  }

  private read(vaultId: string): JourneyProgress | null {
    try {
      const raw = this.deps.storage.getItem(JOURNEY_KEY_PREFIX + vaultId);
      if (!raw) return null;
      const journeyId = (JSON.parse(raw) as { journeyId?: unknown }).journeyId;
      const def = JOURNEYS[journeyId as JourneyId];
      return def ? parseProgress(raw, def) : null;
    } catch {
      return null;
    }
  }

  private readMarker(): SessionMarker | null {
    try {
      const raw = this.deps.sessionStorage.getItem(JOURNEY_SESSION_KEY);
      return raw ? (JSON.parse(raw) as SessionMarker) : null;
    } catch {
      return null;
    }
  }

  private writeMarker(): void {
    if (!this.vaultId || !this.progress) return;
    try {
      this.deps.sessionStorage.setItem(
        JOURNEY_SESSION_KEY,
        JSON.stringify({
          vaultId: this.vaultId,
          journeyId: this.progress.journeyId,
        }),
      );
    } catch {
      // Without the marker the card simply does not come back after a reload.
    }
  }

  private removeMarker(): void {
    try {
      this.deps.sessionStorage.removeItem(JOURNEY_SESSION_KEY);
    } catch {
      // Nothing to clean up.
    }
  }
}
