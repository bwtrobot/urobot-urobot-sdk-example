## Context

当前 uRobot SDK Web Example 已具备 Spring Boot WebFlux BFF、React 空间工作台、SoonSpace 3D 渲染、机器人指令下发和任务 HTTP 轮询闭环。后端依赖 `utwin-opensdk-core/services 1.0.0-SNAPSHOT`，`UTwinClient` 未启用 WS 能力；前端通过 `getRobotRuntime()` 3 秒轮询运行时状态，通过 `getTaskResult()` 2 秒轮询任务结果。

`openspec/docs/guide/3.2.0` 和上游 `sdk-ws-realtime` 变更已经定义 SDK 1.1.0 的实时通道能力：`utwin-opensdk-ws`、`WsConfiguration`、`RobotRealtimeClient`、Topic 订阅、`robot_upload_info` 快照、`TASK_REPLY` 推送和 TaskCache。示例项目应以 BFF 方式演示这些能力，而不是让浏览器直接处理 OpenControl WebSocket、WsToken 和 protobuf。

## Goals / Non-Goals

**Goals:**

- 后端升级到 SDK 1.1.0 并引入 `utwin-opensdk-ws`
- 后端维护每个 robotId 的 `RobotRealtimeClient`，封装连接、订阅、取消订阅、关闭和事件分发
- 浏览器通过 BFF WebSocket 接收连接状态、Topic 数据摘要、`robot_upload_info` 快照和任务结果
- 前端工作台展示实时连接状态、订阅状态、最近推送和任务实时更新
- 指令任务状态优先使用 WS `TASK_REPLY`，HTTP `getTaskResult()` 继续作为补偿，保证任务闭环
- 实时通道不可用时保留当前 HTTP 轮询和 Mock 降级体验

**Non-Goals:**

- 不在浏览器端实现 OpenControl protobuf 编解码
- 不绕过 Java SDK 直接连接平台 `/api/open/v1/ws/open-nav/{id}`
- 不实现点云/相机以外的 binary Topic 完整渲染（如 TF、关节数据），这些仍以摘要展示
- 不改变现有 HTTP `robot/runtime`、`robot/command`、`robot/task-result` 的接口契约
- 不支持同一后端实例内同一 robotId 建立多个 SDK OpenControl 连接

## Decisions

### 1. 后端使用 SDK `RobotRealtimeClient`，浏览器不直连平台 WS

**决策**：Spring Boot BFF 通过 `uTwinClient.robot().realtime(robotId)` 建立 SDK WS 连接，前端只连接 BFF 暴露的 WebSocket 端点。

**理由**：SDK 已封装 WsToken 获取、protobuf binary frame、心跳、重连、被挤占不重连、TaskCache 和重订阅。浏览器直连会重复实现协议细节，并暴露更多平台连接复杂度。

**替代方案**：浏览器直接连接平台 OpenControl WS。排除原因是浏览器需要处理一次性 WsToken 和 protobuf，且会绕开本示例既有 BFF 代理 SDK 的架构定位。

### 2. 浏览器实时通道采用 WebSocket，控制与推送统一

**决策**：后端提供 `WS /robot/realtime/{robotId}` WebSocket 端点，控制命令（connect、subscribe、unsubscribe、close）和事件推送在同一条连接上双向传输。仅保留 `GET /robot/realtime/{robotId}/snapshot` 作为独立 HTTP 端点供一次性快照查询。

**理由**：
- 单连接承载控制 + 推送，API 表面从 6 个 HTTP 端点收缩为 1 个 WS + 1 个 HTTP
- WebSocket 原生支持 binary frame，为后续点云/相机数据透传预留通道，不受 SSE 文本协议限制
- 连接生命周期语义更直接——WS 断开即断开，无需额外管理 SSE sink 与 HTTP 控制请求之间的状态同步
- Spring WebFlux `WebSocketHandler` 可与 reactor 管道集成

**替代方案**：SSE 推送 + HTTP 控制端点。排除原因是需要维护两条通道的状态同步，且 SSE 为纯文本协议不支持 binary，限制了后续 Topic 数据透传能力。

### 3. `RobotRealtimeService` 统一管理连接实例和事件分发

**决策**：新增应用服务管理 `Map<String, RealtimeSession>`，每个 robotId 复用一个 SDK `RobotRealtimeClient`，并维护前端订阅集合、事件 sink、最近 `robot_upload_info` 快照和连接状态。

