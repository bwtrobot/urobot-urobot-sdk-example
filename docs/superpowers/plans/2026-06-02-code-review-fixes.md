# 代码审查修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复代码审查中发现的 1 个严重问题和 5 个重要问题

**Architecture:** 后端新增全局异常处理器、修复阻塞调度、修复类名拼写；前端修复任务轮询闭环、分页参数名、sendCommand 错误处理

**Tech Stack:** Java 8 / Spring Boot WebFlux / React 18 / TypeScript

---

### Task 1: 后端 — 添加全局异常处理器

**Files:**
- Create: `backend/src/main/java/com/bwton/urobot/interfaces/api/GlobalExceptionHandler.java`

- [ ] **Step 1: 创建全局异常处理器**

```java
package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.infrastructure.lang.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import reactor.core.publisher.Mono;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public Mono<Result<Object>> handleException(Exception e) {
        log.error("请求处理异常", e);
        Result<Object> result = new Result<>(false, "INTERNAL_ERROR", e.getMessage());
        return Mono.just(result);
    }
}
```

- [ ] **Step 2: 验证编译**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/java/com/bwton/urobot/interfaces/api/GlobalExceptionHandler.java
git commit -m "feat: add global exception handler for unified error response"
```

---

### Task 2: 后端 — 为 Mono.fromSupplier 添加 boundedElastic 调度

SDK 调用是阻塞操作，`Mono.fromSupplier()` 默认在 Netty 事件循环线程执行，会阻塞 I/O。需要调度到弹性线程池。

**Files:**
- Modify: `backend/src/main/java/com/bwton/urobot/application/RobotService.java`
- Modify: `backend/src/main/java/com/bwton/urobot/application/MapService.java`

- [ ] **Step 1: 修改 RobotService — 所有 Mono.fromSupplier 添加 subscribeOn**

在 `RobotService.java` 中，为每个 `Mono.fromSupplier(...)` 链末尾添加 `.subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())`：

```java
// 文件顶部添加 import
import reactor.core.scheduler.Schedulers;

// page 方法 (第26行附近)
// 将:
return Mono.fromSupplier(() -> {
    ...
}).map(response -> {
    ...
});
// 改为:
return Mono.fromSupplier(() -> {
    ...
}).map(response -> {
    ...
}).subscribeOn(Schedulers.boundedElastic());

// getRobotRuntime 方法 (第47行附近)
// 在 Mono.fromSupplier(...) 后添加:
.subscribeOn(Schedulers.boundedElastic());

// sendCommand 方法 (第56行附近)
// 在 Mono.fromSupplier(...) 后添加:
.subscribeOn(Schedulers.boundedElastic());

// getTaskResult 方法 (第69行附近)
// 在 Mono.fromSupplier(...) 后添加:
.subscribeOn(Schedulers.boundedElastic());
```

- [ ] **Step 2: 修改 MapService — 所有 Mono.fromSupplier 添加 subscribeOn**

在 `MapService.java` 中，为所有 5 个方法的 `Mono.fromSupplier(...)` 链末尾添加 `.subscribeOn(Schedulers.boundedElastic())`：

```java
// 文件顶部添加 import
import reactor.core.scheduler.Schedulers;

// listEditions, getEdition, getChargingStations, listNavPaths, listTopoPaths
// 每个方法的 return Mono.fromSupplier(...) 末尾添加:
.subscribeOn(Schedulers.boundedElastic());
```

- [ ] **Step 3: 验证编译**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: 提交**

```bash
git add backend/src/main/java/com/bwton/urobot/application/RobotService.java
git add backend/src/main/java/com/bwton/urobot/application/MapService.java
git commit -m "fix: schedule blocking SDK calls on boundedElastic to avoid blocking Netty event loop"
```

---

### Task 3: 后端 — 修复 BaseHanlder 类名拼写

**Files:**
- Rename: `backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java` → `BaseHandler.java`

- [ ] **Step 1: 重命名文件并修改类名**

```bash
cd backend
mv src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java \
   src/main/java/com/bwton/urobot/interfaces/api/BaseHandler.java
