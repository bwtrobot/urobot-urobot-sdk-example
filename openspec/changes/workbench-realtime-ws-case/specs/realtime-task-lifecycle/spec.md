## ADDED Requirements

### Requirement: TASK_REPLY 实时更新任务时间线
工作台 SHALL 在实时通道连接时优先使用 WS `TASK_REPLY` 推送更新任务时间线中的任务状态和结果。

#### Scenario: 收到 EXECUTING 推送
- **WHEN** 前端收到 taskStatus 为 EXECUTING 的 `task_reply` 实时事件
- **THEN** 任务时间线中对应 taskId 的状态更新为 EXECUTING

#### Scenario: 收到终态推送
- **WHEN** 前端收到 taskStatus 为 FINISHED、ERROR 或 TERMINATED 的 `task_reply` 实时事件
- **THEN** 任务时间线中对应 taskId 的状态更新为终态并保存结果摘要

### Requirement: sendCommand 后注册实时任务
前端下发指令后 SHALL 将返回的 taskId 加入任务时间线。若实时通道已连接，则任务进入等待 WS 推送状态；若实时通道未连接，则沿用 HTTP 查询任务结果。

#### Scenario: 实时通道已连接时下发指令
- **WHEN** 用户下发导航、TTS、急停、运动或位姿标定指令且实时通道已连接
- **THEN** 前端创建 PENDING 任务记录，并等待 `TASK_REPLY` 推送更新状态

#### Scenario: 实时通道未连接时下发指令
- **WHEN** 用户下发指令但实时通道未连接
- **THEN** 前端创建任务记录，并使用 HTTP `getTaskResult()` 查询任务状态

### Requirement: HTTP QueryTask 补偿
工作台 MUST 保留 HTTP `getTaskResult()` 作为任务结果权威补偿通道。当 WS 推送缺失、断线或任务长时间未进入终态时，前端 SHALL 使用 HTTP 查询补偿任务状态。

#### Scenario: WS 未收到终态
- **WHEN** 任务通过 WS 更新到非终态后超过补偿查询间隔仍未收到终态
- **THEN** 前端调用 HTTP `getTaskResult()` 查询该 taskId，并用查询结果更新任务时间线

#### Scenario: WS 断开期间查询任务
- **WHEN** 实时通道断开且存在未终结任务
- **THEN** 前端调用 HTTP `getTaskResult()` 查询未终结任务状态

#### Scenario: WS 与 HTTP 状态不一致
- **WHEN** 同一 taskId 的 WS 推送状态与 HTTP 查询结果不一致
- **THEN** 前端以 HTTP 查询结果为权威更新任务时间线

### Requirement: 任务终态停止补偿查询
任务进入终态后，前端 SHALL 停止对该 taskId 的周期性补偿查询。

#### Scenario: 任务已完成
- **WHEN** 任务状态变为 FINISHED、ERROR、TERMINATED、completed、failed、canceled 或 timeout
- **THEN** 前端停止对该 taskId 的周期性补偿查询

#### Scenario: 任务仍在执行
- **WHEN** 任务状态为 PENDING 或 EXECUTING
- **THEN** 前端继续等待 WS 推送或按补偿策略查询 HTTP 结果
