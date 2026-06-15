## ADDED Requirements

### Requirement: SDK WS 配置启用
后端 SHALL 引入 `utwin-opensdk-ws` 并在构建 `UTwinClient` 时配置 `WsConfiguration`。配置项 SHALL 支持通过应用配置覆盖最大重连次数、重连间隔、心跳间隔、连接超时、TaskCache 最大条目数和 TTL。

#### Scenario: 默认 WS 配置
- **WHEN** 应用未显式配置 WS 参数
- **THEN** 后端使用 SDK 默认值或项目默认值构建 `WsConfiguration`

#### Scenario: 自定义 WS 配置
- **WHEN** 应用配置了重连次数、重连间隔或 TaskCache 参数
- **THEN** 后端构建 `UTwinClient` 时使用配置值创建 `WsConfiguration`

### Requirement: 实时连接管理
后端 SHALL 提供按 robotId 管理的实时连接服务，每个 robotId 在同一后端实例中最多维护一个 SDK `RobotRealtimeClient` 连接。

#### Scenario: 建立实时连接
- **WHEN** 前端请求连接指定 robotId 的实时通道
- **THEN** 后端获取或创建该 robotId 的 `RobotRealtimeClient`，调用 `connect()` 建立 SDK WS 连接，并返回连接状态

#### Scenario: 重复连接同一 robotId
- **WHEN** 前端重复请求连接同一 robotId
- **THEN** 后端复用已有 `RobotRealtimeClient`，不创建新的 SDK OpenControl 连接

#### Scenario: 关闭实时连接
- **WHEN** 前端请求关闭指定 robotId 的实时通道
- **THEN** 后端关闭 SDK WS 连接，清理本地订阅、WS 会话和快照状态

### Requirement: WebSocket 实时通道
后端 SHALL 提供 `WS /robot/realtime/{robotId}` WebSocket 端点，在同一条连接上双向传输控制消息和事件推送。

#### Scenario: 浏览器建立 WS 连接
- **WHEN** 前端打开 WebSocket 连接到 `/robot/realtime/{robotId}`
- **THEN** 后端接受连接并将该 WS 会话加入该 robotId 的会话集合

#### Scenario: 接收 connect 控制消息
- **WHEN** 前端发送 `{ "action": "connect" }` text frame
- **THEN** 后端获取或创建该 robotId 的 SDK 连接，连接成功后向所有 WS 会话广播 `connected` 事件

#### Scenario: 接收 subscribe 控制消息
- **WHEN** 前端发送 `{ "action": "subscribe", "topics": [...] }` text frame
- **THEN** 后端注册 SDK Topic 回调并向平台发送 subscribe 请求

#### Scenario: 接收 unsubscribe 控制消息
- **WHEN** 前端发送 `{ "action": "unsubscribe", "topic": "..." }` text frame
- **THEN** 后端调用 SDK `unsubscribe()` 并从本地订阅集合移除该 Topic

#### Scenario: 接收 close 控制消息
- **WHEN** 前端发送 `{ "action": "close" }` text frame
- **THEN** 后端关闭 SDK WS 连接，向所有 WS 会话广播 `disconnected` 事件，清理订阅和快照

#### Scenario: 推送连接事件
- **WHEN** SDK 连接首次建立或重连成功
- **THEN** 后端向所有 WS 会话广播 `connected` 事件

#### Scenario: 推送断开事件
- **WHEN** SDK 连接断开且不是主动关闭
- **THEN** 后端向所有 WS 会话广播 `disconnected` 事件，并包含断开原因

#### Scenario: 推送被挤占事件
- **WHEN** SDK 收到 `CLOSE_CONNECT` 并触发 `onKicked()`
- **THEN** 后端向所有 WS 会话广播 `kicked` 事件，且不主动重连

### Requirement: Topic 订阅代理
后端 SHALL 通过 WS 控制消息处理 Topic 订阅和取消订阅，内部调用 SDK `onTopic(topic, callback)` 和 `unsubscribe(topic)`。

#### Scenario: 订阅 Topic
- **WHEN** 前端通过 WS 发送 subscribe 消息订阅 `/cmd_vel_robot`
- **THEN** 后端注册 SDK Topic 回调并向平台发送 subscribe 请求

#### Scenario: 取消订阅 Topic
- **WHEN** 前端通过 WS 发送 unsubscribe 消息取消 `/cmd_vel_robot`
- **THEN** 后端调用 SDK `unsubscribe()` 并从本地订阅集合移除该 Topic

#### Scenario: 取消未订阅 Topic
- **WHEN** 前端通过 WS 发送 unsubscribe 消息取消一个未订阅的 Topic
- **THEN** 后端静默处理，不报错

### Requirement: robot_upload_info 默认订阅
实时连接建立后，后端 SHALL 默认订阅 `robot_upload_info`，并维护最近一次机器人信息快照。

#### Scenario: 收到 robot_upload_info
- **WHEN** SDK 推送 `robot_upload_info`
- **THEN** 后端更新该 robotId 的最新快照，并向所有 WS 会话推送 `robot_info` 事件

#### Scenario: 获取快照为空
- **WHEN** 尚未收到 `robot_upload_info`
- **THEN** 后端快照查询结果为空或返回未就绪状态

### Requirement: 连接状态映射
后端 SHALL 定义 `RealtimeConnectionStatus` 枚举，将 SDK 内部状态和事件映射为前端可消费的确定性状态。

