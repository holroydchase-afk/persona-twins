// Shared helpers for the PTW-M2.1 acceptance tests (docs/specs/PTW-ux-reviewer.md).
// No API key, no network: everything reads repo files or runs scripts against a temp copy.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const root = path.resolve(cliDir, "..");
export const personasDir = path.join(root, "personas");
export const pagePath = path.join(root, "persona-twins.html");
export const protocolPath = path.join(root, "review-protocol.md");
export const everydayPath = path.join(personasDir, "everyday.md");
const tsxBin = path.join(cliDir, "node_modules", ".bin", "tsx");

export function readRequired(file: string): string {
  assert.ok(fs.existsSync(file), `missing file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}

export function personaFiles(): string[] {
  return fs
    .readdirSync(personasDir)
    .filter((f) => f.endsWith(".md") && !["TEMPLATE.md", "README.md"].includes(f))
    .map((f) => path.join(personasDir, f));
}

type PromptModule = {
  loadPersona: (file: string) => { id: string; [k: string]: unknown };
  systemPrompt: (p: any) => string;
};

// Spec PTW-M2.1.2: systemPrompt and loadPersona are exported from twin.ts (or cli/prompt.ts),
// and twin.ts runs main() only when executed directly. Importing twin.ts before that guard exists
// would run the CLI (usage error, process.exit), so check it in a child process first.
export async function loadPromptModule(): Promise<PromptModule> {
  const promptTs = path.join(cliDir, "prompt.ts");
  const target = fs.existsSync(promptTs) ? promptTs : path.join(cliDir, "twin.ts");
  const probe = spawnSync(
    tsxBin,
    ["-e", `import(${JSON.stringify(target)}).then((m) => console.log("EXPORTS " + JSON.stringify(Object.keys(m))))`],
    { cwd: cliDir, encoding: "utf8", env: { ...process.env, ANTHROPIC_API_KEY: "" }, timeout: 30000 },
  );
  assert.equal(
    probe.status, 0,
    `importing ${path.basename(target)} ran the CLI instead of just loading it (main() not guarded). stderr: ${probe.stderr.trim()}`,
  );
  const line = probe.stdout.split("\n").find((l) => l.startsWith("EXPORTS ")) ?? "EXPORTS []";
  const keys: string[] = JSON.parse(line.slice(8));
  for (const name of ["loadPersona", "systemPrompt"]) {
    assert.ok(keys.includes(name), `${path.basename(target)} does not export ${name} (exports: ${keys.join(", ") || "none"})`);
  }
  return (await import(target)) as PromptModule;
}

// Runs cli/sync-personas.ts against a temp copy of the repo so tests never rewrite the real page.
export function syncIntoTempCopy(): { dir: string; page: string; stdout: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptw-sync-"));
  fs.mkdirSync(path.join(dir, "cli"));
  fs.copyFileSync(path.join(cliDir, "sync-personas.ts"), path.join(dir, "cli", "sync-personas.ts"));
  fs.copyFileSync(path.join(cliDir, "package.json"), path.join(dir, "cli", "package.json"));
  fs.symlinkSync(path.join(cliDir, "node_modules"), path.join(dir, "cli", "node_modules"), "dir");
  fs.cpSync(personasDir, path.join(dir, "personas"), { recursive: true });
  fs.copyFileSync(pagePath, path.join(dir, "persona-twins.html"));
  if (fs.existsSync(protocolPath)) fs.copyFileSync(protocolPath, path.join(dir, "review-protocol.md"));
  const run = spawnSync(tsxBin, ["sync-personas.ts"], { cwd: path.join(dir, "cli"), encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, `sync-personas failed: ${run.stderr.trim()}`);
  return { dir, page: fs.readFileSync(path.join(dir, "persona-twins.html"), "utf8"), stdout: run.stdout };
}

export function pagePersonas(html: string): Array<{ id: string; [k: string]: unknown }> {
  const m = html.match(/\/\/ PERSONAS:BEGIN[^\n]*\n\s*const PERSONAS = ([\s\S]*?);\s*\n\/\/ PERSONAS:END/);
  assert.ok(m, "persona-twins.html: PERSONAS block not found");
  return JSON.parse(m[1]);
}

export function pageProtocol(html: string): string {
  const m = html.match(/\/\/ PROTOCOL:BEGIN[^\n]*\n\s*const REVIEW_PROTOCOL = ([\s\S]*?);\s*\n\/\/ PROTOCOL:END/);
  assert.ok(m, "persona-twins.html: PROTOCOL:BEGIN/END block with `const REVIEW_PROTOCOL = ...;` not found");
  return JSON.parse(m[1]);
}

export function pageRulesSource(html: string): string {
  const start = html.indexOf("function rules(p)");
  assert.ok(start >= 0, "persona-twins.html: function rules(p) not found");
  const end = html.indexOf("\nfunction ", start + 1);
  return html.slice(start, end < 0 ? undefined : end);
}
