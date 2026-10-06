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
import { systemClock, type Clock } from "$lib/utils/runtime-deps";
import {
  CIF_POPOUT_WINDOW,
  createCifChannel,
} from "$lib/services/help-assistant/cif-popout-protocol";
import { CifPopoutHost } from "./cif-popout-host.svelte";
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
  isSidebarOpen: () => layoutUIStore.leftSidebarOpen,
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

function waitFor(
  check: () => boolean,
  ms: number,
  clock: Clock = systemClock,
): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = clock.now() + ms;
    const tick = () => {
      if (check()) return resolve(true);
      if (clock.now() >= deadline) return resolve(false);
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

/**
 * The pop-out window keeps Cif beside the map on another screen. The
 * conversation and the AI request stay in this window, so what Cif knows about
 * the screen is exactly what it knows when docked.
 */
export const cifPopout = new CifPopoutHost({
  assistant: helpAssistant,
  accept: async (action) => {
    helpAssistant.dismissOffer();
    await helpActionRunner.run(action);
  },
  openArticle: (id) => helpStore.openHelpToArticle(id),
  openLibrary: () => helpStore.openHelpWindow(),
  createChannel: createCifChannel,
  openWindow: () =>
    window.open(
      `${window.location.origin}${base}/cif`,
      CIF_POPOUT_WINDOW,
      cifPopoutFeatures(),
    ),
});

function cifPopoutFeatures(): string {
  const width = 420;
  const height = 640;
  const left = window.screenX + window.outerWidth - width - 24;
  const top = window.screenY + 80;
  return `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0`;
}

/** Opens or closes Cif, or brings the pop-out forward when it is already out. */
export function toggleCif(): void {
  if (cifPopout.connected) {
    cifPopout.open();
    return;
  }
  if (helpAssistant.isOpen) helpAssistant.close();
  else helpAssistant.open();
}
