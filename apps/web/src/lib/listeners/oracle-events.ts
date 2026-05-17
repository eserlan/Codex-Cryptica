import { appEventBus } from "@codex/events";
import { uiStore } from "../stores/ui.svelte";
import { ORACLE_EVENTS } from "@codex/oracle-engine";

/**
 * Initializes global event listeners for Oracle actions.
 * Maps engine events to UI side effects like notifications.
 * Returns an unsubscription function.
 */
export function initOracleEventListeners(): () => void {
  const unsubs: (() => void)[] = [];

  // Listen for command failures
  unsubs.push(
    appEventBus.subscribe(ORACLE_EVENTS.COMMAND_FAILED, (event) => {
      const { error, intent } = event.payload;
      console.error(`[Oracle] Command failed (${intent.type}):`, error);
      uiStore.notify(error.startsWith("❌") ? error : `❌ ${error}`, "error");
    }),
  );

  // Listen for command completion
  unsubs.push(
    appEventBus.subscribe(ORACLE_EVENTS.COMMAND_COMPLETED, (event) => {
      const { intent } = event.payload;
      console.log(`[Oracle] Command completed: ${intent.type}`);
    }),
  );

  // Listen for entity creation
  unsubs.push(
    appEventBus.subscribe(ORACLE_EVENTS.ENTITY_CREATED, (event) => {
      const { title } = event.payload;
      uiStore.notify(`✨ Created: ${title}`, "success");
    }),
  );

  // Listen for discoveries
  unsubs.push(
    appEventBus.subscribe(ORACLE_EVENTS.ENTITY_DISCOVERED, (event) => {
      const { proposal } = event.payload;
      console.log(`[Oracle] Entity discovered: ${proposal.title}`);
    }),
  );

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}
