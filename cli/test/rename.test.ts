// PTW-M2.2 acceptance tests: the product is renamed to "Stakeholder Twins".
// The old name is built from parts below so this file never contains it and trips criterion 4 itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { cliDir, root, personasDir, protocolPath, pagePath, readRequired } from "./helpers.ts";

const NEW_NAME = "Stakeholder Twins";
const NEW_PAGE = "stakeholder-twins.html";
const OLD_SLUG = ["persona", "twins"].join("-");
const OLD_PAGE = `${OLD_SLUG}.html`;
const OLD_NAME_RE = new RegExp(["persona", "twins"].join("[ _-]?"), "gi");
const tsxBin = path.join(cliDir, "node_modules", ".bin", "tsx");

// Every file git would ship: tracked plus untracked-not-ignored. Skips .git, node_modules and agent-run logs.
function repoFiles(): string[] {
  const ls = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" });
  assert.equal(ls.status, 0, `git ls-files failed: ${ls.stderr}`);
  return ls.stdout
    .split("\0")
    .filter(Boolean)
    .filter((f) => !f.split("/").includes("node_modules") && !f.startsWith(".claude/agent-runs/"))
    .filter((f) => fs.existsSync(path.join(root, f)) && fs.statSync(path.join(root, f)).isFile());
}

test("PTW-M2.2.1 page file is stakeholder-twins.html and the old page file is gone", () => {
  assert.ok(fs.existsSync(path.join(root, NEW_PAGE)), `${NEW_PAGE} does not exist`);
  assert.ok(!fs.existsSync(path.join(root, OLD_PAGE)), `${OLD_PAGE} still exists`);
});

test("PTW-M2.2.2 page <title> and <h1> read Stakeholder Twins", () => {
  const html = readRequired(path.join(root, NEW_PAGE));
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim();
  assert.equal(title, NEW_NAME, `<title> is "${title}"`);
  assert.equal(h1, NEW_NAME, `<h1> is "${h1}"`);
});

test("PTW-M2.2.3 cli package and lockfile are named stakeholder-twins-cli", () => {
  const pkg = JSON.parse(readRequired(path.join(cliDir, "package.json")));
  const lock = JSON.parse(readRequired(path.join(cliDir, "package-lock.json")));
  assert.equal(pkg.name, "stakeholder-twins-cli", "cli/package.json name");
  assert.equal(lock.name, "stakeholder-twins-cli", "cli/package-lock.json name");
  assert.equal(lock.packages?.[""]?.name, "stakeholder-twins-cli", 'cli/package-lock.json packages[""].name');
});

test("PTW-M2.2.4 no file mentions the old product name (HANDOFF.md may keep one 'renamed from' note)", () => {
  const offenders: string[] = [];
  for (const rel of repoFiles()) {
    if (OLD_NAME_RE.test(rel)) offenders.push(`${rel} (file path)`);
    OLD_NAME_RE.lastIndex = 0;
    const lines = fs.readFileSync(path.join(root, rel), "utf8").split("\n");
    const hits = lines
      .map((line, i) => ({ line, n: i + 1, count: (line.match(OLD_NAME_RE) ?? []).length }))
      .filter((h) => h.count > 0);
    if (rel === "HANDOFF.md") {
      const total = hits.reduce((s, h) => s + h.count, 0);
      const ok = total === 0 || (total === 1 && /renamed from/i.test(hits[0].line));
      if (!ok) offenders.push(...hits.map((h) => `${rel}:${h.n} (only one "renamed from" mention allowed)`));
    } else {
      offenders.push(...hits.map((h) => `${rel}:${h.n}`));
    }
  }
  assert.deepEqual(offenders, [], `old product name still found in:\n  ${offenders.join("\n  ")}`);
});

test("PTW-M2.2.5 existing tests target stakeholder-twins.html", () => {
  assert.equal(path.basename(pagePath), NEW_PAGE, "cli/test/helpers.ts pagePath");
});

test("PTW-M2.2.5 npm run sync-personas writes into stakeholder-twins.html", () => {
  const src = readRequired(path.join(root, NEW_PAGE));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptw-rename-"));
  try {
    fs.mkdirSync(path.join(dir, "cli"));
    fs.copyFileSync(path.join(cliDir, "sync-personas.ts"), path.join(dir, "cli", "sync-personas.ts"));
    fs.copyFileSync(path.join(cliDir, "package.json"), path.join(dir, "cli", "package.json"));
    fs.symlinkSync(path.join(cliDir, "node_modules"), path.join(dir, "cli", "node_modules"), "dir");
    fs.cpSync(personasDir, path.join(dir, "personas"), { recursive: true });
    fs.copyFileSync(protocolPath, path.join(dir, "review-protocol.md"));
    // Blank the generated blocks so a pass proves sync really wrote the new file.
    const blanked = src
      .replace(/(\/\/ PERSONAS:BEGIN[^\n]*\n)[\s\S]*?(\n\/\/ PERSONAS:END)/, "$1const PERSONAS = [];$2")
      .replace(/(\/\/ PROTOCOL:BEGIN[^\n]*\n)[\s\S]*?(\n\/\/ PROTOCOL:END)/, '$1const REVIEW_PROTOCOL = "";$2');
    fs.writeFileSync(path.join(dir, NEW_PAGE), blanked);
    const run = spawnSync(tsxBin, ["sync-personas.ts"], { cwd: path.join(dir, "cli"), encoding: "utf8", timeout: 30000 });
    assert.equal(run.status, 0, `sync-personas failed against ${NEW_PAGE}: ${run.stderr.trim()}`);
    assert.ok(!fs.existsSync(path.join(dir, OLD_PAGE)), `sync-personas created ${OLD_PAGE}`);
    const out = fs.readFileSync(path.join(dir, NEW_PAGE), "utf8");
    assert.ok(!/const PERSONAS = \[\];/.test(out), `sync-personas did not fill PERSONAS in ${NEW_PAGE}`);
    assert.ok(!/const REVIEW_PROTOCOL = "";/.test(out), `sync-personas did not fill REVIEW_PROTOCOL in ${NEW_PAGE}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
