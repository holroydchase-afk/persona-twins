// PTW-M2.1 acceptance tests: everyday-user twin and the review protocol.
// Spec: docs/specs/PTW-ux-reviewer.md. PTW-UX-9 and PTW-UX-10 are manual. Roster per PTW-M2.1.4 (see spec).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  cliDir, root, pagePath, personasDir, protocolPath, everydayPath, personaFiles, readRequired,
  loadPromptModule, syncIntoTempCopy, pagePersonas, pageProtocol, pageRulesSource,
} from "./helpers.ts";

const BANNED = /\b(accurate|accuracy|validated|proven)\b/i;
const DISCLAIMER = "Answers are hypotheses, not data.";

test("PTW-UX-1 every persona file loads with all required fields and unique ids", async () => {
  const { loadPersona } = await loadPromptModule();
  const files = personaFiles();
  assert.ok(files.length > 0, "no persona files found");
  const ids: string[] = [];
  for (const f of files) {
    const name = path.basename(f);
    const p = loadPersona(f);
    for (const k of ["name", "role", "goals", "fears", "pet_peeves", "sample_quotes"]) {
      assert.ok(p[k], `${name} is missing "${k}"`);
    }
    for (const k of ["goals", "fears", "pet_peeves", "sample_quotes"]) {
      assert.ok(Array.isArray(p[k]) && (p[k] as unknown[]).length > 0, `${name} "${k}" should be a non-empty list`);
    }
    ids.push(p.id);
  }
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, [], `duplicate persona ids: ${dupes.join(", ")}`);
});

const ROSTER = ["everyday", "customer", "skeptic", "marketing", "sales", "finance", "product"];

test("PTW-UX-2 sync orders personas exactly everyday, customer, skeptic, marketing, sales, finance, product", () => {
  const { page, dir } = syncIntoTempCopy();
  try {
    assert.deepEqual(pagePersonas(page).map((p) => p.id), ROSTER);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("PTW-UX-11 legal persona is gone from the files and the page", () => {
  assert.ok(!fs.existsSync(path.join(personasDir, "legal.md")), "personas/legal.md still exists");
  for (const f of personaFiles()) {
    const fm = fs.readFileSync(f, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    assert.ok(!/^id:\s*["']?legal["']?\s*$/m.test(fm), `${path.basename(f)} has id legal`);
  }
  const ids = pagePersonas(fs.readFileSync(pagePath, "utf8")).map((p) => p.id);
  assert.ok(!ids.includes("legal"), `page PERSONAS still has id legal (ids: ${ids.join(", ")})`);
});

test("PTW-UX-3 review-protocol.md has the four questions, plain-language, platform and one-fix rules", () => {
  const text = readRequired(protocolPath);
  const checks: Array<[string, RegExp]> = [
    ["Q1 know what to do", /know what to do/i],
    ["Q2 see the button or control", /see the (button|control)/i],
    ["Q3 words tell me it's the right one", /words tell me/i],
    ["Q4 know it worked", /know it worked/i],
    ["plain-language check", /plain/i],
    ["platform-pattern check", /platform/i],
    ["exactly one fix", /exactly one fix/i],
    ["fix in quotes", /in quotes/i],
  ];
  for (const [label, re] of checks) assert.match(text, re, `review-protocol.md is missing: ${label}`);
  assert.ok(text.includes('[#2 "Start free trial" button]'), 'review-protocol.md is missing the [#2 "Start free trial" button] example');
});

test("PTW-UX-4 systemPrompt includes the protocol verbatim after How you review, still in character", async () => {
  const protocol = readRequired(protocolPath).trim();
  const { loadPersona, systemPrompt } = await loadPromptModule();
  const files = personaFiles();
  assert.ok(files.length >= ROSTER.length, `expected ${ROSTER.length} personas, found ${files.length}`);
  for (const f of files) {
    const out = systemPrompt(loadPersona(f));
    const name = path.basename(f);
    assert.ok(out.includes("Stay fully in character"), `${name}: prompt lost "Stay fully in character"`);
    const at = out.indexOf(protocol);
    assert.ok(at >= 0, `${name}: prompt does not contain review-protocol.md verbatim`);
    assert.ok(at > out.indexOf("# How you review"), `${name}: protocol should come after "# How you review"`);
    assert.equal(out, systemPrompt(loadPersona(f)), `${name}: prompt must be byte-identical across runs (cache)`);
  }
});

test("PTW-UX-5 page REVIEW_PROTOCOL matches review-protocol.md and rules() uses it (drift guard)", () => {
  const file = readRequired(protocolPath);
  const html = fs.readFileSync(pagePath, "utf8");
  assert.equal(pageProtocol(html), file, "page REVIEW_PROTOCOL is out of date: run `npm run sync-personas` in cli/");
  assert.match(pageRulesSource(html), /\$\{REVIEW_PROTOCOL\}/, "rules() does not include ${REVIEW_PROTOCOL}");
  assert.ok(!/<\/script/i.test(html.slice(html.indexOf("// PROTOCOL:BEGIN"), html.indexOf("// PROTOCOL:END"))),
    "PROTOCOL block must escape </");
});

test("PTW-UX-6 the page's first persona (default for new visitors) is everyday", () => {
  const html = fs.readFileSync(pagePath, "utf8");
  assert.equal(pagePersonas(html)[0]?.id, "everyday");
});

test("PTW-UX-7 protocol, everyday persona and prompts claim no accuracy; disclaimer unchanged", async () => {
  const html = fs.readFileSync(pagePath, "utf8");
  assert.ok(html.includes(DISCLAIMER), `page disclaimer "${DISCLAIMER}" changed or missing`);
  const sources: Array<[string, string]> = [
    ["review-protocol.md", readRequired(protocolPath)],
    ["personas/everyday.md", readRequired(everydayPath)],
    ...personaFiles().map((f): [string, string] => [`personas/${path.basename(f)}`, fs.readFileSync(f, "utf8")]),
    ["page rules()", pageRulesSource(html)],
  ];
  const { loadPersona, systemPrompt } = await loadPromptModule();
  for (const f of personaFiles()) sources.push([`systemPrompt(${path.basename(f)})`, systemPrompt(loadPersona(f))]);
  for (const [label, text] of sources) {
    const hit = text.match(BANNED);
    assert.equal(hit, null, `${label} contains "${hit?.[0]}"`);
  }
});

test("PTW-UX-8 npm test is wired into cli/package.json and CI's agents.verify", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(cliDir, "package.json"), "utf8"));
  assert.match(pkg.scripts?.test ?? "", /tsx --test/, "cli/package.json has no `test` script using tsx --test");
  const checks = JSON.parse(fs.readFileSync(path.join(root, "studio-checks.json"), "utf8"));
  const verify: string = checks.agents?.verify ?? "";
  assert.match(verify, /npx tsc --noEmit/, "agents.verify lost the typecheck");
  assert.match(verify, /npm test/, "agents.verify in studio-checks.json does not run `npm test`");
});
