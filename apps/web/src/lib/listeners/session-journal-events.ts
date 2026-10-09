import { appEventBus, type AppEventBus } from "@codex/events";
import { sessionJournalStore } from "$lib/stores/session-journal.svelte";
import {
  SessionJournalCapture,
  type JournalCaptureTarget,
} from "$lib/stores/session-journal-capture";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

/**
 * Starts the Session Journal's capture listener (spec 163, slice 3): rolls,
 * card draws and table results published on the shared event bus are added to
 * the active journal. Nothing is captured in a guest / player-facing session,
 * where the journal is not available (FR-033).
 * Returns a function that stops listening.
 */
export function initSessionJournalCapture(
  deps: {
    store?: JournalCaptureTarget;
    bus?: AppEventBus;
    isGuestMode?: () => boolean;
  } = {},
): () => void {
  const {
    store = sessionJournalStore,
    bus = appEventBus,
    isGuestMode = () => sessionModeStore.isGuestMode,
  } = deps;
  const capture = new SessionJournalCapture({
    store,
    bus,
    isCaptureAllowed: () => !isGuestMode(),
  });
  capture.start();
  return () => capture.stop();
}
