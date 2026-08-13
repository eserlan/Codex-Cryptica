# VTT Domain Contract

The map-engine package exports the shared VTT types plus:

- `normalizeToken(token)`: returns a token using supported visibility values and
  explicit nullable ownership fields.
- `normalizeEncounterSession(session)`: returns a cloned, internally consistent
  session with valid selection and initiative turn state.

Both functions are synchronous, do not mutate inputs, and import only workspace
package dependencies.
