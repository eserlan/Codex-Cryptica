# Quickstart: Using the Import Engine

## Installation

The importer is a separate package.

```bash
npm install @codex/importer
```

## Basic Usage

### 1. Initialize the Importer

```typescript
import { Importer } from "@codex/importer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(API_KEY);
const importer = new Importer({
  oracle: genAI,
  // Optional custom parsers
});
```

### 2. Process a File

```typescript
const fileInput = document.getElementById("file-upload");
const file = fileInput.files[0];

// Step 1: Parse (Local)
const parseResult = await importer.parse(file);
console.log(parseResult.text); // Raw markdown-ish text
console.log(parseResult.assets); // Blobs

// Step 2: Analyze (AI)
const analysis = await importer.analyze(parseResult.text);

// Step 3: Handle Results
analysis.entities.forEach((entity) => {
  console.log(`Found ${entity.type}: ${entity.title}`);
  // Save to your vault...
});
```

## Supported Formats

- **PDF**: Text extraction only (initially).
- **DOCX**: Text + Image extraction. Preserves Headers/Lists.
- **TXT/MD**: Raw text import.
- **JSON**: Heuristic structure analysis.

## Configuration

You can tune the Oracle prompts by passing a custom prompt templates in the constructor (Advanced).
