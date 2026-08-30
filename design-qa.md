# ALIVE V4 clean-room · first-screen visual QA

final result: passed
visual review: ready for user sign-off

Reference: `/Users/Jenny/Desktop/alive排版.png` plus the supplied `alive 01–05.png` and `kit1–9.png` visual kits.

Captured states (contract1):

- 390×844 folded cover viewport: `outputs/qa/folded-390x844.png`
- 1140×2616 folded cover viewport: `outputs/qa/folded-1140x2616.png`
- 2248×2480 unfolded main viewport: `outputs/qa/unfolded-2248x2480.png`

Checks completed:

- Handheld black bezel remains the device shell; UI panels and actions now use the supplied hand-drawn panel/button/CTA/label frames instead of straight black rectangles.
- Paper texture and grain overlay are applied to the page shell, while the supplied wall/floor textures remain inside the Room Zero scene.
- Unfolded mode keeps the Room Zero world in the 2fr main column, status/mood in the 1fr secondary column, then places a full-width horizontal quick-record band below the upper world/status band, followed by full-width navigation.
- The unfolded quick-record band contains four equal actions: `+ 抽烟`, `+ 喝酒`, `+ 运动`, and `••• 其它`.
- The dimension labels are documentation/QA metadata only; the product screen itself contains no extra `MAIN DISPLAY` bar.
- Unfolded mode uses the corrected physical ratio (2248 wide × 2480 high) with large, vertically balanced record and mood controls instead of oversized empty cards.
- Unfolded mode does not reuse the folded focus card; the room keeps its complete near-square composition without clipping the residents or world objects.
- Folded mode keeps the action order: room → today's focus → primary action → other records; it intentionally has no unfolded HUD, full quick-record row, or four-item navigation.
- Real Room Zero furniture, characters, world objects, UI paper/tape, frame assets, and textures are loaded from the copied asset library.
- Entry points and asset references are repository-relative so a GitHub Pages project URL can load the app on mobile.
- Screen aspect-ratio constraints are explicit in CSS and covered by automated tests: unfolded width/height `2248 / 2480`, folded width/height `1140 / 2616`; folded internal rows keep the room short enough for the full daily loop.
- Mode switching and the five first-stage record actions are interactive; state remains intentionally in memory until the persistence phase.
- Automated tests: 5/5 passed.

Current review note: GitHub publication is intentionally paused because this contract requests implementation and QA only.

Follow-up notes for Phase 2: add append-only event records, Undo, Check-in, Settlement, and versioned local persistence without changing this layout contract.
