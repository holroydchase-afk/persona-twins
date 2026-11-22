// PTW-M3.1 acceptance tests (docs/specs/PTW-studio-wiring.md, PTW-WIRE-1 to 7).
// No network, and never the real .claude/agent-runs log: the --as, check-agent-runs and workflow tests run
// in temp git repos. Checks that need the sibling studio-agents clone (byte-for-byte sync) skip when it is
// absent (CI), and the "this PR only" scope guards (WIRE-6 hard rules, WIRE-7) skip on any other branch.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { cliDir, root, readRequired } from "./helpers.ts";

const PR_BRANCH = "claude/project-thread-rnaovm";
const studioDir = process.env.STUDIO_AGENTS_DIR ?? path.resolve(root, "..", "holroydchase-afk", "studio-agents");
const haveStudio = fs.existsSync(path.join(studioDir, "templates", "CLAUDE-agents.md"));
const noStudio = haveStudio ? false : `no studio-agents clone at ${studioDir} (set STUDIO_AGENTS_DIR)`;

function run(cmd: string, args: string[], opts: { cwd: string; env?: Record<string, string>; input?: string }) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd,
    encoding: "utf8",
    input: opts.input ?? "",
    timeout: 60000,
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", ...(opts.env ?? {}) },
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function git(cwd: string, ...args: string[]) {
  const r = run("git", ["-c", "user.name=qa", "-c", "user.email=qa@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd });
  assert.equal(r.status, 0, `git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

// A temp git repo on `branch` holding a copy of the repo's agents and the given scripts.
function tempRepo(branch: string, scripts: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptw-wire-"));
  git(dir, "init", "-q");
  git(dir, "checkout", "-q", "-b", branch);
  fs.cpSync(path.join(root, ".claude", "agents"), path.join(dir, ".claude", "agents"), { recursive: true });
  fs.mkdirSync(path.join(dir, "scripts"));
  for (const s of scripts) fs.copyFileSync(path.join(root, "scripts", s), path.join(dir, "scripts", s));
  return dir;
}

function agentBody(agent: string): string {
  const src = readRequired(path.join(root, ".claude", "agents", `${agent}.md`));
  const m = src.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  assert.ok(m, `${agent}.md has no frontmatter`);
  return m[1].trim();
}

function currentBranch(): string {
  return process.env.GITHUB_HEAD_REF || process.env.HEAD_REF || run("git", ["symbolic-ref", "--short", "HEAD"], { cwd: root }).stdout.trim();
}
const notThisPr = currentBranch() === PR_BRANCH ? false : `scope guard for ${PR_BRANCH} only (on ${currentBranch() || "detached"})`;

function baseRef(): string | null {
  for (const ref of ["origin/main", "main"]) {
    const r = run("git", ["merge-base", "HEAD", ref], { cwd: root });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

function section(md: string, heading: string): string {
  const start = md.indexOf(`\n${heading}`);
  assert.ok(start >= 0, `section not found: ${heading}`);
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start + 1, next < 0 ? undefined : next).trim();
}

// ---------- PTW-WIRE-1 ----------
test("PTW-WIRE-1 agent-prompt.sh qa-tdd prints the role body, the task and the --as log line", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts", "agent-prompt.sh")), "scripts/agent-prompt.sh is missing");
  const r = run("bash", ["scripts/agent-prompt.sh", "qa-tdd", "test"], { cwd: root });
  assert.equal(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  assert.ok(r.stdout.includes(agentBody("qa-tdd")), "prompt does not contain the qa-tdd role body (after frontmatter)");
  assert.ok(!/^name:\s*qa-tdd$/m.test(r.stdout), "prompt leaks the frontmatter");
  assert.match(r.stdout, /## Your task\n\ntest\n?$/, "prompt does not end with the task 'test'");
  assert.ok(r.stdout.includes("bash scripts/log-agent-run.sh --as qa-tdd"), "prompt lacks 'log-agent-run.sh --as qa-tdd'");
});

test("PTW-WIRE-1 agent-prompt.sh refuses a bad or unknown agent name", () => {
  for (const name of ["Bad Name", "no-such-agent", ""]) {
    const r = run("bash", ["scripts/agent-prompt.sh", name, "test"], { cwd: root });
    assert.notEqual(r.status, 0, `agent-prompt.sh accepted '${name}'`);
  }
});

// ---------- PTW-WIRE-2 ----------
test("PTW-WIRE-2 log-agent-run.sh --as qa-tdd appends one '<time> qa-tdd via-general-purpose' line to the branch log", () => {
  const dir = tempRepo("claude/wire-test", ["log-agent-run.sh"]);
  const log = path.join(dir, ".claude", "agent-runs", "claude-wire-test.log");
  const r = run("bash", ["scripts/log-agent-run.sh", "--as", "qa-tdd"], { cwd: dir });
  assert.equal(r.status, 0, `exit ${r.status}: ${r.out}`);
  assert.ok(fs.existsSync(log), `no log at .claude/agent-runs/claude-wire-test.log (got: ${r.out.trim()})`);
  const lines = fs.readFileSync(log, "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, 1, `expected 1 line, got ${lines.length}`);
  assert.match(lines[0], /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ qa-tdd via-general-purpose$/, "line is not '<time> qa-tdd via-general-purpose'");
  // a second run appends rather than rewrites
  assert.equal(run("bash", ["scripts/log-agent-run.sh", "--as", "qa-tdd"], { cwd: dir }).status, 0);
  assert.equal(fs.readFileSync(log, "utf8").split("\n").filter(Boolean).length, 2, "second --as run did not append");
});

test("PTW-WIRE-2 log-agent-run.sh --as rejects a bad or unknown name and writes nothing", () => {
  const dir = tempRepo("claude/wire-test", ["log-agent-run.sh"]);
  for (const name of ["Bad Name", "no-such-agent", "../qa-tdd"]) {
    const r = run("bash", ["scripts/log-agent-run.sh", "--as", name], { cwd: dir });
    assert.notEqual(r.status, 0, `--as '${name}' exited 0`);
  }
  assert.ok(!fs.existsSync(path.join(dir, ".claude", "agent-runs")), "a rejected --as call wrote a log");
});

// ---------- PTW-WIRE-3 ----------
function checkRuns(logLines: string[] | null, body: string) {
  const dir = tempRepo("claude/wire-test", ["check-agent-runs.sh"]); // no studio-checks.json: no verify rerun
  if (logLines) {
    fs.mkdirSync(path.join(dir, ".claude", "agent-runs"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude", "agent-runs", "claude-wire-test.log"), logLines.join("\n") + "\n");
  }
  return run("bash", ["scripts/check-agent-runs.sh"], { cwd: dir, env: { BODY: body, HEAD_REF: "claude/wire-test" } });
}

test("PTW-WIRE-3 check-agent-runs.sh accepts a 'qa-tdd via-general-purpose' log entry", () => {
  const r = checkRuns(
    ["2026-11-22T04:45:20Z staff-pm via-general-purpose", "2026-11-22T04:46:01Z qa-tdd via-general-purpose"],
    "Summary\n\nAgents: staff-pm scoped; qa-tdd red then green, 3x\n",
  );
  assert.equal(r.status, 0, `check-agent-runs.sh failed: ${r.out}`);
});

test("PTW-WIRE-3 check-agent-runs.sh still accepts the hook's plain '<time> qa-tdd' entry", () => {
  const r = checkRuns(["2026-11-22T04:46:01Z qa-tdd"], "Agents: qa-tdd red then green, 3x");
  assert.equal(r.status, 0, `check-agent-runs.sh failed: ${r.out}`);
});

test("PTW-WIRE-3 check-agent-runs.sh fails naming qa-tdd when the log has no qa-tdd run", () => {
  for (const lines of [["2026-11-22T04:45:20Z staff-pm via-general-purpose"], null]) {
    const r = checkRuns(lines, "Agents: staff-pm scoped; qa-tdd red then green, 3x");
    assert.notEqual(r.status, 0, `passed with qa-tdd absent from the log (${lines ? "log without qa-tdd" : "no log"})`);
    assert.match(r.out, /names 'qa-tdd'/, `failure does not name qa-tdd: ${r.out}`);
  }
});

test("PTW-WIRE-3 a look-alike entry ('qa-tdd via-something-else') does not count as a run", () => {
  const r = checkRuns(["2026-11-22T04:46:01Z qa-tdd via-something-else"], "Agents: qa-tdd red then green, 3x");
  assert.notEqual(r.status, 0, "accepted an entry that is neither '<agent>' nor '<agent> via-general-purpose'");
});

test("QA-R1 PTW-WIRE-3 the branch run log is not gitignored, so it can be committed with the PR", () => {
  const r = run("git", ["check-ignore", "-q", ".claude/agent-runs/claude-project-thread-rnaovm.log"], { cwd: root });
  assert.equal(r.status, 1, `.claude/agent-runs/claude-project-thread-rnaovm.log is ignored by git (check-ignore exit ${r.status}); "commit the log" would commit nothing`);
});

// ---------- PTW-WIRE-4 ----------
// Runs the real "Agents line in the PR body" step from agents-check.yml against a fixture PR.
function agentsLineStep(): string {
  const wf = YAML.parse(readRequired(path.join(root, ".github", "workflows", "agents-check.yml")));
  const steps: Array<{ name?: string; run?: string }> = wf?.jobs?.agents?.steps ?? [];
  const step = steps.find((s) => s.run && /qa-tdd/.test(s.run) && /BODY/.test(s.run) && /git diff/.test(s.run));
  assert.ok(step?.run, "agents-check.yml has no step checking the Agents: line against the diff");
  return step.run;
}

function runAgentsLineStep(body: string, changed: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptw-wire-pr-"));
  git(dir, "init", "-q");
  fs.writeFileSync(path.join(dir, "README.md"), "base\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "base");
  const base = git(dir, "rev-parse", "HEAD");
  fs.mkdirSync(path.dirname(path.join(dir, changed)), { recursive: true });
  fs.writeFileSync(path.join(dir, changed), "change\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "head");
  const head = git(dir, "rev-parse", "HEAD");
  return run("bash", ["-e", "-c", agentsLineStep()], { cwd: dir, env: { BASE: base, HEAD: head, BODY: body } });
}

test("PTW-WIRE-4 agents-check fails 'qa-tdd skipped: busy' (and 'no time') on a PR touching a non-docs file", () => {
  for (const reason of ["busy", "no time"]) {
    const r = runAgentsLineStep(`Summary\n\nAgents: staff-pm scoped; qa-tdd skipped: ${reason}\n`, "cli/twin.ts");
    assert.notEqual(r.status, 0, `'qa-tdd skipped: ${reason}' passed on a code PR: ${r.out}`);
    assert.match(r.out, /qa-tdd cannot be skipped/, `failure is not the 'qa-tdd cannot be skipped' error: ${r.out}`);
  }
});

test("PTW-WIRE-4 agents-check passes 'qa-tdd skipped: docs only' on a docs-only PR", () => {
  const r = runAgentsLineStep("Agents: staff-pm scoped; qa-tdd skipped: docs only", "docs/notes.md");
  assert.equal(r.status, 0, `docs-only skip failed: ${r.out}`);
});

test("PTW-WIRE-4 agents-check passes a code PR where qa-tdd really ran", () => {
  const r = runAgentsLineStep("Agents: staff-pm scoped; qa-tdd red then green, 3x", "cli/twin.ts");
  assert.equal(r.status, 0, `code PR with qa-tdd ran failed: ${r.out}`);
});

// ---------- PTW-WIRE-5 ----------
test("PTW-WIRE-5 check-agents.sh exits 0 and the CLAUDE.md table lists release-captain", () => {
  const r = run("bash", ["scripts/check-agents.sh"], { cwd: root });
  assert.equal(r.status, 0, `check-agents.sh failed: ${r.out}`);
  assert.ok(fs.existsSync(path.join(root, ".claude", "agents", "release-captain.md")), ".claude/agents/release-captain.md missing");
  assert.match(readRequired(path.join(root, "CLAUDE.md")), /^\|.*\| `release-captain` \|$/m, "CLAUDE.md table has no release-captain row");
});

test("PTW-WIRE-5 .claude/agents/ equals the studio-agents copy byte for byte", { skip: noStudio }, () => {
  const src = path.join(studioDir, "plugins", "studio", "agents");
  const ours = fs.readdirSync(path.join(root, ".claude", "agents")).filter((f) => f.endsWith(".md")).sort();
  const diffs = ours.filter((f) => !fs.existsSync(path.join(src, f)) || !fs.readFileSync(path.join(src, f)).equals(fs.readFileSync(path.join(root, ".claude", "agents", f))));
  assert.deepEqual(diffs, [], `differ from studio-agents plugins/studio/agents: ${diffs.join(", ")}`);
});

test("PTW-WIRE-5 synced scripts and agents-check.yml equal studio-agents templates", { skip: noStudio }, () => {
  const pairs: Array<[string, string]> = [
    ...["agent-prompt.sh", "log-agent-run.sh", "check-agent-runs.sh", "check-agents.sh"].map((s): [string, string] => [`scripts/${s}`, `templates/scripts/${s}`]),
    [".github/workflows/agents-check.yml", "templates/agents-check.yml"],
  ];
  const diffs = pairs.filter(([ours, theirs]) => !fs.existsSync(path.join(root, ours)) || !fs.readFileSync(path.join(root, ours)).equals(fs.readFileSync(path.join(studioDir, theirs))));
  assert.deepEqual(diffs.map(([o]) => o), [], "differ from studio-agents templates");
});

// ---------- PTW-WIRE-6 ----------
test("PTW-WIRE-6 CLAUDE.md Studio agents section equals templates/CLAUDE-agents.md but for the product name", { skip: noStudio }, () => {
  const ours = section(readRequired(path.join(root, "CLAUDE.md")), "## Studio agents");
  const tpl = fs.readFileSync(path.join(studioDir, "templates", "CLAUDE-agents.md"), "utf8").trim()
    .replace(`(for example "Hi Chase, I'm Charlie's chief of staff")`, `(here: "Hi Chase, I'm Stakeholder Twins' chief of staff")`);
  assert.equal(ours, tpl);
});

test("PTW-WIRE-6 CLAUDE.md hard rules and stack sections are unchanged from main", { skip: notThisPr }, () => {
  const base = baseRef();
  assert.ok(base, "no origin/main or main to compare against");
  const was = run("git", ["show", `${base}:CLAUDE.md`], { cwd: root });
  assert.equal(was.status, 0, was.stderr);
  const now = readRequired(path.join(root, "CLAUDE.md"));
  for (const h of ["## Hard rules", "## Stack and commands"]) assert.equal(section(now, h), section(was.stdout, h), `${h} changed`);
  assert.equal(now.slice(0, now.indexOf("\n## ")), was.stdout.slice(0, was.stdout.indexOf("\n## ")), "intro changed");
});

test("PTW-WIRE-6 nothing says check-agent-runs.sh 'is not wired yet' (CLAUDE.md, HANDOFF.md, docs/)", () => {
  const files = ["CLAUDE.md", "HANDOFF.md"];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
      const rel = path.join(d, e.name);
      if (e.isDirectory()) walk(rel);
      else files.push(rel);
    }
  };
  if (fs.existsSync(path.join(root, "docs"))) walk("docs");
  const hits: string[] = [];
  for (const rel of files) {
    if (rel === path.join("docs", "specs", "PTW-studio-wiring.md")) continue; // the spec quotes the phrase it bans
    fs.readFileSync(path.join(root, rel), "utf8").split("\n").forEach((line, i) => {
      if (/not wired yet/i.test(line) && /check-agent-runs/.test(line)) hits.push(`${rel}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});

// ---------- PTW-WIRE-7 ----------
test("PTW-WIRE-7 this PR touches nothing under cli/ (but this test), personas/ or stakeholder-twins.html", { skip: notThisPr }, () => {
  const base = baseRef();
  assert.ok(base, "no origin/main or main to compare against");
  const changed = run("git", ["diff", "--name-only", base], { cwd: root });
  const untracked = run("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root });
  assert.equal(changed.status, 0, changed.stderr);
  const files = [...changed.stdout.split("\n"), ...untracked.stdout.split("\n")].filter(Boolean);
  const off = files.filter((f) => (f.startsWith("cli/") && f !== "cli/test/studio-wiring.test.ts") || f.startsWith("personas/") || f === "stakeholder-twins.html");
  assert.deepEqual(off, [], "PTW-M3.1 is docs and CI only");
});

test("PTW-WIRE-7 cli typechecks (npx tsc --noEmit)", () => {
  const r = run("npx", ["tsc", "--noEmit"], { cwd: cliDir });
  assert.equal(r.status, 0, `tsc failed: ${r.out}`);
});
