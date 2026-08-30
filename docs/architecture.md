# ALIVE V4 clean-room architecture

This project intentionally starts as a small, dependency-free browser runtime. It has no import path into the old project, no `preview-site` source, and no persistence layer in the first shell.

```text
index.html
└── src/app.js                 composition root + event binding
    ├── src/data/scene.js      visual/content configuration
    ├── src/layout/shell.js    unfolded/folded display markup
    ├── src/state/store.js     in-memory preview state only
    └── src/styles/            tokens, responsive layout, interaction states
public/assets/                 copied approved raster assets
tools/dev-server.mjs           standalone static runtime
tests/clean-room.test.mjs      ownership, layout, asset and legacy-boundary checks
```

The state boundary is deliberately replaceable: later event reducers and persistence can be added behind `src/state/` without changing the visual layout contract.