**理由**：平台约束每个 Robot 只允许一个 OpenControl 连接；服务端集中管理可避免同一 robotId 多次连接互相挤占，也能让多个浏览器页面共享后端同一 SDK 连接。

**实现约束**：
- 连接建立使用 boundedElastic，避免阻塞 Netty 事件循环
- SDK 回调线程不得直接执行重 CPU 操作，仅做轻量解析和事件投递
- `close(robotId)` 需要关闭 SDK 连接、清理订阅和前端事件 sink

### 4. WebSocket 消息协议

**决策**：WS 通道使用 JSON text frame 传输控制消息和事件。后续需要 binary Topic 透传时使用 binary frame。

**客户端 → 服务端（控制消息）**：

```json
{ "action": "connect" }
{ "action": "subscribe", "topics": ["/cmd_vel_robot", "/filtered_tf"] }
{ "action": "unsubscribe", "topic": "/cmd_vel_robot" }
{ "action": "close" }
```

**服务端 → 客户端（事件推送）**：

```json
{
  "type": "connected | disconnected | kicked | topic | robot_info | task_reply | error",
  "robotId": "string",
  "topic": "string?",
  "taskId": "string?",
  "status": "string?",
  "jsonData": "string?",
  "binarySize": "number?",
  "reason": "string?",
  "timestamp": "string"
}
```

**理由**：统一 Envelope 让前端用同一个解析逻辑处理所有事件类型。控制消息使用 `action` 字段区分，事件推送使用 `type` 字段区分，方向明确不会混淆。binary frame 保留为后续点云/相机透传通道，初版以 JSON text frame 为主。

### 5. `robot_upload_info` 驱动状态快照，HTTP runtime 保留补偿

**决策**：连接成功后默认订阅 `Topics.ROBOT_UPLOAD_INFO`；收到推送后更新前端 `runtime` 兼容快照和状态卡。若实时连接未启用或断开，则继续使用当前 `getRobotRuntime()` 轮询。

**理由**：`robot_upload_info` 是 SDK 设计中唯一需要快照缓存的 Topic，适合做工作台状态实时化的第一步。

**字段映射策略**：`robot_upload_info`（ROS Topic 上报）与 `getRobotRuntime()` HTTP API 返回的字段结构不完全一致。后端收到 `robot_upload_info` 推送后，对已知字段做最佳努力映射，未覆盖字段保留 HTTP runtime 最近值。前端维护合并视图：实时字段覆盖 HTTP 字段。

| robot_upload_info 字段 | RobotRuntime 映射字段 | 说明 |
|----------------------|---------------------|------|
| `soc` | `soc` | 电量百分比，直接映射 |
| `pose` / `odom` | `ros_odom.pose` | 位姿数据，可能需要坐标结构适配 |
| `terminal_status` | `terminal_status` / `terminal_status_value` | 在线/离线状态 |
| `charge` | `charge` | 充电状态 |
| `velocity` / `speed` | — | HTTP runtime 中无对应字段，仅实时展示 |

实际可映射字段取决于 robot_upload_info 的运行时 JSON 结构，首次对接时需根据实际推送数据校准映射表。无法映射的字段仍依赖 HTTP `getRobotRuntime()` 补偿。

### 6. 任务状态 WS 优先，HTTP QueryTask 兜底

**决策**：`sendCommand()` 返回 taskId 后，若实时通道已连接，则任务时间线先进入 `PENDING`，后续由 `TASK_REPLY` 推送更新；同时保留低频 HTTP 补偿查询，断线、超时或未收到终态时使用 `getTaskResult()` 查询权威结果。

**理由**：项目规则要求机器人操作必须完整监控任务最终状态。WS 可降低延迟和轮询压力，但网络断线期间可能丢事件，HTTP 仍是最终一致性补偿通道。

### 7. sendCommand 保持现有路径，手动注册 TaskCache

**决策**：后端 `RobotService.sendCommand()` 继续使用 `httpClient().post()` 构建灵活请求体。sendCommand 返回 taskId 后，检查该 robotId 的 `RobotRealtimeClient` 是否已连接，若已连接则手动调用 `taskCache().register(taskId)` 注册待跟踪任务。

**替代方案**：迁移到 SDK `robot().sendCommand(SendCommandRequest)` 以利用自动注册。排除原因是当前前端下发的指令结构灵活（type、messagesType、嵌套 params），`SendCommandRequest` 的 Builder 字段较固定，迁移需要额外适配且可能限制前端指令扩展性。

