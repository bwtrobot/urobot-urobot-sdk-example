# urobot-urobot-sdk-example
uRobot SDK Example 是 uTwin 机器人平台的全栈 SDK 示例应用。项目初始状态仅有一个 Spring Boot WebFlux 后端脚手架（含机器人列表端点）和空白前端。需要补全完整的前后端链路，包括 3D 空间可视化、机器人执行控制、后端 API 端点。  当前后端使用 Java 8 / Spring Boot WebFlux，依赖内部 `utwin-opensdk-core` 和 `utwin-opensdk-services`。前端基于 React 18 / Vite / TypeScript，3D 渲染使用 SoonSpace.js（内置 Three.js）。