| SDK 状态/事件 | BFF 状态 | 说明 |
|-------------|---------|------|
| 初始（未调用 connect） | `DISCONNECTED` | 默认状态 |
| `connect()` 调用中 | `CONNECTING` | 正在建立 SDK WS 连接 |
| `onConnected` 触发 | `CONNECTED` | 已连接（含首次和重连） |
| 网络异常 + SDK 重连中 | `RECONNECTING` | SDK 正在自动重连 |
| `onDisconnected(EXHAUSTED)` | `DISCONNECTED` | 重连次数耗尽 |
| `onKicked` 触发 | `KICKED` | 被其他客户端挤占 |
| `connect()` 抛异常 | `ERROR` | 连接失败 |
| 主动 `close()` | `DISCONNECTED` | 回到初始状态 |

#### Scenario: 连接状态通过 WS 推送
- **WHEN** 连接状态发生变化
- **THEN** 后端向所有 WS 会话广播对应的事件（`connected`、`disconnected`、`kicked`、`error`），事件中包含状态和原因

#### Scenario: 快照端点返回当前状态
- **WHEN** 前端查询 `GET /robot/realtime/{robotId}/snapshot`
- **THEN** 响应中包含当前 `RealtimeConnectionStatus`

### Requirement: WS 会话生命周期管理
后端 SDK 连接生命周期 SHALL 与浏览器 WS 会话独立。单个 WS 会话断开不立即关闭 SDK 连接。

#### Scenario: 浏览器页面刷新
- **WHEN** 前端 WS 连接因页面刷新断开
- **THEN** 后端 SDK 连接保持不变，5 秒内若有新 WS 连入则取消延迟关闭

#### Scenario: 多个 WS 会话共享
- **WHEN** 多个浏览器页面对同一 robotId 建立 WS 连接
- **THEN** 所有 WS 会话收到相同的实时事件（广播）

#### Scenario: 最后一个 WS 会话断开
- **WHEN** 该 robotId 的最后一个 WS 会话断开且未发送 `close` 消息
- **THEN** 后端延迟 5 秒后关闭 SDK 连接并清理会话状态（容忍页面刷新）

#### Scenario: SDK 连接关闭清理 WS
- **WHEN** 收到 `close` 控制消息关闭 SDK 连接
- **THEN** 向所有 WS 会话广播 `disconnected` 事件，清理订阅和快照

### Requirement: sendCommand 与 TaskCache 集成
后端 `sendCommand()` 返回 taskId 后，若该 robotId 的实时连接已建立，SHALL 手动将 taskId 注册到 SDK `TaskCache`，使后续 WS `TASK_REPLY` 推送能自动更新缓存。

#### Scenario: 实时连接已建立时下发指令
- **WHEN** 后端收到指令下发请求且该 robotId 实时连接已建立
- **THEN** sendCommand 返回 taskId 后调用 `taskCache().register(taskId)`

#### Scenario: 实时连接未建立时下发指令
- **WHEN** 后端收到指令下发请求但该 robotId 实时连接未建立
- **THEN** sendCommand 正常返回 taskId，不做 TaskCache 注册（行为与当前一致）

### Requirement: Binary Topic 分级推送
后端 SHALL 根据订阅时的 `binary` 标记对 Topic 数据做分级处理：渲染级（`binary: true`）透传完整 binary frame，摘要级（默认）推送 JSON 摘要。

#### Scenario: 摘要级 — 收到 binary Topic
- **WHEN** 前端订阅时未指定 `binary: true`，SDK 推送包含 binaryData 的 Topic
- **THEN** 后端向所有 WS 会话推送 JSON text frame，包含 binarySize 和可用 jsonData 摘要

#### Scenario: 摘要级 — 收到纯 JSON Topic
- **WHEN** SDK 推送纯 JSON Topic
- **THEN** 后端向所有 WS 会话推送 JSON text frame，包含完整 jsonData 且 binarySize 为 0 或空

#### Scenario: 渲染级 — 透传 binary frame
- **WHEN** 前端订阅时指定 `binary: true`，SDK 推送包含 binaryData 的 Topic
- **THEN** 后端向所有 WS 会话发送 binary frame，格式为 `[2 bytes topic 名称长度][topic 名称 UTF-8][原始 binaryData]`

#### Scenario: 渲染级 — 节流控制
- **WHEN** 前端订阅时指定 `throttleRate`（毫秒）
- **THEN** 后端按该间隔丢弃中间帧，只转发最近一帧（每 topic 独立计时）

#### Scenario: 更新节流频率
- **WHEN** 前端对已订阅 Topic 重新发送 subscribe 消息（含新的 `throttleRate`）
- **THEN** 后端更新该 Topic 的节流间隔，立即生效

### Requirement: Subscribe 消息扩展参数
后端 SHALL 在 subscribe 控制消息中支持以下可选参数：
- `binary`（boolean，默认 false）：是否透传完整 binary data
- `throttleRate`（number，毫秒，默认 0 不节流）：BFF 层推送节流间隔

#### Scenario: 订阅点云渲染级
- **WHEN** 前端发送 `{ "action": "subscribe", "topics": ["/x_nav/current_pointcloud"], "binary": true, "throttleRate": 333 }`
- **THEN** 后端以渲染级模式订阅，按 333ms 间隔（约 3fps）透传 binary frame

#### Scenario: 订阅相机渲染级
- **WHEN** 前端发送 `{ "action": "subscribe", "topics": ["/camera/color/image_raw/compressed/webp"], "binary": true, "throttleRate": 200 }`
- **THEN** 后端以渲染级模式订阅，按 200ms 间隔（约 5fps）透传 binary frame

#### Scenario: 订阅速度摘要级
- **WHEN** 前端发送 `{ "action": "subscribe", "topics": ["/cmd_vel_robot"] }`
- **THEN** 后端以摘要级模式订阅，不做节流，推送 JSON text frame
