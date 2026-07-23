## MODIFIED Requirements

### Requirement: 讲解相关类型定义
前端 SHALL 在 `shared/types/api.ts` 中新增讲解功能所需的类型定义，并 SHALL 覆盖多节点行为配置与讲解片段视图形态。

#### Scenario: NarrationCommand 联合类型
- **WHEN** 前端构建讲解控制请求
- **THEN** command 字段 SHALL 为 `NarrationCommand` 联合类型，取值：`'start' | 'pause' | 'resume' | 'stop' | 'node-pick'`

#### Scenario: SegmentMode 联合类型
- **WHEN** 前端指定讲解片段的响应形态
- **THEN** SHALL 使用 `SegmentMode` 联合类型，取值：`'collapsed' | 'expanded'`，取值为小写

#### Scenario: ControlNarrationParams 类型
- **WHEN** 前端调用讲解控制 API
- **THEN** 参数 SHALL 符合 `ControlNarrationParams` 类型，包含 editionId、processId、processName、command（NarrationCommand）、operationSource、nodeId（可选）、nodeName（可选）；SHALL NOT 包含 segmentMode

#### Scenario: NarrationProcessSummary 类型
- **WHEN** 前端展示讲解流程列表
- **THEN** 每项 SHALL 符合 `NarrationProcessSummary` 类型，含 id、uuid、name、navPathId、navPathName、valid、nodes（NarrationProcessNodeSummary[]）

#### Scenario: NarrationProcessNodeSummary 类型
- **WHEN** 前端展示讲解流程节点
- **THEN** 每项 SHALL 符合 `NarrationProcessNodeSummary` 类型，含 id、uuid、name、navNodeId、order、position、rotation、**selfScripts（可选 string[]）、selfScriptNames（可选 string[]）、selfScriptValids（可选 boolean[]）、stopover（可选 boolean）**

#### Scenario: NarrationRuntimeSegment 类型
- **WHEN** 前端消费讲解运行时片段
- **THEN** 每项 SHALL 符合 `NarrationRuntimeSegment` 类型，含 nodeIndex、nodeId、nodeName、segmentType、fromNodeId、toNodeId、taskId、taskStatus、**selfIndex（可选 number | null）**

#### Scenario: NarrationRuntimeInfo 类型
- **WHEN** 前端展示讲解运行时状态
- **THEN** 数据 SHALL 符合 `NarrationRuntimeInfo` 类型

### Requirement: 讲解控制 API
前端 SHALL 提供讲解控制和运行时查询的 API 封装，并 SHALL 支持指定讲解片段的响应形态。

#### Scenario: 发送讲解控制指令
- **WHEN** 前端调用 `controlNarration(robotId, params)`
- **THEN** 请求 `POST /api/robot/{robotId}/narration/control`，请求体为 `ControlNarrationParams`

#### Scenario: 查询讲解运行时
- **WHEN** 前端调用 `getNarrationRuntime(robotId)`
- **THEN** 请求 `GET /api/robot/{robotId}/narration/runtime`，返回 `NarrationRuntimeInfo[]`

#### Scenario: 指定片段形态查询运行时
- **WHEN** 前端调用 `getNarrationRuntime(robotId, 'expanded')`
- **THEN** 请求 URL SHALL 携带查询参数 `?segmentMode=expanded`

#### Scenario: 指定片段形态发送控制指令
- **WHEN** 前端调用 `controlNarration(robotId, params, 'expanded')`
- **THEN** 请求 URL SHALL 携带查询参数 `?segmentMode=expanded`，且 `segmentMode` SHALL NOT 出现在请求体中

#### Scenario: 未指定片段形态
- **WHEN** 前端调用两个 API 时未传 `segmentMode`
- **THEN** 请求 URL SHALL NOT 携带 `segmentMode` 查询参数

### Requirement: useRobotWorkbench 讲解状态管理
`useRobotWorkbench` hook SHALL 新增讲解导览和激活地图的状态与方法，并 SHALL 管理讲解片段的视图形态。

#### Scenario: 讲解流程列表自动加载
- **WHEN** edition 加载完成
- **THEN** 自动调用 `listNarrationProcesses(editionId)` 获取该版本下的讲解流程列表，存入 `narrationProcesses` 状态

#### Scenario: 讲解流程选择
- **WHEN** 用户选择一个讲解流程
- **THEN** `selectedProcessId` 状态更新为选中的流程 ID

#### Scenario: 讲解运行时状态
- **WHEN** 调用 `controlNarration(command, options?)` 成功
- **THEN** 自动刷新 `narrationRuntime` 状态

#### Scenario: segmentMode 状态默认值
- **WHEN** hook 初始化
- **THEN** `segmentMode` 状态 SHALL 默认为 `'collapsed'`

#### Scenario: 所有讲解请求携带当前 segmentMode
- **WHEN** 执行运行时查询、定时轮询或讲解控制
- **THEN** 三处调用 SHALL 一律携带当前 `segmentMode` 状态，保证同一次交互中不会出现两种片段形态

#### Scenario: 切换 segmentMode 立即刷新
- **WHEN** 用户切换 `segmentMode`
- **THEN** SHALL 立即触发一次运行时刷新，SHALL NOT 等待下一次轮询周期

#### Scenario: 激活地图复用 task 追踪
- **WHEN** 调用 `activateMap()` 返回 taskId
- **THEN** 将 taskId 加入 tasks 状态，复用已有 TaskTimeline 的 HTTP 轮询 + WS TASK_REPLY 推送追踪模式

