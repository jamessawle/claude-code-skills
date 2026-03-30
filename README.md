# Claude Code Skills

Personal [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for automating development workflows.

## Plugins

### pr-management

Tools for managing and fixing open PRs.

| Skill | Description |
|-------|-------------|
| [`/fix-pr`](plugins/pr-management/skills/fix-pr/SKILL.md) | Autonomously fix a GitHub PR with merge conflicts or failed CI — diagnoses, rebases, resolves conflicts, and pushes. |

### skill-tools

Development tools for validating and maintaining skill definitions.

| Skill | Description |
|-------|-------------|
| [`/skill-validator`](plugins/skill-tools/skills/skill-validator/SKILL.md) | Validate a single Claude Code skill — checks markdown formatting, frontmatter fields, and content consistency. |
| [`/marketplace-validator`](plugins/skill-tools/skills/marketplace-validator/SKILL.md) | Validate a Claude Code skills marketplace — checks repo structure, JSON schemas, plugin paths, then validates each skill. |

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
