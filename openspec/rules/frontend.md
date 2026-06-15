## 常用命令

### 前端 (frontend/)

```bash
cd frontend
npm run dev          # 启动开发服务器 (Vite, port 5173, 代理 /api → localhost:8080)
npm run build        # TypeScript 编译 + Vite 构建
npm run lint         # tsc --noEmit 类型检查
npm test             # vitest run (单次运行)
npm run test:watch   # vitest 监听模式
npx vitest run src/shared/utils/pose.test.ts  # 运行单个测试文件
```

## 架构

### 前端

- **技术栈**: React 18 + TypeScript + Vite + Three.js (通过 soonspacejs 封装)
- **测试**: Vitest + jsdom + @testing-library/react
- **入口**: `App.tsx` → `SpatialWorkbenchPage` (单页应用，无路由)

**目录结构按功能模块组织**:

- `features/spatial-viewer/` — 3D 空间场景，核心是 `spatialScene.ts` 中的 `SpatialSceneAdapter`，负责 BIM 模型、点云、路径、机器人位姿渲染
- `features/robot-execution/` — 机器人操控面板（指令下发、导航目标选择、任务时间线）
- `services/api/` — HTTP 客户端，所有 API 调用内置 mock fallback 机制（真实 API 失败时自动降级到 mock 数据）
- `shared/utils/pose.ts` — ROS 坐标系 ↔ Three.js 坐标系转换工具
- `shared/types/api.ts` — 前后端共享的 API 类型定义

**API fallback 模式**: `httpClient.ts` 的 `apiRequest()` 接收 `fallbackData` 参数，后端不可用时自动使用 mock 数据并记录日志，通过 `ApiDebugDrawer` 组件可查看实际/mock 来源。