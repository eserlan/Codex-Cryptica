# Quickstart: Fog of War

## Enabling Shared Mode

1. Open any vault.
2. Click the **Eye Icon** (Shared Mode) in the Vault Controls toolbar.
3. The graph will immediately refresh to show only "revealed" content.

## Setting Default Visibility

1. Open **Settings** > **Vault**.
2. Locate the **Fog of War** section.
3. Choose between:
   - **Visible by Default**: Standard mode. Use `hidden` tag to hide secrets.
   - **Hidden by Default**: Exploration mode. Use `revealed` tag to uncover content.

## Tagging for Fog of War

In any entity's metadata:

- Add `tags: [hidden]` to hide it from players.
- Add `tags: [revealed]` to reveal it in a "Hidden by Default" world.
