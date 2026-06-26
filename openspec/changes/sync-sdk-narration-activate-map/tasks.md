## Tasks

### 0. SDK 版本升级

- [x] `backend/pom.xml` 3 个 SDK dependency 版本 3.2.0 → 3.2.1
- [x] 验证编译通过（`mvn compile`）

### 1. 修复 sendCommand 绕过 SDK

- [x] `RobotService.sendCommand()` 改用 `uRobotClient.robot().sendCommand(SendCommandRequest)`
  - 构建 `SendCommandRequest.builder().robotId().type().messagesType().params().callbackUrl().build()`
  - 保留 `normalizeCommandParams()` 和 `normalizeMessagesType()` 逻辑
  - 删除 `httpClient().post()` 直调
  - 删除 `realtimeService.registerTask()` 手动调用
- [x] `RobotService` 构造函数移除 `RobotRealtimeService` 注入（sendCommand 是唯一调用点）
- [x] 验证 sendCommand 功能正常：指令下发 → taskId 返回 → TaskTimeline 追踪

### 2. 后端新增讲解流程查询接口

- [x] `MapService` 新增 `listNarrationProcesses(String editionId)` 方法
  - 调用 `uRobotClient.map().narration().listProcesses(ListNarrationProcessesRequest)`
  - 返回 `List<Map<String, Object>>`，转换 `NarrationProcess` 及其嵌套 `NarrationProcessNode`
- [x] `MapService` 新增 `getNarrationProcessDetail(String editionId, String processId)` 方法
  - 调用 `uRobotClient.map().narration().getProcessDetail(GetNarrationProcessDetailRequest)`
- [x] `MapHandler` 新增端点 `GET /map/edition/{editionId}/narration-processes`
- [x] `MapHandler` 新增端点 `GET /map/edition/{editionId}/narration-process-detail?processId=`

### 3. 后端新增讲解控制 + 激活地图接口

- [x] 新建 `ControlNarrationBody.java`（字段：editionId, processId, processName, command, operationSource, nodeId, nodeName）
- [x] `RobotService` 新增 `controlNarration(String robotId, ControlNarrationBody body)` 方法
  - 构建 `ControlNarrationRequest`，调用 `uRobotClient.robot().controlNarration()`
  - 返回 `Map<String, Object>`（accepted, mode, runtime 信息）
- [x] `RobotService` 新增 `getNarrationRuntime(String robotId)` 方法
  - 调用 `uRobotClient.robot().getNarrationRuntime()`
  - 返回 `List<Map<String, Object>>`
- [x] `RobotService` 新增 `activateMap(String robotId, String editionId)` 方法
  - 构建 `ActivateMapRequest`，调用 `uRobotClient.robot().activateMap()`
  - 返回 taskId（String）
- [x] `RobotHandler` 新增端点 `POST /robot/{robotId}/narration/control`
- [x] `RobotHandler` 新增端点 `GET /robot/{robotId}/narration/runtime`
- [x] `RobotHandler` 新增端点 `POST /robot/activate-map?robotId=&editionId=`
- [x] 后端编译验证

### 4. 前端 API 层

- [x] `shared/types/api.ts` 新增类型定义
  - `NarrationCommand` 联合类型
  - `ControlNarrationParams` 请求参数类型
  - `NarrationProcessSummary` 流程摘要（id, uuid, name, navPathId, navPathName, valid, nodes）
  - `NarrationProcessNodeSummary` 流程节点（id, uuid, name, navNodeId, order, position, rotation）
  - `NarrationRuntimeInfo` 运行时信息
- [x] `mapApi.ts` 新增 `listNarrationProcesses(editionId)` 和 `getNarrationProcessDetail(editionId, processId)`
- [x] `robotApi.ts` 新增 `controlNarration(robotId, params)`、`getNarrationRuntime(robotId)`、`activateMap(robotId, editionId)`

### 5. 前端 useRobotWorkbench 扩展

- [x] 新增 `narrationProcesses` 状态，在 edition 加载后自动调用 `listNarrationProcesses(editionId)`
- [x] 新增 `selectedProcessId` 状态（讲解流程选择）
- [x] 新增 `narrationRuntime` 状态
- [x] 新增 `controlNarration(command, options?)` 方法，调用后刷新 narrationRuntime
- [x] 新增 `activateMap()` 方法，复用 task 追踪模式（加入 tasks → 轮询/WS 推送）
- [x] 导出新增状态和方法

### 6. CommandPanel 激活地图按钮

- [x] CommandPanel props 新增 `editionId?` 和 `onActivateMap?`
- [x] 快捷指令区新增「激活地图」按钮（需要 robotName 和 editionId 都存在才可用）
- [x] SpatialWorkbenchPage 传入 editionId 和 activateMap 回调

### 7. NarrationPanel 讲解导览面板

- [x] 新建 `NarrationPanel.tsx` 组件
  - 流程下拉选择（`<select>` 从 narrationProcesses 中选择）
  - 开始按钮（`command: 'start'`）
  - 节点列表展示（遍历选中流程的 nodes，展示节点名称 + 状态标记）
  - 节点点击跳转（`command: 'node-pick'`，传入 nodeId + nodeName）
  - 运行时状态行（展示当前讲解状态）
  - 暂停（`command: 'pause'`）/ 恢复（`command: 'resume'`）/ 停止（`command: 'stop'`）按钮
  - 空状态提示（无讲解流程时显示"当前地图版本无讲解流程"）
- [x] 样式：复用已有 `side-card` + `command-grid` CSS 模式
- [x] SpatialWorkbenchPage 中在 NavigationTargetPanel 之后、CommandPanel 之前插入 NarrationPanel

### 8. 验证

- [x] 后端编译通过
- [x] 前端编译通过（`npm run build`）
- [x] 前端已有测试通过（`npm test`）
