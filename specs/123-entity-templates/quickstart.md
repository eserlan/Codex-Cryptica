# Quickstart: Default Entity Templates

**Branch**: `123-entity-templates` | **Date**: 2026-05-28

## Usage Guide

This feature provides automatic markdown templates for new entities, with simple local overrides.

### 1. Default System Templates

When you create a new **Character**, **Faction**, **Location**, **Item**, **Event**, **Creature**, or **Note**, it automatically populates with standardized Markdown sections.

### 2. Disabling Templates

If you want to start with a blank document, simply untick **"Start from default format"** in the entity creation form.

### 3. Vault-Level Override

You can fully customize these templates for your specific campaign or vault:

1. Create a folder named `.cc/templates/` (or `.codex/templates/`) in your vault.
2. Add a markdown file named after the entity type (e.g., `character.md`, `location.md`). Casing does not matter.
3. Add whatever markdown headings or structure you want.
4. The next time you create an entity of that type, your custom template will be used!

> [!NOTE]
> If you want to disable templates entirely for a single type (e.g., you always want blank Location notes), simply create an empty `.cc/templates/location.md` file. The system will respect your blank override.
