## ADDED Requirements

### Requirement: 讲解相关类型定义
前端 SHALL 在 `shared/types/api.ts` 中新增讲解功能所需的类型定义。

#### Scenario: NarrationCommand 联合类型
- **WHEN** 前端构建讲解控制请求
- **THEN** command 字段 SHALL 为 `NarrationCommand` 联合类型，取值：`'start' | 'pause' | 'resume' | 'stop' | 'node-pick'`

#### Scenario: ControlNarrationParams 类型
- **WHEN** 前端调用讲解控制 API
- **THEN** 参数 SHALL 符合 `ControlNarrationParams` 类型，包含 editionId、processId、processName、command（NarrationCommand）、operationSource、nodeId（可选）、nodeName（可选）

#### Scenario: NarrationProcessSummary 类型
- **WHEN** 前端展示讲解流程列表
- **THEN** 每项 SHALL 符合 `NarrationProcessSummary` 类型，含 id、uuid、name、navPathId、navPathName、valid、nodes（NarrationProcessNodeSummary[]）

#### Scenario: NarrationProcessNodeSummary 类型
- **WHEN** 前端展示讲解流程节点
- **THEN** 每项 SHALL 符合 `NarrationProcessNodeSummary` 类型，含 id、uuid、name、navNodeId、order、position、rotation

#### Scenario: NarrationRuntimeInfo 类型
- **WHEN** 前端展示讲解运行时状态
- **THEN** 数据 SHALL 符合 `NarrationRuntimeInfo` 类型

### Requirement: 讲解流程查询 API
前端 SHALL 提供讲解流程列表和详情的 API 封装。

#### Scenario: 查询讲解流程列表
- **WHEN** 前端调用 `listNarrationProcesses(editionId)`
- **THEN** 请求 `GET /api/map/edition/{editionId}/narration-processes`，返回 `NarrationProcessSummary[]`

#### Scenario: 查询讲解流程详情
- **WHEN** 前端调用 `getNarrationProcessDetail(editionId, processId)`
- **THEN** 请求 `GET /api/map/edition/{editionId}/narration-process-detail?processId=xxx`，返回流程详情

### Requirement: 讲解控制 API
前端 SHALL 提供讲解控制和运行时查询的 API 封装。

#### Scenario: 发送讲解控制指令
- **WHEN** 前端调用 `controlNarration(robotId, params)`
- **THEN** 请求 `POST /api/robot/{robotId}/narration/control`，请求体为 `ControlNarrationParams`

#### Scenario: 查询讲解运行时
- **WHEN** 前端调用 `getNarrationRuntime(robotId)`
- **THEN** 请求 `GET /api/robot/{robotId}/narration/runtime`，返回 `NarrationRuntimeInfo[]`

### Requirement: 激活地图 API
前端 SHALL 提供激活地图的 API 封装。

#### Scenario: 调用激活地图
- **WHEN** 前端调用 `activateMap(robotId, editionId)`
- **THEN** 请求 `POST /api/robot/activate-map?robotId=xxx&editionId=yyy`，返回 taskId（String）

### Requirement: useRobotWorkbench 讲解状态管理
`useRobotWorkbench` hook SHALL 新增讲解导览和激活地图的状态与方法。

#### Scenario: 讲解流程列表自动加载
- **WHEN** edition 加载完成
- **THEN** 自动调用 `listNarrationProcesses(editionId)` 获取该版本下的讲解流程列表，存入 `narrationProcesses` 状态

#### Scenario: 讲解流程选择
- **WHEN** 用户选择一个讲解流程
- **THEN** `selectedProcessId` 状态更新为选中的流程 ID

#### Scenario: 讲解运行时状态
- **WHEN** 调用 `controlNarration(command, options?)` 成功
- **THEN** 自动刷新 `narrationRuntime` 状态

#### Scenario: 激活地图复用 task 追踪
- **WHEN** 调用 `activateMap()` 返回 taskId
- **THEN** 将 taskId 加入 tasks 状态，复用已有 TaskTimeline 的 HTTP 轮询 + WS TASK_REPLY 推送追踪模式

#### Scenario: 导出新增状态和方法
- **WHEN** 其他组件需要使用讲解功能
- **THEN** `useRobotWorkbench` SHALL 导出 `narrationProcesses`、`selectedProcessId`、`narrationRuntime`、`controlNarration()`、`activateMap()` 及 `setSelectedProcessId()`

### Requirement: 激活地图按钮
`CommandPanel` SHALL 在快捷指令区新增「激活地图」按钮。

#### Scenario: 按钮可用条件
- **WHEN** `robotName` 和 `editionId` 都存在
- **THEN** 「激活地图」按钮可点击

#### Scenario: 按钮不可用
- **WHEN** `robotName` 或 `editionId` 不存在
- **THEN** 「激活地图」按钮禁用

#### Scenario: 点击激活地图
- **WHEN** 用户点击「激活地图」按钮
- **THEN** 调用 `onActivateMap()` 回调，触发 activateMap 流程，返回的 taskId 在 TaskTimeline 中追踪

#### Scenario: CommandPanel props 扩展
- **WHEN** SpatialWorkbenchPage 渲染 CommandPanel
- **THEN** 传入 `editionId` 和 `onActivateMap` 回调

### Requirement: NarrationPanel 讲解导览面板
系统 SHALL 提供独立的 `NarrationPanel` 侧栏面板，位于 NavigationTargetPanel 之后、CommandPanel 之前。

#### Scenario: 流程下拉选择
- **WHEN** `narrationProcesses` 列表非空
- **THEN** 面板展示流程下拉选择器，用户可选择一个讲解流程

#### Scenario: 空状态提示
- **WHEN** `narrationProcesses` 列表为空
- **THEN** 面板显示"当前地图版本无讲解流程"提示

#### Scenario: 启动讲解
- **WHEN** 用户选中一个流程并点击「开始」按钮
- **THEN** 调用 `controlNarration('start', { processId, processName, editionId })`

#### Scenario: 节点列表展示
- **WHEN** 用户选中一个讲解流程
- **THEN** 面板展示该流程的节点列表，每个节点显示名称和状态标记（若有运行时数据则标记当前执行位置）

#### Scenario: 节点点击跳转
- **WHEN** 用户点击节点列表中的某个节点
- **THEN** 调用 `controlNarration('node-pick', { nodeId, nodeName, processId, editionId })`

#### Scenario: 暂停/恢复/停止控制
- **WHEN** 讲解流程运行中
- **THEN** 面板展示暂停、恢复、停止按钮，点击分别发送 `pause`、`resume`、`stop` 指令

#### Scenario: 运行时状态展示
- **WHEN** `narrationRuntime` 有数据
- **THEN** 面板展示当前讲解状态信息

#### Scenario: 样式风格
- **WHEN** NarrationPanel 渲染
- **THEN** 复用已有 `side-card` + `command-grid` CSS 模式，与工作台其他面板风格一致

### Requirement: NarrationPanel 页面集成
`SpatialWorkbenchPage` SHALL 在控制面板中集成 NarrationPanel。

#### Scenario: 面板位置
- **WHEN** 工作台渲染右侧控制面板
- **THEN** NarrationPanel 位于 NavigationTargetPanel 之后、CommandPanel 之前

#### Scenario: 数据传递
- **WHEN** SpatialWorkbenchPage 渲染 NarrationPanel
- **THEN** 传入 `narrationProcesses`、`selectedProcessId`、`setSelectedProcessId`、`narrationRuntime`、`controlNarration`、`editionId`
