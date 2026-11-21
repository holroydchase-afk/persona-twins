# PTW-M2.1: Everyday-user twin and the review protocol

Status: todo. One PR on `claude/ux-reviewer-twin`. Source: studio-agents `plugins/studio/agents/ux-reviewer.md`
(Review steps 1-3) and `skills/ux-review/SKILL.md` (Set up, Review 1-3).

## Bet
Chase's ask: "add a 'non-technical everyday user' twin ranked first; have every twin run the 4 cognitive-walkthrough
questions per screenshot ... add plain-language and platform-pattern checks; end every objection with one exact fix."
Who has to act: a PM who uploads screens should leave with fixes they can paste, not vibes. The studio rule is
"rank them least tech-savvy first", so the twin who gets stuck first is the default.
Signal: on the page's sample screenshot, the first reply from each twin covers all four questions and every
objection ends in a quoted fix (PTW-UX-9). Stop: if replies turn into a clinical report or run past ~150 words
per screenshot in that check, cut the protocol to the four questions plus fixes and drop the checks.

## Scope
- **PTW-M2.1.1 Protocol file.** New `review-protocol.md` at repo root (not in `personas/`, which sync reads as
  personas). Contents, written as instructions to the twin, in character:
  1. Per screenshot, answer the four walkthrough questions in your own voice: Would I know what to do here?
     Can I see the button or control for it? Do the words tell me it's the right one? After I tap it, would I
     know it worked? A "no" or "not sure" must quote the element in the existing form, e.g. [#2 "Start free trial" button].
  2. Plain language: the purpose is clear in 3 seconds with one next step labeled by a verb; every control has
     unique words you could say over the phone; no words you wouldn't use (say the word you would); no blank
     screen or silent error (an error says what happened and what to do).
  3. Platform patterns: does each control look and act like the standard one you already know on this platform
     (browser, iPhone, Android, command line)? Flag anything that doesn't. No guideline citations; the twin can't browse.
  4. Every objection ends with exactly one fix in quotes: the exact words or change, e.g. `Make it "Start free, no card".`
  5. Stay in character: spoken, no headings, no scores. Follow-up questions get a direct answer; reuse the
     four questions only when a screen is being judged again.
- **PTW-M2.1.2 CLI.** `twin.ts` reads `review-protocol.md` at runtime and appends it to `systemPrompt` after
  "How you review" (still byte-identical per run, so caching holds). Export `systemPrompt` and `loadPersona`
  (or move them to `cli/prompt.ts`) and run `main()` only when executed directly, so tests can import them.
- **PTW-M2.1.3 Page.** `sync-personas.ts` also writes the file into `stakeholder-twins.html` between
  `// PROTOCOL:BEGIN` / `// PROTOCOL:END` as `const REVIEW_PROTOCOL = <JSON string>;` (escape `</`), and `rules()`
  includes `${REVIEW_PROTOCOL}`. Replace the "a few sentences or a short list" line in both prompts so it no longer
  contradicts the per-screenshot walkthrough.
- **PTW-M2.1.4 Roster.** Seven twins, in this order, all fictional: `everyday` (non-technical person just trying
  to get the task done; jargon, icon-only buttons, not knowing it worked), `customer` (Maya, reframed as the paying
  buyer deciding to buy or renew: value, price, trust, switching cost), `skeptic` (assumes the product overpromises;
  hunts gaps between claims and what the screens show), `marketing` (judges story, message and audience fit),
  `sales` (Marcus, unchanged), `finance` (CFO: abrasive, cost-obsessed, blunt to the point of rude; no profanity,
  no insults about people), `product` (product leader: scope, core job to be done, metrics). Delete
  `personas/legal.md` (Elena). Sync `order` = that list. Voices (5 presets, two repeat): everyday `rounded`, skeptic
  `glassy`, marketing `buttery`, finance `default`, product `airy`. Update README (list, table, `legal.md` CLI
  example), `personas/README.md` table, the `twin.ts` usage comment and HANDOFF.md.
- **PTW-M2.1.5 Tests and checks.** `npm test` in `cli/` = `tsx --test test/*.test.ts` (Node only, no key, no
  network). Add `npm test` to `agents.verify` in `studio-checks.json` so CI's 3x rerun covers it. HANDOFF.md updated.

## Acceptance criteria
- **PTW-UX-1 (auto)** Given every persona file (not TEMPLATE/README), when parsed by `loadPersona`, then all
  required fields (name, role, goals, fears, pet_peeves, sample_quotes) are present and the ids are unique.
- **PTW-UX-2 (auto)** After sync, page order is exactly everyday, customer, skeptic, marketing, sales, finance, product.
- **PTW-UX-11 (auto)** `personas/legal.md` does not exist, and no persona file or page `PERSONAS` entry has id `legal`.
- **PTW-UX-3 (auto)** Given `review-protocol.md`, then it contains the four questions (know what to do; see the
  control; words confirm it; know it worked), "plain", "platform", the one-exact-fix-in-quotes rule and the
  `[#2 "Start free trial" button]` example.
- **PTW-UX-4 (auto)** Given any persona, when `systemPrompt(p)` runs, then the output contains the protocol file
  text verbatim and still contains "Stay fully in character".
- **PTW-UX-5 (auto)** Given a sync, then the page's `REVIEW_PROTOCOL` decodes to exactly the file text, and
  `rules()` references `REVIEW_PROTOCOL`. Editing the file without re-syncing fails this test (the drift guard).
- **PTW-UX-6 (auto)** Given a sync, then `PERSONAS[0].id === "everyday"` in the page.
- **PTW-UX-7 (auto)** Given the protocol, persona and prompts, then none contain "accurate", "accuracy",
  "validated" or "proven"; the page disclaimer "Answers are hypotheses, not data." is unchanged.
- **PTW-UX-8 (auto)** `cd cli && npm ci && npx tsc --noEmit && npm test` passes 3x.
- **PTW-UX-9 (manual)** Given the page with the sample screenshot, when each of the seven twins gets its starter
  question, then each reply answers the four questions in its own voice, quotes elements as [#n "..."], ends every
  objection with one quoted fix, and has no headings or scores. ux-reviewer runs this; log replies in the PR.
- **PTW-UX-10 (manual)** Given the dropdown on a fresh browser (no saved persona), then the everyday twin is selected.

## Out of scope (not now)
- ux-rules.mjs, Playwright, measurement (pt, contrast): twins see images, not a DOM.
- Visual score 0-10 and V1-V12 craft layer: a score breaks character and implies accuracy we can't claim.
- "Harshest critic" pass, showcase/recruiter personas, older-adult rules A1-A7, Nielsen/WCAG sweep.
- A switch to turn the protocol off, per-persona protocols, CLI default persona, voice tuning beyond one preset per twin, the 3 `twin.ts` log-hygiene fixes.

## Risks
- Longer replies hurt TTS and phone reading (UX-9 checks; stop rule applies). Chase republishes after merge.
## Decisions for Chase
- Customer = paying buyer (buy/renew), Everyday = non-technical task-doer. Staff-pm's reading of your roster note;
  override here if you meant otherwise. Recommendation: keep it, it stops the two twins giving the same review.
