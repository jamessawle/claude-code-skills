import { readFileSync, existsSync } from "fs";
import { resolve, dirname, basename, join } from "path";

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const data = {};
  let currentParent = null;

  for (const line of match[1].split("\n")) {
    if (line.length === 0) continue;

    const isIndented = /^\s{2,}/.test(line);

    if (isIndented && currentParent !== null) {
      const trimmed = line.trim();
      const colon = trimmed.indexOf(":");
      if (colon === -1) continue;
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      data[currentParent][key] = value;
      continue;
    }

    currentParent = null;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (value === "") {
      currentParent = key;
      data[key] = {};
    } else if (value === "true") {
      data[key] = true;
    } else if (value === "false") {
      data[key] = false;
    } else {
      data[key] = value;
    }
  }
  return data;
}

const requiredFields = ["name", "description", "license", "compatibility", "metadata"];

function extractBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (match) return match[1];
  return content;
}

function validatePaths(skillMdPath) {
  const skillDir = dirname(resolve(skillMdPath));
  const content = readFileSync(resolve(skillMdPath), "utf-8");
  const body = extractBody(content);

  const paths = new Set();

  // Match ${CLAUDE_SKILL_DIR}/... paths (in code blocks or inline)
  const claudeSkillDirRe = /\$\{CLAUDE_SKILL_DIR\}\/([\w./-]+)/g;
  for (const m of body.matchAll(claudeSkillDirRe)) {
    paths.add(m[1]);
  }

  // Match references/<file> paths (backtick-quoted or bare)
  const referencesRe = /(?:^|[`\s(])(references\/[\w./-]+)/gm;
  for (const m of body.matchAll(referencesRe)) {
    paths.add(m[1]);
  }

  // Match scripts/<file> paths that aren't already captured by CLAUDE_SKILL_DIR
  const scriptsRe = /(?:^|[`\s(])(scripts\/[\w./-]+)/gm;
  for (const m of body.matchAll(scriptsRe)) {
    paths.add(m[1]);
  }

  for (const p of paths) {
    // Skip placeholder patterns like "...", "foo/...", wildcards, and variable references
    if (/\.{2,}/.test(p) || /[*?$]/.test(p)) continue;

    const resolved = join(skillDir, p);
    check(`referenced path exists: ${p}`, () => {
      if (!existsSync(resolved)) {
        throw new Error(`Not found: ${resolved}`);
      }
    });
  }
}

const results = [];

function check(label, fn) {
  try {
    fn();
    results.push({ label, passed: true });
  } catch (e) {
    results.push({ label, passed: false, error: e.message });
  }
}

function run(skillMdPath) {
  const resolved = resolve(skillMdPath);

  check("SKILL.md exists", () => {
    if (!existsSync(resolved)) {
      throw new Error(`Not found: ${resolved}`);
    }
  });

  if (!existsSync(resolved)) return;

  let frontmatter = null;

  check("SKILL.md has YAML frontmatter", () => {
    const content = readFileSync(resolved, "utf-8");
    frontmatter = parseFrontmatter(content);
    if (!frontmatter) {
      throw new Error("No YAML frontmatter found");
    }
  });

  if (!frontmatter) return;

  check("Frontmatter has required fields", () => {
    const missing = requiredFields.filter((f) => !(f in frontmatter));
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }
  });

  // name validation
  check('"name" format is valid', () => {
    const name = frontmatter.name;
    if (typeof name !== "string" || name.length === 0) {
      throw new Error('"name" must be a non-empty string');
    }
    if (name.length > 64) {
      throw new Error(`"name" must be at most 64 characters, got ${name.length}`);
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error('"name" must contain only lowercase letters (a-z), numbers, and hyphens');
    }
    if (name.startsWith("-") || name.endsWith("-")) {
      throw new Error('"name" must not start or end with a hyphen');
    }
    if (/--/.test(name)) {
      throw new Error('"name" must not contain consecutive hyphens');
    }
  });

  check('"name" matches parent directory', () => {
    const expected = basename(dirname(resolved));
    if (frontmatter.name !== expected) {
      throw new Error(`"name" is "${frontmatter.name}" but parent directory is "${expected}"`);
    }
  });

  // description validation
  check('"description" is valid', () => {
    const desc = frontmatter.description;
    if (typeof desc !== "string" || desc.length === 0) {
      throw new Error('"description" must be a non-empty string');
    }
    if (desc.length > 1024) {
      throw new Error(`"description" must be at most 1024 characters, got ${desc.length}`);
    }
  });

  // allowed-tools validation (optional)
  if ("allowed-tools" in frontmatter) {
    check('"allowed-tools" is a non-empty string', () => {
      const v = frontmatter["allowed-tools"];
      if (typeof v !== "string" || v.length === 0) {
        throw new Error('"allowed-tools" must be a non-empty string if present');
      }
    });
  }

  // license validation (required)
  check('"license" is present and valid', () => {
    if (!("license" in frontmatter)) {
      throw new Error('"license" field is required');
    }
    if (typeof frontmatter.license !== "string" || frontmatter.license.length === 0) {
      throw new Error('"license" must be a non-empty string');
    }
  });

  // compatibility validation (required)
  check('"compatibility" is present and valid', () => {
    if (!("compatibility" in frontmatter)) {
      throw new Error('"compatibility" field is required');
    }
    const v = frontmatter.compatibility;
    if (typeof v !== "string" || v.length === 0) {
      throw new Error('"compatibility" must be a non-empty string');
    }
    if (v.length > 500) {
      throw new Error(`"compatibility" must be at most 500 characters, got ${v.length}`);
    }
  });

  // metadata validation (required)
  check('"metadata" is present and valid', () => {
    if (!("metadata" in frontmatter)) {
      throw new Error('"metadata" field is required');
    }
    const m = frontmatter.metadata;
    if (typeof m !== "object" || m === null || Array.isArray(m)) {
      throw new Error('"metadata" must be a map of key-value pairs');
    }
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== "string") {
        throw new Error(`metadata key "${k}" must have a string value, got ${typeof v}`);
      }
    }
  });

  // path reference validation
  validatePaths(skillMdPath);
}

const skillMdPath = process.argv[2];
if (!skillMdPath) {
  console.error("Usage: node validate-skill.mjs <path-to-SKILL.md>");
  process.exit(1);
}

run(skillMdPath);

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

for (const r of results) {
  const icon = r.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`${icon} ${r.label}`);
  if (r.error) {
    console.log(`  ${r.error}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
