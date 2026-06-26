## 1. 后端 SDK 与配置

- [x] 1.1 升级 backend 依赖：`utwin-opensdk-core`、`utwin-opensdk-services` 到 `1.1.0-SNAPSHOT`
- [x] 1.2 新增 backend 依赖：`utwin-opensdk-ws`
- [x] 1.3 扩展 `application.yml`，新增 WS 配置项（enabled、maxReconnectAttempts、reconnectInterval、heartbeatInterval、connectTimeout、taskCacheMaxSize、taskCacheTtl）
- [x] 1.4 修改 `URobotConfiguration`，构建 `UTwinClient` 时注入 `WsConfiguration`
- [x] 1.5 验证未配置自定义 WS 参数时使用默认配置，后端仍可启动

## 2. 后端实时模型与事件结构

- [x] 2.1 新增 `RealtimeEvent` 响应模型，包含 type、robotId、topic、taskId、status、jsonData、binarySize、reason、timestamp
- [x] 2.2 新增 `RealtimeConnectionStatus` 或等价状态模型，用于表示未连接、连接中、已连接、重连中、已断开、被挤占、错误
- [x] 2.3 新增 Topic 订阅请求 DTO，支持传入单个 topic 或 topic 列表
- [x] 2.4 增加 JSON 解析辅助逻辑，从 `TASK_REPLY` jsonData 中提取 taskId 和 taskStatus

## 3. 后端实时连接服务

- [x] 3.1 新增 `RobotRealtimeService`，按 robotId 管理单例 `RobotRealtimeClient` 会话
- [x] 3.2 实现 `connect(robotId)`：boundedElastic 中获取 realtime client、注册事件回调、建立连接
- [x] 3.3 连接成功后默认订阅 `Topics.ROBOT_UPLOAD_INFO`
- [x] 3.4 实现 `subscribe(robotId, topics)`：注册 Topic 回调并维护本地订阅集合
- [x] 3.5 实现 `unsubscribe(robotId, topic)`：取消 SDK 订阅并更新本地订阅集合
- [x] 3.6 实现 `close(robotId)`：关闭 SDK 连接、向所有 WS 会话广播 `disconnected`、清理订阅和快照
- [x] 3.7 实现 `onConnected`、`onDisconnected`、`onKicked` 事件转换，`onKicked` 不触发主动重连
- [x] 3.8 实现 Topic 回调分发：JSON Topic 透传 jsonData，binary Topic 只推送 binarySize 和摘要
- [x] 3.9 实现 `onTaskResult` 回调分发，并更新任务事件字段
- [x] 3.10 `RobotService.sendCommand()` 返回 taskId 后，检查该 robotId 的实时连接是否已建立，若已连接则手动调用 `taskCache().register(taskId)` 注册待跟踪任务
- [x] 3.11 SDK 连接关闭时向所有 WS 会话广播 `disconnected` 事件，清理会话集合和订阅
- [x] 3.12 WS 会话断开时从会话集合移除；若该 robotId 无剩余 WS 会话，延迟 5 秒后关闭 SDK 连接（页面刷新容忍）

## 4. 后端实时 API

- [x] 4.1 新增 `RobotRealtimeWebSocketHandler` 实现 `WebSocketHandler`，处理 `WS /robot/realtime/{robotId}` 端点
- [x] 4.2 实现 WS 入站消息解析：根据 `action` 字段分发到 connect、subscribe、unsubscribe、close 处理逻辑
- [x] 4.3 实现 WS 出站事件广播：将 `RealtimeEvent` 序列化为 JSON text frame 发送给该 robotId 的所有 WS 会话
- [x] 4.4 在 WebFlux `RouterFunction` 或 `HandlerMapping` 中注册 WebSocket 端点路由
- [x] 4.5 新增 `GET /robot/realtime/{robotId}/snapshot` HTTP 端点，获取 `robot_upload_info` 最新快照和连接状态
- [x] 4.6 确保所有阻塞 SDK 调用使用 `Schedulers.boundedElastic()`

## 5. 前端类型与 API 客户端

- [x] 5.1 在 `shared/types/api.ts` 新增实时事件（`RealtimeEvent`）、连接状态（`RealtimeConnectionStatus`）、控制消息（`RealtimeAction`）和 Topic 订阅类型
- [x] 5.2 新增 `services/api/realtimeApi.ts`，封装 WebSocket 连接管理、控制消息发送（connect、subscribe、unsubscribe、close）和事件监听
- [x] 5.3 实现 WS 自动重连逻辑（指数退避、最大重试次数），处理 onopen、onmessage、onclose、onerror
- [x] 5.4 新增 `GET /robot/realtime/{robotId}/snapshot` HTTP 调用，用于一次性查询快照
- [x] 5.5 为 realtime API 增加 Mock fallback 数据，保持后端不可用时工作台可演示

## 6. 前端工作台状态集成

- [x] 6.1 扩展 `useRobotWorkbench`，新增 realtimeStatus、subscribedTopics、realtimeEvents、latestRobotInfo 状态
- [x] 6.2 选中机器人变化时建立 WS 连接并发送 `connect` 消息，切换机器人或卸载时关闭 WS
- [x] 6.3 收到 `connected`、`disconnected`、`kicked`、`error` 事件时更新实时连接状态
- [x] 6.4 收到 `robot_info` 事件时解析可映射字段，并更新状态卡使用的运行时快照
- [x] 6.5 实时连接不可用时保持或恢复现有 `getRobotRuntime()` 轮询
- [x] 6.6 订阅和取消订阅 Topic 时同步更新本地订阅状态

