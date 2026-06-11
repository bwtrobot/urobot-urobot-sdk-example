## 1. 前端项目脚手架

- [x] 1.1 创建 frontend/ 项目结构：package.json、index.html、tsconfig、vite.config、vitest.setup
- [x] 1.2 创建 App shell：main.tsx、App.tsx、App.css
- [x] 1.3 安装依赖并验证 `npm run build` 通过

## 2. 前端共享类型与工具

- [x] 2.1 创建 shared/types/api.ts — 全部 API 类型定义（Robot、Runtime、Map、Path、Command、Task）
- [x] 2.2 创建 shared/utils/pose.ts — robotToThreeMatrix、rosPositionToThree、rosQuaternionToThree
- [x] 2.3 编写 pose.test.ts 单元测试并验证通过

## 3. 前端 API 客户端与 Mock 降级

- [x] 3.1 创建 services/mock/mockData.ts — 机器人、运行时、地图版本、路径等 Mock 数据
- [x] 3.2 创建 services/api/httpClient.ts — axios 实例、apiRequest 包装器、日志存储与订阅
- [x] 3.3 编写 httpClient.test.ts 测试（真实成功、Mock 降级、日志订阅）
- [x] 3.4 创建 services/api/robotApi.ts — listRobots、getRobotRuntime、sendRobotCommand、getTaskResults
- [x] 3.5 创建 services/api/mapApi.ts — getMapEditions、getMapEdition、getChargingPoints、listNavigationPaths、listTopologyPaths
- [x] 3.6 编写 robotApi.test.ts 测试 buildCommandPayload

## 4. 前端空间场景适配器

- [x] 4.1 创建 features/spatial-viewer/lib/spatialScene.ts — SoonSpaceSceneAdapter 实现（SoonSpace 初始化、PCD 加载、BIM 加载、机器人 Mesh、路径渲染）
- [x] 4.2 创建 features/spatial-viewer/components/LayerDropdown.tsx — 图层可见性控制
- [x] 4.3 创建 features/spatial-viewer/components/RenderDropdown.tsx — 渲染参数控制
- [x] 4.4 创建 features/spatial-viewer/components/SpatialViewer.tsx — 场景容器与控件组合
- [x] 4.5 创建 spatial-viewer.css 样式
- [x] 4.6 编写 LayerDropdown.test.tsx 测试

## 5. 前端机器人执行组件

- [x] 5.1 创建 features/robot-execution/hooks/useRobotWorkbench.ts — 数据编排 hook（机器人加载、运行时轮询、地图数据加载、指令发送与任务轮询闭环）
- [x] 5.2 创建 MotionPad.tsx — 运动方向键
- [x] 5.3 创建 RobotStatusCard.tsx — 状态卡片
- [x] 5.4 创建 NavigationTargetPanel.tsx — 导航目标选择
- [x] 5.5 创建 CommandPanel.tsx — 快捷指令面板
- [x] 5.6 创建 TaskTimeline.tsx — 任务时间线
- [x] 5.7 创建 robot-execution.css 样式
- [x] 5.8 编写 MotionPad.test.tsx 测试

## 6. 前端页面组合与调试面板

- [x] 6.1 创建 shared/components/ApiDebugDrawer.tsx — 可折叠 API 调试面板
- [x] 6.2 创建 pages/workbench/SpatialWorkbenchPage.tsx — 空间工作台页面
- [x] 6.3 创建 spatial-workbench-page.css 样式
- [x] 6.4 修改 App.tsx 挂载 SpatialWorkbenchPage
- [x] 6.5 验证 `npm run build` 和 `npm test` 通过

## 7. 后端配置与基础设施

- [x] 7.1 创建 backend/src/main/resources/application.yml — 端口、uTwin 凭证配置
- [x] 7.2 修改 URobotConfiguration.java — 使用 @Value 注入配置、添加 Jackson SNAKE_CASE 配置
- [x] 7.3 修改 Result.java — 添加 Result.ok() 静态工厂方法
- [x] 7.4 创建 GlobalExceptionHandler.java — 全局异常处理器
- [x] 7.5 验证 `mvn compile` 通过

## 8. 后端机器人 API 端点

- [x] 8.1 创建 SendCommandBody.java — 指令请求体 DTO（params 为 Map<String, Object>）
- [x] 8.2 扩展 RobotService.java — 添加 getRobotRuntime、sendCommand、getTaskResult 方法（所有方法使用 subscribeOn(boundedElastic)）
- [x] 8.3 创建 RobotHandler.java — runtime、command、task-result 三个端点
- [x] 8.4 简化 BaseHandler.java（原 BaseHanlder），使用 Result.ok()
- [x] 8.5 验证 `mvn compile` 通过

## 9. 后端地图 API 端点

- [x] 9.1 创建 MapService.java — listEditions、getEdition、getChargingStations、listNavPaths、listTopoPaths（含 SDK 模型转 Map、subscribeOn(boundedElastic)）
- [x] 9.2 创建 MapHandler.java — 5 个地图端点
- [x] 9.3 删除空的 RobotRepository.java 和 MapRepository.java
- [x] 9.4 验证 `mvn compile` 通过

## 10. SoonSpace.js 渲染引擎替换

- [x] 10.1 安装 @soonspacejs/plugin-cps-soonmanager 及其 peer dependencies
- [x] 10.2 重写 pose.ts — robotToThreeMatrix 矩阵变换替换原有简单映射
- [x] 10.3 重写 spatialScene.ts — SoonSpaceSceneAdapter 替换 ThreeSpatialSceneAdapter（SoonSpace 初始化、PCDLoader 加载、CPS BIM 加载、坐标变换统一）
- [x] 10.4 修复所有引用旧 pose API 的代码
- [x] 10.5 验证 `npm run build`、`npm test` 通过

## 11. 全量验证

- [x] 11.1 后端编译验证 `mvn clean compile`
- [x] 11.2 前端 lint + 测试 + 构建验证 `npm run lint && npm test && npm run build`
- [x] 11.3 浏览器端到端验证：3D 场景、图层控制、渲染设置、指令发送、任务轮询、Mock 降级