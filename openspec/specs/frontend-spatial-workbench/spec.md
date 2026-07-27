## Requirements

### Requirement: 空间工作台页面布局
系统 SHALL 提供单页空间工作台（SpatialWorkbenchPage），左侧为 3D 空间视图，右侧为机器人控制面板（状态卡片、导航目标、快捷指令、任务时间线），顶部为机器人选择下拉框。

#### Scenario: 默认布局
- **WHEN** 用户打开应用首页
- **THEN** 系统渲染空间工作台页面，左侧显示 3D 场景，右侧显示控制面板

#### Scenario: 响应式布局
- **WHEN** 视口宽度小于 980px
- **THEN** 布局切换为单列，3D 场景在上，控制面板在下

### Requirement: 机器人列表加载与选择
系统 SHALL 在页面加载时获取机器人列表，并默认选中第一台机器人。

#### Scenario: 加载机器人列表
- **WHEN** 页面挂载
- **THEN** 调用 `GET /api/robot/page` 获取列表，填充下拉框，自动选中第一台

#### Scenario: 切换机器人
- **WHEN** 用户从下拉框选择另一台机器人
- **THEN** 系统更新运行时数据、地图数据、3D 场景中的机器人位姿

### Requirement: 机器人运行时轮询
系统 SHALL 每 3 秒轮询选中机器人的运行时状态，更新状态卡片和 3D 位姿。

#### Scenario: 运行时更新
- **WHEN** 轮询定时器触发
- **THEN** 调用 `GET /api/robot/runtime/{id}`，更新 RobotStatusCard 显示和 3D 机器人位姿

### Requirement: 快捷指令发送
系统 SHALL 提供导航、语音、充电、暂停、继续、急停 6 个快捷指令按钮。

#### Scenario: 发送导航指令
- **WHEN** 用户点击「导航」按钮
- **THEN** 系统调用 `POST /api/robot/command/{id}` 发送 navigation 命令，并在任务时间线中添加记录

#### Scenario: 发送急停指令
- **WHEN** 用户点击「急停」按钮
- **THEN** 系统发送 emergency_stop 命令

### Requirement: 任务状态轮询闭环
系统 SHALL 在发送指令后轮询任务状态直到终态（completed/failed/canceled/timeout），最多 30 次、每次间隔 2 秒。

#### Scenario: 任务完成
- **WHEN** 指令下发后，任务状态查询返回 completed
- **THEN** 任务时间线中该任务状态更新为「完成」，停止轮询

#### Scenario: 轮询超限
- **WHEN** 轮询 30 次后任务仍未达到终态
- **THEN** 停止轮询，任务保持最后已知状态

### Requirement: 运动方向键
系统 SHALL 在 3D 视图左下角提供 MotionPad，支持前进/后退/左移/右移和旋转操作。

#### Scenario: 前进操作
- **WHEN** 用户点击前进按钮
- **THEN** 系统发送 `base_move` 命令，direction=forward, speed=0.3

#### Scenario: 旋转操作
- **WHEN** 用户点击旋转按钮
- **THEN** 系统发送 `cmd_vel` 命令，angular.z=0.4

### Requirement: API Mock 降级
系统 SHALL 在后端不可达时自动降级到 Mock 数据，页面保持可用并显示「演示数据」标记。

#### Scenario: 后端不可达
- **WHEN** 任意 API 调用因网络错误失败
- **THEN** 返回预定义 Mock 数据，UI 显示 demo-badge，ApiDebugDrawer 记录降级原因

#### Scenario: 后端正常
- **WHEN** API 调用成功
- **THEN** 使用真实数据，ApiDebugDrawer 记录为「真实接口」

### Requirement: API 调试面板
系统 SHALL 在 3D 视图右下角提供可折叠的 ApiDebugDrawer，展示请求方法、URL、数据来源（real/mock）和响应内容。

#### Scenario: 展开调试面板
- **WHEN** 用户点击「接口调试」按钮
- **THEN** 面板展开，显示所有历史请求记录（最多 80 条）

### Requirement: 图层控制
系统 SHALL 在 3D 视图右上角提供 LayerDropdown，控制 BIM 模型、全局点云、地面点云、导航路径 4 个图层的可见性。

#### Scenario: 隐藏 BIM 模型
- **WHEN** 用户在图层下拉中点击「BIM 模型」
- **THEN** 3D 场景中 BIM 图层隐藏，图标切换为 EyeOff

### Requirement: 渲染设置
系统 SHALL 在 3D 视图右上角提供 RenderDropdown，控制点大小（小/中/大）、透明度（30%/60%/100%）和 BIM 线框模式。

#### Scenario: 调整点大小
- **WHEN** 用户选择「大」点大小
- **THEN** 点云材质 size 更新为 0.16

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
