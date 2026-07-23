## Tasks

### 0. SDK 版本升级

- [x] `backend/pom.xml` 3 个 dependency 版本 3.2.1 → 3.3.0（`urobot-opensdk-core`、`urobot-opensdk-services`、`urobot-opensdk-ws`）
- [x] 确认本机 `~/.m2/repository/io/github/bwtrobot/*/3.3.0/` 已存在，无需额外 install
- [x] `mvn compile` 通过，确认既有调用无编译错误（3.3.0 相对 3.2.1 为 MINOR，签名应全部不变）

### 1. 后端：讲解流程节点透传多行为配置

- [x] `MapService.narrationProcessNodeToMap` 新增 4 个字段
  - `selfScripts` ← `node.selfScripts()`
  - `selfScriptNames` ← `node.selfScriptNames()`
  - `selfScriptValids` ← `node.selfScriptValids()`
  - `stopover` ← `node.stopover()`
- [x] 保持手写映射风格，不改造为反射（design 决策 8）
- [x] 不新增 `entranceScript` / `exitScript` 系列字段
- [x] 补注释说明：三个列表由 SDK 各自独立降级，**不保证等长**（design 决策 7）

### 2. 后端：segmentMode 视图参数贯通

- [x] `RobotService` 新增私有方法 `parseSegmentMode(String)`
  - null / 空白 → 返回 `null`（调用方据此跳过 `.segmentMode()`）
  - 不区分大小写匹配 `collapsed` / `expanded` → 返回对应 `SegmentMode` 枚举
  - 其余取值 → 抛 `IllegalArgumentException`（design 决策 3）
- [x] `RobotService.getNarrationRuntime(String robotId, String segmentMode)` 签名扩展
  - 解析结果非 null 时才调用 `GetNarrationRuntimeRequest.builder().segmentMode(...)`
- [x] `RobotService.controlNarration(String robotId, ControlNarrationBody body, String segmentMode)` 签名扩展
  - 同上，注入 `ControlNarrationRequest.builder().segmentMode(...)`
- [x] `ControlNarrationBody` **不新增字段**（design 决策 1）
- [x] `RobotHandler` 两个端点新增 `@RequestParam(required = false) String segmentMode`
  - `GET /robot/{robotId}/narration/runtime`
  - `POST /robot/{robotId}/narration/control`（与 `@RequestBody` 共存）
- [x] 后端编译验证

### 3. 后端：segment 透传 selfIndex

- [x] `RobotService.narrationSegmentToMap` 新增 `map.put("selfIndex", segment.selfIndex())`
- [x] 补注释说明该方法是手写分支，SDK 后续新增 segment 字段需在此同步跟进（design 决策 8 的代价）
- [x] 补注释说明 `segmentType` 实际取值为小写 `entrance` / `self` / `transition` / `exit`（design 决策 6）

### 4. 前端类型定义

- [x] `shared/types/api.ts` 新增 `export type SegmentMode = 'collapsed' | 'expanded';`
- [x] `NarrationProcessNodeSummary` 新增可选字段
  - `selfScripts?: string[]`
  - `selfScriptNames?: string[]`
  - `selfScriptValids?: boolean[]`
  - `stopover?: boolean`
- [x] `NarrationRuntimeSegment` 新增 `selfIndex?: number | null`

### 5. 前端 API 层

- [x] `robotApi.ts` 的 `getNarrationRuntime(robotId, segmentMode?: SegmentMode)`
  - 拼接 `?segmentMode=` 查询参数，未传时不拼
  - `fallbackData` 改为按 `segmentMode` 生成（见任务 8）
- [x] `robotApi.ts` 的 `controlNarration(robotId, params, segmentMode?: SegmentMode)`
  - `segmentMode` 走查询参数，**不进** request body（design 决策 1）
  - 保留既有的 editionId / processId 前置校验逻辑

### 6. 前端 Hook 扩展

- [x] `useRobotWorkbench` 新增 `segmentMode` 状态，默认 `'collapsed'`
- [x] `refreshNarrationRuntime` 携带当前 `segmentMode`
- [x] `controlNarration` 携带当前 `segmentMode`
- [x] 轮询（`NARRATION_RUNTIME_POLL_INTERVAL_MS`）携带当前 `segmentMode`
- [x] 新增 `setSegmentMode`：切换后**立即**触发一次运行时刷新，不等下一轮轮询（design 注意点 4）
- [x] 导出 `segmentMode` 与 `setSegmentMode`

### 7. 前端 UI：NarrationPanel 改造

