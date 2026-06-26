## ADDED Requirements

### Requirement: 实时连接状态展示
前端空间工作台 SHALL 展示当前机器人实时通道状态，包括未连接、连接中、已连接、重连中、已断开、被挤占和错误状态。

#### Scenario: 实时连接成功
- **WHEN** 前端通过 WS 收到 `connected` 事件
- **THEN** 工作台显示实时通道已连接

#### Scenario: 实时连接被挤占
- **WHEN** 前端通过 WS 收到 `kicked` 事件
- **THEN** 工作台显示被其他客户端挤占，并停止展示为实时在线状态

#### Scenario: WS 连接失败
- **WHEN** 浏览器 WebSocket 连接建立失败或断开后重连耗尽
- **THEN** 工作台显示实时通道不可用，并继续使用现有 HTTP 轮询和 Mock 降级链路

### Requirement: Topic 订阅控制
前端 SHALL 提供常用 Topic 的订阅控制，至少包含 `robot_upload_info`、`/cmd_vel_robot`、`/x_nav/current_pointcloud`、`/filtered_tf`、`/camera/color/image_raw/compressed/webp` 和 `/g1_arm/low_state`。

#### Scenario: 订阅常用 Topic
- **WHEN** 用户开启 `/cmd_vel_robot` 订阅
- **THEN** 前端通过 WS 发送 subscribe 消息，并在 UI 中显示该 Topic 已订阅

#### Scenario: 取消订阅常用 Topic
- **WHEN** 用户关闭 `/cmd_vel_robot` 订阅
- **THEN** 前端通过 WS 发送 unsubscribe 消息，并在 UI 中显示该 Topic 未订阅

### Requirement: 实时推送摘要展示
前端 SHALL 展示最近收到的实时推送摘要，包括事件类型、Topic、更新时间、JSON 摘要和 binarySize。

#### Scenario: 展示 JSON Topic 摘要
- **WHEN** 前端收到包含 jsonData 的 `topic` 事件
- **THEN** 推送摘要区域展示 Topic 名称、更新时间和 JSON 摘要

#### Scenario: 展示 Binary Topic 摘要
- **WHEN** 前端收到包含 binarySize 的 `topic` 事件
- **THEN** 推送摘要区域展示 Topic 名称、更新时间和二进制数据大小

### Requirement: robot_upload_info 更新状态卡
前端 SHALL 使用 `robot_info` 实时事件更新机器人状态卡中可映射的运行时字段。未收到实时快照时 SHALL 保持当前 HTTP runtime 数据。

#### Scenario: 收到机器人信息快照
- **WHEN** 前端收到 `robot_info` 事件且 jsonData 包含电量或位姿信息
- **THEN** 状态卡使用实时快照更新对应展示字段

#### Scenario: 未收到机器人信息快照
- **WHEN** 实时通道已连接但尚无 `robot_info` 推送
- **THEN** 状态卡继续展示最近一次 HTTP runtime 数据

### Requirement: 实时点云渲染
前端 SHALL 支持订阅 `/x_nav/current_pointcloud` 后在 3D 场景中实时渲染点云数据。

#### Scenario: 订阅点云并渲染
- **WHEN** 用户开启 `/x_nav/current_pointcloud` 订阅（binary 模式）
- **THEN** 前端接收 WS binary frame，解析 CBOR 编码的 ROS PointCloud2，更新 `realtimePointCloud` 图层中的 `THREE.Points` 对象

#### Scenario: 点云坐标变换
- **WHEN** 前端解析出点云 x/y/z 坐标
- **THEN** 应用 ROS Z-up → Three.js Y-up 变换后渲染

#### Scenario: 点云图层控制
- **WHEN** 用户在图层控制中关闭 `realtimePointCloud`
- **THEN** 前端取消订阅该 Topic 并隐藏点云图层

#### Scenario: 点云最大点数限制
- **WHEN** 收到超过 20,000 点的 PointCloud2 帧
- **THEN** 前端截断到 20,000 点渲染，不崩溃

### Requirement: 实时相机画面渲染
前端 SHALL 支持订阅 `/camera/color/image_raw/compressed/webp` 后在画中画面板中实时显示相机画面。

#### Scenario: 订阅相机并显示
- **WHEN** 用户开启相机 Topic 订阅（binary 模式）
- **THEN** 前端接收 WS binary frame，构建 webp Blob URL，在画中画面板的 `<img>` 中实时刷新

#### Scenario: 相机画面内存管理
- **WHEN** 前端收到新一帧相机数据
- **THEN** 释放前一帧 Blob URL（`URL.revokeObjectURL()`），再创建新 URL

#### Scenario: 画中画面板交互
- **WHEN** 相机画面正在显示
- **THEN** 面板支持拖拽位置、缩放大小和关闭操作，不遮挡 3D 场景核心控件

#### Scenario: 取消订阅关闭面板
- **WHEN** 用户关闭相机 Topic 订阅
- **THEN** 前端取消订阅并隐藏画中画面板

### Requirement: 实时帧率控制
前端 SHALL 提供点云和相机的帧率调节控制，修改后即时生效。

#### Scenario: 调整点云帧率
- **WHEN** 用户将点云帧率从 3 fps 调整为 5 fps
- **THEN** 前端通过 WS 重新发送 subscribe 消息（`throttleRate: 200`），后续推送频率变为约 5 fps

#### Scenario: 调整相机帧率
- **WHEN** 用户将相机帧率从 5 fps 调整为 10 fps
- **THEN** 前端通过 WS 重新发送 subscribe 消息（`throttleRate: 100`），后续推送频率变为约 10 fps

#### Scenario: 帧率范围约束
- **WHEN** 用户调整帧率
- **THEN** 点云帧率范围为 1-10 fps，相机帧率范围为 1-15 fps

### Requirement: 实时通道降级
前端 SHALL 在 WS 连接不可用、断开或重连耗尽时保留现有工作台功能。

#### Scenario: WS 连接不可用
- **WHEN** 前端无法建立 WebSocket 连接
- **THEN** 机器人列表、地图渲染、指令下发、runtime 轮询和任务 HTTP 查询仍可继续工作

#### Scenario: WS 断开后恢复轮询
- **WHEN** WS 连接断开且自动重连耗尽
- **THEN** 前端恢复或保持 HTTP runtime 轮询，并继续使用 HTTP QueryTask 补偿任务状态

### Requirement: WS 自动重连
前端 SHALL 在 WebSocket 意外断开时自动尝试重连（指数退避），避免因瞬时网络抖动导致实时通道永久丢失。

#### Scenario: WS 意外断开
- **WHEN** WebSocket 连接因网络异常断开
- **THEN** 前端按指数退避策略自动重连，重连成功后重新发送 `connect` 消息恢复 SDK 连接

#### Scenario: 重连次数耗尽
- **WHEN** WS 重连次数达到上限仍未成功
- **THEN** 前端停止重连，显示实时通道不可用，回退到 HTTP 轮询模式
