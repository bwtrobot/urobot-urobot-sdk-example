## Why

SDK 3.2.1 新增了两组能力：可观测性日志（traceId 贯穿 + 结构化日志 + 脱敏）和讲解控制/激活地图 3 个 API。Example 项目需要同步升级 SDK 版本，修复 `sendCommand` 绕过 SDK 的技术债，并全栈实现讲解导览和激活地图功能，使工作台覆盖机器人讲解场景的完整操作链路。

## What Changes

### SDK 版本升级 & sendCommand 修复

- `backend/pom.xml` SDK 版本 3.2.0 → 3.2.1（3 个 dependency）
- `RobotService.sendCommand()` 从 `httpClient().post()` 直调改为 `uRobotClient.robot().sendCommand(SendCommandRequest)`，删除手动 `realtimeService.registerTask()` 调用
- 升级后 observability-logging（traceId、结构化日志、脱敏）自动生效，无需 Example 侧代码改动

### 后端新增 BFF 接口

- `MapService` 新增 2 个方法：`listNarrationProcesses(editionId)`、`getNarrationProcessDetail(editionId, processId)`，调用 SDK `NarrationClient`
- `MapHandler` 新增 2 个端点：`GET /map/edition/{editionId}/narration-processes`、`GET /map/edition/{editionId}/narration-process-detail`
- `RobotService` 新增 3 个方法：`controlNarration`、`getNarrationRuntime`、`activateMap`，调用 SDK `RobotClient` 对应方法
- `RobotHandler` 新增 3 个端点：`POST /robot/{robotId}/narration/control`、`GET /robot/{robotId}/narration/runtime`、`POST /robot/activate-map`
- 新建 `ControlNarrationBody.java` 请求体 DTO

### 前端 API 层

- `shared/types/api.ts` 新增讲解相关类型：`NarrationCommand`、`ControlNarrationParams`、`NarrationProcessSummary`、`NarrationProcessNodeSummary`、`NarrationRuntimeInfo`
- `mapApi.ts` 新增 `listNarrationProcesses(editionId)`、`getNarrationProcessDetail(editionId, processId)`
- `robotApi.ts` 新增 `controlNarration(robotId, params)`、`getNarrationRuntime(robotId)`、`activateMap(robotId, editionId)`

### 前端 UI

- `CommandPanel.tsx` 快捷指令区新增「激活地图」按钮，携带当前 robotId + editionId 调用 `activateMap()`，返回 taskId 接入已有 TaskTimeline 追踪
- 新建 `NarrationPanel.tsx` 独立侧栏面板（与 CommandPanel 平级），包含：讲解流程下拉选择、开始/跳过按钮、节点列表展示、运行时状态、暂停/恢复/停止控制按钮
- `useRobotWorkbench.ts` 新增：`narrationProcesses` 状态（随 edition 加载）、`narrationRuntime` 状态（控制后刷新）、`controlNarration()`、`activateMap()` 方法
- `SpatialWorkbenchPage.tsx` 在 NavigationTargetPanel 之后、CommandPanel 之前插入 NarrationPanel

## Capabilities

### New Capabilities

（无新 capability，本次为已有 capability 的增量扩展）

### Modified Capabilities

- `backend-api-endpoints`：MapHandler 新增 2 个讲解流程查询端点，RobotHandler 新增 3 个讲解控制/激活地图端点，RobotService.sendCommand 修复为使用 SDK API
- `frontend-spatial-workbench`：快捷指令区新增激活地图按钮，新增 NarrationPanel 讲解导览侧栏面板

## Impact

- **后端代码**：修改 4 个 Java 文件（RobotService、RobotHandler、MapService、MapHandler），新建 1 个 DTO（ControlNarrationBody）
- **前端代码**：修改 4 个文件（api.ts 类型、robotApi.ts、mapApi.ts、useRobotWorkbench.ts、SpatialWorkbenchPage.tsx、CommandPanel.tsx），新建 1 个组件（NarrationPanel.tsx）
- **API 兼容性**：纯增量，5 个新端点，不修改已有端点
- **SDK 依赖**：3.2.0 → 3.2.1，MINOR 升级向后兼容；sendCommand 修复后行为与 SDK 标准调用路径一致
- **构建**：需先 `mvn install` SDK 3.2.1 到本地仓库，后端 `mvn compile` 和前端 `npm run build` 均需通过
