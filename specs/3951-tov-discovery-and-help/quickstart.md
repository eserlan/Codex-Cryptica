# Quickstart: Verifying ToV Discovery & Help Deliverables

**Feature**: [spec.md](./spec.md)  
**Parent Epic**: #3941  
**Issue**: #3951

---

## 1. Discovery Audit Verification

Verify that new discovery entries comply with Constitution XIII:

```bash
bun scripts/discovery-audit.mjs
```

Expected output: 0 fatal audit errors.

---

## 2. Unit & Route Tests Verification

Run targeted test suites across answers, landing pages, and help:

```bash
# Verify landing page pack and registry
bun test apps/web/src/lib/content/for/registry.test.ts

# Verify answers registry, schema, and categories
bun test apps/web/src/lib/content/answers/registry.test.ts apps/web/src/lib/content/answers/categories.test.ts

# Verify help registry
bun test apps/web/src/lib/content/help-registry.test.ts
```

---

## 3. Editorial & Lint Quality Gate

Check for British English and absence of AI tells in the changed files:

```bash
bun run lint:changed
```

Run fallow audit to guarantee no introduced complexity or duplication:

```bash
bunx fallow audit --format human --base origin/staging
```
