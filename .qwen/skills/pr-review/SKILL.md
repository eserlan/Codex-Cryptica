# PR Review Response Skill

## Purpose

Systematically address pull request review comments from GitHub, ensuring each comment is resolved with appropriate code changes, tests, and commit messages that reference the original feedback.

## Prerequisites

- Git repository with unmerged PR branch
- GitHub CLI (`gh`) installed and authenticated
- PR number or URL provided by user

## Step-by-Step Process

### Step 1: Fetch PR Comments

```bash
# Checkout the PR branch
gh pr checkout <PR_NUMBER>

# Fetch all review comments with file locations and IDs
gh pr view <PR_NUMBER> --json reviewComments,comments,files -t '{{range .reviewComments}}{{.path}}:{{.line}} - {{.body}} (ID: {{.databaseId}}){{"\n"}}{{end}}'

# Alternative: Get full comment thread details
gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments \
  --jq '.[] | "\(.path):\(.line) - \(.body | gsub("\n"; " ")) [Comment #\(.id)]"'
```

**Output Format:**

- File path and line number
- Comment body/content
- Comment ID for reference
- Comment author (to prioritize owner/bot feedback)

**Tips:**

- Distinguish between inline comments (specific lines) and general comments (no line number)
- Note which comments are from the PR author vs. reviewers vs. automated bots
- Identify comment threads (replies to comments) vs. top-level comments

---

### Step 2: Group Comments by File

Organize comments into logical groups:

```markdown
## apps/web/src/lib/components/oracle/OracleChat.svelte

- [ ] Line 329: Add aria-hidden to loading spinner (Comment #123456)
- [ ] Line 330: Move aria-busy to form element (Comment #123457)

## apps/web/src/lib/services/ai/prompts/merge-proposal.ts

- [ ] Line 3: Remove trailing comma formatting change (Comment #123458)

## General Comments (no file)

- [ ] Consider adding tests for the new loading state (Comment #123459)
```

**Grouping Strategy:**

1. **By File**: All comments affecting the same file together
2. **By Type**:
   - 🐛 Bug fixes
   - ♿ Accessibility improvements
   - 🎨 Code style/formatting
   - 🧪 Test additions
   - 📝 Documentation
3. **By Priority**:
   - Critical (blocks merge)
   - Suggested (recommended improvements)
   - Nitpicks (optional enhancements)

**Create a tracking file:**

```bash
# Create temporary tracking file
cat > /tmp/pr-review-plan.md << 'EOF'
# PR <NUMBER> Review Response Plan

## Files to Modify
<file-list>

## Comments to Address
<comment-list>

## Completed
- [ ] Comment #ID - Description
EOF
```

---

### Step 3: Address Each Comment

For **each comment**, follow this sub-process:

#### 3.1: Understand the Comment

- Read the full comment thread (including replies)
- Identify the core issue or suggestion
- Check if there are code suggestions in the comment

#### 3.2: Locate the Code

```bash
# Open the file at the specific line
code -g <file-path>:<line-number>

# Or view the diff context
git diff origin/main...HEAD -- <file-path>
```

#### 3.3: Implement the Fix

