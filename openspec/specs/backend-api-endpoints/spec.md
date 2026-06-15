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
