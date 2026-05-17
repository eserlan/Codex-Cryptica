# Entity Creation & Reconciliation Flow

This document describes how entities are created and reconciled in Codex Cryptica, specifically focusing on how categories (types) are determined.

## Logic Overview

When the Oracle suggests a new entity (Discovery), it provides a title and a type guess. When the user "commits" this discovery, the following flow occurs:

### ASCII Flow Diagram

```text
+-----------------------+
|  Discovery Proposal   | (title, type guess, draft)
+-----------+-----------+
            |
            v
+-----------+-----------+
| reconcileNewEntityDraft| (OracleStore)
+-----------+-----------+
            |
            v
+-----------+-----------+
| reconcileEntityFields | (Calls AI with "shell" entity)
+-----------+-----------+
            |
            | AI Prompt (entity-reconciliation.ts):
            | "Choose the single best categoryId from ALLOWED CATEGORIES
            |  based on the final reconciled chronicle and lore.
            |  Prefer the final record over the earlier type guess."
            v
+-----------+-----------+
|  AI Response (JSON)   | (content, lore, categoryId)
+-----------+-----------+
            |
            v
+-----------+-----------+
| reconcileEntityUpdate | (TextGenerationService)
+-----------+-----------+
            |
            | Returns { content, lore, categoryId }
            v
+-----------+-----------+
| reconcileEntityFields | (OracleStore)
+-----------+-----------+
            |
            | [Fixed] Returns:
            | { content, lore, categoryId }
            v
+-----------+-----------+
| reconcileNewEntityDraft| (OracleStore)
+-----------+-----------+
            |
            | [Fixed] Returns:
            | { content, lore, categoryId }
            v
+-----------+-----------+
|    DiscoveryChip      | (UI Component)
+-----------+-----------+
            |
            | [Fixed] Logic:
            | Calls vault.createEntity((reconciled.categoryId || proposal.type), ...)
            | Now uses AI-refined category if available.
            v
+-----------+-----------+
|     Vault Store       |
+-----------+-----------+
```

## Observations

1.  **AI Involvement**: The reconciliation prompt _is_ instructed to refine the category (`categoryId`) based on the full draft.
2.  **Connected Pipeline**: The refined `categoryId` is now correctly propagated through `OracleStore` and used by `DiscoveryChip`.
3.  **Guest Bypass**: AI reconciliation is entirely bypassed for guest users (collaborators) to maintain security and simplicity. In guest mode, entities are created using the initial Oracle guess and raw draft data.

## Conclusion

The entity creation pipeline now ensures that the most accurate category (determined by the AI during reconciliation) is used when a new record is added to the vault.
