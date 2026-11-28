import type { AdventureSession } from "@codex/adventure-engine";
import {
  measureStateBudget,
  unsummarisedTurns,
  worldEntryDiscoveryMetrics,
} from "@codex/adventure-engine";
import { generationSummary } from "./adventure-diagnostic-generation";
import { diagnosticTurnSummary } from "./adventure-diagnostic-turns";

function oocSummary(session: AdventureSession) {
  return {
    totalExchanges: (session.oocExchanges ?? []).length,
    answeredCount: (session.oocExchanges ?? []).filter(
      (entry) => entry.status === "answered",
    ).length,
    establishedDecisionsCount: (session.oocExchanges ?? []).reduce(
      (sum, entry) => sum + (entry.committedFactIds?.length ?? 0),
      0,
    ),
    latestExchangeIds: (session.oocExchanges ?? [])
      .slice(-5)
      .map((entry) => entry.id),
    oocSourcedFactCount: session.provisionalFacts.filter(
      (fact) => fact.provenance === "ooc",
    ).length,
  };
}

function secretCounts(session: AdventureSession) {
  return {
    hiddenSecrets: session.hiddenState.secrets.filter(
      (secret) => secret.status === "hidden",
    ).length,
    revealedSecrets: session.hiddenState.secrets.filter(
      (secret) => secret.status === "revealed",
    ).length,
  };
}

function scenarioCounts(scenarios: AdventureSession["scenarioCollection"]) {
  const items = scenarios?.items ?? [];
  return {
    openScenarios: items.filter((item) => item.status === "open").length,
    unheardScenarios: items.filter((item) => item.knowledge === "unheard")
      .length,
  };
}

function diagnosticPlaceSummary(session: AdventureSession) {
  return {
    currentLocation: session.visibleState.location?.text ?? null,
    currentPlace:
      session.places?.find((place) => place.id === session.currentPlaceId)
        ?.name ?? null,
    currentSituation: session.visibleState.situation?.text ?? null,
  };
}

function emergentThreadSummary(session: AdventureSession) {
  const threads = session.emergentThreads ?? [];
  const countStatus = (status: string) =>
    threads.filter((t) => t.status === status).length;
  return {
    total: threads.length,
    open: countStatus("open"),
    resolved: countStatus("resolved"),
    abandoned: countStatus("abandoned"),
    cold: countStatus("cold"),
    focusedEmergentThreadId: session.focusedEmergentThreadId ?? null,
    threads: threads.slice(-6).map((t) => ({
      id: t.id,
      title: t.title,
      ...(t.goal ? { goal: t.goal } : {}),
      status: t.status,
      ...(t.outcome ? { outcomeResult: t.outcome.result } : {}),
      provenance: t.provenance,
      turnCount: t.turnCount,
      linkedFactCount: t.linkedFactIds.length,
      linkedPersonCount: t.linkedPersonIds.length,
      linkedPlaceCount: t.linkedPlaceIds.length,
      linkedCommitmentCount: t.linkedCommitmentIds.length,
      openQuestionCount: t.openQuestions.length,
      knownConsequenceCount: t.knownConsequences.length,
      ...(t.linkedScenarioId ? { linkedScenarioId: t.linkedScenarioId } : {}),
    })),
  };
}

export function diagnosticSummary(
  session: AdventureSession,
  cutoff: number,
  lastTurn: AdventureSession["turns"][number] | undefined,
) {
  const discoveryMetrics = worldEntryDiscoveryMetrics(session);
  return {
    sessionId: session.id,
    title: session.title,
    schemaVersion: session.schemaVersion,
    revision: session.revision,
    status: session.status,
    elapsedMinutes: session.worldTime?.elapsedMinutes ?? 0,
    ...diagnosticPlaceSummary(session),
    unsummarisedTurns: unsummarisedTurns(session).length,
    ...secretCounts(session),
    ...scenarioCounts(session.scenarioCollection),
    timeToFirstSign: discoveryMetrics.timeToFirstSign,
    timeToFirstActionableLead: discoveryMetrics.timeToFirstActionableLead,
    ...diagnosticTurnSummary(session, cutoff, lastTurn),
    ooc: oocSummary(session),
    generation: generationSummary(session),
    emergentThreads: emergentThreadSummary(session),
    stateBudget: measureStateBudget(session),
    lastPlayedAt: session.lastPlayedAt,
  };
}
