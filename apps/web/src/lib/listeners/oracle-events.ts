import { appEventBus } from "@codex/events";
import { uiStore } from "$lib/stores/ui.svelte";
import { ORACLE_EVENTS } from "@codex/oracle-engine";

/**
 * Initializes global event listeners for Oracle actions.
 * Maps engine events to UI side effects like notifications.
 */
export function initOracleEventListeners() {
  // Listen for command failures
  appEventBus.subscribe(ORACLE_EVENTS.COMMAND_FAILED, (event) => {
    const { error, intent } = event.payload;
    console.error(`[Oracle] Command failed (${intent.type}):`, error);
    uiStore.notify(error.startsWith("❌") ? error : `❌ ${error}`, "error");
  });

  // Listen for command completion (optional: could add success toasts here)
  appEventBus.subscribe(ORACLE_EVENTS.COMMAND_COMPLETED, (event) => {
    const { intent } = event.payload;
    console.log(`[Oracle] Command completed: ${intent.type}`);
  });

  // Listen for entity creation
  appEventBus.subscribe(ORACLE_EVENTS.ENTITY_CREATED, (event) => {
    const { title } = event.payload;
    uiStore.notify(`✨ Created: ${title}`, "success");
  });

  // Listen for discoveries
  appEventBus.subscribe(ORACLE_EVENTS.ENTITY_DISCOVERED, (event) => {
    const { proposal } = event.payload;
    console.log(`[Oracle] Entity discovered: ${proposal.title}`);
    // Future: Could trigger discovery UI here
  });
}
