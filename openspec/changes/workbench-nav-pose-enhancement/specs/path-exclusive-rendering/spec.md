## ADDED Requirements

### Requirement: 路径类型互斥选择
系统 SHALL 提供导航路径和拓扑路径的互斥选择，同一时间只渲染一种路径类型。默认选中导航路径。

#### Scenario: 切换到拓扑路径
- **WHEN** 用户在 NavigationTargetPanel 中选择「拓扑路径」类型
- **THEN** 3D 场景清除当前导航路径渲染，显示拓扑路径列表中第一条路径

#### Scenario: 切换到导航路径
- **WHEN** 用户在 NavigationTargetPanel 中选择「导航路径」类型
- **THEN** 3D 场景清除当前拓扑路径渲染，显示导航路径列表中第一条路径

### Requirement: 单条路径选择
系统 SHALL 在当前路径类型下，通过下拉框选择具体的一条路径进行渲染。

#### Scenario: 切换路径
- **WHEN** 用户从路径下拉框选择另一条路径
- **THEN** 3D 场景清除当前路径渲染，显示新选中路径的线条、点位和名称

### Requirement: 路径节点圆点标记
系统 SHALL 在 3D 场景中为当前路径的每个节点渲染圆球标记（SphereGeometry，半径 0.1，灰色 0x94a3b8）。

#### Scenario: 节点渲染
- **WHEN** 一条路径被激活渲染
- **THEN** 每个节点位置显示一个圆球，坐标经过正确的坐标系变换

### Requirement: 路径节点名称标注
系统 SHALL 在每个节点圆球上方渲染名称文字标签（Canvas Sprite）。

#### Scenario: 名称显示
- **WHEN** 路径节点被渲染
- **THEN** 节点上方 0.25 单位处显示该节点的 name 文字

#### Scenario: 无名称节点
- **WHEN** 节点 name 为空
- **THEN** 不显示文字标签，仅显示圆球

### Requirement: 选中节点高亮
系统 SHALL 对用户勾选的节点使用不同颜色（黄色 0xfbbf24）和更大半径（0.15）区分未选中节点。

#### Scenario: 勾选节点
- **WHEN** 用户在点位列表中勾选某个节点
- **THEN** 3D 场景中该节点圆球变为黄色且半径增大

#### Scenario: 取消勾选
- **WHEN** 用户取消勾选某个节点
- **THEN** 3D 场景中该节点恢复为灰色和默认半径