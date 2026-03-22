# Data Model: Free Oracle Use

No persistent database entities are required for the client-side implementation of "Free Oracle Use" since personal credit tracking was removed.

## Client-Side State (OracleSettingsService)

- `apiKey`: string | null (User provided key)
- `tier`: "advanced" (Defaults to advanced, superseding lite)
- `isSovereign`: boolean (Derived: true if `apiKey` is present)
- `useProxy`: boolean (Derived: true if `apiKey` is null)