```

修改 `BaseHandler.java` 中的类名：

```java
// 将:
public class BaseHanlder {
    ...
    public BaseHanlder(RobotService service) {
// 改为:
public class BaseHandler {
    ...
    public BaseHandler(RobotService service) {
```

- [ ] **Step 2: 验证编译**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java
git add backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHandler.java
git commit -m "fix: rename BaseHanlder to BaseHandler (typo)"
```

---

### Task 4: 前端 — 修复分页参数名与后端 @ModelAttribute 对齐

后端 `PageQuery` 使用 `@ModelAttribute` 绑定，setter 是 `setPageNo` / `setPageSize`，Spring 期望 query params 为 `pageNo` / `pageSize`（camelCase），不是 `page_no` / `page_size`。

**Files:**
- Modify: `frontend/src/services/api/mapApi.ts:54,59`

- [ ] **Step 1: 修改 mapApi.ts 分页参数名**

```typescript
// listNavigationPaths (第54行附近)
// 将:
params: { editionId, page_no: 1, page_size: 20 },
// 改为:
params: { editionId, pageNo: 1, pageSize: 20 },

// listTopologyPaths (第63行附近)
// 将:
params: { editionId, page_no: 1, page_size: 20 },
// 改为:
params: { editionId, pageNo: 1, pageSize: 20 },
```

- [ ] **Step 2: 验证前端编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无报错

- [ ] **Step 3: 运行测试**

Run: `cd frontend && npx vitest run`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add frontend/src/services/api/mapApi.ts
git commit -m "fix: align pagination params with backend @ModelAttribute (pageNo/pageSize)"
```

---

### Task 5: 前端 — sendCommand 添加任务状态轮询闭环（严重）

**违反 CLAUDE.md 强约定**："业务需完整的任务闭环要 QueryTask 监控任务最终状态"。当前只查询一次，需要轮询到终态。

**Files:**
- Modify: `frontend/src/features/robot-execution/hooks/useRobotWorkbench.ts:109-128`

- [ ] **Step 1: 定义任务终态常量**

在 `useRobotWorkbench.ts` 文件顶部（`export interface WorkbenchTask` 之前）添加：

```typescript
// 任务终态集合，轮询到这些状态时停止
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'timeout', '完成', '失败', '已取消', '超时']);
```

- [ ] **Step 2: 重写 sendCommand 加入轮询逻辑**

替换 `useRobotWorkbench.ts` 中 `sendCommand` 的 useCallback 实现：

```typescript
const sendCommand = useCallback(
  async (commandCode: RobotCommandCode, commandParam: unknown) => {
    if (!selectedRobotId) return;
    const payload = buildCommandPayload(commandCode, commandParam);

    try {
      const response = await sendRobotCommand(selectedRobotId, payload);
      const taskId = response.data;
      setDemoMode((current) => current || response.source === 'mock');
      setTasks((current) => [
        { taskId, commandCode, source: response.source, status: response.source === 'mock' ? '演示执行中' : '已下发' },
        ...current,
      ]);

      // 轮询监控任务最终状态
      const maxPolls = 30;
      const pollInterval = 2000;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        const taskResponse = await getTaskResults(selectedRobotId, [taskId]);
        const latestStatus = taskResponse.data[0]?.task_status ?? '';
        setTasks((current) =>
          current.map((task) =>
            task.taskId === taskId
              ? { ...task, status: latestStatus || task.status, result: taskResponse.data[0] }
              : task,
          ),
        );
        if (TERMINAL_STATUSES.has(latestStatus)) break;
      }
    } catch (error) {
      console.error('发送命令失败', error);
    }
  },
  [selectedRobotId],
);
```

- [ ] **Step 3: 验证前端编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无报错

- [ ] **Step 4: 运行测试**

Run: `cd frontend && npx vitest run`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add frontend/src/features/robot-execution/hooks/useRobotWorkbench.ts
git commit -m "fix: add task status polling loop to satisfy QueryTask contract"
```

---

### Task 6: 后端 — SendCommandBody.params 类型改为 Map

**Files:**
- Modify: `backend/src/main/java/com/bwton/urobot/interfaces/request/SendCommandBody.java:3,7`

- [ ] **Step 1: 修改 params 类型**

```java
// 将:
import java.util.Map;  // 添加 import

// 将:
private Object params;
// 改为:
private Map<String, Object> params;

// 将:
public Object getParams() {
// 改为:
public Map<String, Object> getParams() {

// 将:
public void setParams(Object params) {
// 改为:
public void setParams(Map<String, Object> params) {
```

完整文件应为：

```java
package com.bwton.urobot.interfaces.request;

import java.util.Map;

public class SendCommandBody {
    private Integer type;
    private String messagesType;
    private Map<String, Object> params;
    private String callbackUrl;

    public Integer getType() {
        return type;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public String getMessagesType() {
        return messagesType;
    }

    public void setMessagesType(String messagesType) {
        this.messagesType = messagesType;
    }

    public Map<String, Object> getParams() {
        return params;
    }

    public void setParams(Map<String, Object> params) {
        this.params = params;
    }

    public String getCallbackUrl() {
        return callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }
}
```

- [ ] **Step 2: 检查 SDK 兼容性**

确认 `SendCommandRequest.builder().params()` 是否接受 `Map<String, Object>`。查看 `RobotService.java:60`：
```java
.params(body.getParams())
```
如果 SDK 的 `params()` 方法接受 `Object`，则 `Map<String, Object>` 是其子类型，兼容无问题。

- [ ] **Step 3: 验证编译**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: 提交**

```bash
git add backend/src/main/java/com/bwton/urobot/interfaces/request/SendCommandBody.java
git commit -m "fix: narrow SendCommandBody.params type from Object to Map<String, Object>"
```

---

## 任务摘要

| 优先级 | Task | 描述 |
|--------|------|------|
| 严重 | Task 5 | 前端任务状态轮询闭环 |
| 重要 | Task 1 | 后端全局异常处理器 |
| 重要 | Task 2 | 后端 boundedElastic 调度 |
| 重要 | Task 4 | 前端分页参数名对齐 |
| 重要 | Task 6 | 后端 params 类型收窄 |
| 次要 | Task 3 | BaseHanlder 拼写修复 |

## 未纳入本次修复的审查意见

以下问题经评估后暂不修复，原因如下：

- **N+1 查询 (MapService)** — 需要确认 SDK 是否支持批量 API，且当前是 demo 应用，数据量小，优先级低
- **getRobotRuntime 返回 Map<String, Object>** — 需要了解 SDK 返回的 runtime 结构是否稳定再定义 DTO
- **NavigationTargetPanel 无 onChange** — 属于功能未完成，不是 bug，应作为独立 feature 开发
- **后端密钥启动校验** — demo 应用，启动时无密钥有默认空值，不影响功能演示