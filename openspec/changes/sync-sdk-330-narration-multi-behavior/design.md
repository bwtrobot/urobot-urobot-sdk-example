## Context

上游变更 `sdk-narration-flexible-config-compat` 在服务端与 SDK 两侧完成了多节点行为能力的贯通。本变更是**消费侧**的同步：Example 项目作为面向集成方的参考实现，需要把 SDK 3.3.0 的新能力示范出来。

三条既有事实构成本次设计的边界：

1. **本项目无兼容包袱**。上游 design 的核心焦虑（`@JsonCreator` 构造器冻结、collapsed 默认值保护老集成方、`Collectors.toMap(nodeId)` 抛 Duplicate key）在本项目一件都不适用：本项目只消费 SDK 模型不定义它们；本项目就是那个"集成方"，BFF 之下没有下游；前端零处消费 `segments`，不存在会炸的 keyBy。

2. **`MapService.narrationProcessNodeToMap` 目前不透出任何讲解稿字段**。因此 `selfScripts` 系列是从零新增，不涉及"单值→列表"的迁移，也不需要在 BFF 层写降级逻辑——SDK 的访问器已经做完了双向降级。

3. **`RobotService` 的运行时映射是半自动的**：`narrationRuntimeFieldsToMap(Object)` 反射遍历顶层无参方法自动透出，但 `nodes` / `segments` 落在两个手写分支里（`narrationNodeToMap` / `narrationSegmentToMap`）。`selfIndex` 恰好在手写侧，必须显式补。

SDK 3.3.0 已发布并存在于本机 `~/.m2/repository/io/github/bwtrobot/`（core / services / ws 均含 jar、sources、javadoc），升级路径已通。

## Goals / Non-Goals

**Goals:**

- 把 `selfIndex ↔ selfScripts` 下标对齐这一核心语义在 UI 上直接呈现出来
- 示范"视图形态由调用方选择"，而非在 BFF 硬编码某一种
- 折叠 / 展开两种视图的差异对使用者可见、可对比
- mock 降级模式下同样能演示上述全部能力
- 不带 `segmentMode` 调用时，BFF 行为与升级前逐字段一致

**Non-Goals:**

- 不补 `entranceScript` / `exitScript` 系列透传（SDK 3.3.0 未改动它们）
- 不把 `narrationNodeToMap` / `narrationSegmentToMap` 改造为反射映射
- 不实现讲解流程的编辑/写入（SDK 未开放）
- 不改动 `NarrationNode`（runtime 的 node 维度）的字段集合，SDK 侧 `selfScriptId` 仍是单值
- 不在 BFF 层实现任何折叠/展开的自研逻辑，一律由服务端负责

## Decisions

### 1. `segmentMode` 走查询参数，镜像 Open API 口径

**决策**: BFF 两个端点均以查询参数接收 `segmentMode`：

```
GET  /robot/{robotId}/narration/runtime?segmentMode=expanded
POST /robot/{robotId}/narration/control?segmentMode=expanded   （body 保持 ControlNarrationBody 不变）
```

**原因**:

- 与上游决策 7 完全一致。示例项目的价值在于示范 SDK 与 Open API 的正确用法，BFF 口径若与 Open API 分叉，读者会误以为那是 SDK 的要求
- `segmentMode` 控制的是响应的表示形式而非业务参数，塞进 `ControlNarrationBody` 会污染其语义
- 两个端点同名、同值、同默认，使用者只需记一处

**替代方案**: 放进 `ControlNarrationBody` —— 前端少拼一次 query，但与 Open API 口径分叉，且 `getNarrationRuntime` 是 GET 无 body，必然导致两个端点写法不一致。

### 2. BFF 不设默认值，null 即不传

**决策**: `segmentMode` 为 null / 空白时，**不调用** Builder 的 `.segmentMode()`，让 SDK 不拼该查询参数，由服务端按默认 collapsed 响应。

**原因**:

- 默认值的所有权归服务端。BFF 若硬编码 `COLLAPSED`，一旦服务端未来调整默认值，示例会静默偏离真实行为
- 这正是 SDK 决策 11（"SDK 默认不传"）的正确用法示范：不传 ≠ 传 collapsed，虽然当前二者等效
- 保证不带参调用时 BFF 行为与升级前逐字段一致