## 7. 前端实时点云渲染

- [x] 7.1 新增 `PointCloud2Parser` 工具类：解析 CBOR 编码的 ROS PointCloud2 binary，提取 fields/point_step/data，按 DataView 读取 x/y/z/rgb
- [x] 7.2 在 `SoonSpaceSceneAdapter` 中新增 `realtimePointCloud` 图层组，创建 `THREE.Points` 对象（`DynamicDrawUsage` BufferAttribute，max_pts: 20000）
- [x] 7.3 实现 `updateRealtimePointCloud(binary)` 方法：解析 PointCloud2 → 填充 position/color BufferAttribute → `setDrawRange` → `needsUpdate` → `ssp.render()`
- [x] 7.4 坐标变换：对解析出的点应用 `robotToThreeMatrix`（ROS Z-up → Three.js Y-up）
- [x] 7.5 WS binary frame 接收后按 topic 头路由：`/x_nav/current_pointcloud` → `updateRealtimePointCloud()`
- [x] 7.6 在 `LayerDropdown` 中新增 `realtimePointCloud` 图层开关，控制订阅/取消订阅和可见性
- [x] 7.7 在 `RenderDropdown` 中复用 pointSize 配置，同步应用到实时点云 PointsMaterial

## 8. 前端实时相机画面渲染

- [x] 8.1 新增 `CameraStreamPanel` 画中画组件：可拖拽、可缩放、可关闭，展示 `<img>` 元素
- [x] 8.2 WS binary frame 接收后按 topic 头路由：`/camera/.../webp` → `Blob` → `URL.createObjectURL()` → 更新 img.src
- [x] 8.3 每帧渲染前 `URL.revokeObjectURL()` 释放前一帧 Blob URL，防止内存泄漏
- [x] 8.4 将 `CameraStreamPanel` 集成到 `SpatialWorkbenchPage`，默认隐藏，通过 Topic 开关或工具栏按钮激活

## 9. 前端实时参数控制

- [x] 9.1 新增帧率控制 UI（滑块或下拉选择器）：点云 1-10 fps（默认 3）、相机 1-15 fps（默认 5）
- [x] 9.2 帧率变更时通过 WS 发送新的 subscribe 消息（含更新的 `throttleRate`），BFF 层重新订阅 SDK Topic 以更新服务端推送频率
- [x] 9.3 将帧率控制集成到 Topic 控制组件中，与 Topic 开关并列

## 10. 前端实时 UI（连接与摘要）

- [x] 10.1 在 `RobotStatusCard` 中展示实时连接状态和被挤占提示
- [x] 10.2 新增实时 Topic 控制组件，支持常用 Topic 开关（含点云、相机、速度、TF、关节等）
- [x] 10.3 新增实时推送摘要区域，展示摘要级 Topic 的事件类型、更新时间、JSON 摘要和 binarySize
- [x] 10.4 将实时 Topic 控制和推送摘要集成到 `SpatialWorkbenchPage`
- [x] 10.5 保持移动端和窄屏布局中文字不溢出、不遮挡 3D 场景控件

## 11. 实时任务闭环

- [x] 11.1 扩展 `WorkbenchTask`，增加实时来源、更新时间、结果摘要和补偿查询状态
- [x] 11.2 `sendCommand()` 后若实时通道已连接，则任务进入 PENDING 并等待 `TASK_REPLY`
- [x] 11.3 收到 `task_reply` 实时事件时更新对应 taskId 的状态和结果
- [x] 11.4 对未收到终态的任务启动 HTTP `getTaskResult()` 低频补偿查询
- [x] 11.5 实时事件与 HTTP 查询结果不一致时，以 HTTP 查询结果更新任务时间线
- [x] 11.6 任务进入终态后停止该 taskId 的补偿查询

## 12. 后端 Binary 透传与节流

- [x] 12.1 实现 WS binary frame 发送逻辑：topic 头（2 bytes 长度 + UTF-8 名称）+ 原始 binaryData
- [x] 12.2 subscribe 消息支持 `binary: true` 和 `throttleRate` 参数，控制渲染级/摘要级和推送频率
- [x] 12.3 实现 BFF 层 throttle：按 `throttleRate` 间隔丢弃中间帧，只转发最近一帧（每 topic 独立计时）
- [x] 12.4 收到前端更新 `throttleRate` 的重新订阅消息时，更新该 topic 的节流间隔

## 13. 测试与验证

- [x] 13.1 后端编译验证：`mvn compile`
- [x] 13.2 前端类型检查：`npm run lint`
- [x] 13.3 前端单元测试：`npm test`
- [x] 13.4 前端构建验证：`npm run build`
- [ ] 13.5 手动验证实时通道不可用时，工作台仍可通过 HTTP 轮询和 Mock 降级运行
- [ ] 13.6 手动验证连接、订阅、取消订阅、被挤占提示、任务 WS 更新和 HTTP 补偿查询链路
- [ ] 13.7 手动验证点云实时渲染：订阅后 3D 场景中出现动态点云，帧率可调
- [ ] 13.8 手动验证相机实时画面：订阅后画中画面板显示实时 webp 图像，帧率可调
