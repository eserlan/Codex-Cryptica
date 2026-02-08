# Spec 038: Staging Environment

## Status

- **Status**: Implemented (Retroactive)
- **Date**: 2026-02-07

## Overview

To improve the reliability of mobile debugging and prevent testing in production, a dedicated staging environment is required. This environment should be identical to production but with additional diagnostic tools enabled.

## Requirements

1.  **Parallel Deployment**: Deploy a staging version of the application alongside the production version on GitHub Pages.

2.  **Subpath Access**: The staging environment must be accessible at the `/staging` subpath.

3.  **Debug Activation**: The `DebugConsole` (implemented in Spec 037) must be automatically enabled in the staging environment.

4.  **Branch Strategy**:

    *   **Production (Root)**: Always built from the `main` branch.

    *   **Staging (/staging)**: Built from the currently pushed branch (`main` or `feat/*`, `fix/*`).



## Architecture

- **GitHub Actions**: The `deploy.yml` workflow checks out `main` for the production build and the *triggered branch* for the staging build.

- **Base Path Routing**: The `svelte.config.js` uses a `BASE_PATH` environment variable to adjust asset links and routing.
- **Environment Gating**: A `VITE_STAGING` environment variable is used to conditionally render the `DebugConsole` component.

## Environment Variables

| Variable       | Value (Staging) | Description                                                 |
| :------------- | :-------------- | :---------------------------------------------------------- |
| `BASE_PATH`    | `/staging`      | Sets the application root for routing and asset resolution. |
| `VITE_STAGING` | `true`          | Enables staging-only features (e.g., DebugConsole).         |
