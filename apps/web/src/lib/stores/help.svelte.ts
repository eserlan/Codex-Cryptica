import { browser } from "$app/environment";
import { base } from "$app/paths";
import { VERSION } from "$lib/config";
import {
  type GuideStep,
  ONBOARDING_TOUR,
  HELP_ARTICLES,
} from "$lib/config/help-content";
import FlexSearch from "flexsearch";
import { uiStore as defaultUiStore } from "./ui.svelte";
import { searchStore as defaultSearchStore } from "./search.svelte";

const STORAGE_KEY = "codex-cryptica-help-state";

interface HelpStoreState {
  completedTours: string[];
  lastSeenVersion: string;
  dismissedHints: string[];
}

export class HelpStore {
  // Walkthrough State
  activeTour = $state<{
    id: string;
    currentStepIndex: number;
    steps: GuideStep[];
  } | null>(null);

  currentStep = $derived(
    this.activeTour
      ? this.activeTour.steps[this.activeTour.currentStepIndex]
      : null,
  );

  // Help Center State
  searchQuery = $state("");
  isHelpOpen = $state(false);
  expandedId = $state<string | null>(null);
  isInitialized = $state(false);

  // Dependencies
  private uiStore: typeof defaultUiStore;
  private searchStore: typeof defaultSearchStore;

  get searchResults() {
    // If not initialized or index doesn't exist, return all articles
    if (!this.isInitialized || !this.index) return HELP_ARTICLES;

    const query = this.searchQuery;
    if (!query) return HELP_ARTICLES;

    const results = this.index.search(query);
    const allMatches = new Set<string>();
    results.forEach((r: any) => {
      r.result.forEach((id: any) => allMatches.add(id.toString()));
    });

    if (allMatches.size > 0) {
      return HELP_ARTICLES.filter((a) => allMatches.has(a.id));
    } else {
      return [];
    }
  }

  // Persistence State
  private state = $state<HelpStoreState>({
    completedTours: [],
    lastSeenVersion: VERSION,
    dismissedHints: [],
  });

  private index: any;
  private indexedCount = 0;

  constructor(
    uiStore: typeof defaultUiStore = defaultUiStore,
    searchStore: typeof defaultSearchStore = defaultSearchStore,
  ) {
    this.uiStore = uiStore;
    this.searchStore = searchStore;
    // Init handled explicitly in layout
  }

