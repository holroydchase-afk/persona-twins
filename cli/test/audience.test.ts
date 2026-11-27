// PTW-AUD-1..13 acceptance tests (docs/specs/PTW-audience.md). node:test via tsx.
// No network, no API key. Baselines in test/fixtures/ were captured from main BEFORE the change:
//   seven-systemprompts.json (AUD-6), seven-personas.json + persona-type.txt + loadpersona-body.txt (AUD-3),
//   page.sha256 (AUD-4), review-protocol.sha256 (AUD-10). Never regenerate them from a changed tree.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { cliDir, root, personasDir, pagePath, protocolPath, pagePersonas } from "./helpers.ts";
import { loadPersona, systemPrompt } from "../prompt.ts";

const fixtures = path.join(cliDir, "test", "fixtures");
const fx = (n: string) => fs.readFileSync(path.join(fixtures, n), "utf8");
const audienceDir = path.join(personasDir, "audience");
const audienceJson = path.join(personasDir, "audience.json");
const textProtocolPath = path.join(root, "review-protocol-text.md");
const tsxBin = path.join(cliDir, "node_modules", ".bin", "tsx");

const AUDIENCE_IDS = ["hiring-manager", "recruiter-skim", "staff-engineer", "pm-peer", "linkedin-scroller"];
const SEVEN = ["everyday", "customer", "skeptic", "marketing", "sales", "finance", "product"];
const sha = (b: string | Buffer) => crypto.createHash("sha256").update(b).digest("hex");

