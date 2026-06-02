# Backend API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all backend REST endpoints that the frontend spatial workbench expects, so the app can connect to a real uTwin robot platform instead of running in demo/mock mode.

**Architecture:** DDD-lite layering: `interfaces/api/` (WebFlux controllers) → `application/` (services) → `UTwinClient` SDK calls. Each frontend API call maps 1:1 to an SDK method. `RobotService` handles robot operations; new `MapService` handles map/edition/path operations. All responses wrapped in `Result<T>` envelope. The Vite dev proxy strips `/api` prefix, so backend endpoints are at root paths (e.g. `/robot/page`).

**Tech Stack:** Java 8, Spring Boot WebFlux 2.7.18, uTwin OpenSDK 1.0.0-SNAPSHOT (utwin-opensdk-core + utwin-opensdk-services), Jackson.

---

## Endpoint Mapping

| Frontend URL | Backend Endpoint | SDK Call | Status |
|---|---|---|---|
| `GET /api/robot/page` | `GET /robot/page` | `uTwinClient.robot().listRobots()` | Exists |
| `GET /api/robot/runtime/{id}` | `GET /robot/runtime/{id}` | `uTwinClient.robot().getRobotRuntime()` | **New** |
| `POST /api/robot/command/{id}` | `POST /robot/command/{id}` | `uTwinClient.robot().sendCommand()` | **New** |
| `GET /api/robot/task-result/{id}` | `GET /robot/task-result/{id}` | `uTwinClient.robot().getTaskResult()` | **New** |
| `GET /api/map/{mapId}/editions` | `GET /map/{mapId}/editions` | `uTwinClient.map().listEditions()` | **New** |
| `GET /api/map/edition/{id}` | `GET /map/edition/{id}` | `uTwinClient.map().getEdition()` | **New** |
| `GET /api/map/edition/{id}/charging-stations` | `GET /map/edition/{id}/charging-stations` | `uTwinClient.map().getChargingStations()` | **New** |
| `GET /api/map/nav-path/page` | `GET /map/nav-path/page` | `uTwinClient.map().navPath().list()` + `.getPoints()` | **New** |
| `GET /api/map/topo-path/page` | `GET /map/topo-path/page` | `uTwinClient.map().topoPath().list()` + `.getPoints()` | **New** |

## SDK API Surface (decompiled from JAR)

### RobotClient

```java
// uTwinClient.robot()
listRobots(ListRobotsRequest) → ListRobotsResponse          // .data(): List<RobotItem>, .total(), .pageNum(), .pageSize()
getRobotRuntime(GetRobotRuntimeRequest) → GetRobotRuntimeResponse  // .runtime(): Map<String, Object>
sendCommand(SendCommandRequest) → SendCommandResponse        // .taskId(): String
getTaskResult(GetTaskResultRequest) → GetTaskResultResponse  // .data(): List<TaskReply>

// GetRobotRuntimeRequest.builder().robotId(String).build()
// SendCommandRequest.builder().robotId(String).type(Integer).messagesType(String).params(Object).callbackUrl(String).build()
// GetTaskResultRequest.builder().robotId(String).taskIds(List<String>).build()

// TaskReply: .taskId(), .taskStatus(), .messagesType(), .commandRespList(): List<TaskCommandResponse>
// TaskCommandResponse: .status(), .result(): Object, .description(), .taskCommandCode(), .taskCommandId()
```

### MapClient

```java
// uTwinClient.map()
listEditions(ListMapEditionsRequest) → ListMapEditionsResponse  // .data(): List<MapEdition>
getEdition(GetMapEditionRequest) → GetMapEditionResponse        // .edition(): MapEdition
getChargingStations(GetChargingStationsRequest) → GetChargingStationsResponse  // .data(): List<MapPoint>

// ListMapEditionsRequest.builder().mapId(String).build()
// GetMapEditionRequest.builder().editionId(String).build()
// GetChargingStationsRequest.builder().editionId(String).build()

// MapEdition: .id(), .mapId(), .name(), .mapName(), .createTime(), .globalMap(), .groundMap(), .bim(): Map<String, Object>
// MapPoint: .id(), .uuid(), .name(), .x(), .y(), .z(), .rotationX(), .rotationY(), .rotationZ(), .editionId(), .editionName()
```

