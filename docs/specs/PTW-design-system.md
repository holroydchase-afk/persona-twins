# PTW-M2.3: Apply the studio design system to the demo page

Status: todo. One PR, `stakeholder-twins.html` only (plus its test file, HANDOFF.md and the agent-run log).
Source: hearth `docs/design/STUDIO-CORE.md` (sections 2-7) and `docs/design/tokens.json` (`themes.paper`).
Chase: "use Atkinson Hyperlegible Next, copy the type/space/radius values as-is, use one of the shared themes
(Paper by default) ... run the checklist in section 7. Ask me before changing any of the section 2 principles."

## Bet
The demo is a portfolio piece reviewed by a hiring manager and by Rosa-type users; today it breaks principles 1,
2, 3, 6, 7 and 10 (10-15px text, sub-48px targets, an icon-only "×", accent as decoration). Signal: every AC
below green 3x, and ux-reviewer finds no P0/P1 against section 2. Stop: if Atkinson does not load inside the
Claude page, ship with the fallback stack and log it; do not bundle a font file in this PR.

## Steps (about 2 sessions)
- **M2.3.1** qa-tdd: `cli/test/design-system.test.ts`, red. Reads the page via `pagePath`; Paper values and the
  WCAG 2 contrast math live in the test (no network, tokens.json is not in this repo). 0.5 session.
- **M2.3.2** engineer: font, tokens, Paper light/dark, high-contrast set (section 3 recipe), focus. 0.5 session.
- **M2.3.3** engineer: components (targets, buttons, accent use, remove button, theme control). 1 session.
- **M2.3.4** qa-tdd 3x green; ux-reviewer against section 2; Chase republishes the page.

## Rules for the build
- Copy only: "×" becomes the word "Remove" (principle 3), plus the theme control's words "Theme", "System",
  "Light", "Dark" (principle 10). No other copy, no title/h1 text change (rename runs in another thread).
- Buttons per section 6: Ask = `primary` (filled, the send moment); starters, Preview, Play again = `tinted`;
  New session, Stop, Speak, Stop voice, Remove = `secondary`. Accent only on tappable things, hover and focus.
- Avatar: `fill` background, `ink` letter, weight 600. Speaking state: 2px `ink` outline plus the existing
  "Talking" words. Twin replies: no accent rule; your messages: no bubble (no card inside a card), "You" label stays.
- Screenshot refs `[#n ...]` and tile badges: `fill` capsule, `ink` text, solid backing over images (principle 5).
- Theme control: native `<select id="theme">`, labeled "Theme", in the header. No saved choice = page never
  writes `data-theme`, so a host-set value wins. Saved choice in `localStorage` key `twin-theme`.

## Acceptance criteria (all `auto` read the repo files only; no network, no browser)
- **AC-DS-1 (auto)** Exactly one stylesheet `<link>`, to `fonts.googleapis.com`, family Atkinson Hyperlegible
  Next only, weights 400;500;600, no `ital`. No Bricolage, Inter, JetBrains Mono or other `font-family` anywhere;
  body uses `"Atkinson Hyperlegible Next", system-ui, sans-serif`.
- **AC-DS-2 (auto)** `:root` defines type tokens base 17 / line 22, title 22 / 28, display 28 / 34, written in
  `rem` (e.g. `calc(17rem / 16)`) so text grows with the browser text size. Every `font-size` in `<style>` is a
  type token; no px/em/% font sizes below 17.
- **AC-DS-3 (auto)** Every `font-weight` is 400, 500 or 600; `strong`, `summary`, `h1`-`h4` set to 600. No
  `font-style: italic`, no `text-transform: uppercase`.
- **AC-DS-4 (auto)** `:root` defines space xs4 sm8 md12 lg16 xl24 xxl32 and radius small4 medium12 photo16
  pill999. Every padding, margin, gap and inset is 0 or a space token; every `border-radius` is a radius token.
  Allowed literals: 1px/2px borders, 2px outline offset, `env(safe-area-*)` fallbacks.
- **AC-DS-5 (auto)** Light values equal `themes.paper.light` (bg, surface, ink, muted, line, fill, accent,
  accentInk, accentSoft, safe, danger, dangerText, onDanger, tabLine), and both
  `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]` equal
  `themes.paper.dark`. `--mark`, `--you`, `--warn` and all other color vars are gone; outside the token blocks
  `<style>` has no hex, `rgb(`, `rgba(` or named colors.
- **AC-DS-6 (auto)** `@media (prefers-contrast: more)` blocks exist for light and dark, overriding only muted,
  line and accent (section 3 recipe).
- **AC-DS-7 (auto)** Contrast test, WCAG 2, in light, dark, HC light, HC dark: ink 7:1 on bg and surface;
  muted 4.5:1 (7:1 in HC) on bg, surface, fill; accent 4.5:1 on bg, surface, fill, accentSoft; accentInk on
  accent 4.5:1 (7:1 in HC); line 4.5:1 on bg in HC; tabLine 3:1 on bg and surface; safe and dangerText 4.5:1
  on bg and surface.
- **AC-DS-8 (auto)** No `box-shadow` or `text-shadow` other than `none`. `:focus-visible` is a 2px solid
  `var(--accent)` outline; no focus rule changes border width, padding or size.
- **AC-DS-9 (auto)** `.btn`, `select`, `.starter`, `.speak`, `.rm`, `summary`, `.drop`, `.voice-row label` and
  `#theme` set `min-height` (and `.rm` `min-width`) to the 48 target token.
- **AC-DS-10 (auto)** The rules for `.avatar` (all states), `.msg.twin .body`, `.ref`, `.shot .num`, `.shot .ex`
  and `.thinking` do not reference `--accent` or `--accent-soft`.
- **AC-DS-11 (auto)** `renderShots()` output has a `.rm` button whose text is "Remove" (no "×") with
  `aria-label="Remove screenshot N"` kept.
- **AC-DS-12 (auto)** `.err` and `.status` use `var(--danger-text)`.
- **AC-DS-13 (auto)** The page has `<select id="theme">` with an associated label "Theme" and options System,
  Light, Dark; its script reads/writes `twin-theme`, sets `data-theme` for Light/Dark, removes it for System,
  and does not set `data-theme` when nothing is saved.
- **AC-DS-14 (auto)** Title text and `<h1>` text are byte-identical to `main`; `npm test` and `tsc` pass.
- **AC-DS-15 (manual)** In the published page at 360px and 1180px, in light, dark and increased contrast: every
  control is at least 48x48 with space between, nothing overflows, and ux-reviewer reports no P0/P1 against
  section 2 (checklist item 5).

## Not in this PR
Bigger text setting; the CLI; rename to Stakeholder Twins; a fourth theme; bundling the font file; layout
changes beyond what the ACs force; upstream edits to studio design-rules.md.
