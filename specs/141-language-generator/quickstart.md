# Developer Quickstart: Language Generator

This guide describes how to run and test the **Language Generator** in development.

## Setup & Running Local Development

1. Check out the feature branch:

   ```bash
   git checkout 141-language-generator
   ```

2. Run the development server from the repository root:

   ```bash
   bun run dev
   ```

3. To check out the public tool, open your browser and navigate to:
   ```
   http://localhost:5173/generators/language-generator
   ```

## Running Tests

Verify library package tests:

```bash
bun test packages/generator-engine/src/public-language.test.ts
```

Verify linting across the project:

```bash
bun run lint
```
