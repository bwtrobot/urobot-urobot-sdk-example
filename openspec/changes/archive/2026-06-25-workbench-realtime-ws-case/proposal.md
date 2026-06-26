## Why

当前空间工作台通过 `getRobotRuntime()` 3 秒轮询刷新机器人状态，并在指令下发后通过 `getTaskResult()` 2 秒轮询追踪任务状态，无法展示 SDK 1.1.0 新增的 WebSocket 实时通道能力。`openspec/docs/guide/3.2.0` 已定义 `RobotRealtimeClient`、Topic 订阅和 TaskCache 行为，本示例需要跟进迭代，形成面向开发者的实时通道案例。

## What Changes

- 后端升级接入 `utwin-opensdk-ws`，基于 SDK 1.1.0 的 `RobotRealtimeClient` 维护机器人 OpenControl WS 连接
- 后端新增实时连接管理与 Topic 订阅能力，封装 `connect`、`subscribe`、`unsubscribe`、`close`、连接事件和被挤占事件
- 后端通过 BFF WebSocket 端点将 SDK WS 推送桥接给浏览器，前端不直接处理 WsToken、protobuf 或 OpenControl 协议
- 前端工作台新增实时连接状态、Topic 订阅控制、推送摘要、实时点云 3D 渲染和相机画中画面板
- 前端提供点云（默认 3fps）和相机（默认 5fps）帧率可调控制
- `robot_upload_info` 推送用于更新机器人状态快照，降低或替代运行时轮询
- `TASK_REPLY` 推送用于更新任务时间线，HTTP `getTaskResult()` 保留为断线和最终一致性补偿
- 保留当前 Mock 降级体验：实时通道不可用时，工作台继续使用既有 HTTP 轮询与 Mock 数据

## Capabilities

### New Capabilities

- `backend-realtime-bridge`: 后端基于 SDK 1.1.0 管理 `RobotRealtimeClient`，提供实时连接、Topic 订阅和浏览器 WebSocket 桥接
- `frontend-realtime-workbench`: 前端空间工作台展示实时连接状态、Topic 订阅状态、实时机器人快照和推送摘要
- `realtime-task-lifecycle`: 指令下发后的任务状态优先通过 WS `TASK_REPLY` 更新，HTTP QueryTask 作为补偿通道保证任务闭环

### Modified Capabilities

（无已有 capability 被修改；本次在现有 HTTP 工作台之上新增实时通道案例能力）

## Impact

- **后端依赖**：`utwin-opensdk-core/services` 升级到 `1.1.0-SNAPSHOT`，新增 `utwin-opensdk-ws`
- **后端配置**：新增 WS 配置项（重连次数、重连间隔、心跳间隔、连接超时、TaskCache 容量和 TTL）
- **后端 API**：新增 `WS /robot/realtime/{robotId}` WebSocket 端点（控制与推送统一）和 `GET /robot/realtime/{robotId}/snapshot` HTTP 端点
- **前端 API**：新增 WebSocket 实时客户端，保持现有 `apiRequest()` Mock 降级模式
- **前端状态**：`useRobotWorkbench` 新增 WS 实时连接、订阅、事件处理和任务更新逻辑
- **兼容性**：现有 HTTP runtime、command、task-result 端点保持不变；实时通道失败时回退既有轮询链路
