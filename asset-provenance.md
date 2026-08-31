# Clean-room asset provenance

The redone shell uses read-only-copied production assets from the legacy project's asset library. The legacy project was not edited, and no legacy CSS, DOM, preview runtime, or cache code was imported.

| New path | Source path | Approval evidence | First-stage consumer |
| --- | --- | --- | --- |
| `public/assets/zhanzhan-sitting.png` | `/Users/Jenny/.codex/.chatgpt-projects/g-p-6a8f9aca2b388191ac1e414f39dc585a/ALIVE_V4_BATCH02A_ZHANZHAN_ASSETS/zhanzhan_sitting.png` | `full-mvp-batch02a-zhanzhan-manifest.json`, `APPROVED · LOCKED` | Room Zero resident |
| `public/assets/egg-stage-01-still.png` | `/Users/Jenny/.codex/.chatgpt-projects/g-p-6a8f9aca2b388191ac1e414f39dc585a/ALIVE_V4_FULL_MVP_BATCH01_ASSETS/egg_stage_01_still.png` | `full-mvp-batch01-manifest.json`, `APPROVED · LOCKED` | Room Zero egg |
| `public/assets/plant-stage-03.png` | `/Users/Jenny/.codex/.chatgpt-projects/g-p-6a8f9aca2b388191ac1e414f39dc585a/ALIVE_V4_FULL_MVP_BATCH01_ASSETS/plant_stage_03.png` | `full-mvp-batch01-manifest.json`, `APPROVED · LOCKED` | Room Zero plant |

The redone first screen additionally uses the locked Slice 01 production asset set for Room Zero furniture, UI paper/tape details, ZhanZhan morning, smoke beast encounter, egg still, plant stage B, and the material textures. Normal liver, muscle, and water character cutouts are used only as small action-card illustrations; their source is the previously supplied character kit and can be re-approved independently before a production release.

Batch 02 resident assets were not used because its manifest is marked `PENDING USER VISUAL APPROVAL`.
