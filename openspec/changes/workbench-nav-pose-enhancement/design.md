## Context

空间工作台已完成全栈搭建，3D 场景可渲染 BIM、点云、机器人位姿和路径线条。但自测发现：导航路径和拓扑路径同时渲染，缺少点位标注；NavigationTargetPanel 只是展示组件，无法实际下发导航指令；充电按钮与实际场景不匹配，应改为位姿标定。

当前关键文件状态：
- `spatialScene.ts` — `setNavigationData()` 同时渲染所有 navPaths + topoPaths，只画线不画点
- `NavigationTargetPanel.tsx` — 两个 select 无 onChange，纯展示
- `CommandPanel.tsx` — 「充电」按钮发 `charge_manager` 指令
- `robotApi.ts` — `RobotCommandCode` 已包含 `navigation` 和 `topology_navigation`，但缺少 `pose_init`
- `pose.ts` — 只有 ROS→Three.js 正向变换，缺少反向

## Goals / Non-Goals

**Goals:**

- 路径互斥渲染：同一时间只显示一种路径类型（导航/拓扑）下的一条路径
- 点位标注：3D 场景中每个路径节点显示圆点 + 名称文字
- 导航下发：用户勾选点位后可下发 `navigation`（单点）或 `topology_navigation`（多点）指令
- 位姿标定：用户通过 3D 场景交互标定位姿（点击定位 + 拖拽定向），下发 `pose_init` 指令
- 坐标反向变换：Three.js 坐标 → ROS 坐标，用于指令下发

**Non-Goals:**

- 相机数据订阅与渲染（预留，不在本次范围）
- 路径编辑/创建功能
- 充电指令保留（完全替换为位姿标定）
- 后端改动（全部通过现有通用指令端点）

## Decisions

### 1. 路径互斥选择：状态提升到 useRobotWorkbench

新增三个状态：`activePathType: 'nav' | 'topo'`、`selectedPathId: string`、`selectedNodeIds: Set<string>`。

`SpatialViewer` 只接收当前激活的单条路径数据，不再接收全部路径列表。`setNavigationData` 接口简化为只渲染一条路径。

**理由**：路径选择逻辑属于业务状态，应该在 hook 中管理，而非在 3D 渲染层做过滤。

### 2. 点位标注：Canvas Sprite

每个节点渲染为：圆球 Mesh（SphereGeometry r=0.1）+ Canvas 纹理 Sprite（显示名称）。

**替代方案**：CSS2DRenderer — 需要额外的 renderer setup 和 DOM 叠加层，在 SoonSpace.js 环境下兼容性不确定。Canvas Sprite 自包含在 Three.js 场景中，更简单。

### 3. 导航指令构造：按选中数量分发

```
勾选 1 个点 → navigation 单点导航
  { point_name, position, orientation, look_at: true }

勾选 ≥2 个点 → topology_navigation 多点导航
  { point: [{ position, orientation, look_at: true }, ...] }
```

坐标需要从后端返回的坐标系（可能是 THREE 或 ROBOT）统一转为 ROS 后再下发。

### 4. 位姿标定交互：两步式

```
步骤 1: 点击地面 → Raycaster 拾取点，放置标记 Mesh
步骤 2: 拖拽旋转箭头 → 确定朝向 (ArrowHelper + 鼠标 mousemove 计算角度)
确认: 按钮确认后构造 pose_init 指令
```

进入标定模式时禁用 SoonSpace 的相机控制器（避免拖拽冲突），退出时恢复。

**SpatialSceneAdapter 接口扩展**：

```typescript
enterPoseCalibration(): void;      // 进入标定模式
exitPoseCalibration(): void;       // 退出标定模式
onPoseConfirmed(cb: (pose: { position: Vector3Value; orientation: QuaternionValue }) => void): () => void;
```

### 5. 坐标反向变换

```typescript
// Three.js(x, y, z) → ROS(x, -z, y) — rosPositionToThree 的逆
threePositionToRos(p): Vector3Value

// 四元数通过 robotToThreeMatrix 的逆矩阵变换
threeQuaternionToRos(q): QuaternionValue
```

### 6. 选中点位高亮

选中的节点用不同颜色（黄色 0xfbbf24）和更大半径（0.15）区分未选中节点（灰色 0x94a3b8，半径 0.1）。

## Risks / Trade-offs

- **Canvas Sprite 文字清晰度**：缩放后可能模糊。→ 缓解：使用高分辨率 canvas（devicePixelRatio * 2），限制文字长度。
- **位姿标定地面检测**：Raycaster 需要一个可拾取的地面平面。当前场景无显式地面。→ 缓解：创建一个不可见的大平面（PlaneGeometry）作为拾取目标。
- **SoonSpace 相机控制器禁用**：进入标定模式需要禁用 OrbitControls 类似的控制器，SoonSpace 的 API 可能不暴露这个能力。→ 缓解：通过 `ssp.controls.enabled = false` 尝试，或通过 stopPropagation 拦截。
- **coordinateFrame 不一致**：后端返回的节点坐标可能是 THREE 或 ROBOT 坐标系。下发导航指令需要 ROS 坐标。→ 缓解：根据 coordinateFrame 字段判断，THREE 坐标先做反向变换再下发。