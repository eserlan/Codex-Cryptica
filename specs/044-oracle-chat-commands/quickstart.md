# Quickstart: Oracle Chat Commands

## Development Setup

1. **Verify AI Integration**: Ensure you have a valid Gemini API key in settings.
2. **Commands Configuration**: Commands are registered in `apps/web/src/lib/config/chat-commands.ts`.

## Implementation Steps

### 1. Slash Menu UI

- The menu is triggered by the `/` character in `OracleChat.svelte`.
- It uses `floating-ui` (if available) or absolute positioning relative to the caret.
- It displays commands from the `chatCommands` registry.

### 2. /connect oracle Flow

- Triggered via `oracle.ask("/connect oracle")`.
- The `OracleStore` detects this and pushes a message with `type: "wizard"` and `wizardType: "connection"`.
- `ChatMessage.svelte` renders a specialized `ConnectionWizard.svelte` for this message type.

### 3. Connection Wizard Steps

- **Step 1 & 2**: Use a modified `SearchModal` logic for inline entity selection.
- **Step 3**: Calls `aiService.generateConnectionProposal`.
- **Step 4**: Calls `vault.createConnection` on approval.

## Testing

- **Unit Tests**: Test `AIService.generateConnectionProposal` with mocked AI responses.
- **E2E Tests**: Use Playwright to:
  1. Type `/` in chat and verify the menu appears.
  2. Filter the menu by typing `/con`.
  3. Complete the `/connect oracle` flow between two test entities.
