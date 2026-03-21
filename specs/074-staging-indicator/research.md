# Research: Staging Indicator

## Environment Detection

### Decision

Check multiple sources in order of precedence:

1. `import.meta.env.VITE_APP_ENV === 'staging'`
2. `import.meta.env.MODE === 'staging'`
3. `window.location.hostname.includes("staging")`
4. `window.location.pathname.includes("/staging")`

### Rationale

While build-time variables are the most robust, they often fail in GitHub Pages deployments or subfolder environments where the build process might not match the URL structure. Checking the `hostname` and `pathname` ensures the indicator works correctly even when the app is "drag-and-dropped" into a staging folder.

### Alternatives Considered

- **URL Parameter**: Checking for `?env=staging`. Too easy to bookmark or share accidentally.
- **Cookie/LocalStorage**: Requires manual setup by the user.

## UI Placement

### Decision

Apply styling directly to the `<H1>` brand title in the `AppHeader`.

### Rationale

Initially, a separate banner or floating badge was considered. However, the brand title is the most stable and prominent element in the UI. By wrapping it in a red high-contrast "pill", we achieve maximum visibility with zero layout shift and no obstruction of other UI elements (like search or navigation).

## Design System Integration

### Decision

Use Tailwind 4 conditional classes: `bg-red-600 text-white px-3 py-1 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.5)]`.

### Rationale

The red color (#dc2626) provides an immediate "warning" association. The white border and red glow ensure it stands out against the various themes (Solarized Dark/Light) without blending in.
