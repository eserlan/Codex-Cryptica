export type SettingsTab = "vault" | "sync" | "intelligence" | "schema" | "about" | "help";

class UIStore {
    showSettings = $state(false);
    activeSettingsTab = $state<SettingsTab>("vault");
    globalError = $state<{ message: string; stack?: string } | null>(null);

    setGlobalError(message: string, stack?: string) {
        this.globalError = { message, stack };
    }

    clearGlobalError() {
        this.globalError = null;
    }

    openSettings(tab: SettingsTab = "vault") {
        this.activeSettingsTab = tab;
        this.showSettings = true;
    }

    closeSettings() {
        this.showSettings = false;
    }

    toggleSettings(tab: SettingsTab = "vault") {
        if (this.showSettings && this.activeSettingsTab === tab) {
            this.showSettings = false;
        } else {
            this.activeSettingsTab = tab;
            this.showSettings = true;
        }
    }
}

export const uiStore = new UIStore();