- Make the minimal change needed to address the comment
- If the comment suggests an alternative approach, evaluate trade-offs
- If you disagree with the comment, add a reply explaining why (don't ignore)

#### 3.4: Verify the Change

```bash
# Check the diff for this file only
git diff HEAD -- <file-path>

# Ensure no unintended changes were introduced
```

#### 3.5: Update Tracking

Mark the comment as addressed in your tracking file:

```markdown
- [x] Comment #123456 - Added aria-hidden="true" to spinner span
```

**Batch Related Comments:**

- If multiple comments affect the same file/feature, address them together in one commit
- If comments are unrelated, use separate commits for easier review

---

### Step 4: Run Lint/Test

Before committing changes:

```bash
# Run linter to catch style/formatting issues
npm run lint

# Run tests to ensure no regressions
npm test

# Run tests for affected workspace only (faster)
npm test --workspace=<package-name>

# If tests fail, fix issues before proceeding
```

**If lint fails:**

- Run auto-fix if available: `npm run lint -- --fix`
- Manually address remaining issues

**If tests fail:**

- Identify which tests failed
- Determine if failure is related to your changes
- Fix the issue or update tests if they were incorrect

**Add tests for new functionality:**

```bash
# If you added new logic, create corresponding tests
# Follow existing test patterns in the codebase
```

---

### Step 5: Commit with Reference to Comment IDs

#### 5.1: Stage Changes

```bash
# Stage specific files (preferred for granular commits)
git add <file-path>

# Or stage all changes (if addressing multiple comments in one commit)
git add -A
```

#### 5.2: Write Commit Message

**Format:**

```
<gitmoji> <type>: <description>

- Addresses PR #<NUMBER> Comment #<COMMENT_ID>: <comment summary>
- Additional context if needed

Co-authored-by: <reviewer-name> <reviewer-email>
```

**Examples:**

```bash
# Single comment
git commit -m "♿ fix: add aria-hidden to loading spinner

- Addresses PR #502 Comment #123456: Decorative icon should be hidden from screen readers
- Added aria-hidden=\"true\" to lucide-loader-2 span element"

# Multiple related comments
git commit -m "🐛 fix: address PR #502 accessibility comments

- Addresses PR #502 Comment #123456: Add aria-hidden to spinner
- Addresses PR #502 Comment #123457: Move aria-busy to form element
- Removed aria-busy from disabled button to improve screen reader support"
```

#### 5.3: Handle Commitlint Validation

If commitlint fails:

```bash
# Check what went wrong
npm run commitlint -- --last

# If gitmoji is wrong, amend:
git reset --soft HEAD~1
git commit -m "✨ fix: correct commit message with proper gitmoji"

# If format is wrong, fix and amend:
git commit --amend -m "🎨 style: properly formatted commit message"
```

#### 5.4: Push Changes

```bash
# Push to remote (force if rebasing was needed)
git push origin <branch-name>

# Or update existing PR
git push origin <branch-name> --force-with-lease
```

---

## Complete Workflow Example

```bash
# 1. Checkout PR
gh pr checkout 502

# 2. Fetch and review comments
gh pr view 502 --json reviewComments

# 3. Create tracking plan
cat > /tmp/pr-502-plan.md << 'EOF'
# PR #502 Review Plan

## Files to Modify
1. apps/web/src/lib/components/oracle/OracleChat.svelte
2. apps/web/src/lib/services/ai/prompts/*.ts

## Comments
- [ ] #123456: Add aria-hidden to spinner (OracleChat.svelte:329)
- [ ] #123457: Move aria-busy to form (OracleChat.svelte:310)
- [ ] #123458: Remove formatting changes (prompts/*.ts)
EOF

# 4. Address comment #123456
# Edit OracleChat.svelte, add aria-hidden to spinner
git add apps/web/src/lib/components/oracle/OracleChat.svelte
npm run lint && npm test
git commit -m "♿ fix: add aria-hidden to loading spinner

- Addresses PR #502 Comment #123456: Decorative icon should be hidden from screen readers"

# 5. Address comment #123457
# Edit OracleChat.svelte, move aria-busy to form
git add apps/web/src/lib/components/oracle/OracleChat.svelte
npm run lint && npm test
git commit -m "♿ fix: move aria-busy to form element

- Addresses PR #502 Comment #123457: Improve screen reader announcement"

# 6. Address comment #123458
# Revert formatting changes in prompt files
git add apps/web/src/lib/services/ai/prompts/
npm run lint && npm test
git commit -m "🔧 refactor: remove unrelated formatting changes

- Addresses PR #502 Comment #123458: Keep PR focused on accessibility fixes"

# 7. Push all changes
git push origin palette-oracle-chat-loading-ux
```

---

## Best Practices

### Comment Response Quality

- **Be explicit**: Reference the exact comment ID in commit messages
- **Be minimal**: Make only the changes needed to address the comment
- **Be responsive**: If you disagree, reply explaining your reasoning
- **Be thorough**: Don't leave any comments unaddressed

### Commit Hygiene

- **Granular commits**: One logical change per commit when possible
- **Clear messages**: Explain what and why, not just what
- **Reference comments**: Always include comment IDs for traceability
- **Pass CI**: Ensure lint and tests pass before pushing

### Handling Complex Comments

- **Vague comments**: Ask for clarification before implementing
- **Conflicting comments**: If two comments conflict, address both and explain the trade-off
- **Scope creep**: If a comment suggests new features, acknowledge but suggest a follow-up PR

### Final Checklist

- [ ] All comments addressed or replied to
- [ ] Lint passes
- [ ] Tests pass
- [ ] Commit messages reference comment IDs
- [ ] Changes pushed to remote
- [ ] PR description updated if scope changed
- [ ] Reviewers notified of changes

---

## Troubleshooting

### Issue: Comment ID not found in commit history

**Solution:** Ensure comment ID is in the commit message body, not just the subject line.

### Issue: Multiple comments on same line

**Solution:** Address all comments on that line in a single change, reference all IDs.

### Issue: Comment requires multiple files

**Solution:** Group into a single commit if changes are atomic, reference all comment IDs.

### Issue: Tests require API keys

**Solution:** Create mock fixtures that don't require real API calls (see Testing Guidelines in QWEN.md).

---

## Related Skills

- [`git-workflow`](../git-workflow/SKILL.md) - General git operations
- [`code-review`](../code-review/SKILL.md) - Conducting code reviews
- [`test-writing`](../test-writing/SKILL.md) - Creating test coverage
