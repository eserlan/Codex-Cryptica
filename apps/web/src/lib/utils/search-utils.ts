export interface SearchDocument {
    id: string;
    title: string;
    content: string;
    path: string;
    type?: string;
    keywords?: string;
}

/**
 * Extracts the ID and Document from a FlexSearch result item.
 * FlexSearch can return results in various formats depending on the 'enrich' option.
 */
export function extractIdAndDoc(item: any): { id: string | undefined; doc: SearchDocument | undefined } {
    let id: string | undefined;
    let doc: SearchDocument | undefined;

    if (typeof item === 'object' && item !== null) {
        // 1. Check for 'doc' or 'd' which FlexSearch uses in 'enrich' mode
        doc = item.doc ?? item.d;

        // 2. Extract ID from the top level (FlexSearch result object)
        // FlexSearch sometimes returns { id: '...', doc: { ... } }
        id = item.id ?? item.key ?? item.i;

        // 3. Fallback: Extract ID from the inner doc if top-level is missing
        if ((id === undefined || id === null) && doc?.id) {
            id = doc.id;
        }

        // 4. Ultimate Fallback: Use path or title as ID if we have a doc but no ID
        if ((id === undefined || id === null) && doc) {
            id = doc.path || doc.id;
        }
    } else if (typeof item === 'string' || typeof item === 'number') {
        id = String(item);
    }

    // Canonicalize missing values
    if (id === 'undefined' || id === 'null' || id === '' || id === null) {
        id = undefined;
    }

    return { id, doc };
}
