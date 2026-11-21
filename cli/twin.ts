// Stakeholder Twin CLI: a persona looks at your screenshots and answers in character.
//
//   npx tsx twin.ts -p ../personas/customer.md -s shot1.png -s shot2.png -q "Would you sign up?"
//   npx tsx twin.ts -p ../personas/finance.md -s shots/*.png      (no -q = chat mode)
//
// Twins: everyday, customer, skeptic, marketing, sales, finance, product (see ../personas/).
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "node:url";
import { loadPersona, systemPrompt } from "./prompt.js";

const MODEL = "claude-opus-5-5";
const MAX_SHOTS = 5;
const MEDIA: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
};

function imageBlocks(files: string[]): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  files.forEach((f, i) => {
    const media = MEDIA[path.extname(f).toLowerCase()];
    if (!media) throw new Error(`${f}: unsupported image type (use png, jpg, webp or gif)`);
    blocks.push({ type: "text", text: `Screenshot #${i + 1} (${path.basename(f)}):` });
    blocks.push({ type: "image", source: { type: "base64", media_type: media, data: fs.readFileSync(f).toString("base64") } });
  });
  return blocks;
}

async function ask(client: Anthropic, system: string, messages: Anthropic.Beta.BetaMessageParam[]) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages,
    cache_control: { type: "ephemeral" }, // auto-caches persona + screenshots + history
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if Opus declines, the API retries on a fallback model
  });
  stream.on("text", (t) => process.stdout.write(t));
  const msg = await stream.finalMessage();
  process.stdout.write("\n");
  if (msg.stop_reason === "refusal") console.error(`\n[declined: ${msg.stop_details?.category ?? "unknown"}]`);
  if (msg.stop_reason === "max_tokens") console.error("\n[cut off at max_tokens]");
  const u = msg.usage;
  if (process.env.TWIN_DEBUG) {
    console.error(`[tokens in=${u.input_tokens} cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens}]`);
  }
  return msg;
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      persona: { type: "string", short: "p" },
      shot: { type: "string", short: "s", multiple: true },
      question: { type: "string", short: "q" },
    },
    allowPositionals: true,
  });
  const shots = [...(values.shot ?? []), ...positionals];
  if (!values.persona || shots.length === 0) {
    console.error('Usage: npx tsx twin.ts -p ../personas/customer.md -s a.png [-s b.png ...] [-q "question"]');
    process.exit(1);
  }
  if (shots.length > MAX_SHOTS) {
    console.error(`Max ${MAX_SHOTS} screenshots (got ${shots.length}).`);
    process.exit(1);
  }

  const persona = loadPersona(values.persona);
  const system = systemPrompt(persona);
  const client = new Anthropic();
  const history: Anthropic.Beta.BetaMessageParam[] = [];
  const first = imageBlocks(shots);

  const turn = async (q: string) => {
    const content: Anthropic.Beta.BetaContentBlockParam[] =
      history.length === 0 ? [...first, { type: "text", text: q }] : [{ type: "text", text: q }];
    history.push({ role: "user", content });
    process.stdout.write(`\n${persona.name.split(" (")[0]}: `);
    const msg = await ask(client, system, history);
    history.push({ role: "assistant", content: msg.content }); // full content, so thinking blocks are passed back
  };

  console.error("Twin answers are hypotheses about what this person might say, not data. Verify with the real person.");
  if (values.question) return turn(values.question);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.error(`Chatting with ${persona.name}. Empty line or Ctrl+D to quit.`);
  for (;;) {
    const q = (await rl.question("\nYou: ").catch(() => "")).trim();
    if (!q) break;
    await turn(q);
  }
  rl.close();
}

// Run only when executed directly (npx tsx twin.ts ...), not when imported.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    if (e instanceof Anthropic.AuthenticationError) console.error("Auth failed: set ANTHROPIC_API_KEY.");
    else console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
