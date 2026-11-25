# Stakeholder Twins

A Claude page where you show screenshots of your product to an AI everyday user, paying customer, skeptic, marketer, sales rep, CFO or
product lead and ask what they think.

**Demo:** https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc. Runs on your own Claude account, with no API key or install.

## Use it

1. Open the demo and sign in to Claude.
2. Pick a persona. Rosa, the everyday user, is picked first because she is the one most likely to get stuck. See the table below.
3. Add up to 5 screenshots. Drop, paste or pick PNG, JPG or WebP. An example signup screen is loaded to start.
4. Ask a question, like "What would stop you signing up?" The first question asks you to let the page use Claude.

The twin answers in character, bluntly, and quotes the on-screen element it's reacting to, like `[#2 "Start free trial" button]`.
Every twin follows the same [review protocol](review-protocol.md): for each screenshot it asks itself four questions (would I know
what to do here, can I see the control, do the words tell me it's the right one, would I know it worked), checks the words
are plain and the controls look like the ones it already knows, and ends every objection with one fix in quotes.
Answers are read aloud. You can change the voice or turn speaking off on the persona card. The mic button lets you speak your question.

Twin answers are guesses about what this kind of person might say, not research data. Check anything important with a real person.

## Make your own twins

`personas/` is a template pack: seven example twins, a blank `TEMPLATE.md`, and a short guide to writing one from a
real person. All seven are fictional.

| Twin | Who | Judges your product by |
|---|---|---|
| `everyday` | Rosa, non-technical, on her phone | Can I get it done first try, and would I know it worked? |
| `customer` | Maya, the buyer who pays and renews | Is it worth the price, can I trust it, and can I leave? |
| `skeptic` | Dana, who vets tools for her team | What's the catch, and do the screens back up the claims? |
| `marketing` | Priya, head of marketing | Who is it for, and is the message clear? |
| `sales` | Owen, account executive | Can I demo this tomorrow and close? |
| `finance` | Graham, a blunt CFO | What does it cost per year, and what does it save? |
| `product` | Nadia, head of product | What's the one job, and how would you know it works? |

Each persona is a Markdown file with YAML frontmatter: a picker label, role, goals, fears, pet peeves, what wins
them over, and sample quotes.

To use your own on the page, fork the repo, add or edit files in `personas/`, run `npm run sync-personas` in `cli/`
to copy them into `stakeholder-twins.html`, and publish the page as a Claude artifact. See
[personas/README.md](personas/README.md).

## Audience pack

`personas/audience/` holds five fictional twins for the people who read a portfolio before anyone replies: `hiring-manager`
(Helen, five minutes, wants proof), `recruiter-skim` (Tomas, thirty seconds, matches a role), `staff-engineer` (Priyanka,
opens the repo and checks the code, tests and repository basics), `pm-peer` (Owen, would I use it Monday?) and
`linkedin-scroller` (Jada, two seconds in a feed). Each carries `influence` and `interest` tags. They are not on the page's picker.

- **Install:** `personas/audience.json` is the file to copy or fetch. It holds all twelve personas, both review protocols
  and a content hash. Run `npm run sync-personas` in `cli/` after editing any persona to regenerate it.
- **Use:** `agentPrompt(persona, "screenshot" | "text")` in `cli/prompt.ts` asks for findings as JSON lines whose format a checker
  can validate (the format, not whether a finding is right); `systemPrompt` is still the in-character voice the page uses. Text, code and posts use `review-protocol-text.md`.

Twin output is hypotheses, not research: guesses to check against real readers, never validation or approval.

## Files

| Path | What it is |
|---|---|
| `stakeholder-twins.html` | The Claude page (main demo) |
| `personas/` | Persona template pack: seven example twins and a blank template |
| `personas/audience/`, `personas/audience.json` | Five audience twins and the generated file other tools read |
| `review-protocol-text.md` | The same review rules for text, code and posts |
| `review-protocol.md` | How every twin reviews a screen (shared by the page and the CLI) |
| `examples/` | Sample screenshot used by the demo |
| `cli/` | Optional command-line version (see below) |
| `HANDOFF.md` | Current status and next steps |

## Optional: command-line twin

`cli/twin.ts` runs the same twin from a terminal against the Claude API. It needs Node 20+ and an Anthropic API key.

```bash
cd cli
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx twin.ts -p ../personas/finance.md -s ../examples/sample-signup.png -q "Would you pay for this?"
```

Leave out `-q` to chat.

## License

MIT. See [LICENSE](LICENSE). Third-party licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
