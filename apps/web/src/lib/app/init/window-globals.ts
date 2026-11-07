import { browser } from "$app/env";
import { debugStore } from "../../stores/debug.svelte";

type WindowGlobalsContext = {
  searchStore: any;
  vault: any;
  vaultRegistry: any;
  canvasRegistry?: any;
  graph?: any;
  oracle?: any;
  calendarStore?: any;
  helpStore: any;
  categories: any;
  onboardingStore?: any;
  sessionModeStore?: any;
  notificationStore?: any;
  layoutUIStore?: any;
  modalUIStore?: any;
  discoveryPolicyStore?: any;
  connectionModeStore?: any;
  explorerUIStore?: any;
  isEntityVisible: any;
  eventBus?: any;
};

type LegacyStoreGroup = {
  store: keyof WindowGlobalsContext;
  properties: string[];
  methods: string[];
  bindFunctions: boolean;
};

const LEGACY_STORE_GROUPS: LegacyStoreGroup[] = [
  {
    store: "onboardingStore",
    properties: [
      "dismissedWorldPage",
      "dismissedLandingPage",
      "skipWelcomeScreen",
      "lastSeenVersion",
      "showChangelog",
      "isLandingPageVisible",
    ],
    methods: [],
    bindFunctions: false,
  },
  {
    store: "sessionModeStore",
    properties: ["isDemoMode", "sharedMode", "isGuestMode", "guestUsername"],
    methods: ["setGuestUsername"],
    bindFunctions: true,
  },
  {
    store: "layoutUIStore",
    properties: [
      "leftSidebarWidth",
      "rightSidebarWidth",
      "vttSidebarWidth",
      "leftSidebarOpen",
      "activeSidebarTool",
      "mainViewMode",
      "focusedEntityId",
      "isMobile",
      "vttSidebarCollapsed",
      "vttChatSidebarCollapsed",
      "vttEntityListCollapsed",
      "findNodeCounter",
      "lastSelectedNodePosition",
    ],
    methods: [
      "toggleSidebarTool",
      "closeSidebar",
      "setLeftSidebarWidth",
      "setRightSidebarWidth",
      "setVttSidebarWidth",
      "toggleVttSidebar",
      "toggleVttChatSidebar",
      "toggleVttEntityList",
      "findInGraph",
      "setLastSelectedNodePosition",
    ],
    bindFunctions: true,
  },
  {
    store: "modalUIStore",
    properties: [
      "showSettings",
      "activeTab",
      "readModeNodeId",
      "zenModeEntityId",
      "zenModeActiveTab",
      "showZenMode",
    ],
    methods: ["openZenMode", "closeZenMode", "openReadMode", "closeReadMode"],
    bindFunctions: true,
  },
  {
    store: "discoveryPolicyStore",
    properties: ["showUnindexedNotification", "acknowledgedUnindexed"],
    methods: [],
    bindFunctions: false,
  },
  {
    store: "connectionModeStore",
    properties: ["connectionMode"],
    methods: [],
    bindFunctions: false,
  },
  {
    store: "explorerUIStore",
    properties: ["selectedLabels", "expandedCategories", "searchQuery"],
    methods: [],
    bindFunctions: false,
  },
];

function findLegacyStoreGroup(prop: string, writable: boolean) {
  return LEGACY_STORE_GROUPS.find(
    (group) =>
      group.properties.includes(prop) ||
      (!writable && group.methods.includes(prop)),
  );
}

function readLegacyProperty(context: WindowGlobalsContext, prop: PropertyKey) {
  if (typeof prop !== "string") return undefined;
  const group = findLegacyStoreGroup(prop, false);
  if (!group) return undefined;
  const store = context[group.store];
  const value = store?.[prop];
  return group.bindFunctions && typeof value === "function"
    ? value.bind(store)
    : value;
}

function writeLegacyProperty(
  context: WindowGlobalsContext,
  prop: PropertyKey,
  value: unknown,
): boolean {
  if (typeof prop !== "string") return false;
  const group = findLegacyStoreGroup(prop, true);
  const store = group && context[group.store];
  if (!store) return false;
  store[prop] = value;
  return true;
}

function createLegacyUIProxy(context: WindowGlobalsContext) {
  return new Proxy(
    {},
    {
      get: (_target, prop) => readLegacyProperty(context, prop),
      set: (_target, prop, value) => writeLegacyProperty(context, prop, value),
    },
  );
}

/**
 * Attaches core stores and services to window for debugging/E2E.
 */
export function setupWindowGlobals(context: WindowGlobalsContext) {
  if (!browser) return;

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  if (!isSpecialEnv) return;

  debugStore.log("[WindowGlobals] Attaching:", Object.keys(context));
  Object.assign(window, context);
  (window as any).codexUI = {
    onboarding: context.onboardingStore,
    session: context.sessionModeStore,
    notification: context.notificationStore,
    layout: context.layoutUIStore,
    modal: context.modalUIStore,
    discovery: context.discoveryPolicyStore,
    connection: context.connectionModeStore,
    explorer: context.explorerUIStore,
  };

  // Backwards compatibility layer for legacy E2E tests accessing window.uiStore
  (window as any).uiStore = createLegacyUIProxy(context);

  // Expose revisionService for DEV/staging E2E test access
  if (import.meta.env.DEV || import.meta.env.VITE_STAGING === "true") {
    import("../../services/RevisionService.svelte")
      .then((m) => {
        if (m?.revisionService)
          (window as any).revisionService = m.revisionService;
      })
      .catch((e) =>
        debugStore.warn("Failed to attach revisionService to window", e),
      );

    import("../../services/generators/generator-session-manager")
      .then((m) => {
        if (m?.generatorSessionManager)
          (window as any).generatorSessionManager = m.generatorSessionManager;
      })
      .catch((e) =>
        debugStore.warn(
          "Failed to attach generatorSessionManager to window",
          e,
        ),
      );
  }

  // Lazy-load dynamic AI services if not already present
  import("@codex/ai-engine")
    .then((m) => {
      if (m) {
        (window as any).textGeneration = m.textGenerationService;
        (window as any).imageGeneration = m.imageGenerationService;
        (window as any).contextRetrieval = m.contextRetrievalService;
      }
    })
    .catch((e) => debugStore.warn("Failed to attach AI services to window", e));

  import("../../cloud-bridge/p2p/host-service.svelte")
    .then((m) => {
      if (m?.p2pHost) (window as any).p2pHostService = m.p2pHost;
    })
    .catch((e) =>
      debugStore.warn("Failed to attach p2p host service to window", e),
    );

  import("../../cloud-bridge/p2p/guest-service")
    .then((m) => {
      if (m?.p2pGuestService)
        (window as any).p2pGuestService = m.p2pGuestService;
    })
    .catch((e) =>
      debugStore.warn("Failed to attach p2p guest service to window", e),
    );
}
