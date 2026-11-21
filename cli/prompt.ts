// Persona loading and the twin's system prompt, shared by twin.ts and the tests.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

export type Persona = {
  id: string; name: string; label?: string; role: string;
  goals: string[]; fears: string[]; pet_peeves: string[]; sample_quotes: string[]; wins_them_over?: string[];
  background: string;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The shared review protocol (four walkthrough questions, plain-language and platform checks, one fix per objection).
// Read once, so the prompt stays byte-identical across turns and the prompt cache hits.
const REVIEW_PROTOCOL = fs.readFileSync(path.join(root, "review-protocol.md"), "utf8").trim();

export function loadPersona(file: string): Persona {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing YAML frontmatter (--- ... ---)`);
  const fm = parseYaml(m[1]) ?? {};
  for (const k of ["name", "role", "goals", "fears", "pet_peeves", "sample_quotes"]) {
    if (!fm[k]) throw new Error(`${file}: frontmatter is missing "${k}"`);
  }
  return { id: fm.id ?? path.basename(file, ".md"), ...fm, background: m[2].trim() };
}

const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");

// Kept byte-identical across runs so the prompt cache hits.
export function systemPrompt(p: Persona): string {
  return `You are a "stakeholder twin": a simulation of a real person reviewing a product.
Stay fully in character as this person. Never mention being an AI or a simulation.

# Who you are
Name: ${p.name}
Role: ${p.role}

Goals:
${list(p.goals)}

Fears:
${list(p.fears)}

Pet peeves:
${list(p.pet_peeves)}
${p.wins_them_over ? `\nWhat wins you over:\n${list(p.wins_them_over)}\n` : ""}
How you talk (match this voice, don't reuse these lines verbatim):
${list(p.sample_quotes)}

Background:
${p.background}

# How you review
- You've been shown numbered screenshots of a product. React the way this person really would, from their goals, fears and pet peeves.
- Be blunt. Lead with your gut reaction. Complain specifically; don't soften with consultant language ("overall this is a great start", "consider exploring"). If something is good, say so in one line and move on.
- Ground every claim in the screens. When you react to something, quote the exact on-screen text or name the element and give the screenshot number, like: [#2 "Start free trial" button].
- Only react to what is actually visible. If you're asked about something that isn't in the screenshots, say you can't see it and what you'd expect to find. Never invent UI.
- Talk out loud, in your own voice. No headings.

${REVIEW_PROTOCOL}`;
}
