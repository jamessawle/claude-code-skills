# AI Coding Skills

Reusable skills for AI coding agents.

## Skills

| Skill | Description | Claude Plugin | Prerequisites |
|-------|-------------|---------------|---------------|
| [`fix-pr`](skills/pr-management/fix-pr/SKILL.md) | Fix a GitHub PR with merge conflicts or failed CI — diagnoses, rebases, resolves conflicts, and pushes. | pr-management | [GitHub CLI](https://cli.github.com/) (`gh`) |
| [`list-prs`](skills/pr-management/list-prs/SKILL.md) | List open PRs with enriched state — CI status, reviews, conflicts, and staleness. Single repo or cross-repo. | pr-management | [GitHub CLI](https://cli.github.com/) (`gh`) |
| [`merge-queue`](skills/pr-management/merge-queue/SKILL.md) | Process approved PRs through a merge queue — fixes and merges each one sequentially, re-querying after each merge. | pr-management | [GitHub CLI](https://cli.github.com/) (`gh`) |
| [`review-pr`](skills/pr-management/review-pr/SKILL.md) | Review a PR with parallel specialist reviewers (correctness, security, performance, testing, architecture) and produce a structured report. | pr-management | [GitHub CLI](https://cli.github.com/) (`gh`) |
| [`skill-validator`](skills/skill-tools/skill-validator/SKILL.md) | Validate a single skill — checks markdown formatting, frontmatter fields, and content consistency. | skill-tools | Node.js |
| [`marketplace-validator`](skills/skill-tools/marketplace-validator/SKILL.md) | Validate a skills marketplace — checks repo structure, JSON schemas, plugin paths, then validates each skill. | skill-tools | Node.js |
| [`role-validator`](skills/skill-tools/role-validator/SKILL.md) | Validate role definition files — checks structure, required sections, severity levels, and naming conventions. | skill-tools | Node.js |

## Installation

### Any agent

```bash
npx skills add jamessawle/skills
```

### Claude Code

Add this repo as a marketplace in `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "jamessawle-marketplace": {
      "source": { "source": "github", "repo": "jamessawle/skills" }
    }
  }
}
```