#### Scenario: 导出新增状态和方法
- **WHEN** 其他组件需要使用讲解功能
- **THEN** `useRobotWorkbench` SHALL 导出 `narrationProcesses`、`selectedProcessId`、`narrationRuntime`、`controlNarration()`、`activateMap()`、`setSelectedProcessId()` 及 **`segmentMode`、`setSegmentMode()`**

### Requirement: NarrationPanel 讲解导览面板
系统 SHALL 提供独立的 `NarrationPanel` 侧栏面板，位于 NavigationTargetPanel 之后、CommandPanel 之前，并 SHALL 在节点下内嵌展示该节点的多个节点行为。

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

#### Scenario: 视图切换控件
- **WHEN** 面板渲染
- **THEN** SHALL 提供折叠 / 展开两态的视图切换控件，切换时调用 `onSegmentModeChange`

#### Scenario: 节点行为列表渲染
- **WHEN** 节点的 `selfScripts` 非空
- **THEN** 节点行下方 SHALL 内嵌渲染该节点的节点行为列表，行数等于 `selfScripts.length`，每行显示序号

#### Scenario: 以 selfScripts 为迭代基准
- **WHEN** `selfScriptNames` 或 `selfScriptValids` 的长度短于 `selfScripts`
- **THEN** SHALL 仍渲染全部 `selfScripts.length` 行；行为名缺失时降级显示 `selfScripts[i]`，有效性缺失时按有效处理

#### Scenario: 无效行为标记
- **WHEN** `selfScriptValids[i] === false`
- **THEN** 第 i 行 SHALL 标记为无效

#### Scenario: 无节点行为配置
- **WHEN** 节点的 `selfScripts` 缺失或为空数组
- **THEN** SHALL NOT 渲染该节点的行为列表

#### Scenario: 停留标记
- **WHEN** 节点携带 `stopover`
- **THEN** 节点行 SHALL 显示「停留」/「不停留」标记；`stopover` 缺失时按「停留」显示

#### Scenario: 展开视图下逐行为状态
- **WHEN** `segmentMode` 为 `'expanded'`
- **THEN** 第 i 行的状态取自满足 `segmentType === 'self'`、`nodeId` 等于该节点 id、且 `selfIndex === i` 的片段的 `taskStatus`

#### Scenario: segmentType 使用小写比较
- **WHEN** 匹配节点行为片段
- **THEN** SHALL 与小写 `'self'` 比较；与大写 `'SELF'` 比较 SHALL 被视为缺陷（服务端实际下发的取值为小写 `entrance` / `self` / `transition` / `exit`）

#### Scenario: 折叠视图下不显示逐行为状态
- **WHEN** `segmentMode` 为 `'collapsed'`，片段的 `selfIndex` 为 null
- **THEN** 行为列表 SHALL NOT 显示逐条状态；聚合状态 SHALL 显示在节点行上，取自该节点唯一的 `self` 片段的 `taskStatus`

#### Scenario: 不推断折叠状态归属
- **WHEN** 处于折叠视图
- **THEN** SHALL NOT 将聚合状态标注到任何单个节点行为上

#### Scenario: 样式风格
- **WHEN** NarrationPanel 渲染
- **THEN** 复用已有 `side-card` + `command-grid` CSS 模式与既有 `narration-*` 类名，与工作台其他面板风格一致

### Requirement: NarrationPanel 页面集成
`SpatialWorkbenchPage` SHALL 在控制面板中集成 NarrationPanel。

#### Scenario: 面板位置
- **WHEN** 工作台渲染右侧控制面板
- **THEN** NarrationPanel 位于 NavigationTargetPanel 之后、CommandPanel 之前

#### Scenario: 数据传递
- **WHEN** SpatialWorkbenchPage 渲染 NarrationPanel
- **THEN** 传入 `narrationProcesses`、`selectedProcessId`、`setSelectedProcessId`、`narrationRuntime`、`controlNarration`、`editionId`、**`segmentMode`、`onSegmentModeChange`**

## ADDED Requirements

### Requirement: 讲解 Mock 数据覆盖多节点行为与双视图
`services/mock/mockData.ts` SHALL 提供能够演示多节点行为与两种片段形态的讲解 mock 数据，使后端不可用的降级模式下功能可完整演示。

#### Scenario: 多节点行为的流程节点
- **WHEN** mock 讲解流程被消费
- **THEN** SHALL 至少存在一个含 3 个 `selfScripts` 的节点，其中一个 `selfScriptValids` 为 `false`；SHALL 至少存在一个 `stopover` 为 `false` 的节点；SHALL 保留单行为节点以覆盖存量形态

#### Scenario: 按形态生成运行时片段
- **WHEN** 以 `segmentMode` 请求 mock 运行时数据
- **THEN** SHALL 按形态返回不同的 `segments`：展开形态下同节点的 3 个 `self` 片段各自独立且 `selfIndex` 为 0/1/2；折叠形态下聚合为 1 个片段且 `selfIndex` 为 null

#### Scenario: 折叠形态保持响应自洽
- **WHEN** mock 返回折叠形态
- **THEN** `taskIds` 与 `latestTaskId` SHALL 同步折叠，与折叠后的片段一一对应，SHALL NOT 保留已被聚合掉的 taskId

#### Scenario: 片段类型取值为小写
- **WHEN** mock 生成 `segments`
- **THEN** `segmentType` SHALL 取小写值 `entrance` / `self` / `transition` / `exit`，与服务端实际下发形式一致