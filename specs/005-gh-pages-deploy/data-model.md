# Data Model: GitHub Pages Deployment

## Entities

### DeploymentConfiguration

Represents the settings required for a successful static build.

| Field      | Type      | Description                                                |
| ---------- | --------- | ---------------------------------------------------------- |
| `basePath` | `string`  | The repository subdirectory (e.g., `/Codex-Arcana`).       |
| `fallback` | `string`  | The fallback HTML file for SPA routing (e.g., `404.html`). |
| `strict`   | `boolean` | Whether to fail the build if any routes are missing.       |

### CI/CD Workflow

The automated pipeline defined in `.github/workflows/deploy.yml`.

| Step     | Action                 | Purpose                                                  |
| -------- | ---------------------- | -------------------------------------------------------- |
| `Build`  | `npm run build`        | Generates the `build/` directory using `adapter-static`. |
| `Deploy` | `actions/deploy-pages` | Uploads the `build/` artifacts to GitHub Pages.          |
