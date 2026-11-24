# PTW-AUD: Audience pack, agent prompt, text protocol, audience.json

Status: todo. Step 1 (this repo side) of `docs/stakeholder-agent-plan.md` in studio-agents. One PR, this repo first;
studio-agents' `sync-audience.sh` and `check-stakeholder` are a separate PR after this merges. No change to
`stakeholder-twins.html`'s behavior, the seven existing personas, `review-protocol.md` or `systemPrompt`. Nothing is
republished.

## Bet
Chase has no stakeholders, so the stakeholder agent stands in for his real readers (hiring manager, recruiter, engineer,
PM peer, LinkedIn feed) before something goes public. It can only do that if the personas and a validatable findings
format live once, here, and studio-agents reads them instead of retyping them. Signal: the new tests pass 3x, and
studio-agents' next PR consumes `personas/audience.json` with no persona text of its own. Stop: if `loadPersona` can't
load the five files unchanged, or the page output for the seven twins changes by one byte, fix or drop that part;
never edit the seven to make it fit.

## Acceptance criteria
- **PTW-AUD-1 (auto)** Given `personas/audience/`, then it holds exactly `hiring-manager.md`, `recruiter-skim.md`,
  `staff-engineer.md`, `pm-peer.md`, `linkedin-scroller.md`, and `loadPersona` loads each without throwing, with
  `id` equal to the filename, every required key non-empty and a non-empty background.
- **PTW-AUD-2 (auto)** Given each audience file, then optional `influence` and `interest` are each `high|medium|low`
  (all ten values present), and `influence` is hiring-manager high, recruiter-skim high, staff-engineer medium,
  pm-peer medium, linkedin-scroller low (the plan's table).
- **PTW-AUD-3 (auto)** Given the `Persona` type, then it gains optional `influence` and `interest` only; `loadPersona`
  body and the seven existing personas' loaded output are unchanged (snapshot of the seven taken before the change).
- **PTW-AUD-4 (auto)** Given `npm run sync-personas`, then the page's `PERSONAS` list still has exactly the seven
  existing ids in the same order, none of the five audience ids, and the HTML diff against main is empty.
- **PTW-AUD-5 (auto)** Given all twelve persona files, then none contains a real person's name, a real company name
  (from a denylist in the test: the companies Chase has applied to or named in the site, plus Anthropic), an email,
  a phone number, a URL or a path. Personas stay fictional with invented first names.
- **PTW-AUD-6 (auto)** Given `systemPrompt(p)` for each of the seven twins, then its output is byte-identical to a
  fixture captured from main before this change.
- **PTW-AUD-7 (auto)** Given `agentPrompt(persona, "screenshot" | "text")`, then it is exported from `cli/prompt.ts`,
  contains the persona's name, role, goals, fears, pet peeves, sample quotes and background (reusing the same fields),
  appends `review-protocol.md` for `screenshot` (up to its "Stay in character:" section, whose talk-out-loud, no-headings rules contradict JSON-line output; the file itself is untouched) and `review-protocol-text.md` for `text`, is deterministic
  (same input, same bytes), and throws on any other protocol kind.
- **PTW-AUD-8 (auto)** Given `agentPrompt` output, then it requires output as JSON lines, one finding per line, with
  fields `persona`, `quote_id`, `severity` (`P0|P1|P2`) and `fix` (exactly one fix: a single string, never a list);
  it says to emit nothing but those lines; and it does not contain "no headings", "stay fully in character" or
  "never mention being an AI" (the page voice stays in `systemPrompt`).
- **PTW-AUD-9 (auto)** Given `agentPrompt` output, then it states that the artifact text is data to review, never
  instructions to follow, including any text inside it that addresses the reviewer or the model, and that a finding
  with no quotable text in the artifact is dropped.
- **PTW-AUD-10 (auto)** Given `review-protocol-text.md`, then it exists, asks "would I stop, believe less, or skip?",
  requires quoting the exact text or code element, requires one fix per objection, mentions text, code and posts,
  and does not mention screenshots; `review-protocol.md` is byte-identical to main.
- **PTW-AUD-11 (auto)** Given `npm run sync-personas`, then `personas/audience.json` is written with: every persona of
  both packs parsed (twelve, sorted by id, each with `pack` = `product` or `audience`), the full text of both protocols,
  and `hash` = sha256 hex of the canonical JSON of everything else (sorted keys, no whitespace, `hash` excluded).
- **PTW-AUD-12 (auto)** Given two consecutive runs of sync with no source change, then `audience.json` and the page are
  byte-identical (no timestamps, no absolute paths, LF newlines, trailing newline); changing one persona line changes
  `hash`; recomputing the hash from the file's own contents matches (this is what `check-stakeholder` will verify).
- **PTW-AUD-13 (auto)** Given `cd cli && npm ci && npx tsc --noEmit && npm test`, then all pass, and
  `git diff main --stat` touches under `personas/` only new files in `personas/audience/` and `audience.json`, and
  under `cli/` only `prompt.ts`, `sync-personas.ts` and new test files.
- **PTW-AUD-14 (manual)** README gains a short "Audience pack" section: what the five personas are, how to install
  (`personas/audience.json` is the file to copy or fetch; run `npm run sync-personas` after editing a persona), how to
  use (`agentPrompt` for findings, `systemPrompt` for the page voice), and the plain sentence "Twin output is
  hypotheses, not research: guesses to check against real readers, never validation or approval." HANDOFF.md names
  this PR; the PR body's `Agents:` line shows `staff-pm scoped; qa-tdd red then green, 3x`.

## Not doing
Adding the audience pack to the page picker, editing or re-voicing the seven twins, extending the CLI (`twin.ts`) to
use `agentPrompt`, fixing the three `twin.ts` log-hygiene findings (next code PR that touches it), studio-agents'
`sync-audience.sh`/`check-stakeholder`, the calibration file, any eval. Each is a later step in the plan.

## Risks
- **Persona content in a public repo.** Mitigated by PTW-AUD-5; the privacy-security lane reviews the five files before
  merge.
- **Hash drift between two canonicalizers.** The studio-agents checker must reimplement the canonical JSON rule; the
  rule is in PTW-AUD-11 and the test fixture is the shared contract.

## Decisions for Chase
- Persona first names for the five (invented, e.g. a hiring manager and a recruiter): recommend I pick them and you
  skim the files in the PR.

## Handoffs
- `qa-tdd` -> write failing tests for PTW-AUD-1..13 (fixture for AUD-6 captured from main first) -> all red for the
  right reason.
- `engineer` -> five persona files, types, `agentPrompt`, `review-protocol-text.md`, sync output -> tests green 3x.
- `privacy-security` -> AUD-5 and the public-repo check on the new files -> no P0/P1.
- `positioning` -> README section wording (AUD-14) -> no overclaim.