- [x] props 新增 `segmentMode` 与 `onSegmentModeChange`
- [x] 面板新增视图切换控件（折叠 / 展开两态）
- [x] 节点列表改为可展开结构，节点行下方嵌套节点行为列表
  - 以 `node.selfScripts` 的长度为迭代基准（design 决策 7）
  - 行为名：`selfScriptNames?.[i]` ?? `selfScripts[i]`
  - `selfScriptValids?.[i] === false` 时标记为无效
  - 无 `selfScripts` 或为空数组时，不渲染行为列表
- [x] 节点行新增「停留 / 不停留」标记（`stopover`，缺省按停留）
- [x] 行为状态匹配（**展开视图**）
  - `segments.find(s => s.segmentType === 'self' && s.nodeId === node.id && s.selfIndex === i)?.taskStatus`
  - `segmentType` 必须小写 `'self'`，就地留注释说明（design 决策 6）
- [x] 节点级状态（**折叠视图**）
  - `segments.find(s => s.segmentType === 'self' && s.nodeId === node.id)?.taskStatus`
  - 折叠视图下行为列表**不显示**逐条状态（design 决策 5）
- [x] 保留既有的流程下拉、开始/暂停/恢复/停止按钮、节点跳转（`node-pick`）能力不变
- [x] `robot-execution.css` 补充行为列表与视图切换控件样式，复用现有 `narration-*` 命名与 `side-card` 视觉语言
- [x] `SpatialWorkbenchPage.tsx` 传入 `segmentMode` / `onSegmentModeChange`

### 8. Mock 数据

- [x] `mockNarrationProcesses` 的节点补多行为配置
  - 「巡检点」节点：3 个 `selfScripts`，对应 3 个 `selfScriptNames`，其中第 3 个 `selfScriptValids` 为 `false`
  - 「充电桩」节点：`stopover: false`
  - 其余节点：单行为，验证存量形态（design 场景 B）
- [x] `mockNarrationRuntime` 改为按 `segmentMode` 生成的函数
  - **展开形态**：含 `entrance` / `self`×3（`selfIndex` 0/1/2）/ `transition` / `exit` 段
  - **折叠形态**：同节点 3 个 SELF 聚合为 1 段，`selfIndex` 为 `null`
  - 折叠形态须同步折叠 `taskIds` 与 `latestTaskId`，保持响应自洽（design 决策 9）
- [x] 保留原 `mockNarrationRuntime` 导出或调整全部引用点

### 9. 前端测试

- [x] `robotApi.test.ts` 新增：`getNarrationRuntime` 带 `segmentMode` 时 URL 含 `?segmentMode=expanded`，不带时不含该参数
- [x] `robotApi.test.ts` 新增：`controlNarration` 的 `segmentMode` 出现在 URL 而**不在** request body 中
- [x] 新增行为状态匹配的单元测试
  - 展开视图下按 `selfIndex` 正确命中对应行为
  - `segmentType` 为大写 `'SELF'` 时**不**命中（守住 design 决策 6）
  - `selfScriptNames` 短于 `selfScripts` 时仍渲染全部行为（守住 design 决策 7）
- [x] `useRobotWorkbench` 测试：切换 `segmentMode` 触发一次立即刷新

### 10. 文档

- [x] `openspec/docs/guide/3.3.0/` 纳入版本管理（当前工作区已存在，`index.html` + `assets/` 与既有版本目录格式一致）
- [x] 确认 guide 3.3.0 的 16.1 / 16.2 两节（多节点行为、展开读取运行时片段）与本变更实现一致

**不在本变更范围**：`openspec/docs/api/3.3.0/agent任务参数 v3.3.0.docx`（当前 untracked）。该文件内容为「全部任务指令 command_code 一览」，属 agent 任务参数协议 v3.3.0，与 SDK 3.3.0 的讲解多行为能力无关，版本号相同属巧合。且 `.docx` 为二进制，与 `openspec/docs/api/` 下既有的 `.md` + `.json` 惯例不符（2.9.0 为 `具身智能中枢接口文档2.9.0.md` + `command.json`，3.1.0 为 `.md`）。建议单独处理：转为 `.md` 与目录惯例对齐后另行提交，或保持 untracked。

### 11. 验证

- [x] 后端 `mvn compile` 通过
- [x] 前端 `npm run lint`（tsc --noEmit）通过
- [x] 前端 `npm run build` 通过
- [x] 前端 `npm test` 全部通过
- [ ] 手工验证（mock 降级模式）：切换折叠/展开，行为状态逐条亮起/消失
- [ ] 手工验证（真实服务端）：不带 `segmentMode` 调用 BFF，响应与升级前一致
- [ ] 手工验证：`?segmentMode=EXPAND` 返回 400

### 12. 归档顺序提醒

- [ ] 归档本变更**之前**，先归档 `sync-sdk-narration-activate-map`（其任务已全部完成，spec delta 尚未合入 `openspec/specs/`）