**理由**：手动 register 仅一行调用，既保留现有 sendCommand 灵活性，又接入 TaskCache WS 推送更新链路。

### 8. WS 会话与 SDK 连接的生命周期关系

**决策**：SDK 连接生命周期与浏览器 WS 会话独立。SDK 连接通过 WS `connect` 消息显式建立，通过 `close` 消息或最后一个 WS 会话断开后显式关闭。单个 WS 会话断开不关闭 SDK 连接（容忍页面刷新）。

**生命周期规则**：
- 浏览器打开 WS → 加入该 robotId 的会话集合，接收事件广播
- 浏览器发送 `connect` → 若 SDK 连接不存在则创建并连接，若已存在则复用并回复当前状态
- 浏览器发送 `close` → 关闭 SDK 连接，向所有 WS 会话广播 `disconnected`
- 浏览器 WS 断开（页面刷新/关闭）→ 从会话集合移除；若该 robotId 无剩余 WS 会话，延迟 5 秒后关闭 SDK 连接（容忍页面刷新重连）

**实现约束**：
- `RobotRealtimeService` 维护 `Map<String, RealtimeSession>`，每个 `RealtimeSession` 包含 SDK `RobotRealtimeClient`、WS 会话集合（`Set<WebSocketSession>`）、订阅列表和快照
- 事件广播遍历会话集合发送 text/binary frame
- 延迟关闭使用 `Schedulers.parallel()` 定时任务，若延迟期间有新 WS 连入则取消关闭

### 9. BFF 连接状态与 SDK 状态映射

**决策**：后端定义 `RealtimeConnectionStatus` 枚举，与 SDK 内部状态和事件做确定性映射，前端只消费 BFF 状态。

| SDK 状态/事件 | BFF RealtimeConnectionStatus | 前端展示 |
|-------------|------------------------------|---------|
| 初始（未调用 connect） | `DISCONNECTED` | 未连接 |
| `connect()` 调用中 | `CONNECTING` | 连接中 |
| `onConnected` 触发 | `CONNECTED` | 已连接 |
| 网络异常断开 + SDK 重连中 | `RECONNECTING` | 重连中 |
| `onDisconnected(EXHAUSTED)` | `DISCONNECTED` | 已断开（重连耗尽） |
| `onKicked` 触发 | `KICKED` | 被挤占 |
| `connect()` 抛异常 | `ERROR` | 连接错误 |
| 主动 `close()` | `DISCONNECTED` | 未连接 |

**理由**：前端不需要理解 SDK 内部状态机，BFF 层负责语义映射。状态枚举同时用于 WS 事件推送和 `GET snapshot` 响应。

### 10. 多浏览器共享同一 robotId 连接

**决策**：允许一个后端实例内同一 robotId 的 SDK 连接被多个浏览器页面（WS 会话）共享。不按用户会话做隔离。

**理由**：平台约束每个 Robot 只允许一个 OpenControl 连接，按用户隔离会导致互相挤占。示例项目以功能演示为主，不涉及多租户访问控制。多个 WS 会话共享同一事件广播，天然支持多窗口场景。

### 11. Binary Topic 分级策略：渲染级透传 + 摘要级

**决策**：Binary Topic 按用途分为两级：

| 级别 | Topic 示例 | BFF 行为 | 前端行为 |
|------|-----------|---------|---------|
| **渲染级** | `/x_nav/current_pointcloud`、`/camera/.../webp` | 完整 binary 透传（WS binary frame） | 解析并实时渲染 |
| **摘要级** | `/filtered_tf`、`/g1_arm/low_state` 等其余 | JSON text frame（binarySize + jsonData） | 展示摘要 |

前端通过 subscribe 消息的 `binary: true` 请求渲染级透传：

```json
{ "action": "subscribe", "topics": ["/x_nav/current_pointcloud"], "binary": true, "throttleRate": 333 }
```

**Binary frame 信封**：后端发送 binary frame 时前置 topic 标识头：

```
[2 bytes: topic 名称长度 (uint16 big-endian)]
[N bytes: topic 名称 (UTF-8)]
[remaining bytes: 原始 binary data]
```

**理由**：点云和相机需要完整 binary 做实时渲染，其余 Topic 暂无渲染需求。分级策略兼顾渲染能力和带宽效率。

### 12. 实时点云渲染（参考 robot-central-web PointCloud2）

