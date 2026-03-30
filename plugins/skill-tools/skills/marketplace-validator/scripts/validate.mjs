import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const data = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = value;
  }
  return data;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
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

function validateRequired(obj, fields, label) {
  const missing = fields.filter((f) => !(f in obj));
  if (missing.length > 0) {
    throw new Error(`${label} missing required fields: ${missing.join(", ")}`);
  }
}

function run(repoRoot) {
  const marketplacePath = join(repoRoot, ".claude-plugin", "marketplace.json");

  let marketplace;

  check("marketplace.json exists", () => {
    if (!existsSync(marketplacePath)) {
      throw new Error(`Not found: ${marketplacePath}`);
    }
  });

  check("marketplace.json is valid JSON with required fields", () => {
    marketplace = readJson(marketplacePath);
    validateRequired(marketplace, ["name", "plugins"], "marketplace.json");
    if (!Array.isArray(marketplace.plugins)) {
      throw new Error("marketplace.json 'plugins' must be an array");
    }
  });

  if (!marketplace) return;

  for (const plugin of marketplace.plugins) {
    const pluginDir = resolve(repoRoot, plugin.source);
    const pluginJsonPath = join(pluginDir, ".claude-plugin", "plugin.json");
    const skillsDir = join(pluginDir, "skills");

    check(`plugin "${plugin.name}" — has required fields`, () => {
      validateRequired(plugin, ["name", "source", "description"], `plugin "${plugin.name}"`);
    });

    check(`plugin "${plugin.name}" — source directory exists`, () => {
      if (!existsSync(pluginDir)) {
        throw new Error(`Not found: ${pluginDir}`);
      }
    });

    check(`plugin "${plugin.name}" — plugin.json exists and is valid`, () => {
      if (!existsSync(pluginJsonPath)) {
        throw new Error(`Not found: ${pluginJsonPath}`);
      }
      const pluginJson = readJson(pluginJsonPath);
      validateRequired(pluginJson, ["name", "description", "version"], "plugin.json");
    });

    check(`plugin "${plugin.name}" — has skills directory`, () => {
      if (!existsSync(skillsDir)) {
        throw new Error(`Not found: ${skillsDir}`);
      }
    });

    if (!existsSync(skillsDir)) continue;

    const skills = readdirSync(skillsDir, { withFileTypes: true }).filter(
      (d) => d.isDirectory()
    );

    check(`plugin "${plugin.name}" — has at least one skill`, () => {
      if (skills.length === 0) {
        throw new Error(`No skill directories found in ${skillsDir}`);
      }
    });

    for (const skill of skills) {
      const skillMdPath = join(skillsDir, skill.name, "SKILL.md");

      check(`skill "${plugin.name}/${skill.name}" — SKILL.md exists`, () => {
        if (!existsSync(skillMdPath)) {
          throw new Error(`Not found: ${skillMdPath}`);
        }
      });

      if (!existsSync(skillMdPath)) continue;

      check(`skill "${plugin.name}/${skill.name}" — frontmatter is valid`, () => {
        const content = readFileSync(skillMdPath, "utf-8");
        const frontmatter = parseFrontmatter(content);

        if (!frontmatter) {
          throw new Error("No YAML frontmatter found");
        }

        validateRequired(
          frontmatter,
          ["name", "description", "allowed-tools"],
          `${skill.name}/SKILL.md frontmatter`
        );
      });
    }
  }
}

const repoRoot = process.argv[2];
if (!repoRoot) {
  console.error("Usage: node validate.mjs <repo-root>");
  process.exit(1);
}

run(resolve(repoRoot));

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
