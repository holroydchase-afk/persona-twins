// Copies every persona in ../personas into the PERSONAS list in ../persona-twins.html,
// and ../review-protocol.md into its REVIEW_PROTOCOL string.
//   npm run sync-personas
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, "personas");
const page = path.join(root, "persona-twins.html");
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
  if (!re.test(html)) throw new Error(`persona-twins.html: ${name}:BEGIN/END markers not found`);
  return html.replace(re, (_m, begin: string, end: string) => begin + body + end);
}

const protocol = fs.readFileSync(protocolFile, "utf8");
let html = fs.readFileSync(page, "utf8");
html = fill(html, "PERSONAS", `const PERSONAS = ${js(personas, 2)};`);
html = fill(html, "PROTOCOL", `const REVIEW_PROTOCOL = ${js(protocol)};`);
fs.writeFileSync(page, html);
console.log(`Synced ${personas.length} personas: ${personas.map((p) => p.id).join(", ")}; review protocol: ${protocol.length} chars`);