**决策**：前端接收 `/x_nav/current_pointcloud` binary 数据，按 ROS `PointCloud2` 标准格式解析，使用 `THREE.Points` + `DynamicDrawUsage BufferAttribute` 实时更新 3D 场景。

**数据格式**（与 robot-central-web 一致）：
- SDK 推送的 `binaryData` 为 CBOR 编码的 PointCloud2 消息
- `fields` 描述点字段布局（x/y/z/rgb 的 offset、datatype）
- `data` 为交错排列的二进制点数据
- `point_step` 每点字节数，`width × height` 点数

**渲染参数**（页面可调）：
- 默认帧率：**3 fps**（`throttleRate: 333`）
- 最大点数：20,000（超出截断）
- 点大小：复用现有 `RenderSettings.pointSize`
- 坐标变换：ROS Z-up → Three.js Y-up（复用 `robotToThreeMatrix`）
- 独立图层 `realtimePointCloud`，与静态地图点云分离

**帧率可调**：前端 UI 提供帧率控制（1-10 fps），修改后通过 WS 发送新的 subscribe（含更新的 `throttleRate`）重新订阅。

### 13. 实时相机画面渲染（参考 robot-central-web img-stream）

**决策**：前端接收 `/camera/color/image_raw/compressed/webp` binary 数据（原始 webp 字节），通过 `Blob` → `URL.createObjectURL()` → `<img>` 实时刷新，以画中画面板展示。

**数据格式**：SDK `TopicData.binaryData` 为原始 webp 字节流（BFF 直接透传 binary frame，不做 Base64 编码）。

**渲染参数**（页面可调）：
- 默认帧率：**5 fps**（`throttleRate: 200`）
- 显示方式：工作台角落可拖拽/可缩放画中画面板
- 内存管理：每帧 `URL.revokeObjectURL()` 释放前一帧

**帧率可调**：与点云相同机制，前端 UI 提供帧率控制（1-15 fps），修改后重新订阅。

## Risks / Trade-offs

- **[高频 binary 带宽消耗]** → 点云默认 3fps、相机默认 5fps，均低于参考项目的频率，页面可调整。BFF 层 throttle 控制源头发送频率，非前端丢帧。
- **[服务端单连接被其他客户端挤占]** → 收到 `onKicked()` 后向所有 WS 会话广播 `kicked` 事件，不自动重连，前端 UI 显示明确状态。
- **[多个浏览器页面共享同一 robotId 连接]** → 后端使用单 SDK 连接，多 WS 会话共享事件广播；`close` 消息关闭 SDK 连接影响所有会话。
- **[浏览器 WS 重连]** → WebSocket 无内置自动重连（不同于 SSE EventSource），前端需实现重连逻辑（指数退避 + 最大重试次数）。
- **[任务推送丢失]** → 保留 HTTP `getTaskResult()` 补偿查询，终态以 HTTP 查询结果为权威。
- **[SDK 1.1.0 SNAPSHOT 可用性]** → 后端编译依赖本地/私服 SNAPSHOT；若依赖不可用，实时能力不可启用但 HTTP 案例不应被破坏。
- **[guide 3.2.0 安装版本号]** → `openspec/docs/guide/3.2.0/index.html` 安装章节仍标注 SDK `1.0.0`，WS 章节已描述 1.1.0 能力。此为上游 SDK 文档问题，不在本变更范围内修正，但后端实际依赖版本以 pom.xml `1.1.0-SNAPSHOT` 为准。

## Migration Plan

1. 升级后端 SDK 依赖并新增 WS 配置项，默认启用保守重连参数。
2. 新增后端实时服务和端点，不改现有 HTTP 端点。
3. 前端新增 realtime API 和状态管理，默认尝试实时连接，失败后保留现有轮询。
4. 任务时间线改为 WS 优先、HTTP 补偿，验证终态闭环。
5. 若需要回滚，移除前端实时连接入口或关闭 WS 配置，现有 HTTP 轮询路径仍可运行。

## Resolved Questions

- ~~是否允许一个后端实例把同一 robotId 的实时连接共享给多个浏览器用户，还是需要按用户会话做隔离？~~ → **Decision 10**：允许共享，不按用户隔离。
- ~~高频 Topic 的完整 binary 数据是否需要在本次案例中下载到浏览器，还是只展示摘要并把渲染留给后续变更？~~ → **Decision 11**：初版只展示摘要，完整 binary 渲染留给后续变更。