### 3. 非法 `segmentMode` 快速失败，不静默回退

**决策**: 取值非 `collapsed` / `expanded` 时抛 `IllegalArgumentException`（→ 400），而非回退到不传。

**原因**:

- 静默回退会让使用者以为拿到的是 expanded、实际是 collapsed —— `selfIndex` 全为 `null`，逐行为状态全部不显示，使用者会去怀疑服务端版本，属 silent wrong
- 与 `RobotService.requireText()` 已有的快速失败风格一致
- 大小写：接受不区分大小写的输入（`Expanded` 亦可），因为 HTTP 查询参数由人手工敲入的概率高；但**传给 SDK 的一律是枚举**，序列化后仍是小写

### 4. 节点内嵌行为列表，`selfIndex` 就地对齐

**决策**: 采用节点内嵌结构而非独立 segment 时间线：

```
┌──────────────────────────────────────────┐
│ ▾ 巡检点                  停留   executing │
│     ① 欢迎词                     finished  │
│     ② 设备介绍                  executing  │
│     ③ 安全须知（无效）                 -   │
│ ▸ 充电桩                 不停留        -   │
└──────────────────────────────────────────┘
      ↑ 序号 i 同时是 selfScripts[i] 的下标
        与 segment.selfIndex 的取值
```

**原因**:

- `selfIndex` 的语义就是 `selfScripts()` 的下标。把两者画在同一行，是解释这条语义的最短路径；独立时间线需要读者跨组件在脑内做 join
- 复用现有 `narration-node-list` 结构与 CSS，改动收敛在一个组件内
- 节点行本身已承载"当前节点""节点状态"，行为列表是它天然的下一层

**替代方案**: 独立 segment 时间线 —— 能同时展示 `entrance` / `transition` / `exit` 段的全貌，信息更完整，但与现有节点列表信息大量重叠，且把 `selfIndex ↔ selfScripts` 的对齐关系拆到了两个组件里。

### 5. 折叠视图下不伪造逐行为状态

**决策**: 折叠视图下 `selfIndex` 为 `null`，行为列表只显示脚本名与有效性，**不显示逐条状态**；聚合状态显示在节点行上。

**原因**:

- 折叠段是 N 个行为的聚合，不代表任何单个行为。把聚合状态标到第一个行为上会误导使用者以为只有第一个在跑（正是上游决策 4 拒绝的 silent wrong）
- 这个"折叠时逐条状态消失、展开时逐条亮起"的对比，**本身就是视图差异最直观的演示**，是本次示范的核心画面
- 不做任何"猜测当前执行到第几个"的推断

### 6. `segmentType` 比较必须用小写 `'self'`

**决策**: 匹配节点行为段时写 `segment.segmentType === 'self'`，并在代码注释中写明实际取值为小写四值 `entrance` / `self` / `transition` / `exit`。

**原因**:

- 上游 design 注意点 5 已确认：服务端对枚举 `name()` 做了 `toLowerCase()`，SDK 3.2.1 的 Javadoc 注释（`navigate / narrate / transition`）是错的，3.3.0 已修正
- 写成 `'SELF'` 会得到一个**永假判断**：行为列表状态全部为空，且不报任何错，排查成本极高
- 示例项目一旦写错，会被集成方原样复制

### 7. 三个列表不保证等长，以 `selfScripts` 为迭代基准

**决策**: 前端以 `selfScripts.length` 为准迭代，`selfScriptNames[i]` / `selfScriptValids[i]` 按下标**可选**读取：名称缺失时降级显示 `selfScripts[i]`（UUID），有效性缺失时按有效处理。

**原因**:

- SDK 的三个访问器**各自独立降级**（`immutableListOrSingle(values, singleValue)`），彼此不参照。存在真实的不等长场景：新服务端返回 `selfScripts=[a,b,c]` 但 `selfScriptNames` 为空列表时，`selfScriptNames()` 会降级到旧单值字段，返回长度为 1 的列表
- 此时若以 `selfScriptNames` 为迭代基准，会**丢失 2 个行为**；若按下标硬取则得到 `undefined`
- `selfScripts` 是脚本 UUID，是行为存在性的唯一权威来源

