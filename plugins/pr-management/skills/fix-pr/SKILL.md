---
name: fix-pr
description: Fix a GitHub PR that has merge conflicts or failed CI checks. Takes a repo and PR number, diagnoses the problem, rebases onto the base branch, resolves merge conflicts, fixes broken CI/tests, force-pushes the fix, and comments on the PR explaining what was done. Use this skill whenever someone asks to fix, unblock, rebase, or get a PR mergeable again — including when they mention merge conflicts, CI failures, failed checks, broken builds, or a PR that cannot be merged.
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent
argument-hint: <owner/repo> <pr-number>
---

# Fix PR

You are tasked with fixing a single GitHub PR that has merge conflicts or failed CI checks.

## Arguments

- `$0` — GitHub repository in `owner/repo` format
- `$1` — PR number

If arguments are missing, ask the user to provide them: `/fix-pr owner/repo 123`

## Required permissions

Add these permissions to your settings so only the final push and comment require approval:

**Allow:**

```text
Bash(gh pr view*)
Bash(gh pr checks*)
Bash(gh run view*)
Bash(gh repo clone*)
Bash(mktemp -d*)
Bash(git -C /var/folders/*)
Bash(git -C /tmp/*)
Bash(GIT_EDITOR=true git -C /var/folders/*)
Bash(GIT_EDITOR=true git -C /tmp/*)
Bash(cd /var/folders/* && *)
Bash(cd /tmp/* && *)
Bash(rm -rf /var/folders/*)
Bash(rm -rf /tmp/*)
```

> **Platform note:** `mktemp -d` returns `/var/folders/*` on macOS and `/tmp/*` on Linux. Add the patterns matching your platform.

## Workflow

### Step 1: Diagnose the PR

Run these checks in parallel:

```bash
gh pr view $1 --repo $0 --json title,baseRefName,headRefName,mergeable,state,statusCheckRollup,mergeStateStatus
```

```bash
gh pr checks $1 --repo $0
```

Analyze the results:

- **mergeable**: Is the PR mergeable or does it have conflicts?
- **statusCheckRollup**: Are CI checks passing, failing, or pending?
- **state**: Is the PR still open?

If the PR is clean (mergeable, all checks passing), report that and stop — no work needed.

### Step 2: Clone and fix

Create a temp directory, then delegate ALL the fix work to an Agent:

```bash
WORKDIR=$(mktemp -d)
echo "WORKDIR=$WORKDIR"
```

Pass the agent: diagnostic info from Step 1, the WORKDIR path, repo name, PR number, base branch, and head branch.

**Command patterns for the agent:**

- Git commands: `git -C $WORKDIR <subcommand>` (avoids Claude Code's bare repository attack protection that blocks `cd && git`)
- Rebase continue: `GIT_EDITOR=true git -C $WORKDIR rebase --continue` (avoids interactive editor)
- Non-git commands: `cd $WORKDIR && <command>`
- Reading files: use the Read tool with absolute paths (`$WORKDIR/<file>`)

The agent should clone, fix, and report back autonomously — no user interaction.

```bash
gh repo clone $0 $WORKDIR -- --depth=50
git -C $WORKDIR fetch origin pull/$1/head:pr-branch
git -C $WORKDIR checkout pr-branch
```

**Do NOT use `isolation: "worktree"`** — this skill may be invoked from a directory that is not the target repo.

#### For merge conflicts:

1. Rebase onto the base branch:

   ```bash
   git -C $WORKDIR fetch origin <baseRefName>
   git -C $WORKDIR rebase origin/<baseRefName>
   ```

2. When conflicts occur, for each conflicting file:
   - Read the file to understand both sides of the conflict
   - Read surrounding context and related files to understand intent
   - Resolve the conflict preserving the intent of both changes
   - Stage the resolved file and continue the rebase
3. If a conflict is ambiguous and you cannot confidently resolve it, abort the rebase and report which files and why.

#### For failed CI checks:

1. Get failure logs:
   - For GitHub Actions: `gh run view <run-id> --repo $0 --log-failed`
   - For other CI: read the CI config to understand what commands are run, then run linters/tests locally to reproduce failures
2. Diagnose and fix the failure.
3. Re-run tests/linters to verify the fix passes.
4. **Roll fixes into the appropriate existing commit** rather than adding a separate "fix" commit at the end. Use interactive rebase (`git -C $WORKDIR rebase -i`) or `git -C $WORKDIR commit --fixup=<sha>` followed by `git -C $WORKDIR rebase --autosquash` to fold the fix into the commit that introduced the problem. Each commit in the PR should pass all checks on its own — this keeps the history clean and bisectable.
5. If the failure isn't attributable to a specific commit (e.g. a flaky config issue), amend it into the most relevant commit rather than appending a new one.

#### For both issues:

Handle conflicts first (rebase), then address CI failures on the rebased branch. When fixing CI after a rebase, still prefer rolling fixes into existing commits over adding new ones.

#### Agent return value:

The agent must return a summary including:

- What conflicts were found and how each was resolved
- The rebased commit list (`git log --oneline`)
- The diff stat (`git diff --stat`)
- Any caveats (e.g. lock files needing regeneration, tests that couldn't run locally)

### Step 3: Present changes, push, and comment

Present the agent's summary to the user **before** asking for approval. The user needs to understand what they're approving.

Only **after** presenting the summary, ask for **one single confirmation** to push and comment. This is the **only point where user interaction is required**.

On approval, push with `--force-with-lease` (explicit ref for shallow clone compatibility):

```bash
git -C $WORKDIR fetch origin <headRefName>:refs/remotes/origin/<headRefName>
git -C $WORKDIR push origin pr-branch:<headRefName> --force-with-lease=<headRefName>:origin/<headRefName>
```

Then comment on the PR. Tailor the content to exactly what happened — these are templates, not copy-paste:

```bash
# On success:
gh pr comment $1 --repo $0 --body "$(cat <<'EOF'
🤖 **Automated PR maintenance** (via `fix-pr` skill)

**Actions taken:**
- Rebased onto `<baseRefName>` — resolved conflicts in `<files>`
- <any other actions, e.g. CI fixes>

**Conflict resolutions:**
- `<file>`: <brief description of how it was resolved>

All checks should re-run automatically.
EOF
)"

# On failure / partial success:
gh pr comment $1 --repo $0 --body "$(cat <<'EOF'
🤖 **Automated PR maintenance** (via `fix-pr` skill)

**Status: Needs manual attention**

**What was attempted:** <actions taken>
**What couldn't be resolved:** <files and why>
**Suggested next steps:** <specific guidance>
EOF
)"
```

Always comment, even on failure — this creates an audit trail.

### Step 4: Verify and clean up

Check the PR state after pushing:

```bash
gh pr view $1 --repo $0 --json mergeable,mergeStateStatus
```

Report the final status to the user, then clean up regardless of outcome:

```bash
rm -rf "$WORKDIR"
```

## Important guidelines

- **Minimize user interaction** — only ask for approval once, at the push + comment step
- If conflicts are ambiguous, report them rather than guessing — preserve intent of both sides
- Never use `--force` — always `--force-with-lease`
- Always comment on the PR with what was done, even on failure
