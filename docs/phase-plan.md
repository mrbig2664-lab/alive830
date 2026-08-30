# ALIVE V4 clean-room phase plan

## Phase 0 · completed in this initialization

- Establish a standalone runtime in `alive-v4-clean`.
- Recreate the reference's two intentional modes: `unfolded` and `folded`.
- Load only approved, real assets needed for the first screen.
- Keep state in memory; do not inherit the legacy CSS, DOM, or cache scheme.
- Add a zero-dependency dev server and contract tests.

## Phase 1 · first-screen fidelity gate

- Measure the reference at the three required viewports: 390×844, 1140×2616, and 2480×2248.
- Replace temporary room scaffolding with approved room/background assets or newly approved artwork.
- Tune typography, panel proportions, fold breakpoint, and image scale against side-by-side captures.
- Add a visual QA report for each viewport before gameplay work starts.

## Phase 2 · smallest living loop

- Add Smoke append-only event, visible count, and five-second Undo.
- Add Daily Focus and Check-in as explicit state transitions.
- Add Settlement with an idempotent change queue.
- Introduce local persistence behind a new storage adapter, with a versioned schema and migration tests.

## Phase 3 · world growth

- Add Seeds/Nurture, Plant/Egg progression, Residents and discovery surfaces.
- Add folded/unfolded interaction parity and reload persistence tests.
- Keep all event semantics independent from layout components.

## Phase 4 · release validation

- Run unit/interaction tests and all three visual viewport checks.
- Confirm old project has no changed files.
- Create the new repository history, push the approved source to GitHub, and publish the runtime through GitHub Pages only after the release gate passes.
