# ALIVE V4 clean-room architecture

This project is a small, dependency-free browser runtime. It has no import path into the old project and no `preview-site` source. The visual shell is clean-room markup; the tested ALIVE domain/state rules are isolated behind the new state boundary.

```text
index.html
└── src/app.js                 composition root + event binding
    ├── src/data/scene.js      visual/content configuration
    ├── src/layout/shell.js    unfolded/folded display markup
    ├── src/state/store.js     persistence facade
    ├── src/state/persistence.js IndexedDB with a namespaced local fallback
    └── src/state/domain.js    tested event, check-in, settlement and nurture rules
    └── src/styles/            tokens, responsive layout, interaction states
public/assets/                 copied approved raster assets
tools/dev-server.mjs           standalone static runtime
tests/clean-room.test.mjs      ownership, layout, asset and legacy-boundary checks
```

`src/app.js` derives the visual view model from the persisted domain state and translates UI events into domain operations. Folded and Unfolded only change the view mode; they share the same store instance and therefore the same records, undo corrections, mood, settlement and world progression.
