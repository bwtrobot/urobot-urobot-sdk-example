## MODIFIED Requirements

### Requirement: 讲解流程列表查询端点
系统 SHALL 提供 `GET /map/edition/{editionId}/narration-processes` 端点，返回指定地图版本下的讲解流程列表，其中每个流程节点 SHALL 携带完整的多节点行为配置与停留配置。

#### Scenario: 查询讲解流程列表
- **WHEN** 客户端请求 `GET /map/edition/{editionId}/narration-processes`
- **THEN** `MapService` 调用 `uRobotClient.map().narration().listProcesses(ListNarrationProcessesRequest)`，返回 `Result<List<Map<String, Object>>>`

#### Scenario: 返回数据结构
- **WHEN** 查询成功
- **THEN** 每项包含 id、uuid、name、navPathId、navPathName、valid 和嵌套的 nodes 列表；每个 node 含 id、uuid、name、navNodeId、order、position、rotation、**selfScripts、selfScriptNames、selfScriptValids、stopover**

#### Scenario: 透传多节点行为配置
- **WHEN** `MapService.narrationProcessNodeToMap` 转换 `NarrationProcessNode`
- **THEN** `selfScripts` 取 `node.selfScripts()`、`selfScriptNames` 取 `node.selfScriptNames()`、`selfScriptValids` 取 `node.selfScriptValids()`、`stopover` 取 `node.stopover()`

#### Scenario: 不在 BFF 层重复实现降级
- **WHEN** 服务端版本较低、仅返回单值 `selfScript`
- **THEN** BFF SHALL 直接透传 SDK 访问器的返回值，由 SDK 内部完成单值升列表的降级；BFF 不得自行编写降级分支

#### Scenario: 三个列表不保证等长
- **WHEN** SDK 的 `selfScripts()` / `selfScriptNames()` / `selfScriptValids()` 因各自独立降级而返回不等长的列表
- **THEN** BFF SHALL 原样透传，不做补齐或截断；长度对齐的责任由消费端按 `selfScripts` 为基准承担

#### Scenario: 不透传入场与退场讲解稿
- **WHEN** 转换 `NarrationProcessNode`
- **THEN** 本次 SHALL NOT 新增 `entranceScript` / `exitScript` 及其 Name / Valid 字段

#### Scenario: 无讲解流程
- **WHEN** 该地图版本未配置讲解流程
- **THEN** 返回空列表 `Result<[]>`

### Requirement: 讲解运行时状态查询端点
系统 SHALL 提供 `GET /robot/{robotId}/narration/runtime` 端点，返回机器人当前的讲解运行时状态，并 SHALL 支持通过可选查询参数 `segmentMode` 选择讲解片段的响应形态。

#### Scenario: 查询运行时状态
- **WHEN** 客户端请求 `GET /robot/{robotId}/narration/runtime`
- **THEN** `RobotService` 调用 `uRobotClient.robot().getNarrationRuntime()`，返回 `Result<List<Map<String, Object>>>`

#### Scenario: 不带 segmentMode 时保持服务端默认
- **WHEN** 客户端请求未携带 `segmentMode`，或其值为空白
- **THEN** `RobotService` SHALL NOT 调用 `GetNarrationRuntimeRequest.Builder.segmentMode(...)`，由服务端按其默认形态（collapsed）响应

#### Scenario: 指定展开形态
- **WHEN** 客户端请求 `GET /robot/{robotId}/narration/runtime?segmentMode=expanded`
- **THEN** `RobotService` 构建请求时调用 `.segmentMode(SegmentMode.EXPANDED)`，响应中同一节点的多个自身讲解片段各自独立且携带 `selfIndex`

#### Scenario: 指定折叠形态
- **WHEN** 客户端请求 `GET /robot/{robotId}/narration/runtime?segmentMode=collapsed`
- **THEN** `RobotService` 构建请求时调用 `.segmentMode(SegmentMode.COLLAPSED)`，响应中同一节点的多个自身讲解片段聚合为一个，`selfIndex` 为 null

#### Scenario: segmentMode 取值不区分大小写
- **WHEN** 客户端传入 `Expanded`、`EXPANDED` 等大小写变体
- **THEN** 系统 SHALL 正确识别为 `SegmentMode.EXPANDED`

#### Scenario: 非法 segmentMode 快速失败
- **WHEN** 客户端传入 `collapsed` / `expanded` 之外的非空取值
- **THEN** 系统 SHALL 抛出 `IllegalArgumentException` 使请求失败，SHALL NOT 静默回退到默认形态

#### Scenario: 无运行中讲解
- **WHEN** 机器人当前没有运行中的讲解流程
- **THEN** 返回空列表

#### Scenario: 透传 selfIndex
- **WHEN** `RobotService.narrationSegmentToMap` 转换 `NarrationSegment`
- **THEN** 输出 Map SHALL 包含 `selfIndex` 字段，取值为 `segment.selfIndex()`

#### Scenario: segment 字段映射保持手写
- **WHEN** 转换 `NarrationSegment` 与 `NarrationNode`
- **THEN** SHALL 保持逐字段手写映射，SHALL NOT 改造为反射遍历

### Requirement: 讲解控制端点
系统 SHALL 提供 `POST /robot/{robotId}/narration/control` 端点，接收 `ControlNarrationBody` 请求体，控制机器人讲解流程的执行，并 SHALL 支持通过可选查询参数 `segmentMode` 选择响应中讲解片段的形态。

#### Scenario: 启动讲解
- **WHEN** 客户端发送 `{ command: "start", editionId, processId, processName, operationSource }` 到 `POST /robot/{robotId}/narration/control`
- **THEN** `RobotService` 构建 `ControlNarrationRequest` 并调用 `uRobotClient.robot().controlNarration()`，返回 `Result<Map<String, Object>>`（含 accepted、mode、runtime 信息）

#### Scenario: 暂停讲解
- **WHEN** 客户端发送 `{ command: "pause", editionId, processId, operationSource }`
- **THEN** 系统暂停当前讲解流程

#### Scenario: 恢复讲解
- **WHEN** 客户端发送 `{ command: "resume", editionId, processId, operationSource }`
- **THEN** 系统恢复已暂停的讲解流程

#### Scenario: 停止讲解
- **WHEN** 客户端发送 `{ command: "stop", editionId, processId, operationSource }`
- **THEN** 系统停止当前讲解流程

#### Scenario: 跳转讲解节点
- **WHEN** 客户端发送 `{ command: "node-pick", editionId, processId, nodeId, nodeName, operationSource }`
- **THEN** 系统跳转到指定讲解节点

#### Scenario: ControlNarrationBody 字段
- **WHEN** 系统解析请求体
- **THEN** ControlNarrationBody SHALL 包含字段：editionId（String）、processId（String）、processName（String）、command（String）、operationSource（String）、nodeId（String）、nodeName（String）

#### Scenario: segmentMode 走查询参数而非请求体
- **WHEN** 客户端需要指定讲解片段形态
- **THEN** SHALL 通过 `POST /robot/{robotId}/narration/control?segmentMode=expanded` 传递；`ControlNarrationBody` SHALL NOT 新增 `segmentMode` 字段

#### Scenario: 控制端点与运行时端点口径一致
- **WHEN** 两个端点均接收 `segmentMode`
- **THEN** 参数名、取值集合、默认行为、非法值处理 SHALL 完全一致，并复用同一段解析逻辑

#### Scenario: 控制响应携带 selfIndex
- **WHEN** 控制请求以展开形态返回内嵌的讲解片段
- **THEN** 每个自身讲解片段 SHALL 携带 `selfIndex`