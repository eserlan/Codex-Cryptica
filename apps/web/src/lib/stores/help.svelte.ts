import { browser } from "$app/environment";
import { VERSION } from "$lib/config";
import { type GuideStep, type HelpArticle, ONBOARDING_TOUR, HELP_ARTICLES } from "$lib/config/help-content";
import FlexSearch from "flexsearch";

const STORAGE_KEY = "codex-cryptica-help-state";

interface HelpStoreState {
    completedTours: string[];
    lastSeenVersion: string;
    dismissedHints: string[];
}

class HelpStore {
    // Walkthrough State
    activeTour = $state<{
        id: string;
        currentStepIndex: number;
        steps: GuideStep[];
    } | null>(null);

    currentStep = $derived(this.activeTour ? this.activeTour.steps[this.activeTour.currentStepIndex] : null);

    // Help Center State
    searchQuery = $state("");
    searchResults = $state<HelpArticle[]>([]);
    isHelpOpen = $state(false);

    // Persistence State
    private state = $state<HelpStoreState>({
        completedTours: [],
        lastSeenVersion: VERSION,
        dismissedHints: []
    });

    private index: any;

    constructor() {
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
    }

    private buildIndex() {
        if (this.index) return;
        
        // Initialize FlexSearch
        this.index = new FlexSearch.Document({
            document: {
                id: "id",
                index: [
                    { field: "title", tokenize: "forward" },
                    { field: "tags", tokenize: "forward" },
                    { field: "content", tokenize: "forward" }
                ],
                store: true,
            }
        });

        HELP_ARTICLES.forEach((article) => this.index.add(article));
        this.searchResults = HELP_ARTICLES;
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
            this.activeTour = {
                id,
                currentStepIndex: 0,
                steps: ONBOARDING_TOUR
            };
        }
    }

    nextStep() {
        if (!this.activeTour) return;
        if (this.activeTour.currentStepIndex < this.activeTour.steps.length - 1) {
            this.activeTour.currentStepIndex++;
        } else {
            this.completeTour();
        }
    }

    prevStep() {
        if (!this.activeTour || this.activeTour.currentStepIndex === 0) return;
        this.activeTour.currentStepIndex--;
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
        if (!this.index) {
            this.buildIndex();
        }
        if (!query) {
            this.searchResults = HELP_ARTICLES;
            return;
        }

        const results = this.index.search(query);
        const allMatches = new Set<string>();
        results.forEach((r: any) => {
            r.result.forEach((id: any) => allMatches.add(id.toString()));
        });

        if (allMatches.size > 0) {
            this.searchResults = HELP_ARTICLES.filter(a => allMatches.has(a.id));
        } else {
            this.searchResults = [];
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

export const helpStore = new HelpStore();
