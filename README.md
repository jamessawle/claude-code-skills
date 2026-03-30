# Claude Code Skills

Personal [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for automating development workflows.

## Skills

| Skill | Description |
|-------|-------------|
| [`/fix-pr`](plugins/pr-management/skills/fix-pr/SKILL.md) | Autonomously fix a GitHub PR with merge conflicts or failed CI — diagnoses, rebases, resolves conflicts, and pushes. |

## Setup

1. Add this repo as a marketplace in `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "jamessawle-marketplace": {
      "source": { "source": "github", "repo": "jamessawle/claude-code-skills" }
    }
  }
}
```

2. Add the required permissions listed in each skill's `SKILL.md`.

3. Requires [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated.
