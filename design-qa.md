# ALIVE V4 clean-room · first-screen visual QA

visual review: ready for user sign-off

Reference: `/Users/Jenny/Desktop/alive排版.png` plus the supplied `alive 01–05.png` and `kit1–9.png` visual kits.

Captured states (ratio3):

- 390×844 folded cover viewport: `outputs/qa/folded-390x844.png`
- 1140×2616 folded cover viewport: `outputs/qa/folded-1140x2616.png`
- 2480×2248 unfolded main viewport: `outputs/qa/unfolded-2480x2248.png`

Checks completed:

- Handheld black bezel remains the device shell; UI panels and actions now use the supplied hand-drawn panel/button/CTA/label frames instead of straight black rectangles.
- Paper texture and grain overlay are applied to the page shell, while the supplied wall/floor textures remain inside the Room Zero scene.
- Unfolded mode keeps the Room Zero world in the main column, status/mood in the secondary column, quick records below, and navigation last.
- Folded mode keeps the action order: room → today's focus → primary action → other records → navigation.
- Real Room Zero furniture, characters, world objects, UI paper/tape, frame assets, and textures are loaded from the copied asset library.
- Entry points and asset references are repository-relative so a GitHub Pages project URL can load the app on mobile.
- Screen aspect-ratio constraints are explicit in CSS and covered by automated tests: unfolded `2480 / 2248`, folded `1140 / 2616`.
- Mode switching and the five first-stage record actions are interactive; state remains intentionally in memory until the persistence phase.
- Automated tests: 5/5 passed.

Current review note: GitHub publication is intentionally paused until the visual version is signed off.

Follow-up notes for Phase 2: add append-only event records, Undo, Check-in, Settlement, and versioned local persistence without changing this layout contract.
