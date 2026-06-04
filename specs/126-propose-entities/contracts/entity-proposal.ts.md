# API Contracts: Propose Entities

## EntityProposalService

```typescript
export interface IEntityProposalService {
  /**
   * Extracts bolded terms from markdown content that are not already links.
   * @param markdown The raw markdown content
   * @param existingEntityTitles A set of existing entity titles for exclusion filtering
   */
  extractProposals(
    markdown: string,
    existingEntityTitles: Set<string>,
  ): string[];

  /**
   * Intelligently creates a new entity from a proposal using AI.
   * @param title The proposed entity title
   * @param sourceContext The markdown content of the originating entity
   */
  acceptProposal(
    title: string,
    sourceContext: string,
    apiKey?: string,
  ): Promise<{ entity: Entity; categoryInferred: boolean }>;
}
```
