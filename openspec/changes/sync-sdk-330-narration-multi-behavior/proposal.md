## Why

SDK 3.3.0 补齐了讲解流程的「多节点行为」与「片段视图」能力（详见上游变更 `s1-maincenter/openspec/changes/sdk-narration-flexible-config-compat`）：

- `NarrationProcessNode` 新增 `selfScripts()` / `selfScriptNames()` / `selfScriptValids()` / `stopover()`
- `NarrationSegment` 新增 `selfIndex()`
- `GetNarrationRuntimeRequest` / `ControlNarrationRequest` 新增 `segmentMode(SegmentMode)`，取值 `COLLAPSED`（服务端默认）/ `EXPANDED`

Example 项目当前锁定 SDK 3.2.1，三处缺口都在「透传」这一层，与上游关注的二进制兼容性无关：

1. **`MapService.narrationProcessNodeToMap` 一个讲解稿字段都没透出**（只有 id / uuid / name / navNodeId / order / position / rotation）。因此新增四件套属于**从零新增透传**，不是单值升列表的兼容改造，本项目无历史包袱。
2. **`RobotService.narrationSegmentToMap` 手写 8 个字段，缺 `selfIndex`**。该方法位于 `narrationRuntimeFieldsToMap` 反射映射的手写分支中，不会被反射自动带出。
3. **两个请求 Builder 均未传 `segmentMode`**，且前端**完全不渲染 `segments`**（全仓库零处消费），新能力在示例中没有任何落点。

作为面向集成方的示例项目，本次目标不是「不炸」，而是**把 SDK 3.3.0 的新能力示范清楚**——尤其是 `selfIndex` 与 `selfScripts` 下标一一对齐这一核心语义。

## What Changes

### SDK 版本升级

- `backend/pom.xml` 3 个 dependency 3.2.1 → 3.3.0（core / services / ws）

### 后端 BFF：讲解流程节点透传多行为配置

- `MapService.narrationProcessNodeToMap` 新增 4 个字段：`selfScripts`、`selfScriptNames`、`selfScriptValids`、`stopover`
- 本次**不**补 `entranceScript` / `exitScript` 系列（SDK 3.3.0 未改动，且面板无展示位）

### 后端 BFF：segmentMode 视图参数贯通

- `RobotHandler` 两个端点新增可选查询参数 `segmentMode`：
  - `GET /robot/{robotId}/narration/runtime?segmentMode=`
  - `POST /robot/{robotId}/narration/control?segmentMode=`
- `RobotService.getNarrationRuntime` / `controlNarration` 接收 `segmentMode`，解析为 SDK `SegmentMode` 枚举后注入 Builder；为空时不调用 `.segmentMode()`，由服务端保持默认 collapsed
- 非法取值快速失败抛 `IllegalArgumentException`，不静默回退
- `ControlNarrationBody` **不新增字段**（镜像上游决策 7：视图开关不污染业务请求体）

### 后端 BFF：segment 透传 selfIndex

- `RobotService.narrationSegmentToMap` 新增 `selfIndex`

### 前端类型与 API 层

- `shared/types/api.ts`：
  - `NarrationProcessNodeSummary` 新增 `selfScripts?` / `selfScriptNames?` / `selfScriptValids?` / `stopover?`
  - `NarrationRuntimeSegment` 新增 `selfIndex?: number | null`
  - 新增 `SegmentMode = 'collapsed' | 'expanded'`
- `robotApi.ts`：`getNarrationRuntime(robotId, segmentMode?)`、`controlNarration(robotId, params, segmentMode?)` 拼接查询参数

### 前端 Hook

- `useRobotWorkbench` 新增 `segmentMode` 状态（默认 `'collapsed'`）与 `setSegmentMode`
- 运行时查询、讲解控制、轮询三处调用统一携带当前 `segmentMode`
- 切换 `segmentMode` 后立即刷新运行时

### 前端 UI：NarrationPanel 节点内嵌行为列表

- 新增视图切换控件（折叠 / 展开），切换即生效
- 节点列表改为可展开结构：节点行下方嵌套该节点的**节点行为列表**
  - 行为名取 `selfScriptNames[i]`，缺失时降级显示 `selfScripts[i]`
  - `selfScriptValids[i] === false` 标记为无效
  - **展开视图**下，逐个行为显示状态：匹配 `segmentType === 'self' && nodeId 相同 && selfIndex === i` 的 segment，取其 `taskStatus`
  - **折叠视图**下，`selfIndex` 为 `null`，状态只显示在节点级，行为列表不显示逐条状态
- 节点行新增「停留 / 不停留」标记（`stopover`）

### Mock 数据

- `mockNarrationProcesses` 造一个含 3 个节点行为的节点（其中 1 个 `valid=false`），另一节点 `stopover=false`
- `mockNarrationRuntime` 新增 `segments`，并按 `segmentMode` 提供折叠 / 展开两套形态，使 mock 降级模式下也能演示视图差异

### 文档

- `openspec/docs/guide/3.3.0/` 纳入版本管理（SDK 3.3.0 开发者指南，16.1 / 16.2 两节对应本次能力）
- `openspec/docs/api/3.3.0/*.docx` **不纳入本变更**：内容为 agent 任务参数协议的 command_code 清单，与本次讲解能力无关，且格式与该目录既有 `.md` 惯例不符

## Capabilities

### Modified Capabilities

- `backend-api-endpoints`：讲解流程节点透传多行为配置；讲解运行时/控制端点新增 `segmentMode` 查询参数；segment 透传 `selfIndex`
- `frontend-spatial-workbench`：NarrationPanel 新增视图切换与节点内嵌行为列表

## Impact

- **SDK 依赖**：3.2.1 → 3.3.0，MINOR 升级向后兼容；本项目使用的全部既有 API 签名不变
- **后端代码**：修改 4 个文件（`pom.xml`、`MapService`、`RobotService`、`RobotHandler`）
- **前端代码**：修改 5 个文件（`api.ts`、`robotApi.ts`、`useRobotWorkbench.ts`、`NarrationPanel.tsx`、`mockData.ts`）+ CSS
- **BFF API 兼容性**：纯增量。两个端点新增**可选**查询参数；响应新增字段。不带参调用行为与升级前完全一致
- **前置依赖**：`sync-sdk-narration-activate-map` 变更任务已全部完成但尚未归档，其 spec delta 未合入 `openspec/specs/`，导致当前 baseline 中不存在任何讲解相关 requirement。本变更的 `MODIFIED` 块以该变更的 delta 为基准书写，**归档顺序须为：先归档 `sync-sdk-narration-activate-map`，再归档本变更**