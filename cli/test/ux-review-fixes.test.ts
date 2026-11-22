// ux-reviewer findings on PTW-M2.1, fixed test-first in the same PR (AC-UX-R1..R9).
// Each test is named with its acceptance ID. No API key, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  root, pagePath, protocolPath, personasDir, readRequired,
  loadPromptModule, syncIntoTempCopy, pagePersonas,
} from "./helpers.ts";

const LABELS: Array<[string, string]> = [
  ["everyday", "Rosa (everyday user)"],
  ["customer", "Maya (paying customer)"],
  ["skeptic", "Dana (skeptic)"],
  ["marketing", "Priya (marketing)"],
  ["sales", "Marcus (sales)"],
  ["finance", "Graham (CFO)"],
  ["product", "Nadia (product)"],
];

function protocolMustSay(...phrases: string[]) {
  const text = readRequired(protocolPath);
  for (const s of phrases) assert.ok(text.includes(s), `review-protocol.md is missing: "${s}"`);
}

// Extracts a top-level function (declaration or `const x = ...` with a braced body) from the page's inline script.
function pageFunction(html: string, name: string): string {
  const m = html.match(new RegExp(`(?:function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=)`));
  assert.ok(m && m.index !== undefined, `stakeholder-twins.html: no function ${name} in the inline script`);
  const open = html.indexOf("{", m.index);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}" && --depth === 0) break;
  }
  return html.slice(m.index, i + 1);
}

function personaFrontmatter(id: string): string {
  const raw = readRequired(path.join(personasDir, `${id}.md`));
  return raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
}

function petPeeves(id: string): string[] {
  const fm = personaFrontmatter(id);
  const block = fm.match(/^pet_peeves:\n((?:[ \t]+-.*\n?)+)/m)?.[1] ?? "";
  return block.split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean);
}

test("AC-UX-R1 protocol: no numbered answers, only talk through no / not sure checks", () => {
  protocolMustSay("Don't number your answers or repeat the questions", "Only talk through the checks that get a no or a not sure");
});

