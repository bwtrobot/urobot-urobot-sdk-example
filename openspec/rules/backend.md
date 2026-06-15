## 常用命令

### 后端 (backend/)

```bash
cd backend
mvn compile          # 编译 (Java 8)
mvn package          # 打包
```

后端依赖 `utwin-opensdk-core` 和 `utwin-opensdk-services` (SNAPSHOT)，需配置环境变量 `UTWIN_ACCESS_KEY`、`UTWIN_SECRET_KEY`、`UTWIN_ENDPOINT`。

## 架构

### 后端

- **技术栈**: Spring Boot 2.7 WebFlux (响应式)，Java 8
- **分层**: `interfaces/api/` (Handler) → `application/` (Service) → uTwin OpenSDK
- **核心端点** (前缀 `/robot`):
    - `GET /robot/runtime/{robotId}` — 机器人运行时状态
    - `POST /robot/command/{robotId}` — 下发指令
    - `POST /command/{robotId}/xxx/xxx(特定名称)` — 下发指令(优先使用)
    - `GET /robot/task-result/{robotId}?taskIds[0]=&taskIds[1]=` — 查询任务结果（Spring indexed 数组格式，前端需按批次分片避免 GET URL 超长）
    - `GET /map/edition/{mapId}` — 地图版本数据

