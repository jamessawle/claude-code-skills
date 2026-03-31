---
name: review-pr
description: Use this skill whenever someone asks to review a pull request, check code quality, or get feedback on PR changes. Spawns parallel specialist reviewers (correctness, security, performance, testing, architecture) that each analyse the diff independently, then collates and deduplicates findings into a structured review. Trigger for "review PR", "review this PR", "code review", "check the code in PR", "look at the changes in PR", "what do you think of this PR", or any request to assess the quality of a pull request's changes.
license: MIT
compatibility: Requires GitHub CLI (gh) authenticated with read access to the target repo
allowed-tools: Bash, Read, Agent
argument-hint: "[owner/repo] [pr-number]"
metadata:
  author: jamessawle
  version: "1.0"
---

# Review PR

Review a pull request by spawning parallel specialist reviewers, then collating their findings into a single structured report.

## Arguments

- `$0` (optional) — GitHub repository in `owner/repo` format
- `$1` (optional) — PR number

**Modes:**

| Arguments | Behaviour |
|-----------|-----------|
| `owner/repo 123` | Review PR #123 in that repo |
| `123` | Review PR #123 in the current repo |
| _(none)_ | Detect the PR for the current branch |

When no arguments are provided, detect the current branch's PR:

```bash
gh pr view --json number,headRefName --jq '.number'
```

If no PR is associated with the current branch, report that and stop.

When only a number is provided (no `/` in `$0`), treat it as a PR number in the current repo — omit `--repo` and let `gh` infer it.

## Workflow

### Step 1: Gather PR context

Determine the PR number and optional `--repo` flag from the arguments (see Modes above). Then run these in parallel:

```bash
gh pr view <number> [--repo <owner/repo>] --json title,body,baseRefName,headRefName,additions,deletions,changedFiles,labels,author
```

```bash
gh pr diff <number> [--repo <owner/repo>]
```

```bash
gh pr view <number> [--repo <owner/repo>] --json files --jq '.files[].path'
```

From the results, determine:

- **PR scope**: small (<100 lines changed), medium (100-500), large (500+)
- **Primary languages**: detect from file extensions in the changeset
- **PR type**: feature, bugfix, refactor, dependency update, config change, docs — infer from title, labels, and file patterns

If the diff is very large (>2000 lines), note this for Step 2 — each reviewer will receive the full diff but should be told to focus on the most critical files rather than trying to cover everything exhaustively.

### Step 2: Spawn specialist reviewers

Spawn 5 subagents in parallel using the Agent tool. Each receives:

- The PR metadata (title, description, author, base branch)
- The full diff
- The list of changed files
- The PR scope and primary languages

Each subagent has a focused prompt from the `agents/` directory. Read the relevant agent file and include its contents in the subagent prompt along with the PR data.

The 5 reviewers are:

| Reviewer | Agent file | Focus |
|----------|-----------|-------|
| Correctness | `agents/correctness.md` | Logic bugs, edge cases, error handling, type safety |
| Security | `agents/security.md` | Vulnerabilities, secrets, auth gaps, input validation |
| Performance | `agents/performance.md` | Algorithmic complexity, resource usage, query patterns |
| Testing | `agents/testing.md` | Coverage gaps, assertion quality, missing edge case tests |
| Architecture | `agents/architecture.md` | Design patterns, abstractions, maintainability, coupling |

For each subagent, the prompt should be structured as:

```text
You are reviewing a pull request as a specialist in [AREA].

## PR Context
- Title: [title]
- Author: [author]
- Base: [baseRefName] <- [headRefName]
- Scope: [small/medium/large] ([additions] additions, [deletions] deletions, [changedFiles] files)
- Languages: [detected languages]
- PR description: [body]

## Your review instructions
[contents of agents/<reviewer>.md]

## Changed files
[file list]

## Diff
[full diff]

Respond with your findings as a JSON array. Each finding should have:
- "severity": "critical" | "important" | "suggestion" | "nitpick"
- "file": the file path (or null if general)
- "line": approximate line number in the diff (or null if general)
- "title": short summary (one line)
- "detail": explanation of the issue and why it matters
- "suggestion": recommended fix or alternative (if applicable)
```

### Step 3: Collate and deduplicate

Once all 5 reviewers return, merge their findings:

1. **Parse** each reviewer's JSON response
2. **Deduplicate** — if two reviewers flag the same file+line with similar concerns, keep the one with more detail and note which reviewers flagged it
3. **Sort** by severity: critical first, then important, suggestions, nitpicks
4. **Count** findings per severity level

### Step 4: Output the review

Present the review in this format:

```markdown
## PR Review: [title]

**[owner/repo]#[number]** | [author] | [additions]+/[deletions]- across [changedFiles] files

### Summary

[2-3 sentence overview: what the PR does, overall quality assessment, key risk areas]

### Risk Assessment

| Dimension | Rating |
|-----------|--------|
| Risk level | Low / Medium / High / Critical |
| Complexity | Low / Medium / High |
| Test coverage | Adequate / Needs work / Missing |

### Findings

#### Critical ([count])

- **[title]** (`file:line`) — [detail]. *Suggestion: [suggestion]*

#### Important ([count])

- **[title]** (`file:line`) — [detail]. *Suggestion: [suggestion]*

#### Suggestions ([count])

- **[title]** (`file:line`) — [detail]

#### Nitpicks ([count])

- **[title]** (`file:line`) — [detail]

### Positive observations

[Note good practices, clean code, thorough tests — always include something positive]

### Verdict

One of:
- Approve — no critical or important findings
- Approve with comments — no critical findings, some important ones
- Request changes — has critical or multiple important findings
- Block — has critical security or data-integrity findings
```

Omit severity sections that have zero findings.

### Step 5: Offer to post

After presenting the review, ask the user:

> "Would you like me to post this as a review on the PR? I can submit it as a GitHub review with inline comments."

If they say yes:

1. Post the summary as a PR review comment:

   ```bash
   gh pr review <number> [--repo <owner/repo>] --comment --body "[review body]"
   ```

2. For critical and important findings that have specific file+line references, post inline review comments using the GitHub API.

If they say no, the review is complete.

## Important guidelines

- **Read-only by default** — never post to GitHub without explicit user approval
- **Be constructive** — explain _why_ something is problematic and suggest alternatives
- **Be proportional** — match review depth to PR risk; don't block on style for a hotfix
- **Always find positives** — every PR has something done well; mention it
- **Respect the diff** — only review what changed, not pre-existing code unless the change makes it worse