### NavPathClient & TopoPathClient

```java
// uTwinClient.map().navPath()
list(ListNavPathsRequest) → ListNavPathsResponse          // extends PageResponse<NavPathItem>
getPoints(GetNavPathPointsRequest) → GetNavPathPointsResponse  // .detail(): NavPathDetail

// ListNavPathsRequest.builder().editionId(String).pageNum(Integer).pageSize(Integer).build()
// GetNavPathPointsRequest.builder().id(String).build()
// NavPathItem: .uuid(), .name(), .mapId(), .createTime()
// NavPathDetail: .id(), .uuid(), .name(), .editionId(), .editionName(), .mapId(), .mapName(), .nodes(): List<NavPathNode>
// NavPathNode: .id(), .uuid(), .name(), .order(), .position(): Map, .orientation(): Map

// uTwinClient.map().topoPath()
list(ListTopoPathsRequest) → ListTopoPathsResponse        // extends PageResponse<TopoPathItem>
getPoints(GetTopoPathPointsRequest) → GetTopoPathPointsResponse  // .detail(): TopoPathDetail

// ListTopoPathsRequest.builder().editionId(String).pageNum(Integer).pageSize(Integer).build()
// GetTopoPathPointsRequest.builder().id(String).build()
// TopoPathItem: .uuid(), .name(), .mapId(), .createTime()
// TopoPathDetail: .id(), .uuid(), .name(), .editionId(), .editionName(), .mapId(), .mapName(), .nodes(), .edges()
// TopoPathNode: .id(), .uuid(), .name(), .order(), .position(): Map, .orientation(): Map
// TopoPathEdge: .id(), .snode(), .enode(), .passable()
```

## File Structure

### New files
- `backend/src/main/resources/application.yml` — Spring config + uTwin credentials
- `backend/src/main/java/com/bwton/urobot/application/MapService.java` — Map/edition/path business logic
- `backend/src/main/java/com/bwton/urobot/interfaces/api/RobotHandler.java` — Robot runtime/command/task-result endpoints
- `backend/src/main/java/com/bwton/urobot/interfaces/api/MapHandler.java` — Map/edition/path endpoints
- `backend/src/main/java/com/bwton/urobot/interfaces/request/SendCommandBody.java` — Command request body DTO

### Modified files
- `backend/src/main/java/com/bwton/urobot/application/RobotService.java` — Add runtime, sendCommand, getTaskResult
- `backend/src/main/java/com/bwton/urobot/infrastructure/config/URobotConfiguration.java` — Use application.yml props, add Jackson config
- `backend/src/main/java/com/bwton/urobot/infrastructure/lang/Result.java` — Add static factory `ok(T)`
- `backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java` — Simplify using `Result.ok()`

### Deleted files
- `backend/src/main/java/com/bwton/urobot/domain/robot/RobotRepository.java` — Empty, unused
- `backend/src/main/java/com/bwton/urobot/domain/map/MapRepository.java` — Empty, unused

### Frontend fix
- `frontend/src/services/api/robotApi.ts` — Fix task-result query param encoding

## Key Design Decisions

1. **Map responses use `Map<String, Object>`** — SDK models use record-style accessors (`id()` not `getId()`), so Jackson can't serialize them as beans. We convert to Maps in the service layer.
2. **Nav/topo path list endpoints fetch detail** — The list SDK response (`NavPathItem`/`TopoPathItem`) only returns uuid/name/mapId. The frontend needs nodes/edges for 3D rendering, so we call `.getPoints()` for each item.
3. **Jackson snake_case naming** — Ensures `Page` fields (`totalCount` → `total_count`) match the frontend's `PageResult` type. `RobotResponse` fields also get snake_cased.
4. **Result.ok() factory** — Reduces boilerplate in all controllers.

---

## Task 1: Add application.yml and fix configuration

**Files:**
- Create: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/java/com/bwton/urobot/infrastructure/config/URobotConfiguration.java`
- Modify: `backend/src/main/java/com/bwton/urobot/infrastructure/lang/Result.java`

- [x] **Step 1: Create application.yml**

Write `backend/src/main/resources/application.yml`:

```yaml
server:
  port: 8080

