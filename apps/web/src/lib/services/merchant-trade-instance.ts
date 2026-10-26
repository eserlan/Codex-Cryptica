import { appEventBus } from "@codex/events";
import { JOURNAL_EVENTS } from "session-journal-engine";
import { systemClock } from "#lib/utils/runtime-deps.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";
import { MerchantTradeService, createCommerceRegistry } from "./merchant-trade";

/** Production wiring for merchant trades (#3963). Tests build their own. */
export const merchantTradeService = new MerchantTradeService({
  getEntity: (id) => vault.entities[id],
  saveSheet: (id, statSheet) => vault.updateEntity(id, { statSheet }),
  getTemplate: (templateId) =>
    statSheetTemplates.allTemplates.find((t) => t.id === templateId),
  registry: createCommerceRegistry(),
  publishCapture: (payload) => {
    appEventBus.emit({
      type: JOURNAL_EVENTS.CAPTURE,
      domain: "journal",
      payload,
      metadata: { timestamp: systemClock.now() },
    });
  },
  now: () => new Date(systemClock.now()).toISOString(),
  isReadOnly: () => vault.isGuest,
});
