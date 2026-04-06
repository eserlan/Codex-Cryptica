# Research: Implement llms.txt standard

## Decision: Implementation Strategy for llms.txt and llms-full.txt

### Decision

The `llms.txt` and `llms-full.txt` files will be implemented as static assets located in the `apps/web/static/` directory. `llms.txt` will be a manually maintained summary file, while `llms-full.txt` will be generated via a pre-build script that concatenates core documentation from across the repository.

### Rationale

- **Static Serving**: Placing files in `static/` ensures they are served at the root of the domain and are compatible with `@sveltejs/adapter-static` without complex routing logic.
- **Maintenance**: A manually maintained `llms.txt` allows for high-quality, curated summaries tailored for AI ingestion.
- **Automation**: Generating `llms-full.txt` prevents documentation drift by automatically pulling the latest READMEs, ADRs, and schema definitions.
- **Standard Compliance**: This approach strictly follows the `llmstxt.org` specification for location, format, and discoverability.

### Alternatives Considered

- **Dynamic Routes**: Serving these files via SvelteKit routes (e.g., `src/routes/llms.txt/+server.ts`).
  - _Rejected because_: Increases complexity for static exports and is unnecessary for text-based documentation.
- **Manual llms-full.txt**: Maintaining the full file manually.
  - _Rejected because_: High risk of outdated information as the architecture evolves.

## Best Practices for AI Ingestion

### Findings

- **Size Constraint**: `llms.txt` should ideally be under 10KB to ensure rapid ingestion by agents.
- **Content Hierarchy**: Use H1 for the project name, blockquotes for summaries, and H2 for categorizing technical sections.
- **Link Descriptions**: Every link must have a concise description to aid agent decision-making.
- **Discoverability**: The `<link rel="llms">` tag in the HTML head is the standard method for programmatic discovery.

## robots.txt and Crawler Access

### Findings

- **Allow Rule**: Ensure `robots.txt` does not block `.txt` files or specifically allows the `/llms` paths.
- **AI Specificity**: Some agents respect specific `User-agent` directives, but a general `Allow: /llms.txt` is the most robust starting point.