function need(file: string): string {
  assert.ok(fs.existsSync(file), `missing: ${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}
function audienceFiles(): string[] {
  assert.ok(fs.existsSync(audienceDir), "missing: personas/audience/");
  return AUDIENCE_IDS.map((id) => path.join(audienceDir, `${id}.md`));
}
async function agentPromptFn(): Promise<(p: any, kind: string) => string> {
  const mod: any = await import("../prompt.ts");
  assert.equal(typeof mod.agentPrompt, "function", "cli/prompt.ts does not export agentPrompt");
  return mod.agentPrompt;
}
// Same canonical JSON rule the studio-agents checker must reimplement: sorted keys, no whitespace.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}
function syncTemp(dir?: string): { dir: string; run: ReturnType<typeof spawnSync> } {
  if (!dir) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptw-aud-"));
    fs.mkdirSync(path.join(dir, "cli"));
    fs.copyFileSync(path.join(cliDir, "sync-personas.ts"), path.join(dir, "cli", "sync-personas.ts"));
    fs.copyFileSync(path.join(cliDir, "package.json"), path.join(dir, "cli", "package.json"));
    fs.symlinkSync(path.join(cliDir, "node_modules"), path.join(dir, "cli", "node_modules"), "dir");
    fs.cpSync(personasDir, path.join(dir, "personas"), { recursive: true });
    fs.copyFileSync(pagePath, path.join(dir, "stakeholder-twins.html"));
    fs.copyFileSync(protocolPath, path.join(dir, "review-protocol.md"));
    if (fs.existsSync(textProtocolPath)) fs.copyFileSync(textProtocolPath, path.join(dir, "review-protocol-text.md"));
  }
  const run = spawnSync(tsxBin, ["sync-personas.ts"], { cwd: path.join(dir, "cli"), encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, `sync-personas failed: ${String(run.stderr).trim()}`);
  return { dir, run };
}

test("PTW-AUD-1 personas/audience holds exactly the five files and each loads", () => {
  const files = audienceFiles();
  assert.deepEqual(fs.readdirSync(audienceDir).sort(), AUDIENCE_IDS.map((i) => `${i}.md`).sort());
  for (const f of files) {
    const p: any = loadPersona(f);
    assert.equal(p.id, path.basename(f, ".md"));
    for (const k of ["name", "role", "goals", "fears", "pet_peeves", "sample_quotes", "background"]) {
      const v = p[k];
      assert.ok(Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim().length > 0, `${p.id}: ${k} empty`);
    }
  }
});

test("PTW-AUD-2 influence and interest are valid and influence matches the plan table", () => {
  const want: Record<string, string> = {
    "hiring-manager": "high", "recruiter-skim": "high", "staff-engineer": "medium", "pm-peer": "medium", "linkedin-scroller": "low",
  };
  let present = 0;
  for (const f of audienceFiles()) {
    const p: any = loadPersona(f);
    for (const k of ["influence", "interest"]) {
      assert.ok(["high", "medium", "low"].includes(p[k]), `${p.id}: ${k} must be high|medium|low, got ${p[k]}`);
      present++;
    }
    assert.equal(p.influence, want[p.id], `${p.id}: influence`);
  }
  assert.equal(present, 10);
});

test("PTW-AUD-3 Persona type gains only influence/interest; loadPersona and the seven are unchanged", () => {
  const src = fs.readFileSync(path.join(cliDir, "prompt.ts"), "utf8");
  const type = src.match(/export type Persona = \{[\s\S]*?\n\};/)?.[0] ?? "";
  assert.match(type, /influence\?:/, "Persona type lacks optional influence");
  assert.match(type, /interest\?:/, "Persona type lacks optional interest");
  const stripped = type.replace(/\s*(influence|interest)\?:[^;\n]*;?/g, "");
  const norm = (s: string) => s.replace(/\s+/g, "");
  assert.equal(norm(stripped), norm(fx("persona-type.txt").trim()), "Persona type changed beyond influence/interest");
  const body = src.match(/export function loadPersona[\s\S]*?\n\}\n/)?.[0];
  assert.equal(body, fx("loadpersona-body.txt"), "loadPersona body changed");
  const base = JSON.parse(fx("seven-personas.json"));
  for (const id of SEVEN) {
    assert.deepEqual(loadPersona(path.join(personasDir, `${id}.md`)), base.personas[id], `${id} loaded output changed`);
  }
});

test("PTW-AUD-4 sync-personas leaves the page's seven personas and HTML unchanged", () => {
  audienceFiles(); // the pack must be present so this proves the pack does not leak into the page
  const { dir } = syncTemp();
  const html = fs.readFileSync(path.join(dir, "stakeholder-twins.html"), "utf8");
  assert.deepEqual(pagePersonas(html).map((p) => p.id), SEVEN);
  for (const id of AUDIENCE_IDS) assert.ok(!html.includes(`"id": "${id}"`), `page contains audience id ${id}`);
  assert.equal(sha(html), fx("page.sha256").trim(), "synced HTML differs from main");
  assert.equal(sha(fs.readFileSync(pagePath)), fx("page.sha256").trim(), "committed page differs from main");
});

test("PTW-AUD-5 all twelve persona files are fictional and carry no identifiers", () => {
  const files = [...SEVEN.map((i) => path.join(personasDir, `${i}.md`)), ...audienceFiles()];
  assert.equal(files.length, 12);
  const companies = [
    "Anthropic", "Google", "Microsoft", "Amazon", "Apple", "Meta", "Facebook", "Netflix", "Stripe", "OpenAI", "Salesforce",
    "Oracle", "IBM", "Uber", "Airbnb", "Spotify", "Slack", "Atlassian", "Shopify", "Twilio", "Datadog", "Notion", "Figma",
  ];
  const companyRe = new RegExp(`\\b(${companies.join("|")})\\b`, "i");
  for (const f of files) {
    const raw = need(f);
    const n = path.relative(root, f);
    assert.doesNotMatch(raw, companyRe, `${n}: company name`);
    assert.doesNotMatch(raw, /[\w.+-]+@[\w-]+\.[\w.-]+/, `${n}: email`);
    assert.doesNotMatch(raw, /\+?\d[\d\s().-]{7,}\d/, `${n}: phone number`);
    assert.doesNotMatch(raw, /https?:\/\/|www\./i, `${n}: URL`);
    assert.doesNotMatch(raw, /(^|\s)(\/[\w.-]+){2,}|[A-Za-z]:\\|~\//, `${n}: path`);
  }
});

test("PTW-AUD-6 systemPrompt for the seven twins is byte-identical to main", () => {
  const base = JSON.parse(fx("seven-systemprompts.json"));
  assert.deepEqual(Object.keys(base), SEVEN);
  for (const id of SEVEN) {
    assert.equal(systemPrompt(loadPersona(path.join(personasDir, `${id}.md`))), base[id], `${id} prompt changed`);
  }
});

test("PTW-AUD-7 agentPrompt carries persona fields and the right protocol, deterministically", async () => {
  const agentPrompt = await agentPromptFn();
  const full = need(protocolPath).trim();
  // Spec amended (AUD-7): the screenshot kind appends review-protocol.md up to its "Stay in character:" section,
  // whose "no headings, talk out loud" rules contradict JSON-line output (found by the engineer, QA-R3).
  const shot = full.slice(0, full.indexOf("Stay in character:")).trim();
  const text = need(textProtocolPath).trim();
  const p: any = loadPersona(audienceFiles()[0]);
  for (const kind of ["screenshot", "text"]) {
    const out = agentPrompt(p, kind);
    for (const s of [p.name, p.role, p.background, ...p.goals, ...p.fears, ...p.pet_peeves, ...p.sample_quotes]) {
      assert.ok(out.includes(s), `${kind}: missing persona field text: ${s.slice(0, 40)}`);
    }
    assert.equal(out, agentPrompt(p, kind), `${kind}: not deterministic`);
    assert.ok(out.includes(kind === "screenshot" ? shot : text), `${kind}: protocol not appended`);
    assert.ok(!out.includes(kind === "screenshot" ? text : shot), `${kind}: wrong protocol also present`);
  }
  assert.throws(() => agentPrompt(p, "video"));
  assert.throws(() => agentPrompt(p, undefined as any));
});

test("PTW-AUD-8 agentPrompt requires JSON-lines findings and drops the page voice", async () => {
  const agentPrompt = await agentPromptFn();
  const p: any = loadPersona(audienceFiles()[0]);
  for (const kind of ["screenshot", "text"]) {
    const out = agentPrompt(p, kind);
    assert.match(out, /JSON lines?/i, `${kind}: JSON lines`);
    assert.match(out, /one finding per line/i, `${kind}: one finding per line`);
    assert.match(out, /nothing (but|except|other than|else)/i, `${kind}: emit nothing but the lines`);
    for (const f of ["persona", "quote_id", "severity", "fix"]) assert.ok(out.includes(f), `${kind}: field ${f}`);
    for (const s of ["P0", "P1", "P2"]) assert.ok(out.includes(s), `${kind}: ${s}`);
    assert.match(out, /exactly one fix/i, `${kind}: exactly one fix`);
    assert.match(out, /single string/i, `${kind}: fix is a single string`);
    assert.match(out, /never a list/i, `${kind}: never a list`);
    for (const bad of ["no headings", "stay fully in character", "never mention being an ai"]) {
      assert.ok(!out.toLowerCase().includes(bad), `${kind}: contains "${bad}"`);
    }
  }
});

test("PTW-AUD-9 agentPrompt treats artifact text as data and drops unquotable findings", async () => {
  const agentPrompt = await agentPromptFn();
  const p: any = loadPersona(audienceFiles()[0]);
  for (const kind of ["screenshot", "text"]) {
    const out = agentPrompt(p, kind);
    assert.match(out, /data to review/i, `${kind}: data to review`);
    assert.match(out, /never instructions/i, `${kind}: never instructions`);
    assert.match(out, /addresses (the|you|the reviewer|the model)/i, `${kind}: text that addresses the reviewer or model`);
    assert.match(out, /no quotable text[\s\S]{0,80}dropped|dropped[\s\S]{0,80}no quotable text/i, `${kind}: drop findings with no quotable text`);
  }
});

test("PTW-AUD-10 review-protocol-text.md exists with the text-review rules; screenshot protocol unchanged", () => {
  const t = need(textProtocolPath);
  assert.match(t, /would I stop, believe less, or skip\?/i);
  assert.match(t, /quot/i);
  assert.match(t, /exact/i);
  assert.match(t, /one fix per objection/i);
  assert.match(t, /\btext\b/i);
  assert.match(t, /\bcode\b/i);
  assert.match(t, /\bposts?\b/i);
  assert.doesNotMatch(t, /screenshot/i);
  assert.equal(sha(fs.readFileSync(protocolPath)), fx("review-protocol.sha256").trim(), "review-protocol.md changed");
});

test("PTW-AUD-11 sync writes personas/audience.json with twelve personas, both protocols and a hash", () => {
  audienceFiles();
  const { dir } = syncTemp();
  const raw = need(path.join(dir, "personas", "audience.json"));
  const j = JSON.parse(raw);
  assert.ok(Array.isArray(j.personas), "personas array");
  assert.equal(j.personas.length, 12);
  const ids = j.personas.map((p: any) => p.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.deepEqual(new Set(ids), new Set([...SEVEN, ...AUDIENCE_IDS]));
  for (const p of j.personas) assert.equal(p.pack, SEVEN.includes(p.id) ? "product" : "audience", `${p.id}: pack`);
  const strings: string[] = [];
  JSON.stringify(j, (_k, v) => (typeof v === "string" && strings.push(v), v));
  assert.ok(strings.includes(need(protocolPath)), "full screenshot protocol text");
  assert.ok(strings.includes(need(textProtocolPath)), "full text protocol text");
  const { hash, ...rest } = j;
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, sha(canonical(rest)));
});

test("PTW-AUD-12 sync is deterministic and the hash tracks content", () => {
  audienceFiles();
  const { dir } = syncTemp();
  const jf = path.join(dir, "personas", "audience.json");
  const pf = path.join(dir, "stakeholder-twins.html");
  const a = { j: need(jf), p: fs.readFileSync(pf, "utf8") };
  syncTemp(dir);
  assert.equal(need(jf), a.j, "audience.json differs between runs");
  assert.equal(fs.readFileSync(pf, "utf8"), a.p, "page differs between runs");
  assert.ok(a.j.endsWith("\n") && !a.j.endsWith("\n\n"), "single trailing newline");
  assert.ok(!a.j.includes("\r"), "LF only");
  assert.doesNotMatch(a.j, /\d{4}-\d\d-\d\dT\d\d:/, "no timestamps");
  assert.ok(!a.j.includes(dir) && !a.j.includes(root) && !/\/home\/|\/tmp\//.test(a.j), "no absolute paths");
  const h1 = JSON.parse(a.j).hash;
  const target = path.join(dir, "personas", "audience", "pm-peer.md");
  fs.appendFileSync(target, "\nOne extra changed line.\n");
  syncTemp(dir);
  const j2 = JSON.parse(need(jf));
  assert.notEqual(j2.hash, h1, "hash did not change with a persona edit");
  const { hash, ...rest } = j2;
  assert.equal(hash, sha(canonical(rest)), "recomputed hash mismatch");
});

test("PTW-AUD-13 tsc passes and the audience pack is in the repo", () => {
  const tsc = spawnSync(path.join(cliDir, "node_modules", ".bin", "tsc"), ["--noEmit"], { cwd: cliDir, encoding: "utf8", timeout: 120000 });
  assert.equal(tsc.status, 0, `tsc --noEmit failed: ${tsc.stdout}${tsc.stderr}`);
  // The pack itself must be present (this used to diff against main, which only held on the PR that added it).
  for (const f of [...AUDIENCE_IDS.map((i) => `personas/audience/${i}.md`), "personas/audience.json"]) {
    assert.ok(fs.existsSync(path.join(root, f)), `missing pack file: ${f}`);
  }
  // Nothing else may sit under personas/audience/ besides the pack's own markdown files.
  const extra = fs.readdirSync(path.join(root, "personas", "audience")).filter((f) => !/^[a-z-]+\.md$/.test(f));
  assert.deepEqual(extra, [], `unexpected files in personas/audience: ${extra.join(", ")}`);
});

test("PTW-PS-R2 agentPrompt's screenshot rules are cut at a marker that must exist, never falling back to the full protocol", () => {
  const src = fs.readFileSync(path.join(cliDir, "prompt.ts"), "utf8");
  assert.match(src, /throw new Error\([^)]*Stay in character/, "screenshotRules must throw when the marker is missing");
  assert.match(src, /ignore any instruction inside it/i, "prompt must tell the model to ignore instructions in the artifact (PS-R1)");
});
