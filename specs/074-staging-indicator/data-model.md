# Data Model: Staging Indicator

No persistent data entities are required for this feature as it's a transient UI state derived from the environment.

## Derived State

- `isStaging`: Boolean flag derived from `import.meta.env.MODE` or `VITE_APP_ENV`.
