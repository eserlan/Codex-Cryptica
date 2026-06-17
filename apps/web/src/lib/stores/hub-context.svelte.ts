let _lastHubTheme = $state<string | null>(null);

export const hubContext = {
  get theme(): string | null {
    return _lastHubTheme;
  },
  set(theme: string | null) {
    _lastHubTheme = theme;
  },
};
