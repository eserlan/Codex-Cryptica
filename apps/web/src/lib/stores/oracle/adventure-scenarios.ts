import {
  addScenario,
  advanceManualWorldTime,
  dismissAdventureDiscoveries,
  linkAdventurePlaceRecord,
  recordScenarioTheory,
  setScenarioFocus,
  setScenarioStatus,
  type ScenarioItem,
  type ScenarioStatus,
} from "@codex/adventure-engine";
import type { AdventureSession } from "@codex/adventure-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";
import type { AdventureState } from "./adventure-state.svelte";

const STATUS_EVENT_TEXT: Record<ScenarioStatus, string> = {
  open: "The player reopened this situation.",
  resolved: "The player marked this situation resolved.",
  abandoned: "The player chose to leave this situation behind.",
};

/** Local, AI-independent scenario commands using the Adventure lease/save boundary. */
export class AdventureScenarios {
  constructor(
    private readonly state: AdventureState,
    private readonly deps: Required<AdventureManagerDependencies>,
    private readonly verifySession: (
      session: AdventureSession,
    ) => Promise<void>,
  ) {}

  add(item: ScenarioItem): Promise<AdventureSession> {
    return this.mutate((session) =>
      addScenario(session, item, session.revision, this.deps.now()),
    );
  }

  focus(scenarioId: string | null): Promise<AdventureSession> {
    return this.mutate((session) =>
      setScenarioFocus(session, scenarioId, session.revision, this.deps.now()),
    );
  }

  status(
    scenarioId: string,
    status: ScenarioStatus,
  ): Promise<AdventureSession> {
    return this.mutate((session) =>
      setScenarioStatus(
        session,
        scenarioId,
        status,
        session.revision,
        {
          id: this.deps.idGenerator(),
          kind: "status-change",
          visibility: "player",
          text: STATUS_EVENT_TEXT[status],
          at: this.deps.now(),
        },
        this.deps.now(),
      ),
    );
  }

  advanceTime(minutes: number, cause: string): Promise<AdventureSession> {
    const eventId = this.deps.idGenerator();
    return this.mutate((session) =>
      advanceManualWorldTime(
        session,
        minutes,
        cause,
        eventId,
        session.revision,
        this.deps.now(),
      ),
    );
  }

  dismissDiscoveries(factIds: string[]): Promise<AdventureSession> {
    return this.mutate((session) =>
      dismissAdventureDiscoveries(
        session,
        factIds,
        session.revision,
        this.deps.now(),
      ),
    );
  }

  linkPlaceRecord(name: string, recordId: string): Promise<AdventureSession> {
    return this.mutate((session) =>
      linkAdventurePlaceRecord(
        session,
        name,
        recordId,
        session.revision,
        this.deps.now(),
      ),
    );
  }

  recordTheory(scenarioId: string, text: string): Promise<AdventureSession> {
    const eventId = this.deps.idGenerator();
    return this.mutate((session) =>
      recordScenarioTheory(
        session,
        scenarioId,
        text,
        eventId,
        session.revision,
        this.deps.now(),
      ),
    );
  }

  private async mutate(
    command: (session: AdventureSession) => ReturnType<typeof addScenario>,
  ): Promise<AdventureSession> {
    const session = this.state.session;
    if (!session) throw new Error("no-active-adventure");
    if (this.state.readOnly) throw new Error("read-only-adventure");
    const result = command(session);
    if (!result.ok) throw new Error(result.reason);
    if (!result.changed) return session;
    await this.verifySession(session);
    const saved = await this.deps.repository.save(
      session.revision,
      result.session,
    );
    if (!saved.ok) throw saved.error;
    await this.verifySession(session);
    this.state.session = saved.session;
    return saved.session;
  }
}

const SCENARIO_ERROR_COPY: Record<string, string> = {
  "invalid-fictional-time":
    "Invalid time advance. The world clock is unchanged.",
  "revision-conflict":
    "This adventure changed elsewhere. Reopen it before updating a situation.",
  "stale-revision":
    "This adventure changed elsewhere. Reopen it before updating a situation.",
  "pending-roll":
    "Resolve or dismiss the pending roll before changing a situation.",
  "read-only-adventure": "This adventure is read-only in this tab.",
  "unknown-scenario": "That situation is no longer available.",
  "unknown-discovery": "That discovery is no longer available to dismiss.",
  "scenario-not-heard": "That situation has not been discovered yet.",
  "invalid-transition": "That situation can no longer be changed.",
  "origin-conflict":
    "This rumour differs from the version already in the adventure.",
  "id-collision": "This situation conflicts with an existing record.",
  "state-budget-exceeded":
    "There is not enough room to save that change. The adventure is unchanged.",
};

export function describeScenarioMutationError(cause: unknown): string {
  if (!(cause instanceof Error))
    return "Could not update the situation. Please retry.";
  return (
    SCENARIO_ERROR_COPY[cause.message] ??
    "Could not update the situation. Please retry."
  );
}

export function extractHeardScenarios(
  session: AdventureSession | null | undefined,
): ScenarioItem[] {
  return (
    session?.scenarioCollection?.items.filter(
      (item) => item.knowledge === "heard",
    ) ?? []
  );
}

export function extractActiveHeardScenarios(
  session: AdventureSession | null | undefined,
): ScenarioItem[] {
  return extractHeardScenarios(session).filter(
    (item) => item.status === "open",
  );
}
