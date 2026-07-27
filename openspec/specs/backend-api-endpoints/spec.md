## Requirements

### Requirement: 机器人运行时查询端点
系统 SHALL 提供 `GET /robot/runtime/{robotId}` 端点，返回指定机器人的运行时状态（含位姿、电量、控制模式等）。

#### Scenario: 查询成功
- **WHEN** 客户端请求 `GET /robot/runtime/{robotId}`
- **THEN** 返回 `Result<Map<String, Object>>`，包含 ros_odom.pose、soc、terminal_status 等字段

### Requirement: 机器人指令发送端点
系统 SHALL 提供 `POST /robot/command/{robotId}` 端点，接收 SendCommandBody（type, messagesType, params, callbackUrl），调用 SDK 下发指令并返回 taskId。

#### Scenario: 发送指令成功
- **WHEN** 客户端发送合法的指令请求
- **THEN** 返回 `Result<String>`，String 为生成的 taskId

#### Scenario: SendCommandBody.params 类型
- **WHEN** 客户端发送指令
- **THEN** params 字段 SHALL 为 `Map<String, Object>` 类型，支持任意嵌套结构

### Requirement: 任务结果查询端点
系统 SHALL 提供 `GET /robot/task-result/{robotId}?taskIds=x&taskIds=y` 端点，返回指定任务的执行结果列表。

#### Scenario: 查询任务结果
- **WHEN** 客户端请求任务结果，传入 taskIds 列表
- **THEN** 返回 `Result<List<Map<String, Object>>>`，每项包含 task_id、task_status、command_resp_list

### Requirement: 地图版本列表端点
系统 SHALL 提供 `GET /map/{mapId}/editions` 端点，返回指定地图的所有版本信息（含 BIM、globalMap、groundMap）。

#### Scenario: 查询地图版本
- **WHEN** 客户端请求 `GET /map/{mapId}/editions`
- **THEN** 返回 `Result<List<Map<String, Object>>>`，每项含 id、mapId、name、bim、globalMap、groundMap

### Requirement: 地图版本详情端点
系统 SHALL 提供 `GET /map/edition/{editionId}` 端点，返回指定版本的详细信息。

#### Scenario: 查询版本详情
- **WHEN** 客户端请求 `GET /map/edition/{editionId}`
- **THEN** 返回 `Result<List<Map<String, Object>>>`，包含单个版本的完整信息

### Requirement: 充电点查询端点
系统 SHALL 提供 `GET /map/edition/{editionId}/charging-stations` 端点，返回指定版本下的充电站点列表。

#### Scenario: 查询充电点
- **WHEN** 客户端请求充电站点
- **THEN** 返回 `Result<List<Map<String, Object>>>`，每项含 id、uuid、name、x、y、z、rotation 等

### Requirement: 导航路径分页端点
系统 SHALL 提供 `GET /map/nav-path/page?editionId=x&pageNo=1&pageSize=20` 端点，返回导航路径列表（含完整节点信息）。

#### Scenario: 查询导航路径
- **WHEN** 客户端请求导航路径分页
- **THEN** 系统先调用 SDK list 获取路径列表，再对每条路径调用 getPoints 获取节点详情，返回 `Result<Page<Map<String, Object>>>`

### Requirement: 拓扑路径分页端点
系统 SHALL 提供 `GET /map/topo-path/page?editionId=x&pageNo=1&pageSize=20` 端点，返回拓扑路径列表（含节点和边信息）。

#### Scenario: 查询拓扑路径
- **WHEN** 客户端请求拓扑路径分页
- **THEN** 返回包含 nodes 和 edges 的完整拓扑路径数据

### Requirement: 阻塞调用调度
所有 SDK 阻塞调用 SHALL 通过 `Mono.fromSupplier().subscribeOn(Schedulers.boundedElastic())` 调度到弹性线程池，避免阻塞 Netty 事件循环。

#### Scenario: 并发请求不阻塞
- **WHEN** 多个客户端同时请求 SDK 端点
- **THEN** 请求在 boundedElastic 线程池并行执行，Netty 事件循环不被阻塞

### Requirement: 全局异常处理
系统 SHALL 提供 GlobalExceptionHandler，捕获所有未处理异常并返回统一的 `Result` 错误响应。

#### Scenario: SDK 调用异常
- **WHEN** SDK 调用抛出运行时异常
- **THEN** 返回 `Result(success=false, errcode="INTERNAL_ERROR", errmsg=异常消息)`

### Requirement: Jackson snake_case 序列化
系统 SHALL 配置 Jackson 使用 SNAKE_CASE 命名策略，确保 Page 字段（totalCount → total_count）匹配前端类型定义。

#### Scenario: 序列化字段名
- **WHEN** 系统序列化 Page 对象
- **THEN** JSON 输出使用 snake_case（如 total_count、page_no、page_size）

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
