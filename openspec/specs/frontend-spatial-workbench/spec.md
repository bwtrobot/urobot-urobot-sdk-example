## Requirements

### Requirement: 空间工作台页面布局
系统 SHALL 提供单页空间工作台（SpatialWorkbenchPage），左侧为 3D 空间视图，右侧为机器人控制面板（状态卡片、导航目标、快捷指令、任务时间线），顶部为机器人选择下拉框。

#### Scenario: 默认布局
- **WHEN** 用户打开应用首页
- **THEN** 系统渲染空间工作台页面，左侧显示 3D 场景，右侧显示控制面板

#### Scenario: 响应式布局
- **WHEN** 视口宽度小于 980px
- **THEN** 布局切换为单列，3D 场景在上，控制面板在下

### Requirement: 机器人列表加载与选择
系统 SHALL 在页面加载时获取机器人列表，并默认选中第一台机器人。

#### Scenario: 加载机器人列表
- **WHEN** 页面挂载
- **THEN** 调用 `GET /api/robot/page` 获取列表，填充下拉框，自动选中第一台

#### Scenario: 切换机器人
- **WHEN** 用户从下拉框选择另一台机器人
- **THEN** 系统更新运行时数据、地图数据、3D 场景中的机器人位姿

### Requirement: 机器人运行时轮询
系统 SHALL 每 3 秒轮询选中机器人的运行时状态，更新状态卡片和 3D 位姿。

#### Scenario: 运行时更新
- **WHEN** 轮询定时器触发
- **THEN** 调用 `GET /api/robot/runtime/{id}`，更新 RobotStatusCard 显示和 3D 机器人位姿

### Requirement: 快捷指令发送
系统 SHALL 提供导航、语音、充电、暂停、继续、急停 6 个快捷指令按钮。

#### Scenario: 发送导航指令
- **WHEN** 用户点击「导航」按钮
- **THEN** 系统调用 `POST /api/robot/command/{id}` 发送 navigation 命令，并在任务时间线中添加记录

#### Scenario: 发送急停指令
- **WHEN** 用户点击「急停」按钮
- **THEN** 系统发送 emergency_stop 命令

### Requirement: 任务状态轮询闭环
系统 SHALL 在发送指令后轮询任务状态直到终态（completed/failed/canceled/timeout），最多 30 次、每次间隔 2 秒。

#### Scenario: 任务完成
- **WHEN** 指令下发后，任务状态查询返回 completed
- **THEN** 任务时间线中该任务状态更新为「完成」，停止轮询

#### Scenario: 轮询超限
- **WHEN** 轮询 30 次后任务仍未达到终态
- **THEN** 停止轮询，任务保持最后已知状态

### Requirement: 运动方向键
系统 SHALL 在 3D 视图左下角提供 MotionPad，支持前进/后退/左移/右移和旋转操作。

#### Scenario: 前进操作
- **WHEN** 用户点击前进按钮
- **THEN** 系统发送 `base_move` 命令，direction=forward, speed=0.3

#### Scenario: 旋转操作
- **WHEN** 用户点击旋转按钮
- **THEN** 系统发送 `cmd_vel` 命令，angular.z=0.4

### Requirement: API Mock 降级
系统 SHALL 在后端不可达时自动降级到 Mock 数据，页面保持可用并显示「演示数据」标记。

#### Scenario: 后端不可达
- **WHEN** 任意 API 调用因网络错误失败
- **THEN** 返回预定义 Mock 数据，UI 显示 demo-badge，ApiDebugDrawer 记录降级原因

#### Scenario: 后端正常
- **WHEN** API 调用成功
- **THEN** 使用真实数据，ApiDebugDrawer 记录为「真实接口」

### Requirement: API 调试面板
系统 SHALL 在 3D 视图右下角提供可折叠的 ApiDebugDrawer，展示请求方法、URL、数据来源（real/mock）和响应内容。

#### Scenario: 展开调试面板
- **WHEN** 用户点击「接口调试」按钮
- **THEN** 面板展开，显示所有历史请求记录（最多 80 条）

### Requirement: 图层控制
系统 SHALL 在 3D 视图右上角提供 LayerDropdown，控制 BIM 模型、全局点云、地面点云、导航路径 4 个图层的可见性。

#### Scenario: 隐藏 BIM 模型
- **WHEN** 用户在图层下拉中点击「BIM 模型」
- **THEN** 3D 场景中 BIM 图层隐藏，图标切换为 EyeOff

### Requirement: 渲染设置
系统 SHALL 在 3D 视图右上角提供 RenderDropdown，控制点大小（小/中/大）、透明度（30%/60%/100%）和 BIM 线框模式。

#### Scenario: 调整点大小
- **WHEN** 用户选择「大」点大小
- **THEN** 点云材质 size 更新为 0.16
