// Copies every persona in ../personas into the PERSONAS list in ../persona-twins.html.
//   npm run sync-personas
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, "personas");
const page = path.join(root, "persona-twins.html");
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

// Keep the order customer, sales, legal first if present; others after, alphabetically.
const order = ["customer", "sales", "legal"];
personas.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99) || a.id.localeCompare(b.id));

const html = fs.readFileSync(page, "utf8");
const re = /(\/\/ PERSONAS:BEGIN[^\n]*\n)[\s\S]*?(\n\/\/ PERSONAS:END)/;
if (!re.test(html)) throw new Error("persona-twins.html: PERSONAS:BEGIN/END markers not found");
const body = `const PERSONAS = ${JSON.stringify(personas, null, 2).replace(/<\//g, "<\\/")};`;
fs.writeFileSync(page, html.replace(re, `$1${body}$2`));
console.log(`Synced ${personas.length} personas: ${personas.map((p) => p.id).join(", ")}`);