### 8. 保留手写映射，不改造为反射

**决策**: `narrationNodeToMap` / `narrationSegmentToMap` 维持手写字段列表，仅新增 `selfIndex`。

**原因**:

- 手写映射是示例项目的可读性资产：读者能一眼看到 BFF 究竟透出了哪些字段
- 反射版会把语义化字段名退化为裸方法名，且无法表达"哪些字段是本次新增的"
- 顶层 `narrationRuntimeFieldsToMap` 的反射是既有实现，本次不动

**代价**: SDK 后续给 `NarrationSegment` / `NarrationNode` 加字段时需手工跟进。已在 tasks 中留下提示。

### 9. mock 提供折叠 / 展开两套 segments

**决策**: mock 运行时数据按 `segmentMode` 返回不同的 `segments` 形态，而非单一静态数组。

**原因**:

- mock fallback 是本项目的主要演示路径之一（后端不可用时自动降级）。若 mock 只有一种形态，切换视图开关将毫无反应，使用者会误判功能未生效
- 折叠形态需同步折叠 `taskIds` 与 `latestTaskId`（上游决策 5 的不变量），mock 若只折叠 segments 会示范出一个自相矛盾的响应

## Architecture

### 视图参数贯通链路

```
NarrationPanel  折叠/展开切换
      │  setSegmentMode('expanded')
      ▼
useRobotWorkbench   segmentMode 状态
      │            ├─ 运行时轮询携带
      │            └─ 讲解控制携带
      ▼
robotApi.ts    ?segmentMode=expanded
      ▼
RobotHandler   @RequestParam(required = false) String segmentMode
      │
      ▼
RobotService   parseSegmentMode(String) → SegmentMode | null
      │            ├─ null  → 不调用 .segmentMode()  ← 决策 2
      │            └─ 非法值 → IllegalArgumentException ← 决策 3
      ▼
SDK Builder    .segmentMode(SegmentMode.EXPANDED)
      ▼
Open API       ?segmentMode=expanded
```

### 字段落点

```
SDK 3.3.0                    BFF 映射                     前端展示
────────────────────────────────────────────────────────────────────────
NarrationProcessNode
  selfScripts()      ──▶ narrationProcessNodeToMap ──▶ 行为列表迭代基准
  selfScriptNames()  ──▶       （新增 4 字段）      ──▶ 行为名（可选）
  selfScriptValids() ──▶                            ──▶ 无效标记（可选）
  stopover()         ──▶                            ──▶ 节点行「停留/不停留」

NarrationSegment
  selfIndex()        ──▶ narrationSegmentToMap      ──▶ 与行为下标 i 匹配
                              （手写分支，新增）          取 taskStatus
```

### 行为状态匹配规则

```
展开视图：
  行为 i 的状态 = segments.find(s =>
      s.segmentType === 'self' &&        ← 小写，决策 6
      s.nodeId === node.id &&
      s.selfIndex === i                  ← 下标对齐，决策 4
  )?.taskStatus

折叠视图：
  行为 i 的状态 = 不显示                  ← 决策 5
  节点状态      = segments.find(s =>
      s.segmentType === 'self' && s.nodeId === node.id
  )?.taskStatus                          ← 聚合段，每节点至多一个
```

## 推演验证

### 场景A：不带 segmentMode（默认路径）

```
前端初始 segmentMode = 'collapsed'
→ 若实现为"collapsed 也拼参数"，BFF 传 SegmentMode.COLLAPSED，服务端显式折叠
→ 若实现为"collapsed 视作不传"，BFF 不拼参数，服务端默认折叠
两者当前等效。本变更选前者（前端显式表达用户选择），BFF 侧保留"null 不传"能力供
直接调用 BFF 的使用者使用。
```

### 场景B：存量单行为节点 + 展开视图

```
selfScripts = ["uuid-a"]，segments 含 1 个 SELF(selfIndex=0)
→ 行为列表渲染 1 行，状态由 selfIndex===0 匹配命中
→ 与折叠视图的唯一差异是 selfIndex 由 null 变 0，视觉上仅多一个逐条状态
→ 说明：存量数据下两种视图几乎无差别，需 mock 多行为数据才能演示（决策 9）
```

