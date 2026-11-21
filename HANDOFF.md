# Handoff
<!-- status
stage: building
goal: portfolio
milestone: Persona Twins v1
now: UX reviewer wrapped into every twin; seven-twin roster (legal removed)
next: Run ux-reviewer and privacy-security showcase review before the demo goes public
waiting_on_chase:
  - Share the demo page publicly (page Share menu)
  - Paste the step 4 lines into Product Studio
blockers: []
-->

Studio-wide status: https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md

Last updated: 2026-11-21

## Where things stand

- **Main demo:** `persona-twins.html`, published as a Claude page at
  https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc. Runs on the viewer's Claude account (`sample` capability
  with images, `tts` for voice, `dictation` for the mic). No API key.
- **Docs:** README with usage and persona format; MIT license, copyright Chase Holroyd.
- **Optional CLI:** `cli/twin.ts`, Claude API with prompt caching. Needs `ANTHROPIC_API_KEY`.
- **Personas:** seven twins in `personas/`, in picker order: `everyday.md` (Rosa, default), `customer.md` (Maya, the
  paying buyer), `skeptic.md` (Dana), `marketing.md` (Priya), `sales.md` (Marcus), `finance.md` (Graham, abrasive CFO),
  `product.md` (Nadia), plus `TEMPLATE.md` and a writing guide. The legal twin was removed. The page's `PERSONAS` list is
  generated from these files by `npm run sync-personas` in `cli/`; republish the page after syncing.
- **Review protocol:** `review-protocol.md` is the single source for how every twin reviews: the 4 cognitive-walkthrough
  questions per screenshot, plain-language and platform-pattern checks, and one exact fix per objection. The CLI
  (`cli/prompt.ts`) reads it at runtime; sync injects it into the page as `REVIEW_PROTOCOL`. Spec:
  `docs/specs/PTW-ux-reviewer.md`. Tests: `cd cli && npm test`.

## Studio review team

Studio agents in `.claude/agents/` (staff-pm, qa-tdd, engineer, ux-reviewer, privacy-security, architect, positioning,
story-keeper) from holroydchase-afk/studio-agents. CLAUDE.md says when to use each. PRs need an `Agents:` line
(`agents-check`) and a HANDOFF.md update (`handoff-check`).

## Known issues

- The demo page is private until Chase shares it from the page's Share menu. Until then, the demo link only works for Chase.
- Voices: the platform doesn't say which voices sound male. Marcus uses "Default (original)", which named no voice in v1 and sounded male. Not yet confirmed after the latest change.
- `node scripts/check-logs.mjs` reports 3 log-hygiene findings in `cli/twin.ts` (token counts under TWIN_DEBUG at line 50; raw error message and object at line 106). Not wired into CI yet; fix test-first in the next code PR.
- Nobody has run the CLI end to end yet (no API key in the build environment).
- The demo page was republished from this branch (version 8) before merge, so it already shows the seven twins.
- PRs in this cloud session have no `.claude/agent-runs` log: the hook runs only when the session starts in this repo,
  so `agents-check` fails for agents that really ran. Chase's cloud setup-script line fixes it.
- Not yet checked live: each twin's replies on a real screenshot (PTW-UX-9) and the everyday twin being selected in a
  fresh browser (PTW-UX-10). Needs the published page and a Claude account.
- Voices repeat: customer and product are both airy; sales and finance both use the default voice.

## Plan

1. Make the Claude page the main demo. Done (PR #1).
2. README with a one-line description, usage, MIT license and demo link. Done (PR #2, license name in PR #3).
3. Sharpen the customer, sales and legal personas into a shareable template pack. Done (PR #4).
4. Portfolio card line and LinkedIn line for Product Studio. Done: handed to Chase as a paste block (Nov 20).
5. Add the studio review team: `.claude/agents/`, session rules, `agents-check` and `handoff-check`, CLAUDE.md. Done (PR #5, pending merge).
6. Wrap the studio UX reviewer into every twin: review protocol, everyday twin first, roster everyday, customer,
   skeptic, marketing, sales, finance, product. **This PR.**