utwin:
  access-key: ${UTWIN_ACCESS_KEY:}
  secret-key: ${UTWIN_SECRET_KEY:}
  endpoint: ${UTWIN_ENDPOINT:https://dev.bwton.cn/cps-dev01}
```

- [x] **Step 2: Update URobotConfiguration**

Replace the entire file `backend/src/main/java/com/bwton/urobot/infrastructure/config/URobotConfiguration.java`:

```java
package com.bwton.urobot.infrastructure.config;

import com.bwton.utwin.opensdk.core.auth.AccessKeyCredentials;
import com.bwton.utwin.opensdk.core.auth.CredentialsProvider;
import com.bwton.utwin.opensdk.services.UTwinClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class URobotConfiguration {

    @Value("${utwin.access-key}")
    private String accessKey;
    @Value("${utwin.secret-key}")
    private String secretKey;
    @Value("${utwin.endpoint}")
    private String endpoint;

    @Bean
    public UTwinClient uTwinClient() {
        CredentialsProvider provider = () -> AccessKeyCredentials.of(accessKey, secretKey);
        return UTwinClient.builder()
                .credentialsProvider(provider)
                .endpoint(endpoint)
                .build();
    }

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder.propertyNamingStrategy(
                com.fasterxml.jackson.databind.PropertyNamingStrategies.SNAKE_CASE);
    }
}
```

- [x] **Step 3: Add Result.ok() static factory**

Add this method to `backend/src/main/java/com/bwton/urobot/infrastructure/lang/Result.java` after the existing constructors:

```java
public static <T> Result<T> ok(T data) {
    Result<T> r = new Result<>();
    r.setSuccess(true);
    r.setResult(data);
    return r;
}
```

- [x] **Step 4: Verify build**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [x] **Step 5: Commit**

```bash
git add backend/src/main/resources/application.yml \
  backend/src/main/java/com/bwton/urobot/infrastructure/config/URobotConfiguration.java \
  backend/src/main/java/com/bwton/urobot/infrastructure/lang/Result.java
git commit -m "feat: add application.yml, Jackson snake_case config, Result.ok() factory"
```

---

## Task 2: Expand RobotService with runtime, command, task-result

**Files:**
- Modify: `backend/src/main/java/com/bwton/urobot/application/RobotService.java`
- Create: `backend/src/main/java/com/bwton/urobot/interfaces/request/SendCommandBody.java`

- [x] **Step 1: Create SendCommandBody DTO**

Write `backend/src/main/java/com/bwton/urobot/interfaces/request/SendCommandBody.java`:

```java
package com.bwton.urobot.interfaces.request;

public class SendCommandBody {
    private Integer type;
    private String messagesType;
    private Object params;
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

    public Object getParams() {
        return params;
    }

