## 1. 坐标反向变换

- [x] 1.1 在 `pose.ts` 中实现 `threePositionToRos` 函数：Three.js(x,y,z) → ROS(x,-z,y)
- [x] 1.2 在 `pose.ts` 中实现 `threeQuaternionToRos` 函数：通过 robotToThreeMatrix 逆矩阵变换四元数
- [x] 1.3 为 `threePositionToRos` 和 `threeQuaternionToRos` 编写单元测试

## 2. 路径互斥渲染 — 状态管理

- [x] 2.1 在 `useRobotWorkbench` 中新增 `activePathType`（'nav'|'topo'，默认 'nav'）、`selectedPathId`、`selectedNodeIds` 状态
- [x] 2.2 实现路径类型切换逻辑：切换时清空 selectedPathId 和 selectedNodeIds，自动选中第一条路径
- [x] 2.3 计算当前激活路径的节点列表，传递给 NavigationTargetPanel 和 SpatialViewer

## 3. 路径互斥渲染 — 3D 场景

- [x] 3.1 重构 `spatialScene.ts` 的 `setNavigationData` 接口，改为只接收单条路径数据
- [x] 3.2 实现路径节点圆球标记渲染（SphereGeometry，半径 0.1，灰色 0x94a3b8）
- [x] 3.3 实现路径节点名称 Canvas Sprite 标注（高分辨率 canvas 纹理，位于圆球上方 0.25 单位）
- [x] 3.4 实现选中节点高亮效果（黄色 0xfbbf24，半径 0.15）

## 4. NavigationTargetPanel 重构

- [x] 4.1 添加路径类型切换 Radio（导航路径 / 拓扑路径）
- [x] 4.2 添加路径选择下拉框（当前类型下的路径列表）
- [x] 4.3 实现节点复选框列表（checkbox + 名称 + 坐标，支持全选/取消全选）
- [x] 4.4 添加「导航到选中点位」按钮，无选中时 disabled

## 5. 导航指令下发

- [x] 5.1 在 `robotApi.ts` 的 `RobotCommandCode` 中新增 `pose_init` 类型，添加 commandTypeByCode 映射
- [x] 5.2 实现单点导航指令构造：勾选 1 个节点时发送 `navigation` 指令（含 coordinateFrame 判断和坐标转换）
- [x] 5.3 实现多点导航指令构造：勾选 ≥2 个节点时发送 `topology_navigation` 指令（按 order 排序）
- [x] 5.4 在 useRobotWorkbench 中集成导航下发流程，连接 NavigationTargetPanel 的导航按钮

## 6. 位姿标定 — 3D 交互

- [x] 6.1 在 SpatialSceneAdapter 中实现 `enterPoseCalibration`：禁用相机控制器，创建不可见地面平面，注册鼠标事件
- [x] 6.2 实现点击地面拾取位置：Raycaster 检测地面交点，放置绿色圆球标记
- [x] 6.3 实现拖拽设定朝向：mousemove 计算角度，红色 ArrowHelper 跟随旋转
- [x] 6.4 实现 `exitPoseCalibration`：恢复相机控制器，清理标记和事件监听
- [x] 6.5 实现 `onPoseConfirmed` 回调：确认时返回 position + orientation

## 7. 位姿标定 — UI 集成

- [x] 7.1 将 CommandPanel 中「充电」按钮替换为「位姿标定」按钮
- [x] 7.2 实现标定模式状态管理（进入/退出/确认），连接 SpatialSceneAdapter 接口
- [x] 7.3 确认标定时构造 `pose_init` 指令：threePositionToRos + threeQuaternionToRos 转换后下发
- [x] 7.4 标定模式下显示操作提示文字（「点击地面设置位置，拖拽设置朝向」）