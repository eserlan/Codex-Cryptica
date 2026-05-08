# Quickstart: Proactive Lore Discovery

## Choosing Oracle Automation

1. Open **Settings** from the sidebar or via `Cmd/Ctrl + ,`.
2. Navigate to the **Oracle** tab.
3. Choose an **Entity Discovery** level:
   - **Off**: The Oracle does not create discovery chips or background drafts.
   - **Suggest**: The Oracle shows discovery chips and waits for you to commit them.
   - **Auto-create**: The Oracle can save discovered records automatically as drafts for review.
4. Choose a **Connection Discovery** level:
   - **Off**: No connection analysis runs after Oracle-created or Oracle-updated records.
   - **Suggest**: Connection suggestions are added to the proposal UI for review.
   - **Auto-apply**: Eligible connection suggestions are created automatically and reported in a toast/activity log.

The recommended default is **Entity Discovery: Suggest** and **Connection Discovery: Suggest**. This keeps the Oracle helpful without silently changing the graph.

## Enabling Auto-Archive

1. Open **Settings** from the sidebar or via `Cmd/Ctrl + ,`.
2. Navigate to the **Oracle** tab.
3. Set **Entity Discovery** to **Auto-create**.
4. (Optional) Set the **Draft Status Visibility** to "Hidden" if you want a completely silent background archive.

## Using Discovery Chips

When the Oracle describes something new:

1. Look for the compact **Found lore** pill at the bottom of the chat message.
2. **Expand**: Click the pill to reveal individual discovered entities, such as `[+] Thalindra (NPC)`.
3. **Click to Commit**: Click the `[+]` to instantly add a discovered entity to your vault.
4. **Review**: Click an existing entity name to open it in the side panel, adjust the Lore or Chronicle, and then click **Verify** if it was saved as a draft.
5. **Smart Update**: If you're talking about an existing character, look for an update chip such as `[~] Thalindra`. Clicking it updates her record according to the current reconciliation behavior.
6. **Connections**: After a create or update, connection handling follows your **Connection Discovery** setting. In **Suggest** mode, review proposed links before applying them. In **Auto-apply** mode, eligible links may appear on the graph immediately.

The Drafting Engine suppresses structured response labels such as `Name`, `Type`, `Chronicle`, and `Lore`, so those field names should never appear as suggested entities.

## Managing Drafts

1. Open the **Entity Explorer**.
2. Use the **Status** filter to show only "Draft" entries.
3. Batch select drafts to **Verify** or **Delete**.