test("AC-UX-R2 every persona has a label and the picker shows exactly those labels in roster order", async () => {
  const { loadPersona } = await loadPromptModule();
  for (const [id, label] of LABELS) {
    const p = loadPersona(path.join(personasDir, `${id}.md`));
    assert.equal(p.label, label, `personas/${id}.md label`);
  }
  const { page, dir } = syncIntoTempCopy();
  try {
    assert.deepEqual(pagePersonas(page).map((p) => [p.id, p.label]), LABELS, "synced PERSONAS labels");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const html = fs.readFileSync(pagePath, "utf8");
  const personas = pagePersonas(html);
  assert.deepEqual(personas.map((p) => [p.id, p.label]), LABELS, "committed page PERSONAS labels (run sync-personas)");
  const m = html.match(/els\.persona\.innerHTML\s*=\s*PERSONAS\.map\(([\s\S]*?)\)\.join\(""\)/);
  assert.ok(m, "persona picker: `els.persona.innerHTML = PERSONAS.map(...).join(\"\")` not found");
  assert.match(m[1], /p\.label/, "persona picker does not use p.label");
  const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const render = new Function("esc", `return (${m[1]});`)(esc) as (p: unknown) => string;
  const texts = personas.map((p) => render(p).replace(/<[^>]*>/g, "").trim());
  assert.deepEqual(texts, LABELS.map(([, l]) => l), "picker option texts");
  const line3 = fs.readFileSync(path.join(root, "README.md"), "utf8").split("\n")[2] ?? "";
  assert.match(line3, /paying customer/, `README line 3 should say "paying customer": ${line3}`);
});

test("AC-UX-R3 answers capped at 300 words; speech trimmed at the last sentence end within 2000 chars", () => {
  protocolMustSay("never more than 300 words in one answer");
  const html = fs.readFileSync(pagePath, "utf8");
  const src = pageFunction(html, "trimForSpeech");
  const trimForSpeech = new Function(`${src}\nreturn trimForSpeech;`)() as (t: string) => string;
  const short = "Short answer. Still short!";
  assert.equal(trimForSpeech(short), short, "text under 2000 chars must not change");
  const sentence = "I would not know where to tap on this screen, honestly. "; // 56 chars, so 2000 falls mid-sentence
  const long = sentence.repeat(60);
  const expected = long.slice(0, Math.floor(2000 / sentence.length) * sentence.length).trimEnd();
  const out = trimForSpeech(long);
  assert.ok(out.length <= 2000, `trimmed text is ${out.length} chars`);
  assert.equal(out.trimEnd(), expected, "should cut at the last sentence end at or under 2000 chars");
  const q = "Why? ".repeat(399) + "Wait! " + "x".repeat(50); // "!" is char 2000
  assert.equal(trimForSpeech(q).trimEnd(), "Why? ".repeat(399) + "Wait!", "? and ! count as sentence ends");
  assert.match(pageFunction(html, "speak"), /trimForSpeech\(/, "speak() does not call trimForSpeech");
  assert.doesNotMatch(pageFunction(html, "speak"), /\.slice\(0,\s*2000\)/, "speak() still hard-cuts at 2000 chars");
});

test("AC-UX-R4 protocol: the first answer always walks through the screens", () => {
  protocolMustSay("Your first answer in a conversation always walks through the screens");
});

test("AC-UX-R5 protocol: anchored in what the twin came for; platform remarks only when something looks off", () => {
  protocolMustSay("what you came here for", "Only if something actually looks off to you");
});

test("AC-UX-R6 customer and finance don't share the Contact pet peeve; Maya objects to IT or sales-call setup", () => {
  const customer = petPeeves("customer");
  const finance = petPeeves("finance");
  assert.ok(customer.length > 0 && finance.length > 0, "could not read pet_peeves");
  const both = customer.some((x) => /Contact/.test(x)) && finance.some((x) => /Contact/.test(x));
  assert.ok(!both, `customer and finance both have a "Contact" pet peeve: ${[...customer, ...finance].filter((x) => /Contact/.test(x)).join(" | ")}`);
  assert.ok(
    customer.some((x) => x.replace(/^["']|["']$/g, "") === "A setup that needs IT or a sales call before her team can try it"),
    'customer.md pet_peeves missing "A setup that needs IT or a sales call before her team can try it"',
  );
});

test("AC-UX-R7 README table ends before the next paragraph; no doc mentions legal.md, Elena or lawyer", () => {
  const lines = fs.readFileSync(path.join(root, "README.md"), "utf8").split("\n");
  const start = lines.findIndex((l) => l.startsWith("| `everyday`"));
  assert.ok(start >= 0, "README persona table row for everyday not found");
  let end = start;
  while (end + 1 < lines.length && lines[end + 1].startsWith("|")) end++;
  for (let i = start; i <= end; i++) assert.match(lines[i], /^\|.*\|\s*$/, `README line ${i + 1} has text after the table row`);
  assert.equal(lines[end + 1], "", `README line ${end + 2} should be blank after the persona table`);

  const skip = new Set(["node_modules", ".git", path.join("docs", "specs"), path.join("cli", "test")]);
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (skip.has(e.name) || skip.has(rel)) return [];
      return e.isDirectory() ? walk(full) : e.name.endsWith(".md") ? [full] : [];
    });
  const hits = walk(root).flatMap((f) =>
    fs.readFileSync(f, "utf8").split("\n").flatMap((l, i) =>
      /legal\.md|\bElena\b|\blawyer/i.test(l) ? [`${path.relative(root, f)}:${i + 1}`] : []));
  assert.deepEqual(hits, [], "docs still mention legal.md, Elena or lawyer");
});

test("AC-UX-R8 finance persona doesn't say \"stop talking\"", () => {
  assert.doesNotMatch(readRequired(path.join(personasDir, "finance.md")), /stop talking/i);
});

test("AC-UX-R9 page has no Participant or Session transcript text", () => {
  const html = fs.readFileSync(pagePath, "utf8");
  for (const s of ["Participant", "Session transcript"]) assert.ok(!html.includes(s), `stakeholder-twins.html still says "${s}"`);
});