  init() {
    if (!browser) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        if (loaded && typeof loaded === "object") {
          this.state.completedTours = loaded.completedTours || [];
          this.state.dismissedHints = loaded.dismissedHints || [];

          // Version Tracking
          if (loaded.lastSeenVersion !== VERSION) {
            console.log(
              `[HelpStore] Version updated: ${loaded.lastSeenVersion} -> ${VERSION}`,
            );
            this.state.lastSeenVersion = VERSION;
            this.save();
            // Future: Trigger specific "What's New" tours here
          }
        }
      } catch (e) {
        console.error("Failed to load help state", e);
      }
    }

    this.buildIndex();
    this.isInitialized = true;
  }

  /**
   * Resets the store to its initial state.
   * Primarily used for testing to prevent state leakage.
   */
  reset() {
    this.searchQuery = "";
    this.activeTour = null;
    this.isHelpOpen = false;
    this.expandedId = null;
    // We don't reset isInitialized or index unless explicitly requested
    // but we can clear search results by clearing query.
  }

  /**
   * Rebuilds the search index.
   * Useful during development if articles change without a full reload.
   */
  buildIndex(force = false) {
    if (this.index && !force && this.indexedCount === HELP_ARTICLES.length)
      return;

    // Initialize FlexSearch
    this.index = new FlexSearch.Document({
      document: {
        id: "id",
        index: [
          { field: "title", tokenize: "forward" },
          { field: "tags", tokenize: "forward" },
          { field: "content", tokenize: "forward" },
        ],
        store: true,
      },
    });

    HELP_ARTICLES.forEach((article) => this.index.add(article));
    this.indexedCount = HELP_ARTICLES.length;
  }

  private save() {
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  // --- Tour Methods ---

  startTour(id: string) {
    if (browser && (window as any).DISABLE_ONBOARDING) return;

    if (id === "initial-onboarding") {
      // Dismiss landing page and close settings modal to ensure the tour is visible
      this.uiStore.dismissedLandingPage = true;
      this.uiStore.closeSettings();

      this.activeTour = {
        id,
        currentStepIndex: 0,
        steps: ONBOARDING_TOUR,
      };
    }
  }

  nextStep() {
    if (!this.activeTour) return;
    if (this.activeTour.currentStepIndex < this.activeTour.steps.length - 1) {
      this.activeTour.currentStepIndex++;

      // Trigger sidepanel states based on step targets
      const nextStep = this.activeTour.steps[this.activeTour.currentStepIndex];
      if (nextStep.id === "search") {
        this.searchStore.open();
      } else if (nextStep.id === "oracle") {
        setTimeout(() => {
          this.uiStore.activeSidebarTool = "oracle";
          this.uiStore.leftSidebarOpen = true;
        }, 100);
      } else if (nextStep.id === "settings") {
        setTimeout(() => {
          this.uiStore.openSettings("vault");
        }, 100);
      }
    } else {
      this.completeTour();
    }
  }

  prevStep() {
    if (!this.activeTour || this.activeTour.currentStepIndex === 0) return;
    this.activeTour.currentStepIndex--;

    const prevStep = this.activeTour.steps[this.activeTour.currentStepIndex];
    if (prevStep.id === "search") {
      this.searchStore.open();
    } else if (prevStep.id === "oracle") {
      this.uiStore.activeSidebarTool = "oracle";
      this.uiStore.leftSidebarOpen = true;
    } else if (prevStep.id === "settings") {
      this.uiStore.openSettings("vault");
    }
  }

  completeTour() {
    if (this.activeTour) {
      if (!this.state.completedTours.includes(this.activeTour.id)) {
        this.state.completedTours.push(this.activeTour.id);
        this.save();
      }
      this.activeTour = null;
    }
  }

  skipTour() {
    this.completeTour();
  }

  hasSeen(tourId: string): boolean {
    return this.state.completedTours.includes(tourId);
  }

  // --- Help Center Methods ---

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  toggleArticle(id: string) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  openHelpToArticle(id: string) {
    // Find article to verify it exists
    const article = HELP_ARTICLES.find((a) => a.id === id);
    if (article) {
      this.expandedId = id;
      this.uiStore.openSettings("help");
    }
  }

  openHelpWindow() {
    if (!browser) return;

    const width = 800;
    const height = 900;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const url = `${window.location.origin}${base}/help`;
    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0,noopener,noreferrer`;

    const newWin = window.open(url, "CodexCrypticaHelp", features);
    if (newWin) newWin.opener = null;
  }

  async copyShareLink(id: string) {
    if (!browser) return;
    try {
      const url = new URL(window.location.href);
      url.hash = `help/${id}`;
      await navigator.clipboard.writeText(url.toString());
      // Future: Add a toast notification here
    } catch (e) {
      console.error("[HelpStore] Failed to copy link to clipboard", e);
    }
  }

  // --- Hint Methods ---

  dismissHint(hintId: string) {
    if (!this.state.dismissedHints.includes(hintId)) {
      this.state.dismissedHints.push(hintId);
      this.save();
    }
  }

  isHintDismissed(hintId: string): boolean {
    return this.state.dismissedHints.includes(hintId);
  }
}

const HELP_KEY = "__codex_help_instance__";
export const helpStore: HelpStore =
  (globalThis as any)[HELP_KEY] ??
  ((globalThis as any)[HELP_KEY] = new HelpStore());
