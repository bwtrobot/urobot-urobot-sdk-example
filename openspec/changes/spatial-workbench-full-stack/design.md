## Context

uRobot SDK Example 是 uTwin 机器人平台的全栈 SDK 示例应用。项目初始状态仅有一个 Spring Boot WebFlux 后端脚手架（含机器人列表端点）和空白前端。需要补全完整的前后端链路，包括 3D 空间可视化、机器人执行控制、后端 API 端点。

当前后端使用 Java 8 / Spring Boot WebFlux，依赖内部 `utwin-opensdk-core` 和 `utwin-opensdk-services`（1.0.0-SNAPSHOT）。前端基于 React 18 / Vite / TypeScript，3D 渲染使用 SoonSpace.js（内置 Three.js）。

## Goals / Non-Goals

**Goals:**

- 提供一个可运行的全栈 SDK 示例，展示 uTwin 平台核心能力
- 前端在后端不可用时自动降级为演示模式（Mock 数据）
- 3D 场景支持 BIM 模型、PCD 点云、机器人位姿、导航路径的分层渲染
- ROS 坐标系到 Three.js 坐标系的统一变换
- 满足 CLAUDE.md 中「业务需完整的任务闭环要 QueryTask 监控任务最终状态」的强约定

**Non-Goals:**

- 多机器人调度控制台
- 机器人引导/消防巡检等业务工作流页面（后续复用现有层实现）
- 实时点云订阅（WebSocket/ROS bridge）
- 用户认证/鉴权 UI
- 高级分析或历史仪表盘

## Decisions

### 1. 前端架构：Feature-sliced 分层

将 `spatial-viewer`（3D 渲染）和 `robot-execution`（执行控制）隔离为独立 feature，通过 `useRobotWorkbench` hook 编排数据流。

**理由**：后续引导页和巡检页可复用同一套 spatial-viewer 和 robot-execution 组件，仅需新增页面组合层。

### 2. API 客户端：统一 Mock 降级包装

所有 API 调用通过 `apiRequest()` 包装，自动 try-catch 并降级到预定义 Mock 数据。每次请求结果记录到日志存储，支持 `useSyncExternalStore` 订阅。

**替代方案**：MSW (Mock Service Worker) 拦截 — 更真实但配置复杂，作为 SDK 示例过重。

### 3. 渲染引擎：SoonSpace.js 接管

初始实现用原生 Three.js 搭建场景。后续替换为 SoonSpace.js，因为：
- SoonSpace.js 封装了相机控制、渲染循环、场景管理
- `cps-soonmanager` 插件可直接加载 CPS 平台生产的 BIM 场景
- 保持 `SpatialSceneAdapter` 接口不变，UI 组件零改动

**替代方案**：继续原生 Three.js — 灵活但无法加载 CPS BIM 场景。

### 4. 坐标变换：robotToThreeMatrix 统一矩阵

ROS 使用 Z-up 坐标系，Three.js 使用 Y-up。定义统一变换矩阵 `robotToThreeMatrix`：

```
Robot(x, y, z) → Three.js(x, z, -y)
```

PCD 点云通过 `applyMatrix4` 批量变换；机器人位姿和路径节点通过 `rosPositionToThree` / `rosQuaternionToThree` 逐点变换。BIM 模型已在 Three.js 坐标系中，直接应用 edition.bim 的变换参数。

### 5. 后端 SDK 模型序列化：手动转 Map

SDK 模型类使用 record 风格访问器（`id()` 而非 `getId()`），Jackson 无法作为 JavaBean 序列化。在 Service 层手动转为 `Map<String, Object>`。

**替代方案**：定义 Response DTO — 更类型安全但增加样板代码量，对 demo 应用来说维护成本不值得。

### 6. 阻塞 SDK 调用调度：boundedElastic

所有 `Mono.fromSupplier()` 包裹的 SDK 阻塞调用添加 `.subscribeOn(Schedulers.boundedElastic())`，避免阻塞 Netty 事件循环线程。

### 7. 任务轮询策略

发送命令后轮询 `getTaskResult`，最多 30 次、每次间隔 2 秒，直到任务进入终态（completed/failed/canceled/timeout）。满足 CLAUDE.md QueryTask 强约定。

## Risks / Trade-offs

- **N+1 查询（MapService nav/topo path）**：列表接口仅返回 uuid/name，需逐条调用 getPoints() 获取节点详情。对 demo 应用数据量小可接受，生产环境需 SDK 提供批量 API。→ 缓解：当前数据量有限，性能风险极低。
- **getRobotRuntime 返回 Map<String, Object>**：运行时数据结构依赖 SDK 版本，未来 SDK 变更可能导致字段缺失。→ 缓解：前端对缺失字段做 optional 处理。
- **CPS BIM 场景加载**：cps-soonmanager 插件将模型直接添加到 ssp.viewport.scene，需要在加载后手动移入 bim group 以支持图层控制。→ 缓解：加载后遍历 scene children 识别新增对象。
- **SoonSpace.js 版本依赖**：SoonSpace.js 和 Three.js 版本耦合，升级需同步验证。→ 缓解：package.json 锁定版本范围。