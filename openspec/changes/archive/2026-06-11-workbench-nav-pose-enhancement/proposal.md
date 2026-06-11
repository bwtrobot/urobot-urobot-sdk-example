## Why

空间工作台自测中发现三个交互问题：路径同时渲染导致视觉混乱且无法区分点位、无法下发导航指令到选中点位、充电按钮功能不符合实际使用场景（应为位姿标定）。这些问题阻碍了 SDK 示例的核心演示价值——展示如何通过 3D 场景控制机器人执行导航和位姿初始化。

## What Changes

- 导航路径与拓扑路径改为互斥渲染，同一时间只显示一种路径类型下的一条路径
- 3D 场景中为路径节点添加圆点标记和名称标注
- NavigationTargetPanel 重构为支持路径类型切换、路径选择、点位勾选
- 支持从选中点位下发单点导航（`navigation`）或多点导航（`topology_navigation`）指令
- 「充电」按钮替换为「位姿标定」，通过 3D 场景点击+拖拽交互标定位姿，下发 `pose_init` 指令
- pose.ts 新增 Three.js → ROS 反向坐标变换（`threePositionToRos`、`threeQuaternionToRos`）
- 第 4 项（相机数据订阅渲染）预留，本次不实现

## Capabilities

### New Capabilities

- `path-exclusive-rendering`: 路径互斥渲染 + 点位标注，3D 场景中只显示当前激活的一条路径，节点带圆点和名称标签
- `navigation-command-dispatch`: 从 UI 选中点位构造并下发单点/多点导航指令，含坐标反向变换
- `pose-calibration`: 3D 场景中交互式位姿标定工具，替代原充电按钮，下发 pose_init 指令

### Modified Capabilities

（无已有 capability 被修改，均为新增功能覆盖原有空壳行为）

## Impact

- **前端**：改动约 8 个文件（pose.ts、spatialScene.ts、NavigationTargetPanel.tsx、CommandPanel.tsx、SpatialWorkbenchPage.tsx、useRobotWorkbench.ts、robotApi.ts、api.ts）
- **后端**：无改动，`pose_init` 通过现有通用 `POST /robot/command/{id}` 端点下发
- **3D 交互**：spatialScene 新增点位标注渲染和位姿标定交互模式（Raycaster + ArrowHelper）
- **坐标系**：新增 Three.js → ROS 反向变换，与已有 ROS → Three.js 正向变换对称
- **API 指令**：新增 `pose_init` command code，`navigation` 和 `topology_navigation` 已存在但此前未实际使用