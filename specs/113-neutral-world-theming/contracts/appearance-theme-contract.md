# Contract: App Appearance and World Theme

## Theme Store Public Contract

The web theme store exposes independent app appearance and world theme state while preserving existing world theme behavior.

```typescript
type AppAppearanceId = "neutral-light" | "neutral-dark" | "system";
type ResolvedAppAppearance = "neutral-light" | "neutral-dark";
type WorldThemeId = keyof typeof THEMES; // includes dedicated neutral "workspace"

interface ThemeStoreContract {
  appAppearanceId: AppAppearanceId;
  resolvedAppAppearanceId: ResolvedAppAppearance;
  currentThemeId: WorldThemeId; // Backwards-compatible alias for active world theme
  worldThemeId: WorldThemeId;
  previewThemeId: WorldThemeId | null;
  activeTheme: StylingTemplate;
  jargon: JargonMap;

  init(): Promise<void>;
  loadForVault(vaultId: string): Promise<void>;

  setAppAppearance(id: AppAppearanceId): Promise<void>;
  setTheme(id: WorldThemeId): Promise<void>; // Existing API, now saves world theme
  setWorldTheme(id: WorldThemeId): Promise<void>;
  previewTheme(id: WorldThemeId | null): void;
  resolveJargon(key: keyof JargonMap, count?: number): string;
}
```

## Persistence Contract

### App Appearance

- Stored globally under a new key such as `codex-cryptica-app-appearance`.
- Valid values: `neutral-light`, `neutral-dark`, `system`.
- Missing or invalid values resolve to `system`.
- System mode follows `prefers-color-scheme`.

### World Theme

- Stored per vault using existing theme persistence paths.
- Existing theme config values continue to load.
- Existing local theme key values are treated as world theme fallback for compatibility.
- Invalid world theme ids are ignored and fallback is used.

## DOM Contract

The document exposes separate data attributes for app appearance and world theme.

```html
<html
  data-app-appearance="neutral-light|neutral-dark"
  data-app-appearance-choice="neutral-light|neutral-dark|system"
  data-world-theme="workspace|fantasy|scifi|modern|..."
></html>
```

Required behavior:

- App chrome selectors must key from app appearance variables or app chrome surface classes.
- World/canvas selectors may key from `data-world-theme` or scoped world containers.
- `data-theme` may remain during migration for backwards compatibility, but new chrome behavior must not depend on it as the sole theme scope.
- `body` must not receive world texture as a background image.

## Settings UI Contract

Appearance settings exposes two separate controls.

### App Appearance Control

Options:

- `System`
- `Light`
- `Dark`

Behavior:

- Selecting an option changes global chrome only.
- It does not change the active world theme.
- System reflects device light/dark changes.

### World Theme Control

Options:

- Dedicated neutral `workspace` world theme.
- Existing genre and style themes.

Behavior:

- Selecting a world theme changes world/canvas mood, graph styling, and world vocabulary.
- It does not change app appearance.
- Preview is temporary until selection is saved.
- Worlds without a saved world theme use `workspace`; `modern` remains a selectable existing theme and is not reused as the default.

## Styling Contract

- App chrome surfaces use app tokens for background, surface, border, text, muted text, accent, radius, and fonts. Any subcomponents or controls nested inside app chrome surfaces (such as `VaultControls`, status labels, database indicators, and action buttons in the App Header) MUST use these app chrome tokens (`chrome-*`) rather than world theme tokens (`theme-*`) to maintain visual stability.
- World surfaces use world tokens for mood, graph, world accents, optional texture, and optional world typography.
- First-pass surfaces must include header, activity bar, footer, settings, search, front page, graph, and entity detail.
- Authored body content must prefer long-form readable typography over decorative theme fonts.
- Light world themes must avoid dark vignettes or overlays that make light backgrounds muddy.
- Fantasy world theme must use deliberate edge/corner treatment and less dominant graph edges.

## Verification Contract

Automated coverage must assert:

- First-time/default state is neutral app appearance, not fantasy app chrome.
- First-time/default world state uses `workspace`, not `modern` or `fantasy`.
- Existing saved world theme is still honored.
- Changing app appearance does not change world theme.
- Changing world theme does not change app appearance.
- Texture is absent from body and chrome surfaces.
- System appearance reacts to `prefers-color-scheme`.
- Fantasy graph edge weight and typography hierarchy are covered at the unit or visual level.
- Header, activity bar, footer, settings, search, front page, graph, and entity detail are covered by focused validation.
