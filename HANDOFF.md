# Handoff
<!-- status
stage: building
goal: portfolio
milestone: Stakeholder Twins v1
now: Renamed to Stakeholder Twins, on top of the design system restyle (PRs #8, #9 merged)
next: Republish the page; run ux-reviewer and privacy-security showcase review before the demo goes public
waiting_on_chase:
  - Share the demo page publicly (page Share menu)
  - Paste the Stakeholder Twins INTAKE block into Product Studio
  - Rename the GitHub repo to stakeholder-twins (Settings)
blockers: []
-->

Studio-wide status: https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md

Last updated: 2026-11-21

## Where things stand

- **Name:** renamed from Persona Twins on 2026-11-21 (Chase's call; the old name was redundant). GitHub repo rename to holroydchase-afk/stakeholder-twins is Chase's one step in repo Settings.
- **Main demo:** `stakeholder-twins.html`, published as a Claude page at
  https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc. Runs on the viewer's Claude account (`sample` capability
  with images, `tts` for voice, `dictation` for the mic). No API key.
- **Docs:** README with usage and persona format; MIT license, copyright Chase Holroyd.
- **Optional CLI:** `cli/twin.ts`, Claude API with prompt caching. Needs `ANTHROPIC_API_KEY`.
- **Personas:** seven twins in `personas/`, in picker order: `everyday.md` (Rosa, default), `customer.md` (Maya, the
  paying buyer), `skeptic.md` (Dana), `marketing.md` (Priya), `sales.md` (Marcus), `finance.md` (Graham, abrasive CFO),
  `product.md` (Nadia), plus `TEMPLATE.md` and a writing guide. The legal twin was removed. The page's `PERSONAS` list is
  generated from these files by `npm run sync-personas` in `cli/`; republish the page after syncing.
- **Design system:** the page follows the studio design system from holroydchase-afk/hearth `docs/design/STUDIO-CORE.md`
  and `tokens.json`: Paper theme (light, dark, and a high-contrast set derived with the section 3 recipe because hearth's
  `themes.css` isn't on main yet), Atkinson Hyperlegible Next only, 17/22/28 type, 4pt space, 48px targets, a Theme
  control (System, Light, Dark). Spec: `docs/specs/PTW-design-system.md`; tests: `cli/test/design-system.test.ts`.
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
- DS-R1 fixed in the stacked portfolio-link PR: "Back to portfolio" (https://chaseholroyd.com/) above the title, and the
  tagline now says what it is and who it's for. The link wasn't opened from the build environment (host blocked).
- Design P2s left: on a screenshot tile the Remove button wraps under "#1 Example", so caption heights differ; the
  persona details block shows two dividers close together. Paper's rust accent sits near danger red, so errors also
  carry a red edge line (DS-R2); whether to change the accent is a studio-level call.
- `.claude/design-rules.md` allows 11px uppercase eyebrow labels, which STUDIO-CORE principle 1 forbids. Fix upstream
  in studio-agents.
- Voices repeat: customer and product are both airy; sales and finance both use the default voice.

## Plan

1. Make the Claude page the main demo. Done (PR #1).
2. README with a one-line description, usage, MIT license and demo link. Done (PR #2, license name in PR #3).
3. Sharpen the customer, sales and legal personas into a shareable template pack. Done (PR #4).
4. Portfolio card line and LinkedIn line for Product Studio. Done: handed to Chase as a paste block (Nov 20).
5. Add the studio review team: `.claude/agents/`, session rules, `agents-check` and `handoff-check`, CLAUDE.md. Done (PR #5).
6. Wrap the studio UX reviewer into every twin: review protocol, everyday twin first, roster everyday, customer,
   skeptic, marketing, sales, finance, product. Done (PR #6).
7. Apply the studio design system to the demo page (PTW-M2.3). PR #8.
8. Portfolio link and what/who line (DS-R1), stacked on PR #8. **This PR.**
