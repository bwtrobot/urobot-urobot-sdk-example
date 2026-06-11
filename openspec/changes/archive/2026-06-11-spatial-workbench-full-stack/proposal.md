## Why

为 uTwin 机器人平台提供一个完整的全栈 SDK 示例应用，展示如何通过 `utwin-opensdk` 进行机器人列表查询、指令下发、状态监控，以及在 3D 空间工作台中可视化机器人位姿、BIM 场景和点云地图。当前项目仅有后端脚手架和空白前端，需要补全从前端渲染到后端 API 的完整链路。

## What Changes

- 搭建 React/Vite/TypeScript 前端项目，包含单机器人空间工作台页面
- 实现 3D 空间渲染引擎（SoonSpace.js + Three.js），支持 BIM 场景加载、PCD 点云渲染、机器人位姿覆盖、导航/拓扑路径可视化
- 实现坐标变换层：ROS 坐标系 (Z-up) → Three.js/SoonSpace 坐标系 (Y-up)，统一使用 robotToThreeMatrix
- 实现机器人执行控制 UI：状态卡片、导航目标选择、快捷指令面板、运动方向键、任务时间线
- 实现 API 客户端层，带自动 Mock 降级和请求调试面板
- 后端新增 8 个 REST 端点（robot runtime/command/task-result、map editions/charging/nav-path/topo-path），对接 uTwin OpenSDK
- 后端基础设施加固：全局异常处理器、boundedElastic 调度、Jackson snake_case 序列化
- 任务状态轮询闭环，满足 CLAUDE.md 中 QueryTask 强约定

## Capabilities

### New Capabilities

- `frontend-spatial-workbench`: 前端空间工作台页面，包含 3D 渲染、图层/渲染控制、机器人执行组件、API Mock 降级
- `backend-api-endpoints`: 后端 9 个 REST API 端点，桥接前端请求与 uTwin OpenSDK
- `soonspace-rendering`: SoonSpace.js 渲染引擎集成，PCD 点云加载、CPS BIM 场景加载、坐标变换

### Modified Capabilities

（无已有 capability 被修改）

## Impact

- **前端**：新增约 30 个 TS/TSX 文件，依赖 React 18、SoonSpace.js、Three.js、Axios、lucide-react
- **后端**：新增/修改 16 个 Java 文件，依赖 utwin-opensdk-core/services 1.0.0-SNAPSHOT
- **API**：9 个端点全部为新增，Vite 代理 `/api/*` → `localhost:8080`
- **坐标系**：前端统一使用 robotToThreeMatrix 进行 ROS→Three.js 坐标变换
- **构建**：前端 `npm run build`、后端 `mvn clean compile` 均需通过