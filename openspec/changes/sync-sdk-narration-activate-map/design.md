## Context

Example 项目是基于 uTwin OpenSDK 的全栈示例工作台，后端作为 BFF 层代理 SDK API，前端通过 3D 场景展示地图/点云/路径并支持向机器人下发指令。

当前状态：
- SDK 依赖版本 3.2.0，已完成 Maven 坐标迁移（`io.github.bwtrobot`），需升至 3.2.1
- `RobotService.sendCommand()` 绕过 `RobotClient.sendCommand()`，直接调用 `httpClient().post()`，丢失 traceId/日志/自动 TaskCache 注册
- SDK 3.2.1 新增 `controlNarration()`、`getNarrationRuntime()`、`activateMap()` 三个 API，Example 尚未封装
- SDK 已有 `NarrationClient`（MapClient 下），提供讲解流程列表和详情查询，Example 尚未封装
- 前端工作台侧栏已有：RobotStatusCard → RealtimeTopicControls → RealtimePushSummary → NavigationTargetPanel → CommandPanel → TaskTimeline

## Goals / Non-Goals

**Goals:**
- 升级 SDK 3.2.1，自动获得 observability-logging 能力
- 修复 sendCommand 绕过 SDK 的问题，统一走 `RobotClient` 标准调用路径
- 全栈实现讲解导览功能：流程列表查询 → 流程选择 → 启动/暂停/恢复/停止/选择讲解点 → 运行时状态展示
- 全栈实现激活地图功能：选择 edition → 激活 → taskId 追踪
- NarrationPanel 作为独立侧栏面板，参考已有控制台 UI 风格（节点列表 + 控制按钮）

**Non-Goals:**
- 不修改 SDK 本身代码
- 不实现讲解脚本编辑功能（NarrationClient 的 listScripts/getScriptDetail 暂不封装）
- 不在 3D 场景中渲染讲解路径（讲解流程绑定的导航路径已有渲染，无需额外处理）
- 不实现地图版本切换下拉框（当前工作台自动加载机器人绑定的 edition，激活地图是对当前 edition 的操作）

## Decisions

### 1. sendCommand 改用 SDK 标准 API

**决策**: `RobotService.sendCommand()` 改为构建 `SendCommandRequest` 调用 `uRobotClient.robot().sendCommand()`，删除 `httpClient().post()` 直调和手动 `realtimeService.registerTask()`。

**理由**: SDK 的 `SendCommandRequest.params` 类型为 `Object`，完全兼容前端传来的 `Map<String, Object>` 自由结构。修复后获得 traceId 贯穿、结构化日志和自动 TaskCache 注册。`RobotRealtimeService.connect()` 通过 `uRobotClient.robot().realtime(robotId)` 创建连接，SDK 内部的 `registerTaskCache()` 能正确查找到对应实例。

**影响**: `RobotService` 不再需要注入 `RobotRealtimeService`（sendCommand 是唯一使用 `realtimeService.registerTask()` 的调用点）。但 `RobotRealtimeService` 仍由 `RobotHandler` 注入用于 snapshot 接口，不受影响。

### 2. 讲解流程查询放在 MapService/MapHandler

**决策**: `listNarrationProcesses` 和 `getNarrationProcessDetail` 放在 MapService 和 MapHandler（路径 `/map/edition/{editionId}/narration-*`）。

**理由**: 讲解流程是地图版本维度的静态资源数据，SDK 中位于 `MapClient.narration()` 下。与已有的 `listEditions`、`getChargingStations`、`listNavPaths` 同属地图资源查询。

### 3. 讲解控制和激活地图放在 RobotService/RobotHandler

**决策**: `controlNarration`、`getNarrationRuntime`、`activateMap` 放在 RobotService 和 RobotHandler。

**理由**: 这三个接口以 robotId 为维度，属于运行时操作。SDK 设计决策也将它们放在 `RobotClient` 上。`activateMap` 路由设计为 `POST /robot/activate-map?robotId=&editionId=`，避免有副作用操作被浏览器、代理或网关缓存。

### 4. activateMap 返回 taskId 接入已有 TaskTimeline

**决策**: `activateMap()` 返回 taskId 后，在 `useRobotWorkbench` 中复用已有的 task 追踪模式（加入 tasks 列表 → HTTP 轮询补偿 + WS TASK_REPLY 推送）。

**理由**: SDK 的 `activateMap()` 内部已自动注册 TaskCache。前端只需将 taskId 加入 tasks 状态即可复用 TaskTimeline 组件展示激活进度，无需新建追踪逻辑。

### 5. NarrationPanel 布局和交互

**决策**: NarrationPanel 作为独立侧栏卡片，插入在 NavigationTargetPanel 之后、CommandPanel 之前。包含：
- 流程下拉选择（从 `narrationProcesses` 列表中选择）
- 开始/跳过 按钮（启动讲解 / node-pick 跳转）
- 节点列表（展示流程中的 node，带状态标记）
- 运行时状态行（显示当前讲解状态）
- 暂停/恢复/停止 控制按钮

**理由**: 参考已有控制台 UI（截图中右侧面板），讲解导览是独立的功能区块，不应嵌入 CommandPanel（快捷指令面板职责是通用指令）。节点列表需要展示详细信息，独立面板有足够空间。

### 6. narrationProcesses 随 edition 加载

**决策**: 在 `useRobotWorkbench` 中，当 edition 加载完成后，自动调用 `listNarrationProcesses(editionId)` 获取该版本下的讲解流程列表。

**理由**: 讲解流程绑定到地图版本，与 navPaths/topoPaths 的加载时机一致。避免用户手动触发查询。

### 7. narrationRuntime 按需刷新

**决策**: `narrationRuntime` 不做定时轮询，在以下时机刷新：
- 初次加载 NarrationPanel 时
- 每次 `controlNarration()` 调用成功后
- 用户手动刷新（可选）

**理由**: 讲解运行时状态变化频率远低于机器人位姿，不需要高频轮询。controlNarration 的响应本身包含最新运行时信息，可直接更新状态。

## Risks / Trade-offs

- **[sendCommand 修复的行为差异]** → SDK 的 `sendCommand` 会在内部做 traceId wrap 和日志记录，增加微量开销（< 1ms），对业务无感知。SDK 内部的 `registerTaskCache` 条件检查更严格（空 taskId 保护、连接状态检查），比原来的手动调用更健壮。
- **[讲解流程为空]** → 某些地图版本可能没有配置讲解流程，`listNarrationProcesses` 返回空列表。NarrationPanel 需展示空状态提示（"当前地图版本无讲解流程"），不影响其他功能。
- **[activateMap 的 edition 来源]** → 当前工作台自动加载机器人绑定的 edition。激活地图操作的含义是"将当前 edition 重新激活到机器人"（比如地图更新后重新加载），而非切换到另一个 edition。如果后续需要切换 edition，需额外实现版本选择 UI。
- **[NarrationPanel 节点状态]** → 讲解运行时的 `NarrationRuntime.nodes` 包含每个节点的执行状态，NarrationPanel 可据此标记当前执行到哪个节点。但初始加载（未启动讲解）时只有流程定义的静态节点列表（`NarrationProcess.nodes`），两者字段不同，需要做映射。
