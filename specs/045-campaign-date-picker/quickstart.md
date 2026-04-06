# Quickstart: Campaign Date Picker

## Development Setup

1. **Initialize Package**:

   ```bash
   mkdir -p packages/chronology-engine
   cd packages/chronology-engine
   npm init -y
   ```

2. **Core Logic**:
   - Implement `CalendarEngine` class in `src/engine.ts`.
   - Add unit tests in `tests/engine.test.ts`.

3. **UI Implementation**:
   - Create `TemporalPicker.svelte` in `apps/web/src/lib/components/timeline/`.
   - Update `TemporalEditor.svelte` to use the new picker.

## Local Testing

- Run unit tests: `npm test -w packages/chronology-engine`
- Manual UI test: Open an entity in Zen Mode and try the new date picker.
