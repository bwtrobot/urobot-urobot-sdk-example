## ADDED Requirements

### Requirement: SoonSpace.js 场景初始化
系统 SHALL 使用 SoonSpace.js 创建 3D 场景，包含环境光（intensity 0.7）、平行光（intensity 0.75）和网格辅助线。

#### Scenario: 场景挂载
- **WHEN** SpatialViewer 组件挂载到 DOM
- **THEN** SoonSpace 实例创建，场景包含灯光和网格，背景色为 #f6f8fb

#### Scenario: 场景销毁
- **WHEN** SpatialViewer 组件卸载
- **THEN** 所有 Three.js 资源（geometry、material）被释放，SoonSpace 实例被 dispose

### Requirement: PCD 点云加载
系统 SHALL 通过 Three.js PCDLoader 加载 globalMap 和 groundMap 点云文件，分别以绿色和蓝色渲染。

#### Scenario: 加载全局点云
- **WHEN** 地图版本包含 globalMap URL
- **THEN** 系统加载 PCD 文件，设置绿色（0x00ff00），通过 robotToThreeMatrix 变换坐标后添加到 globalPointCloud 图层

#### Scenario: 加载地面点云
- **WHEN** 地图版本包含 groundMap URL
- **THEN** 系统加载 PCD 文件，设置蓝色（0x0000ff），通过 robotToThreeMatrix 变换坐标后添加到 groundPointCloud 图层

#### Scenario: 点云 URL 为空
- **WHEN** 地图版本的 globalMap 或 groundMap 为空
- **THEN** 跳过该点云加载，不报错

### Requirement: CPS BIM 场景加载
系统 SHALL 通过 cps-soonmanager 插件加载 CPS 平台生产的 BIM 场景，并应用版本中的位置、缩放、朝向参数。

#### Scenario: 加载 BIM 场景
- **WHEN** 地图版本包含 bim.fileUrl
- **THEN** 注册 CpsSoonmanager 插件，调用 setPath + loadScene 加载场景，将加载的对象移入 bim 图层分组

#### Scenario: 应用 BIM 变换
- **WHEN** BIM 场景加载完成
- **THEN** bim 图层的 position、scale、quaternion 设置为 edition.bim 中的值（已是 Three.js 坐标系）

### Requirement: ROS 到 Three.js 坐标变换
系统 SHALL 使用统一的 robotToThreeMatrix 将 ROS 坐标系 (Z-up) 变换为 Three.js 坐标系 (Y-up)：Robot(x, y, z) → Three.js(x, z, -y)。

#### Scenario: 位置变换
- **WHEN** ROS 位置为 (1, 2, 3)
- **THEN** Three.js 位置为 (1, 3, -2)

#### Scenario: 四元数变换
- **WHEN** ROS 绕 Z 轴旋转 90°（四元数 0, 0, sin45, cos45）
- **THEN** Three.js 绕 Y 轴旋转 90°（四元数 0, sin45, 0, cos45）

#### Scenario: 零向量不变
- **WHEN** ROS 位置为 (0, 0, 0)
- **THEN** Three.js 位置为 (0, 0, 0)

### Requirement: 机器人 Mesh 位姿更新
系统 SHALL 在 3D 场景中渲染机器人 Mesh（主体 + 朝向锥体），并根据运行时位姿实时更新位置和旋转。

#### Scenario: 运行时位姿更新
- **WHEN** 收到新的 runtime 数据，包含 ros_odom.pose
- **THEN** 机器人 Mesh 的 position 和 quaternion 通过 rosPositionToThree / rosQuaternionToThree 更新

#### Scenario: 无位姿数据
- **WHEN** runtime 为 null 或无 ros_odom.pose
- **THEN** 机器人 Mesh 隐藏（visible=false）

### Requirement: 导航路径和拓扑路径渲染
系统 SHALL 将导航路径以橙色线条渲染，拓扑路径以靛色线条渲染，节点坐标通过 rosPositionToThree 变换。

#### Scenario: 渲染导航路径
- **WHEN** 收到导航路径数据（含 2 个以上节点）
- **THEN** 将节点坐标变换后连线，以橙色（0xf97316）添加到 paths 图层

#### Scenario: 渲染拓扑路径
- **WHEN** 收到拓扑路径数据（含 edges）
- **THEN** 按 edge 的 snode/enode 查找节点位置，以靛色（0x6366f1）绘制边线

### Requirement: 图层可见性控制
系统 SHALL 支持独立控制 bim、globalPointCloud、groundPointCloud、paths 4 个图层的可见性。

#### Scenario: 切换图层
- **WHEN** setLayerVisibility 被调用，某图层设为 false
- **THEN** 对应 Three.js Group 的 visible 属性设为 false，场景中该图层不可见

### Requirement: 渲染参数控制
系统 SHALL 支持调整点大小（small=0.06, medium=0.1, large=0.16）、透明度（low=0.35, medium=0.65, solid=1）和 BIM 线框模式。

#### Scenario: 调整点大小
- **WHEN** renderSettings.pointSize 变更
- **THEN** 所有点云材质的 size 属性更新为对应值

#### Scenario: 开启 BIM 线框
- **WHEN** renderSettings.bimWireframe 设为 true
- **THEN** BIM 图层中所有 MeshStandardMaterial 的 wireframe 属性设为 true

### Requirement: SpatialSceneAdapter 接口稳定性
spatialScene.ts 的导出接口（mount, loadEdition, updateRobotRuntime, setNavigationData, setLayerVisibility, setRenderSettings, dispose）SHALL 保持不变，渲染引擎切换不影响上层 UI 组件。

#### Scenario: 引擎替换无感知
- **WHEN** spatialScene.ts 内部从 Three.js 切换为 SoonSpace.js
- **THEN** SpatialViewer.tsx、LayerDropdown.tsx、RenderDropdown.tsx 零改动