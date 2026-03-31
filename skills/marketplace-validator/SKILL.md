---
name: marketplace-validator
description: Validate a Claude Code skills marketplace repository end-to-end. Checks the marketplace.json schema, verifies all plugin references and directory structure, validates every plugin.json, then runs skill-validator on each skill found. Use this skill whenever someone asks to validate, check, or audit an entire marketplace repo, verify marketplace structure, check that plugin paths and JSON schemas are correct, or run a full validation sweep before publishing. This is for whole-marketplace validation — for checking a single skill, use skill-validator instead.
allowed-tools: Bash, Read
argument-hint: <path-to-marketplace-root>
---

# Marketplace Validator

Validates a Claude Code skills marketplace repository, then validates each skill within it.

1. **Marketplace structure** — JSON schemas, plugin paths, directory layout
2. **Per-skill validation** — delegates to the skill-validator's tooling for each skill found

## Required permissions

Add this to your settings so the validation runs without prompts:

**Allow:**

```text
Bash(*/scripts/validate.sh*)
```

## Arguments

- `$0` — Path to a marketplace root (directory containing `.claude-plugin/marketplace.json`). Defaults to the current working directory if not provided.

## Workflow

### Step 1: Verify target

Check that `$0/.claude-plugin/marketplace.json` exists. If not, report an error and stop.

### Step 2: Marketplace structure validation

```bash
${CLAUDE_SKILL_DIR}/scripts/validate.sh '$0'
```

This checks:

- `marketplace.json` exists, is valid JSON, and has required fields (`name`, `plugins` array)
- Each plugin entry has `name`, `source`, `description`
- Each plugin's source directory exists on disk
- Each plugin has a `.claude-plugin/plugin.json` with required fields (`name`, `description`, `version`)
- Each plugin has a `skills/` directory with at least one skill
- Each skill directory contains a `SKILL.md` with valid frontmatter

### Step 3: Per-skill validation

For each skill directory found in Step 2, delegate to the `skill-validator` skill to validate it. Pass the skill directory path as the argument.

### Step 4: Summary

Output a combined report:

- **Marketplace structure**: X passed, Y failed
- **Per-skill results**: for each skill, markdown formatting + content review findings
- **Overall verdict**: PASS / FAIL with actionable next steps for any failures
