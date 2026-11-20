# Persona Twins

Pick a stakeholder persona, show it screenshots of your product, and ask what it thinks. It answers in character
and quotes the screen element it's reacting to.

**Demo:** https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc

## The page (main demo)

`persona-twins.html` is a Claude page: persona dropdown, screenshot upload, chat in character, optional voice.
It runs on the viewer's own Claude account, so there's no API key and nothing to install. Open the demo link,
pick a persona, add up to 5 screenshots and ask a question.

The personas (customer, sales, legal) are in `personas/` and copied into the page's `PERSONAS` list.

Every answer is a hypothesis about what this person might say. Check it with the real person.

## Optional: command-line twin

`cli/` has the same twin as a Node script that calls the Claude API directly. It needs Node 20+ and an
Anthropic API key.

```bash
cd cli
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx twin.ts -p ../personas/legal.md -s ../examples/sample-signup.png -q "Would you approve this?"
```

Leave out `-q` to chat. Set `TWIN_DEBUG=1` to print token and cache usage.
