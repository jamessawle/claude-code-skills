import { readFileSync, existsSync } from "fs";
import { resolve, basename } from "path";

const requiredHeadings = ["## Perspective", "## Areas of expertise", "## Severity calibration"];

const results = [];

function check(label, fn) {
  try {
    fn();
    results.push({ label, passed: true });
  } catch (e) {
    results.push({ label, passed: false, error: e.message });
  }
}

function run(rolePath) {
  const resolved = resolve(rolePath);
  const filename = basename(resolved);

  check("Role file exists", () => {
    if (!existsSync(resolved)) {
      throw new Error(`Not found: ${resolved}`);
    }
  });

  if (!existsSync(resolved)) return;

  const content = readFileSync(resolved, "utf-8");

  check("File has a title (H1 heading)", () => {
    const match = content.match(/^# .+$/m);
    if (!match) {
      throw new Error("No H1 heading found — role files must start with a title");
    }
  });

  check("Title is followed by an identity statement", () => {
    const lines = content.split("\n");
    const titleIndex = lines.findIndex((l) => /^# .+/.test(l));
    if (titleIndex === -1) return;

    // Find the first non-empty line after the title
    let identityLine = null;
    for (let i = titleIndex + 1; i < lines.length; i++) {
      if (lines[i].trim().length > 0) {
        identityLine = lines[i].trim();
        break;
      }
    }

    if (!identityLine) {
      throw new Error("No identity statement found after the title");
    }

    if (identityLine.startsWith("#")) {
      throw new Error(
        "Identity statement is missing — the title is immediately followed by another heading"
      );
    }
  });

  for (const heading of requiredHeadings) {
    check(`Has "${heading}" section`, () => {
      if (!content.includes(heading)) {
        throw new Error(`Missing required section: ${heading}`);
      }
    });
  }

  check('"## Areas of expertise" has content', () => {
    const match = content.match(/## Areas of expertise\n+([\s\S]*?)(?=\n## |\n*$)/);
    if (!match || match[1].trim().length === 0) {
      throw new Error('"## Areas of expertise" section is empty');
    }

    const boldItems = match[1].match(/\*\*[^*]+\*\*/g);
    if (!boldItems || boldItems.length === 0) {
      throw new Error(
        '"## Areas of expertise" should contain bold-labeled items (e.g. **Topic** -- description)'
      );
    }
  });

  check('"## Severity calibration" has all four levels', () => {
    const match = content.match(/## Severity calibration\n+([\s\S]*?)(?=\n## |\n*$)/);
    if (!match) {
      throw new Error('"## Severity calibration" section is empty');
    }

    const section = match[1];
    const levels = ["Critical", "Important", "Suggestion", "Nitpick"];
    const missing = levels.filter(
      (l) => !section.includes(`**${l}**`)
    );

    if (missing.length > 0) {
      throw new Error(`Missing severity levels: ${missing.join(", ")}`);
    }
  });

  check("Filename uses lowercase-hyphen convention", () => {
    const nameWithoutExt = filename.replace(/\.md$/, "");
    if (!/^[a-z0-9-]+$/.test(nameWithoutExt)) {
      throw new Error(
        `Filename "${filename}" should use lowercase letters, numbers, and hyphens only`
      );
    }
  });
}

const rolePath = process.argv[2];
if (!rolePath) {
  console.error("Usage: node validate-role.mjs <path-to-role-file.md>");
  process.exit(1);
}

run(rolePath);

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
