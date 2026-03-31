# AI Coding Skills

This repo (`jamessawle/skills` on GitHub) contains reusable skills for AI coding agents. It is published as a Claude Code marketplace (`jamessawle-marketplace`), but the skills themselves are agent-agnostic — the `SKILL.md` format works across any agent that supports it.

## Repo structure

```
.claude-plugin/marketplace.json   # Marketplace definition — lists all plugins
skills/
  pr-management/                  # Plugin: PR management tools
    fix-pr/SKILL.md               # Diagnose and fix broken PRs
    list-prs/SKILL.md             # List open PRs with enriched state
    merge-queue/SKILL.md          # Batch merge approved PRs
  skill-tools/                    # Plugin: Skill development tools
    skill-validator/SKILL.md      # Validate a single skill
    marketplace-validator/SKILL.md # Validate the whole marketplace
```

Each skill directory contains:
- `SKILL.md` — the skill definition with YAML frontmatter and markdown instructions
- `references/claude.md` — recommended permission patterns (optional)
- `scripts/` — executable scripts for deterministic tasks (optional)

## Skill standard

Skills in this repo follow the [Agent Skills specification](https://agentskills.io/specification). Key points:

- Every skill is a directory containing a `SKILL.md` with YAML frontmatter and markdown instructions
- Required frontmatter: `name` (lowercase, hyphens, must match directory name, max 64 chars) and `description` (max 1024 chars)
- Optional frontmatter: `license`, `compatibility`, `metadata`, `allowed-tools`
- Optional directories: `scripts/` (executable code), `references/` (docs loaded on demand), `assets/` (static resources)
- Keep `SKILL.md` under 500 lines; move detailed content to `references/`
- Progressive disclosure: metadata (~100 tokens) is always loaded, the full body loads on activation, resources load on demand

### Claude Code extensions

These fields are not part of the Agent Skills spec but are used by Claude Code:
- `allowed-tools` — Claude Code uses comma-delimited (e.g. `Bash, Read, Edit`); the spec defines space-delimited
- `argument-hint` — shows usage hint in the skill picker (e.g. `"[owner/repo] [mine]"`)

## Adding a new skill

1. Create a directory under the appropriate plugin: `skills/<plugin-name>/<skill-name>/`
2. Write `SKILL.md` with frontmatter and workflow
3. Add the skill path to `marketplace.json` under the plugin's `skills` array
4. Run `/skill-tools:marketplace-validator` to validate everything
5. Update `README.md` with the new skill

## Adding a new plugin

1. Create a directory: `skills/<plugin-name>/`
2. Add at least one skill inside it
3. Add a plugin entry to `marketplace.json` with `name`, `description`, `source`, and `skills`
4. Validate with `/skill-tools:marketplace-validator`

## Validation

Always validate before committing:
- Single skill: `/skill-tools:skill-validator <path-to-skill-directory>`
- Whole marketplace: `/skill-tools:marketplace-validator`

These check markdown formatting, frontmatter fields, allowed-tools consistency, and permission coverage.

## Creating and improving skills

Use `/skill-creator:skill-creator` for the full skill development lifecycle:
- **Creating new skills** — captures intent, writes the SKILL.md draft, generates test cases, and iterates based on feedback
- **Measuring effectiveness** — runs eval prompts with and without the skill to compare output quality
- **Description optimization** — tests whether the skill triggers for natural language queries and improves the description (requires `ANTHROPIC_API_KEY` for the full loop; without it, use the eval-only step via `run_eval.py`)

Typical workflow: draft with `/skill-creator`, validate with `/skill-tools:marketplace-validator`, then commit.

## PR checklist

Before creating a pull request:
1. Run `/skill-tools:marketplace-validator` — all checks must pass
2. Ensure `README.md` is updated if skills were added or removed
3. Ensure `marketplace.json` includes any new skill paths
4. Commit messages should describe what changed and why

## Key conventions

- Skills that interact with external repos use `git -C <path>` rather than `cd <path> && git` — Claude Code's sandbox blocks the latter pattern
- Permission patterns in `references/claude.md` cover both `/var/folders/*` (macOS) and `/tmp/*` (Linux) temp paths
- Skill descriptions should include explicit trigger phrases to aid auto-triggering
- The `references/claude.md` file is not part of the skill spec — it's a Claude Code-specific convention for permission hints
