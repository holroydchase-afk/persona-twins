# Stakeholder Twins (Stage 1, tasks 1 and 2)

A persona looks at up to 5 screenshots of your product and answers your questions in character,
bluntly, quoting the on-screen element it is reacting to.

## Run it

Needs Node 20+ and an Anthropic API key ([console.anthropic.com](https://console.anthropic.com)).

```bash
git clone https://github.com/holroydchase-afk/cohort.git
cd cohort
npm install
export ANTHROPIC_API_KEY=sk-ant-...

# One question
npx tsx twin.ts -p personas/customer.md -s examples/sample-signup.png -q "Would you sign up? Why not?"

# Chat (no -q): ask follow-ups, empty line to quit
npx tsx twin.ts -p personas/legal.md -s shot1.png -s shot2.png -s shot3.png
```

Screenshots can also be passed as plain arguments: `npx tsx twin.ts -p personas/sales.md shots/*.png`.
Set `TWIN_DEBUG=1` to print token and cache usage per answer.

## Personas

One Markdown file per persona in `personas/`, YAML frontmatter plus a short free-text background:
`name`, `role`, `goals`, `fears`, `pet_peeves`, `sample_quotes`. Quote the `name` value if it contains a colon.

**The three shipped personas are placeholders.** Rewrite them from real people you know. The more
specific the pet peeves and sample quotes, the less the twin sounds like a polite consultant.

## How it works

- Model: `claude-opus-5-5` at `medium` effort, streamed.
- Persona goes in the system prompt; screenshots go in the first user turn. Automatic prompt caching
  means follow-up questions in chat mode reuse the persona and images at about a tenth of the input cost.
- Server-side refusal fallback is on (`fallbacks: "default"`), so a declined answer is retried on another model.
- No Haiku preprocessing step: with 5 screenshots, sending images straight to Opus with caching is simpler
  and cheap enough. Add a Haiku summarizing pass only if you go past ~5 screens.

Every answer is a hypothesis about what this person might say. Check it with the real person.

## The test for task 2

Run each persona against 5 screenshots of your real product and ask "What would stop you from buying/approving this?"
If at least one answer tells you something you'd act on, move on to task 3 (the web page). If not, stop.

## Web version (no API key)

`web/stakeholder-twins.html` is the same twin as a Claude page: persona dropdown, screenshot upload, chat,
optional voice. It runs on the viewer's own Claude account through the page's `sample` capability, so it
needs no key or install. Open the published page at https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc.
