# Code Review

Systematic code review process aligned with the Codex-Arcana Constitution. Ensures code quality, test coverage, and architectural consistency before merging.

## Review Checklist

### 1. Constitution Alignment (Non-Negotiable)

| Principle                      | Check                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| **I. Library-First**           | Is feature logic in `packages/` rather than `apps/web/`?                                  |
| **II. TDD**                    | Are there unit tests for all new logic? Do tests pass?                                    |
| **III. Simplicity & YAGNI**    | Does it use established libraries instead of custom solutions? Is there over-engineering? |
| **IV. AI-First Extraction**    | Does Oracle integration handle structured outputs with validation?                        |
| **V. Privacy**                 | Is processing client-side where possible? No unnecessary server calls?                    |
| **VI. Clean Implementation**   | See AI Guardrails checklist below                                                         |
| **VII. User Documentation**    | Is `help-content.ts` updated? Is there a `FeatureHint` if needed?                         |
| **VIII. Dependency Injection** | Do services/stores use constructor DI with mockable defaults?                             |
| **IX. Natural Language**       | Is user-facing text clear and jargon-free?                                                |
| **X. Quality & Coverage**      | Does coverage meet goals (80% utils, 70% engines, 50% stores)?                            |

### 2. AI Guardrails (Constitution VI)

```markdown
- [ ] Unused variables/parameters prefixed with `_`
- [ ] No stale state warnings (`$derived` instead of `$state(prop)`)
- [ ] Tailwind 4 CSS syntax (no deprecated utilities)
- [ ] Comprehensive type definitions (no `any`, proper interfaces)
```

### 3. Code Quality Checks

#### TypeScript/JavaScript

```markdown
- [ ] No `any` types without explicit justification
- [ ] Proper error handling (try/catch, Result types, or thrown errors)
- [ ] Consistent naming conventions (camelCase, PascalCase for types)
- [ ] JSDoc comments for public APIs and complex functions
- [ ] No console.log in production code (use proper logging if needed)
```

#### Svelte 5 Specific

```markdown
- [ ] Using `$state`, `$derived`, `$effect` runes correctly
- [ ] Props destructured with `$props()` pattern
- [ ] No reactive statements (`$:`) - use `$derived` instead
- [ ] Event handlers use proper types
- [ ] Component lifecycle managed (`onMount`, `onDestroy`)
```

#### Testing

```markdown
- [ ] Unit tests cover happy path and edge cases
- [ ] Tests are isolated (mocked dependencies)
- [ ] Test names describe behavior, not implementation
- [ ] E2E tests for user-facing features
- [ ] No flaky tests (deterministic assertions)
```

### 4. Security Review

```markdown
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user inputs
- [ ] XSS prevention (proper escaping, no innerHTML)
- [ ] CORS configured correctly for APIs
- [ ] Authentication/authorization checks in place
```

### 5. Performance Considerations

```markdown
- [ ] No unnecessary re-renders (memoization where needed)
- [ ] Efficient list rendering (keys, virtualization for large lists)
- [ ] Debounced/throttled event handlers
- [ ] Lazy loading for heavy components
- [ ] No memory leaks (cleanup in onDestroy)
```

## Review Process

### Step 1: Automated Checks

Run before manual review:

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Tests
bun run test

# Coverage report
bun run test:coverage
```

### Step 2: Manual Review

1. **Read the PR description** - Understand the goal
2. **Check linked issues** - Verify requirements are met
3. **Review tests first** - Understand intended behavior
4. **Review implementation** - Check against checklist
5. **Run locally** - Verify functionality

### Step 3: Feedback Format

Use this format for review comments:

```markdown
**Severity**: CRITICAL | HIGH | MEDIUM | LOW

**Location**: `file.ts:line`

**Issue**: Clear description

**Suggestion**: Concrete fix example

**Constitution Violation**: If applicable, cite principle
```

## Common Issues by Severity

### CRITICAL (Block Merge)

- Constitution violations
- Security vulnerabilities
- Missing tests for core logic
- Breaking changes without migration
- Data loss potential

### HIGH (Must Fix Before Merge)

- Type safety issues (`any` without justification)
- Unhandled error cases
- Performance regressions
- Accessibility failures
- Missing user documentation for features

### MEDIUM (Should Fix)

- Code duplication
- Complex logic without comments
- Inconsistent naming
- Missing JSDoc on public APIs
- Minor coverage gaps

### LOW (Nice to Have)

- Style inconsistencies
- Minor refactoring opportunities
- Optimization suggestions
- Documentation typos

## Review Templates

### Approval

```markdown
## Code Review: ✅ APPROVED

**Constitution Alignment**: All principles satisfied
**Tests**: Passing with X% coverage
**Security**: No issues found
**Performance**: No concerns

**Notes**: [Any minor suggestions that don't block merge]
```

### Changes Requested

```markdown
## Code Review: ❌ CHANGES REQUESTED

### CRITICAL Issues (Must Fix)

1. **Location**: `file.ts:42`
   **Issue**: Missing test for error case
   **Suggestion**: Add test for when API returns 500

### HIGH Issues

1. **Location**: `service.ts:15`
   **Issue**: Using `any` type for response
   **Suggestion**: Create `ApiResponse` interface

### Constitution Violations

- **Principle II (TDD)**: No tests for `transformData()` function

### Next Steps

Please address CRITICAL issues and re-request review.
```

## Integration with Workflow

### Pre-Commit

```bash
# Run quick checks before committing
bun run lint && bun run typecheck && bun run test:unit
```

### CI Pipeline

```yaml
# Required checks
- typecheck
- lint
- test (all suites)
- coverage (enforce floor)
- build (verify compilation)
```

### Post-Merge

- Monitor error tracking (Sentry, etc.)
- Check performance metrics
- Verify no regression in production