    public void setParams(Object params) {
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

- [x] **Step 2: Expand RobotService**

Replace the entire file `backend/src/main/java/com/bwton/urobot/application/RobotService.java`:

```java
package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.interfaces.request.SendCommandBody;
import com.bwton.urobot.interfaces.response.RobotResponse;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.robot.model.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RobotService {
    private final UTwinClient uTwinClient;

    public RobotService(UTwinClient uTwinClient) {
        this.uTwinClient = uTwinClient;
    }

    public Mono<Page<RobotResponse>> page(PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListRobotsRequest request = ListRobotsRequest.builder()
                    .pageSize(query.getPageSize())
                    .pageNum(query.getPageNo())
                    .build();
            ListRobotsResponse listRobotsResponse = uTwinClient.robot().listRobots(request);
            return listRobotsResponse;
        }).map(response -> {
            List<RobotItem> list = response.data();
            Page<RobotResponse> page = new Page<>();
            page.setPageNo(response.pageNum());
            page.setPageSize(response.pageSize());
            page.setRows(list.stream()
                    .map(RobotResponse::from)
                    .collect(Collectors.toList()));
            page.setTotalCount(Math.toIntExact(response.total()));
            page.setTotalPage((int) Math.ceil((double) response.total() / response.pageSize()));
            return page;
        });
    }

    public Mono<Map<String, Object>> getRobotRuntime(String robotId) {
        return Mono.fromSupplier(() -> {
            GetRobotRuntimeRequest request = GetRobotRuntimeRequest.builder()
                    .robotId(robotId)
                    .build();
            return uTwinClient.robot().getRobotRuntime(request).runtime();
        });
    }

    public Mono<String> sendCommand(String robotId, SendCommandBody body) {
        return Mono.fromSupplier(() -> {
            SendCommandRequest request = SendCommandRequest.builder()
                    .robotId(robotId)
                    .type(body.getType())
                    .messagesType(body.getMessagesType())
                    .params(body.getParams())
                    .callbackUrl(body.getCallbackUrl())
                    .build();
            return uTwinClient.robot().sendCommand(request).taskId();
        });
    }

    public Mono<List<Map<String, Object>>> getTaskResult(String robotId, List<String> taskIds) {
        return Mono.fromSupplier(() -> {
            GetTaskResultRequest request = GetTaskResultRequest.builder()
                    .robotId(robotId)
                    .taskIds(taskIds)
                    .build();
            List<TaskReply> replies = uTwinClient.robot().getTaskResult(request).data();
            return replies.stream().map(this::taskReplyToMap).collect(Collectors.toList());
        });
    }

    private Map<String, Object> taskReplyToMap(TaskReply reply) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("task_id", reply.taskId());
        map.put("task_status", reply.taskStatus());
        map.put("messages_type", reply.messagesType());
        if (reply.commandRespList() != null) {
            map.put("command_resp_list", reply.commandRespList().stream().map(cmd -> {
                Map<String, Object> cmdMap = new LinkedHashMap<>();
                cmdMap.put("status", cmd.status());
                cmdMap.put("result", cmd.result());
                cmdMap.put("description", cmd.description());
                cmdMap.put("task_command_code", cmd.taskCommandCode());
                cmdMap.put("task_command_id", cmd.taskCommandId());
                return cmdMap;
            }).collect(Collectors.toList()));
        }
        return map;
    }
}
```

- [x] **Step 3: Verify build**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [x] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bwton/urobot/application/RobotService.java \
  backend/src/main/java/com/bwton/urobot/interfaces/request/SendCommandBody.java
git commit -m "feat: add robot runtime, command, task-result to RobotService"
```

---

## Task 3: Create RobotHandler controller

**Files:**
- Create: `backend/src/main/java/com/bwton/urobot/interfaces/api/RobotHandler.java`
- Modify: `backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java`

- [x] **Step 1: Create RobotHandler**

Write `backend/src/main/java/com/bwton/urobot/interfaces/api/RobotHandler.java`:

```java
package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.RobotService;
import com.bwton.urobot.infrastructure.lang.Result;
import com.bwton.urobot.interfaces.request.SendCommandBody;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("robot")
public class RobotHandler {
    private final RobotService service;

    public RobotHandler(RobotService service) {
        this.service = service;
    }

    @GetMapping("runtime/{robotId}")
    public Mono<Result<Map<String, Object>>> runtime(@PathVariable String robotId) {
        return service.getRobotRuntime(robotId).map(Result::ok);
    }

    @PostMapping("command/{robotId}")
    public Mono<Result<String>> command(@PathVariable String robotId,
                                         @RequestBody SendCommandBody body) {
        return service.sendCommand(robotId, body).map(Result::ok);
    }

    @GetMapping("task-result/{robotId}")
    public Mono<Result<List<Map<String, Object>>>> taskResult(
            @PathVariable String robotId,
            @RequestParam("taskIds") List<String> taskIds) {
        return service.getTaskResult(robotId, taskIds).map(Result::ok);
    }
}
```

- [x] **Step 2: Simplify BaseHanlder using Result.ok()**

Replace `backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java`:

```java
package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.RobotService;
import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.infrastructure.lang.Result;
import com.bwton.urobot.interfaces.response.RobotResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("robot")
public class BaseHanlder {
    private final RobotService service;

    public BaseHanlder(RobotService service) {
        this.service = service;
    }

    @GetMapping(value = "page")
    public Mono<Result<Page<RobotResponse>>> page(@ModelAttribute PageQuery pageQuery) {
        return service.page(pageQuery).map(Result::ok);
    }
}
```

- [x] **Step 3: Verify build**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [x] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bwton/urobot/interfaces/api/RobotHandler.java \
  backend/src/main/java/com/bwton/urobot/interfaces/api/BaseHanlder.java
git commit -m "feat: add RobotHandler with runtime, command, task-result endpoints"
```

---

## Task 4: Create MapService

**Files:**
- Create: `backend/src/main/java/com/bwton/urobot/application/MapService.java`

- [x] **Step 1: Implement MapService**

Write `backend/src/main/java/com/bwton/urobot/application/MapService.java`:

```java
package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.map.model.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MapService {
    private final UTwinClient uTwinClient;

    public MapService(UTwinClient uTwinClient) {
        this.uTwinClient = uTwinClient;
    }

    public Mono<List<Map<String, Object>>> listEditions(String mapId) {
        return Mono.fromSupplier(() -> {
            ListMapEditionsRequest req = ListMapEditionsRequest.builder()
                    .mapId(mapId).build();
            List<MapEdition> editions = uTwinClient.map().listEditions(req).data();
            return editions.stream().map(this::editionToMap).collect(Collectors.toList());
        });
    }

    public Mono<List<Map<String, Object>>> getEdition(String editionId) {
        return Mono.fromSupplier(() -> {
            GetMapEditionRequest req = GetMapEditionRequest.builder()
                    .editionId(editionId).build();
            MapEdition edition = uTwinClient.map().getEdition(req).edition();
            return Collections.singletonList(editionToMap(edition));
        });
    }

    public Mono<List<Map<String, Object>>> getChargingStations(String editionId) {
        return Mono.fromSupplier(() -> {
            GetChargingStationsRequest req = GetChargingStationsRequest.builder()
                    .editionId(editionId).build();
            List<MapPoint> points = uTwinClient.map().getChargingStations(req).data();
            return points.stream().map(this::pointToMap).collect(Collectors.toList());
        });
    }

    public Mono<Page<Map<String, Object>>> listNavPaths(String editionId, PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListNavPathsRequest req = ListNavPathsRequest.builder()
                    .editionId(editionId)
                    .pageNum(query.getPageNo())
                    .pageSize(query.getPageSize())
                    .build();
            ListNavPathsResponse resp = (ListNavPathsResponse) uTwinClient.map().navPath().list(req);

            List<Map<String, Object>> rows = resp.data().stream().map(item -> {
                GetNavPathPointsResponse detail = uTwinClient.map().navPath().getPoints(
                        GetNavPathPointsRequest.builder().id(item.uuid()).build());
                return navPathDetailToMap(detail.detail());
            }).collect(Collectors.toList());

            Page<Map<String, Object>> page = new Page<>();
            page.setRows(rows);
            page.setTotalCount(resp.total().intValue());
            page.setPageNo(resp.pageNum());
            page.setPageSize(resp.pageSize());
            page.setTotalPage((int) Math.ceil((double) resp.total() / resp.pageSize()));
            return page;
        });
    }

    public Mono<Page<Map<String, Object>>> listTopoPaths(String editionId, PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListTopoPathsRequest req = ListTopoPathsRequest.builder()
                    .editionId(editionId)
                    .pageNum(query.getPageNo())
                    .pageSize(query.getPageSize())
                    .build();
            ListTopoPathsResponse resp = (ListTopoPathsResponse) uTwinClient.map().topoPath().list(req);

            List<Map<String, Object>> rows = resp.data().stream().map(item -> {
                GetTopoPathPointsResponse detail = uTwinClient.map().topoPath().getPoints(
                        GetTopoPathPointsRequest.builder().id(item.uuid()).build());
                return topoPathDetailToMap(detail.detail());
            }).collect(Collectors.toList());

            Page<Map<String, Object>> page = new Page<>();
            page.setRows(rows);
            page.setTotalCount(resp.total().intValue());
            page.setPageNo(resp.pageNum());
            page.setPageSize(resp.pageSize());
            page.setTotalPage((int) Math.ceil((double) resp.total() / resp.pageSize()));
            return page;
        });
    }

    private Map<String, Object> editionToMap(MapEdition e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.id());
        m.put("mapId", e.mapId());
        m.put("name", e.name());
        m.put("mapName", e.mapName());
        m.put("createTime", e.createTime());
        m.put("globalMap", e.globalMap());
        m.put("groundMap", e.groundMap());
        m.put("bim", e.bim());
        return m;
    }

    private Map<String, Object> pointToMap(MapPoint p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.id());
        m.put("uuid", p.uuid());
        m.put("name", p.name());
        m.put("x", p.x());
        m.put("y", p.y());
        m.put("z", p.z());
        m.put("rotationX", p.rotationX());
        m.put("rotationY", p.rotationY());
        m.put("rotationZ", p.rotationZ());
        m.put("editionId", p.editionId());
        m.put("editionName", p.editionName());
        return m;
    }

    private Map<String, Object> navPathDetailToMap(NavPathDetail d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.id());
        m.put("uuid", d.uuid());
        m.put("name", d.name());
        m.put("mapId", d.mapId());
        m.put("mapName", d.mapName());
        m.put("editionId", d.editionId());
        m.put("editionName", d.editionName());
        if (d.nodes() != null) {
            m.put("nodes", d.nodes().stream().map(n -> {
                Map<String, Object> nm = new LinkedHashMap<>();
                nm.put("id", n.id());
                nm.put("uuid", n.uuid());
                nm.put("name", n.name());
                nm.put("order", n.order());
                nm.put("position", n.position());
                nm.put("orientation", n.orientation());
                return nm;
            }).collect(Collectors.toList()));
        }
        return m;
    }

    private Map<String, Object> topoPathDetailToMap(TopoPathDetail d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.id());
        m.put("uuid", d.uuid());
        m.put("name", d.name());
        m.put("mapId", d.mapId());
        m.put("mapName", d.mapName());
        m.put("editionId", d.editionId());
        m.put("editionName", d.editionName());
        if (d.nodes() != null) {
            m.put("nodes", d.nodes().stream().map(n -> {
                Map<String, Object> nm = new LinkedHashMap<>();
                nm.put("id", n.id());
                nm.put("uuid", n.uuid());
                nm.put("name", n.name());
                nm.put("order", n.order());
                nm.put("position", n.position());
                nm.put("orientation", n.orientation());
                return nm;
            }).collect(Collectors.toList()));
        }
        if (d.edges() != null) {
            m.put("edges", d.edges().stream().map(e -> {
                Map<String, Object> em = new LinkedHashMap<>();
                em.put("id", e.id());
                em.put("snode", e.snode());
                em.put("enode", e.enode());
                em.put("passable", e.passable());
                return em;
            }).collect(Collectors.toList()));
        }
        return m;
    }
}
```

- [x] **Step 2: Verify build**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [x] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bwton/urobot/application/MapService.java
git commit -m "feat: add MapService with edition, charging, nav-path, topo-path"
```

---

## Task 5: Create MapHandler controller

**Files:**
- Create: `backend/src/main/java/com/bwton/urobot/interfaces/api/MapHandler.java`

- [x] **Step 1: Implement MapHandler**

Write `backend/src/main/java/com/bwton/urobot/interfaces/api/MapHandler.java`:

```java
package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.MapService;
import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.infrastructure.lang.Result;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("map")
public class MapHandler {
    private final MapService mapService;

    public MapHandler(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping("{mapId}/editions")
    public Mono<Result<List<Map<String, Object>>>> listEditions(@PathVariable String mapId) {
        return mapService.listEditions(mapId).map(Result::ok);
    }

    @GetMapping("edition/{editionId}")
    public Mono<Result<List<Map<String, Object>>>> getEdition(@PathVariable String editionId) {
        return mapService.getEdition(editionId).map(Result::ok);
    }

    @GetMapping("edition/{editionId}/charging-stations")
    public Mono<Result<List<Map<String, Object>>>> chargingStations(@PathVariable String editionId) {
        return mapService.getChargingStations(editionId).map(Result::ok);
    }

    @GetMapping("nav-path/page")
    public Mono<Result<Page<Map<String, Object>>>> navPathPage(
            @RequestParam String editionId,
            @ModelAttribute PageQuery pageQuery) {
        return mapService.listNavPaths(editionId, pageQuery).map(Result::ok);
    }

    @GetMapping("topo-path/page")
    public Mono<Result<Page<Map<String, Object>>>> topoPathPage(
            @RequestParam String editionId,
            @ModelAttribute PageQuery pageQuery) {
        return mapService.listTopoPaths(editionId, pageQuery).map(Result::ok);
    }
}
```

- [x] **Step 2: Verify build**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [x] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bwton/urobot/interfaces/api/MapHandler.java
git commit -m "feat: add MapHandler with edition, charging, nav-path, topo-path endpoints"
```

---

## Task 6: Clean up unused domain classes

**Files:**
- Delete: `backend/src/main/java/com/bwton/urobot/domain/robot/RobotRepository.java`
- Delete: `backend/src/main/java/com/bwton/urobot/domain/map/MapRepository.java`

- [x] **Step 1: Delete empty domain classes**

```bash
git rm backend/src/main/java/com/bwton/urobot/domain/robot/RobotRepository.java
git rm backend/src/main/java/com/bwton/urobot/domain/map/MapRepository.java
```

- [x] **Step 2: Verify build**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [x] **Step 3: Commit**

```bash
git commit -m "chore: remove unused empty domain repository classes"
```

---

## Task 7: Frontend — fix task-result query params encoding

**Files:**
- Modify: `frontend/src/services/api/robotApi.ts`

The current `getTaskResults` builds query params as `taskIds[0]=x&taskIds[1]=y`, but Spring's `@RequestParam("taskIds") List<String>` expects `taskIds=x&taskIds=y`.

- [x] **Step 1: Fix getTaskResults params**

In `frontend/src/services/api/robotApi.ts`, change the `getTaskResults` function from:

```typescript
export async function getTaskResults(robotId: string, taskIds: string[]) {
  const params = Object.fromEntries(taskIds.map((taskId, index) => [`taskIds[${index}]`, taskId]));

  return apiRequest<TaskResult[]>({
    method: 'GET',
    url: `/robot/task-result/${robotId}`,
    params,
    fallbackData: taskIds.map((taskId) => createMockTaskResult(taskId)),
  });
}
```

To:

```typescript
export async function getTaskResults(robotId: string, taskIds: string[]) {
  const params = new URLSearchParams();
  taskIds.forEach((taskId) => params.append('taskIds', taskId));

  return apiRequest<TaskResult[]>({
    method: 'GET',
    url: `/robot/task-result/${robotId}`,
    params,
    fallbackData: taskIds.map((taskId) => createMockTaskResult(taskId)),
  });
}
```

- [x] **Step 2: Run frontend tests**

Run: `cd frontend && npm test`
Expected: All tests pass

- [x] **Step 3: Commit**

```bash
git add frontend/src/services/api/robotApi.ts
git commit -m "fix: align task-result query params with Spring @RequestParam format"
```

---

## Task 8: Full build verification

- [x] **Step 1: Backend full compile**

Run: `cd backend && mvn clean compile`
Expected: BUILD SUCCESS

- [x] **Step 2: Frontend lint, test, and build**

Run: `cd frontend && npm run lint && npm test && npm run build`
Expected: All pass

- [x] **Step 3: Verify endpoint list**

Manually confirm all 9 endpoints are wired:
- `BaseHanlder`: `GET /robot/page`
- `RobotHandler`: `GET /robot/runtime/{id}`, `POST /robot/command/{id}`, `GET /robot/task-result/{id}`
- `MapHandler`: `GET /map/{mapId}/editions`, `GET /map/edition/{id}`, `GET /map/edition/{id}/charging-stations`, `GET /map/nav-path/page`, `GET /map/topo-path/page`

---

## Verification

1. **Backend compile**: `cd backend && mvn clean compile` — should succeed
2. **Frontend build**: `cd frontend && npm run build` — should succeed
3. **Frontend tests**: `cd frontend && npm test` — all pass
4. **Integration test** (if UTWIN credentials available):
   - Start backend: `UTWIN_ACCESS_KEY=xxx UTWIN_SECRET_KEY=yyy cd backend && mvn spring-boot:run`
   - Start frontend: `cd frontend && npm run dev`
   - Open http://localhost:5173 — ApiDebugDrawer should show "real" source instead of "mock"
   - Select a robot — runtime card should show live data
   - Click nav/topo path controls — should load from backend
