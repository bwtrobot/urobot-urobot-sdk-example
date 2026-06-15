## Purpose
定义空间工作台中的机器人位姿标定入口、3D 标定交互、视觉反馈和 pose_init 指令下发行为。

## Requirements

### Requirement: 位姿标定模式入口
系统 SHALL 在 CommandPanel 中将「充电」按钮替换为「位姿标定」按钮，点击后进入标定模式。

#### Scenario: 进入标定模式
- **WHEN** 用户点击「位姿标定」按钮
- **THEN** 3D 场景进入标定交互模式，相机控制器被禁用，场景显示提示

#### Scenario: 退出标定模式
- **WHEN** 用户点击「取消」或完成标定
- **THEN** 3D 场景退出标定模式，相机控制器恢复

### Requirement: 标定位置拾取
系统 SHALL 在标定模式下，允许用户点击 3D 场景地面确定标定位置。

#### Scenario: 点击地面
- **WHEN** 用户在标定模式下点击场景
- **THEN** Raycaster 检测地面平面交点，在该位置放置标记圆球和朝向箭头

#### Scenario: 重新点击
- **WHEN** 标记已放置后用户再次点击场景
- **THEN** 标记移动到新点击位置

### Requirement: 标定朝向设置
系统 SHALL 在放置标记后，允许用户通过拖拽设置朝向。

#### Scenario: 拖拽设定朝向
- **WHEN** 用户在标记放置后拖拽鼠标
- **THEN** 箭头方向跟随鼠标方向旋转，实时预览朝向

### Requirement: 标定确认下发
系统 SHALL 在用户确认标定后，将位姿转换为 ROS 坐标并下发 `pose_init` 指令。

#### Scenario: 确认标定
- **WHEN** 用户在标定模式下点击「确认」按钮
- **THEN** 系统将标记的 Three.js position 和 orientation 通过 `threePositionToRos` / `threeQuaternionToRos` 转换为 ROS 坐标，发送 `pose_init` 指令

#### Scenario: pose_init 指令格式
- **WHEN** pose_init 指令被构造
- **THEN** 参数格式为 `{ position: { x, y, z }, orientation: { x, y, z, w } }`，坐标为 ROS 坐标系

### Requirement: 标定模式视觉反馈
系统 SHALL 在标定模式下提供清晰的视觉反馈。

#### Scenario: 标记外观
- **WHEN** 标记被放置
- **THEN** 显示绿色圆球（位置）+ 红色箭头（朝向），箭头长度为 1.0

#### Scenario: 标定模式提示
- **WHEN** 进入标定模式
- **THEN** 场景顶部或按钮区域显示「点击地面设置位置，拖拽设置朝向」提示文字

### Requirement: robotApi 新增 pose_init 指令码
系统 SHALL 在 RobotCommandCode 中新增 `pose_init` 类型。

#### Scenario: pose_init 指令类型
- **WHEN** 构造 pose_init 指令
- **THEN** buildCommandPayload 使用 command_code=`pose_init`，type 值与 SDK 文档一致
