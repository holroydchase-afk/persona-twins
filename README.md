# Persona Twins

A Claude page where you show screenshots of your product to an AI customer, sales rep or lawyer and ask what they think.

**Demo:** https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc. Runs on your own Claude account, with no API key or install.

## Use it

1. Open the demo and sign in to Claude.
2. Pick a persona: Maya (customer), Marcus (sales) or Elena (legal).
3. Add up to 5 screenshots. Drop, paste or pick PNG, JPG or WebP. An example signup screen is loaded to start.
4. Ask a question, like "What would stop you signing up?" The first question asks you to let the page use Claude.

The twin answers in character, bluntly, and quotes the on-screen element it's reacting to, like `[#2 "Start free trial" button]`.
Answers are read aloud. You can change the voice or turn speaking off on the persona card. The mic button lets you speak your question.

Twin answers are guesses about what this kind of person might say, not research data. Check anything important with a real person.

## Make your own twins

Each persona is a Markdown file in `personas/` with YAML frontmatter:

```yaml
---
id: customer
name: "Maya"
role: Operations manager at a 40-person logistics company.
goals: [...]
fears: [...]
pet_peeves: [...]
sample_quotes: [...]
---
A short paragraph on how this person behaves.
```

The page carries its own copy of each persona in the `PERSONAS` list inside `persona-twins.html`. To use your own, fork the repo,
edit that list and publish the page as a Claude artifact. Specific pet peeves and real quotes make the twin sound like a person
instead of a consultant.

## Files

| Path | What it is |
|---|---|
| `persona-twins.html` | The Claude page (main demo) |
| `personas/` | Persona files: customer, sales, legal |
| `examples/` | Sample screenshot used by the demo |
| `cli/` | Optional command-line version (see below) |
| `HANDOFF.md` | Current status and next steps |

## Optional: command-line twin

`cli/twin.ts` runs the same twin from a terminal against the Claude API. It needs Node 20+ and an Anthropic API key.

```bash
cd cli
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx twin.ts -p ../personas/legal.md -s ../examples/sample-signup.png -q "Would you approve this?"
```

Leave out `-q` to chat.

## License

MIT. See [LICENSE](LICENSE).
