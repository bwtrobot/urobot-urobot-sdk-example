## 业务约定

- 机器人操作需完整的任务闭环：下发指令后必须通过 QueryTask 监控任务最终状态
- 指令通过 `commandCode` 标识（navigation、topology_navigation、robot_tts、charge_manager 等），由前端 `robotApi.ts` 中的 `buildCommandPayload()` 构造标准任务结构