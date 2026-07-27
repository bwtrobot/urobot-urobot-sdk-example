## ADDED Requirements

### Requirement: sendCommand 改用 SDK 标准 API
后端 `RobotService.sendCommand()` SHALL 通过 `uRobotClient.robot().sendCommand(SendCommandRequest)` 下发指令，不再直接调用 `httpClient().post()`。

#### Scenario: 构建 SendCommandRequest
- **WHEN** 后端收到指令下发请求
- **THEN** 构建 `SendCommandRequest.builder().robotId().type().messagesType().params().callbackUrl().build()` 并调用 SDK API

#### Scenario: 保留参数归一化逻辑
- **WHEN** 后端构建 SendCommandRequest
- **THEN** `normalizeCommandParams()` 和 `normalizeMessagesType()` 逻辑保留不变

#### Scenario: 删除手动 TaskCache 注册
- **WHEN** sendCommand 调用完成
- **THEN** 不再手动调用 `realtimeService.registerTask()`，SDK 内部已自动处理 TaskCache 注册

#### Scenario: 移除 RobotRealtimeService 注入
- **WHEN** sendCommand 是 `RobotService` 中唯一使用 `RobotRealtimeService` 的调用点
- **THEN** `RobotService` 构造函数 SHALL 移除 `RobotRealtimeService` 注入

### Requirement: 讲解流程列表查询端点
系统 SHALL 提供 `GET /map/edition/{editionId}/narration-processes` 端点，返回指定地图版本下的讲解流程列表。

#### Scenario: 查询讲解流程列表
- **WHEN** 客户端请求 `GET /map/edition/{editionId}/narration-processes`
- **THEN** `MapService` 调用 `uRobotClient.map().narration().listProcesses(ListNarrationProcessesRequest)`，返回 `Result<List<Map<String, Object>>>`

#### Scenario: 返回数据结构
- **WHEN** 查询成功
- **THEN** 每项包含 id、uuid、name、navPathId、navPathName、valid 和嵌套的 nodes 列表（每个 node 含 id、uuid、name、navNodeId、order、position、rotation）

#### Scenario: 无讲解流程
- **WHEN** 该地图版本未配置讲解流程
- **THEN** 返回空列表 `Result<[]>`

### Requirement: 讲解流程详情查询端点
系统 SHALL 提供 `GET /map/edition/{editionId}/narration-process-detail?processId=` 端点，返回指定讲解流程的详细信息。

#### Scenario: 查询流程详情
- **WHEN** 客户端请求 `GET /map/edition/{editionId}/narration-process-detail?processId=xxx`
- **THEN** `MapService` 调用 `uRobotClient.map().narration().getProcessDetail(GetNarrationProcessDetailRequest)`，返回 `Result<Map<String, Object>>`

### Requirement: 讲解控制端点
系统 SHALL 提供 `POST /robot/{robotId}/narration/control` 端点，接收 `ControlNarrationBody` 请求体，控制机器人讲解流程的执行。

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

### Requirement: 讲解运行时状态查询端点
系统 SHALL 提供 `GET /robot/{robotId}/narration/runtime` 端点，返回机器人当前的讲解运行时状态。

#### Scenario: 查询运行时状态
- **WHEN** 客户端请求 `GET /robot/{robotId}/narration/runtime`
- **THEN** `RobotService` 调用 `uRobotClient.robot().getNarrationRuntime()`，返回 `Result<List<Map<String, Object>>>`

#### Scenario: 无运行中讲解
- **WHEN** 机器人当前没有运行中的讲解流程
- **THEN** 返回空列表

### Requirement: 激活地图端点
系统 SHALL 提供 `POST /robot/activate-map?robotId=&editionId=` 端点，向机器人发送地图激活指令。

#### Scenario: 激活地图成功
- **WHEN** 客户端请求 `POST /robot/activate-map?robotId=xxx&editionId=yyy`
- **THEN** `RobotService` 构建 `ActivateMapRequest` 并调用 `uRobotClient.robot().activateMap()`，返回 `Result<String>`（taskId）

#### Scenario: taskId 接入 TaskCache
- **WHEN** activateMap 返回 taskId
- **THEN** SDK 内部自动注册 TaskCache，后续可通过已有 task-result 端点查询激活进度

### Requirement: 阻塞调用调度
新增的讲解流程查询、讲解控制、讲解运行时查询和激活地图的 SDK 阻塞调用 SHALL 通过 `Mono.fromSupplier().subscribeOn(Schedulers.boundedElastic())` 调度，与已有端点保持一致。

#### Scenario: 并发请求不阻塞
- **WHEN** 多个客户端同时请求新增端点
- **THEN** 请求在 boundedElastic 线程池并行执行，Netty 事件循环不被阻塞
