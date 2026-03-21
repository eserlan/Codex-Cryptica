# Research: Staging Indicator

## Environment Detection

### Decision

Use `import.meta.env.MODE === 'staging'` or a custom environment variable `VITE_APP_ENV === 'staging'`.

### Rationale

Vite provides `import.meta.env.MODE` which defaults to `development` or `production`. By adding a `staging` mode to the build process, we can easily detect it at runtime. Alternatively, checking `window.location.hostname` for patterns like `staging.codex-cryptica.com` is a robust fallback for client-side only detection.

### Alternatives Considered

- **Build-time injection**: Injecting a `__IS_STAGING__` global via `vite.config.ts`.
- **Hostname check**: Directly checking `window.location.hostname`. While simple, it's less flexible than environment variables.

## UI Placement

### Decision

A fixed, high-contrast banner at the top or a floating badge in a corner. Given the request for small screens, a floating badge or a thin top banner that can be dismissed or is non-obstructive is preferred.

### Rationale

A top banner is the most standard way to show environment status. However, to satisfy "small screen visibility" without obstructing the header, a small floating badge (e.g., bottom-right) might be better, or a very thin top strip above the header.

## Design System Integration

### Decision

Use `var(--color-danger)` (#ef4444) or a custom amber/warning color to ensure high visibility.

### Rationale

Staging indicators should be "loud" to prevent accidents. Red or deep amber provides the necessary contrast against the standard Solarized-inspired theme of Codex Cryptica.
