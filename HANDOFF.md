# Handoff

Studio-wide status: https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md

Last updated: 2026-11-20

## Where things stand

- **Main demo:** `persona-twins.html`, published as a Claude page at
  https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc. Runs on the viewer's Claude account (`sample` capability
  with images, `tts` for voice, `dictation` for the mic). No API key.
- **Docs:** README with usage and persona format; MIT license, copyright Chase Holroyd.
- **Optional CLI:** `cli/twin.ts`, Claude API with prompt caching. Needs `ANTHROPIC_API_KEY`.
- **Personas:** template pack in `personas/`: `customer.md` (Maya), `sales.md` (Marcus), `legal.md` (Elena),
  `TEMPLATE.md` and a writing guide. The page's `PERSONAS` list is generated from these files by
  `npm run sync-personas` in `cli/`; republish the page after syncing.

## Known issues

- The demo page is private until Chase shares it from the page's Share menu. Until then, the demo link only works for Chase.
- Voices: the platform doesn't say which voices sound male. Marcus uses "Default (original)", which named no voice in v1 and sounded male. Not yet confirmed after the latest change.
- Nobody has run the CLI end to end yet (no API key in the build environment).

## Plan

1. Make the Claude page the main demo. Done (PR #1).
2. README with a one-line description, usage, MIT license and demo link. Done (PR #2, license name in PR #3).
3. Sharpen the customer, sales and legal personas into a shareable template pack. **This PR.**
4. Portfolio card line and LinkedIn line for Product Studio (pasted by Chase, not committed to other repos).
