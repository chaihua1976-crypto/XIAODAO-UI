# XIAODAO 小岛之约 — Spatial Reservation UI v0.1

空间预约可交互原型：先走进这间屋子，再决定今晚坐在哪。

## 运行

```bash
pnpm install   # 或 npm install
pnpm dev
```

## 结构

- `src/App.tsx` — 原型外壳：左侧索引（00–10）、模拟开关、手机画框
- `src/xiaodao/Flow.tsx` — 状态机：启动 → 俯瞰 → 区域 → 座位 → 预约 → 成功（含返回）
- `src/xiaodao/space.tsx` — XR-Frame 场景占位：2.5D 投影场景 + 相机插值 `useCamera`
- `src/xiaodao/SeatView.tsx` — 四张桌的第一视角，天色随时段变化
- `src/xiaodao/ui.tsx` — 组件：TableMarker、ZoneIndicator、Date/Time/PeopleControl、Availability、SeatInfo、Actions、Toast、SceneLoading、EmptyState、ReservedTicket
- `src/xiaodao/Board.tsx` — 体验论点、用户流程、组件、Tokens、动效、状态与边界
- `src/xiaodao/data.ts` — 区域、桌位、时段与可约数据
- `src/index.css` — Tailwind v4 `@theme` tokens、字体与关键帧

> 注：空间几何为依据 7486 × 7111 mm 与四张桌位描述的近似占位，待接入真实 CAD / GLB 后校准。