### 场景C：3 行为节点 + 折叠 → 展开切换

```
折叠：节点行显示 executing；行为列表 3 行，均无状态
展开：节点行状态取消；行为列表 finished / executing / -
→ 视图差异一目了然，正是本次示范的核心画面
```

### 场景D：新 SDK 打老服务端（私有化现场未升级）

```
JSON 仅含 selfScript 单值，无 selfScripts / stopover / self_index
→ SDK selfScripts() 降级为 ["uuid-a"]，BFF 透出单元素数组
→ SDK stopover() 返回 true，节点行显示「停留」
→ selfIndex 为 null，即使前端选了展开，行为状态也不显示
→ 面板退化为与折叠视图一致，无异常、无空白崩溃
```

### 场景E：`selfScriptNames` 短于 `selfScripts`

```
selfScripts = [a, b, c]，selfScriptNames() 降级返回 [name-a]
→ 以 selfScripts.length=3 迭代（决策 7）
→ 行 0 显示 "name-a"；行 1、2 降级显示 UUID b、c
→ 3 个行为全部可见，不丢数据
```

### 场景F：非法 segmentMode

```
GET /robot/x/narration/runtime?segmentMode=EXPAND
→ parseSegmentMode 抛 IllegalArgumentException → 400
→ 使用者立刻知道拼错了，而不是拿到一份 selfIndex 全 null 的响应去怀疑服务端版本
```

## 注意点

### 1. `segmentType` 的大小写是本次最易踩的坑

见决策 6。写错不报错、不崩溃，只是行为状态永远为空。建议在实现时于该比较处保留注释，并在前端测试中加一条针对小写匹配的断言。

### 2. 折叠视图下每节点至多一个 SELF 段是前提

节点级状态的匹配逻辑（`find(segmentType==='self' && nodeId===node.id)`）依赖"折叠后同节点只有一个 SELF"这一服务端保证。若该保证被打破，`find` 会静默取首个。此项由服务端 collapsed 聚合逻辑保证，本项目不做防御，但需在实现时留意。

### 3. `stopover` 在 SDK 侧是 primitive `boolean`

`NarrationProcessNode.stopover()` 返回 `boolean` 而非 `Boolean`（缺省 true 已在 SDK 内部处理）。BFF 透传后前端拿到的必然是 `true` / `false`，不会是 `null`。前端类型标为 `stopover?: boolean` 只是为了容忍旧版 BFF 的响应。

### 4. 轮询与视图切换的竞态

运行时轮询间隔 10s（`NARRATION_RUNTIME_POLL_INTERVAL_MS`）。切换视图后若仅等待下一次轮询，最长有 10s 的视觉延迟，使用者会以为开关无效。切换后必须立即触发一次刷新。

### 5. 归档顺序

`sync-sdk-narration-activate-map` 任务已全部完成但未归档，其 spec delta 尚未合入 `openspec/specs/`，当前 baseline 中不存在讲解相关 requirement。本变更的 `MODIFIED` 块以该变更的 delta 为基准书写。归档顺序必须是：先归档 `sync-sdk-narration-activate-map`，再归档本变更。

## 扩展点

### 1. 独立 segment 时间线

决策 4 选择了节点内嵌，`entrance` / `transition` / `exit` 三类段目前在 UI 上没有落点。若后续需要展示完整讲解时序（含节点间转场），可新增一个与节点列表平级的时间线视图，复用同一份 `segments` 数据。

### 2. `selfIndex` 粒度的手动控制

上游 design 提到展开视图支持"单独触发第 N 个节点行为"。SDK 当前 `ControlNarrationRequest` 只有 `nodeId` / `nodeName`，无行为级定位参数。若服务端后续开放，行为列表的每一行可直接挂上触发按钮——本次的内嵌结构已为此预留了位置。

### 3. `entranceScript` / `exitScript` 多值化

若上游后续将入场/退场行为也改为多值，本次的四件套透传与内嵌列表结构可平移复用。