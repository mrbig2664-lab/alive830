# ALIVE V4 clean-room · 勘察与初始化记录

日期：2026-08-30

## 结论

`/Users/Jenny/Documents/Codex/2026-08-30/alive-v4-clean` 已建立为独立、零依赖、可运行的前端源目录。旧项目 `/Users/Jenny/.codex/.chatgpt-projects/g-p-6a8f9aca2b388191ac1e414f39dc585a` 仅被读取和复制批准素材，没有被修改、删除或覆盖。

## 参考图约束

参考图：`/Users/Jenny/Desktop/alive排版.png`

- 展开主屏：宽 2248 × 高 2480 px；主内容区约 66%，记录区约 18%，导航区约 16%。
- 折叠外屏：2616 × 1140 px；首屏优先行动，保持“房间 → 今日状态 → 单一主行动”的顺序。
- 视觉基调：暖纸色、手绘黑线、房间/状态/记录/导航四区分层。

## 当前新项目结构

- `index.html`：唯一入口。
- `src/app.js`：应用组装与交互绑定。
- `src/layout/shell.js`：展开/折叠布局骨架。
- `src/state/store.js`：第一阶段内存状态，尚未接入持久化。
- `src/data/scene.js`：首屏内容和资源配置。
- `src/styles/tokens.css`、`src/styles/app.css`：新建 tokens 与布局，不继承旧 CSS。
- `public/assets/`：三件已批准的真实 PNG 资源。
- `tools/dev-server.mjs`：独立静态服务器。
- `tests/clean-room.test.mjs`：运行入口、资源、模式与旧运行时边界测试。
- `docs/`：架构、资源来源与分阶段计划。

## 第一阶段计划

先完成三尺寸视觉校准，再接入 Smoke、Undo、Daily Focus、Check-in、Settlement；随后以版本化 storage adapter 接入本地持久化，最后进入 Seeds/Nurture、Plant/Egg、Residents 和发布流程。

## 验证方式

```sh
npm test
npm run dev
```

视觉验证必须在 390×844、1140×2616、2480×2248 三个 viewport 各捕获展开/折叠所需状态，与参考图并排检查布局、比例、字体、边框、资源裁切和交互状态。当前初始化阶段只完成结构与资源加载验证，尚未宣称三尺寸视觉 QA 通过。
