## ADDED Requirements

### Requirement: 点位勾选列表
系统 SHALL 在 NavigationTargetPanel 中显示当前路径所有节点的复选框列表，支持单选和全选。

#### Scenario: 显示点位列表
- **WHEN** 用户选择了一条路径
- **THEN** 面板显示该路径所有节点的 checkbox 列表，每项包含名称和坐标

#### Scenario: 全选
- **WHEN** 用户点击「全选」
- **THEN** 所有节点被勾选

#### Scenario: 取消全选
- **WHEN** 所有节点已勾选，用户点击「全选」
- **THEN** 所有节点取消勾选

### Requirement: 单点导航下发
系统 SHALL 在用户勾选 1 个节点并点击导航按钮时，发送 `navigation` 单点导航指令。

#### Scenario: 单点导航
- **WHEN** 用户勾选 1 个节点，点击「导航到选中点位」
- **THEN** 系统构造 `navigation` 指令，参数包含 `point_name`、`position`、`orientation`、`look_at: true`，坐标为 ROS 坐标系

#### Scenario: 坐标转换（coordinateFrame=THREE）
- **WHEN** 节点 coordinateFrame 为 THREE
- **THEN** position 和 orientation 经过 `threePositionToRos` / `threeQuaternionToRos` 转换后再构造指令

#### Scenario: 坐标直传（coordinateFrame=ROBOT）
- **WHEN** 节点 coordinateFrame 为 ROBOT 或未指定
- **THEN** position 和 orientation 直接使用原始值构造指令

### Requirement: 多点导航下发
系统 SHALL 在用户勾选 2 个及以上节点并点击导航按钮时，发送 `topology_navigation` 多点导航指令。

#### Scenario: 多点导航
- **WHEN** 用户勾选 ≥2 个节点，点击「导航到选中点位」
- **THEN** 系统构造 `topology_navigation` 指令，参数包含 `point` 数组，每项含 `position`、`orientation`、`look_at: true`，按节点 order 排序

### Requirement: 导航按钮禁用状态
系统 SHALL 在没有勾选任何节点时禁用导航按钮。

#### Scenario: 无选中
- **WHEN** 没有节点被勾选
- **THEN** 「导航到选中点位」按钮为 disabled 状态

### Requirement: pose.ts 反向坐标变换
系统 SHALL 提供 `threePositionToRos` 和 `threeQuaternionToRos` 函数，作为现有正向变换的逆运算。

#### Scenario: 位置反向变换
- **WHEN** Three.js 坐标为 (1, 3, -2)
- **THEN** ROS 坐标为 (1, 2, 3)

#### Scenario: 四元数反向变换
- **WHEN** Three.js 绕 Y 轴旋转 90° 的四元数
- **THEN** 转换为 ROS 绕 Z 轴旋转 90° 的四元数