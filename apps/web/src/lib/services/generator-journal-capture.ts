import { appEventBus, type AppEventBus } from "@codex/events";
import {
  JOURNAL_EVENTS,
  formatGeneratedResult,
  formatGeneratedSaved,
  type JournalCapturePayload,
} from "session-journal-engine";

interface CaptureDeps {
  bus?: AppEventBus;
  clock: { now(): number };
}

/**
 * Records a generated result in the running journal (Solo Play Loop, FR-008).
 * A journal problem never reaches the generator: failures are logged and
 * swallowed.
 */
export function publishGeneratedCapture(
  input: { generatorId: string; title: string; summary?: string },
  deps: CaptureDeps,
): void {
  publish(formatGeneratedResult(input), deps);
}

/** Records a save to the Vault as a short follow-up entry. */
export function publishGeneratedSaved(
  input: { title: string; category: string },
  deps: CaptureDeps,
): void {
  publish(formatGeneratedSaved(input), deps);
}

function publish(payload: JournalCapturePayload, deps: CaptureDeps): void {
  try {
    (deps.bus ?? appEventBus).emit({
      type: JOURNAL_EVENTS.CAPTURE,
      domain: "journal",
      payload,
      metadata: { timestamp: deps.clock.now() },
    });
  } catch (error) {
    console.error(
      "[GeneratorJournalCapture] Could not publish journal capture:",
      error,
    );
  }
}
