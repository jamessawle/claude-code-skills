---
name: marketplace-validator
description: Validate a Claude Code skills marketplace repository end-to-end. Checks the marketplace.json schema, verifies all plugin references and directory structure, validates every plugin.json, then runs skill-validator on each skill found. Use this skill whenever someone asks to validate, check, or audit an entire marketplace repo, verify marketplace structure, check that plugin paths and JSON schemas are correct, or run a full validation sweep before publishing. This is for whole-marketplace validation — for checking a single skill, use skill-validator instead.
license: MIT
compatibility: Requires Node.js
allowed-tools: Bash, Read
argument-hint: <path-to-marketplace-root>
metadata:
  author: jamessawle
  version: "1.0"
---

# Marketplace Validator

Validates a Claude Code skills marketplace repository, then validates each skill and role within it.

1. **Marketplace structure** — JSON schemas, plugin paths, directory layout
2. **Per-skill validation** — delegates to the skill-validator's tooling for each skill found
3. **Role validation** — delegates to the role-validator's tooling for each role file found in `agents/`

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
- Each skill directory contains a `SKILL.md`

### Step 3: Per-skill validation

For each skill directory found in Step 2, delegate to the `skill-validator` skill to perform full validation (markdown formatting, frontmatter fields, content review). Pass the skill directory path as the argument.

### Step 4: Role validation

If an `agents/` directory exists at the marketplace root, delegate to the `role-validator` skill to validate all role files. Pass the `agents/` directory path as the argument:

```bash
<path-to-role-validator>/scripts/validate.sh '<marketplace-root>/agents'
```

If no `agents/` directory exists, skip this step (roles are optional).

Note: role validation is not included in this skill's own `validate.sh` — it requires either the agent to invoke the role-validator, or a direct call to the role-validator's script.

### Step 5: Summary

Output a combined report:

- **Marketplace structure**: X passed, Y failed
- **Per-skill results**: for each skill, markdown formatting + content review findings
- **Role validation**: for each role, structural validation results (or "No roles found — skipped")
- **Overall verdict**: PASS / FAIL with actionable next steps for any failures
