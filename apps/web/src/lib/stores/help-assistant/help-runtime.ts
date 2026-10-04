import { goto } from "$app/navigation";
import { base } from "$app/paths";
import { page } from "$app/state";
import { FEATURE_REGISTRY, type DestinationId } from "help-engine";
import { getHelpArticles } from "$lib/config/help-content";
import { HelpActionRunner } from "$lib/services/help-assistant/help-action-runner";
import { buildFallback } from "$lib/services/help-assistant/help-fallback";
import { generatorsAvailable } from "$lib/services/help-assistant/generator-availability";
import { helpClient } from "$lib/services/help-assistant/help-client";
import { helpHighlight } from "$lib/services/help-assistant/help-highlight.svelte";
import { helpStore } from "$lib/stores/help.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { HelpAssistantStore } from "./help-assistant.svelte";
import { HelpContextStore } from "./help-context.svelte";
import { helpSurfaces } from "./help-surface.svelte";
import { quickNoteStore } from "$lib/stores/quicknote.svelte";
import { reportPanelStore } from "$lib/stores/ui/report-panel.svelte";

/**
 * Production wiring for the help assistant. The classes take their
 * dependencies through constructors so tests can supply fakes; this is the one
 * place the real stores are plugged in.
 */
const articleTitles = () =>
  new Map(getHelpArticles().map((article) => [article.id, article.title]));

export const helpContext = new HelpContextStore({
  getRouteId: () => page.route.id,
  surfaces: helpSurfaces,
  isGeneratorOpen: () => modalUIStore.generatorWorkflow.open,
  generatorsAvailable: () => generatorsAvailable(vault, sessionModeStore),
  getOpenSettingsTab: () =>
    modalUIStore.showSettings ? modalUIStore.activeSettingsTab : null,
  isGuestMode: () => sessionModeStore.isGuestMode,
  getOpenHelpArea: () =>
    reportPanelStore.request
      ? "entity-reports"
      : quickNoteStore.isOpen && quickNoteStore.activeTab === "journal"
        ? "session-journal"
        : null,
  journalAvailable: () => generatorsAvailable(vault, sessionModeStore),
  getActiveSidebarTool: () => layoutUIStore.activeSidebarTool,
});

const helpIds = () => new Set(getHelpArticles().map((article) => article.id));

export const helpAssistant = new HelpAssistantStore({
  client: helpClient,
  context: helpContext,
  fallback: (error, context) => {
    const titles = articleTitles();
    return buildFallback(error, context, {
      features: FEATURE_REGISTRY,
      titleFor: (id) => titles.get(id) ?? null,
    });
  },
  helpIds,
});

const DESTINATIONS: Record<DestinationId, string> = {
  graph: `${base}/`,
  tables: `${base}/tables`,
  canvas: `${base}/canvas`,
  map: `${base}/map`,
  import: `${base}/import`,
  timeline: `${base}/timeline`,
};

function waitFor(check: () => boolean, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + ms;
    const tick = () => {
      if (check()) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export const helpActionRunner = new HelpActionRunner({
  surfaces: helpSurfaces,
  highlight: helpHighlight,
  context: () => helpContext.current,
  helpIds,
  goto: (path) => goto(path),
  destinationPath: (destination) => DESTINATIONS[destination],
  openHelp: (id) => helpStore.openHelpToArticle(id),
  openSettings: (tab) => modalUIStore.openSettings(tab),
  openJournal: () => quickNoteStore.openJournal(),
  openGenerator: (generatorId) =>
    modalUIStore.openGeneratorWorkflow(generatorId ?? null),
  waitFor,
});
