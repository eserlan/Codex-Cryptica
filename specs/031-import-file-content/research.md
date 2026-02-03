# Research: Import & Extraction Engine

**Feature**: 031-import-file-content
**Date**: 2026-02-01

## 1. DOCX Parsing Strategy

**Question**: What is the best browser-compatible library to convert DOCX to Markdown while extracting images?

**Candidates**:
*   `mammoth.js`: Focuses on semantic HTML. Can easily convert HTML to Markdown (using `turndown` or similar) or we can write a custom style map. Supports image extraction.
*   `docx`: Mostly for *creating* files, reading is limited.
*   `libreoffice-convert`: Server-side only (requires binary).

**Decision**: **`mammoth.js`** + Custom Style Map + HTML-to-Markdown (e.g., `turndown`).
**Rationale**: `mammoth` is robust, browser-compatible, and extracts images as Base64 (which we can save to OPFS). Mapping to HTML first is safer than direct-to-markdown for layout preservation.

## 2. PDF Parsing Strategy

**Question**: How to extract text and images from PDF in the browser?

**Candidates**:
*   `pdfjs-dist`: The gold standard. Heavy, but reliable. Text layer extraction is standard.
*   `pdf-lib`: Mostly for modification/creation.

**Decision**: **`pdfjs-dist`**.
**Rationale**: Standard Mozilla library. We can iterate through pages, extract `getTextContent()`, and potentially use `getOperatorList()` to find images (complex, maybe P2).
*Constraint*: Image extraction from PDF is notoriously difficult (masked images, CMYK, vector parts).
*MVP Adjustment*: For MVP, we might prioritize *Text* from PDFs and *Text+Images* from DOCX, unless PDF image extraction proves straightforward with `pdfjs`.

## 3. Oracle Entity Extraction (Prompt Engineering)

**Question**: How to reliably get multiple Markdown entities from one text blob?

**Approach**:
*   **Prompt**: "Analyze the following text. Identify distinct entities (Characters, Locations, Items). For each, generate a valid Markdown block with YAML frontmatter. Separate blocks with `---ENTITY_SEPARATOR---`."
*   **Format**: Requesting structured JSON might be safer (`Array<{ filename: string, content: string }>`), then we write the Markdown files ourselves.

**Decision**: **JSON Output from Oracle**.
**Rationale**: Asking the LLM to write the file separation syntax in text is error-prone. Asking it to return a JSON array of `{ "title": "...", "type": "...", "content": "..." }` allows us to robustly create the files and sanitize filenames programmatically.

## 4. JSON Import Heuristics

**Question**: How to detect if a generic JSON file is "Codex-ready"?

**Approach**:
*   Check if root is Array.
*   Check first 3 items for common fields (`name`, `title`, `description`, `content`, `id`).
*   If Array + Common Fields -> Offer "Bulk Import".
*   If Object -> Offer "Single Node Import".

**Decision**: **Structure Analysis + Oracle Confirmation**.
**Rationale**: Simple checks first (fast), then ask Oracle "Map this JSON schema to our Codex Entity Schema" if ambiguous.

## 5. Library Structure

**Question**: Where does this code live?

**Decision**: **`packages/importer`**.
**Rationale**: Isolate the heavy PDF/DOCX dependencies from the main editor.
