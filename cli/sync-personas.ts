// Copies every persona in ../personas into the PERSONAS list in ../stakeholder-twins.html,
// and ../review-protocol.md into its REVIEW_PROTOCOL string. It also writes ../personas/audience.json: every persona of
// both packs (product = personas/*.md, audience = personas/audience/*.md), both protocols' text and a content hash.
//   npm run sync-personas
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, "personas");
const page = path.join(root, "stakeholder-twins.html");
const protocolFile = path.join(root, "review-protocol.md");
const REQUIRED = ["name", "role", "goals", "fears", "pet_peeves", "sample_quotes"];

const personas = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".md") && !["TEMPLATE.md", "README.md"].includes(f))
  .sort()
  .map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) throw new Error(`${f}: missing YAML frontmatter`);
    const fm = parseYaml(m[1]) ?? {};
    for (const k of REQUIRED) if (!fm[k]) throw new Error(`${f}: frontmatter is missing "${k}"`);
    return { id: fm.id ?? path.basename(f, ".md"), ...fm, background: m[2].trim().replace(/\s*\n\s*/g, " ") };
  });

// Least tech-savvy first (the default twin is the one who gets stuck first); unknown ids after, alphabetically.
const order = ["everyday", "customer", "skeptic", "marketing", "sales", "finance", "product"];
personas.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99) || a.id.localeCompare(b.id));

// JSON for an inline <script>: escape "</" so a value can't close the tag.
const js = (v: unknown, indent?: number) => JSON.stringify(v, null, indent).replace(/<\//g, "<\\/");

// Replace the text between two markers. A function replacer, so "$" in the content is never a pattern.
function fill(html: string, name: string, body: string): string {
  const re = new RegExp(`(// ${name}:BEGIN[^\\n]*\\n)[\\s\\S]*?(\\n// ${name}:END)`);
  if (!re.test(html)) throw new Error(`stakeholder-twins.html: ${name}:BEGIN/END markers not found`);
  return html.replace(re, (_m, begin: string, end: string) => begin + body + end);
}

const protocol = fs.readFileSync(protocolFile, "utf8");
let html = fs.readFileSync(page, "utf8");
html = fill(html, "PERSONAS", `const PERSONAS = ${js(personas, 2)};`);
html = fill(html, "PROTOCOL", `const REVIEW_PROTOCOL = ${js(protocol)};`);
fs.writeFileSync(page, html);
console.log(`Synced ${personas.length} personas: ${personas.map((p) => p.id).join(", ")}; review protocol: ${protocol.length} chars`);

// personas/audience.json: the one file other tools read, so persona text is never retyped elsewhere.
// Deterministic: sorted by id, no timestamps or paths, LF newlines. hash = sha256 of the canonical JSON (sorted keys,
// no whitespace) of everything except "hash".
const textProtocolFile = path.join(root, "review-protocol-text.md");
function parseDir(d: string, pack: "product" | "audience") {
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith(".md") && !["TEMPLATE.md", "README.md"].includes(f))
    .map((f) => {
      const raw = fs.readFileSync(path.join(d, f), "utf8").replace(/\r\n/g, "\n");
      const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!m) throw new Error(`${f}: missing YAML frontmatter`);
      const fm = parseYaml(m[1]) ?? {};
      for (const k of REQUIRED) if (!fm[k]) throw new Error(`${f}: frontmatter is missing "${k}"`);
      return { id: path.basename(f, ".md"), ...fm, background: m[2].trim(), pack };
    });
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}
const audienceDir = path.join(dir, "audience");
if (fs.existsSync(audienceDir) && fs.existsSync(textProtocolFile)) {
  const all = [...parseDir(dir, "product"), ...parseDir(audienceDir, "audience")].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const body = {
    personas: all,
    protocols: { screenshot: protocol, text: fs.readFileSync(textProtocolFile, "utf8") },
  };
  const hash = crypto.createHash("sha256").update(canonical(body)).digest("hex");
  const sorted = (v: any): any =>
    Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v;
  fs.writeFileSync(path.join(dir, "audience.json"), JSON.stringify(sorted({ ...body, hash }), null, 2) + "\n");
  console.log(`Wrote personas/audience.json: ${all.length} personas, hash ${hash.slice(0, 12)}`);
}
