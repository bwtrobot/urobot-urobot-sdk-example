# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 机器人操作代码强约定

1、业务需完整的任务闭环要QueryTask监控任务最终状态;

## Project Overview

uRobot SDK Example — a full-stack demo app for the uTwin robot platform. It shows how to use the `utwin-opensdk` Java libraries to list robots, send commands, and visualize robot state in a 3D spatial workbench.

## Build & Run

### Backend (Java 8 / Spring Boot WebFlux / Maven)
```bash
cd backend
mvn clean package          # build
mvn spring-boot:run        # run on :8080
```
Depends on internal artifacts `utwin-opensdk-core` and `utwin-opensdk-services` (1.0.0-SNAPSHOT) — must be available in local Maven repo or a configured Nexus.

### Frontend (React 18 / TypeScript / Vite)
```bash
cd frontend
npm install
npm run dev                # dev server on :5173, proxies /api → localhost:8080
npm run build              # production build (tsc -b && vite build)
npm run lint               # type-check only (tsc --noEmit)
npm test                   # vitest run (single pass)
npm run test:watch         # vitest in watch mode
```

## Architecture

### Backend
Layered DDD-lite structure under `com.bwton.urobot`:
- **interfaces/** — REST controllers (WebFlux `@RestController`). `BaseHanlder` serves `/robot/page`.
- **application/** — `RobotService` orchestrates calls to `UTwinClient` from the opensdk.
- **domain/** — Repository interfaces (`RobotRepository`, `MapRepository`).
- **infrastructure/** — Config (`URobotConfiguration` wires `UTwinClient`), utilities (`YamlUtils`), shared types (`Result`, `Page`, `PageQuery`).

All endpoints return `Mono<Result<T>>` (reactive).

### Frontend
Feature-sliced layout under `frontend/src/`:
- **pages/workbench/** — `SpatialWorkbenchPage` is the single-page entry point.
- **features/spatial-viewer/** — Three.js-based 3D viewer (`spatialScene.ts` = `ThreeSpatialSceneAdapter`). Renders BIM placeholders, point clouds, navigation/topology paths, and a robot mesh. Has a `SoonSpaceIntegrationPoint` stub for future SoonSpaceJS asset loading.
- **features/robot-execution/** — Robot control UI: `CommandPanel`, `MotionPad`, `NavigationTargetPanel`, `RobotStatusCard`, `TaskTimeline`. Core logic lives in `useRobotWorkbench` hook.
- **services/api/** — `httpClient.ts` wraps axios with an `apiRequest<T>()` function that auto-falls back to mock data on network failure (graceful degradation). `robotApi.ts` and `mapApi.ts` define all API calls.
- **services/mock/** — Mock data used when the backend is unreachable. The app enters "demo mode" automatically.
- **shared/types/api.ts** — All API type definitions (robot, map, path, command, task types). Uses dual snake_case/camelCase fields for backend compatibility.
- **shared/utils/pose.ts** — Coordinate transforms between ROS odom poses and Three.js scene coordinates.

### API Proxy
Vite dev server proxies `/api/*` to `http://localhost:8080` with path rewrite (strips `/api` prefix). Frontend code uses `/api` as the base URL via `VITE_API_BASE_URL` env var.

## Key Patterns

- **Graceful mock fallback**: Every API call provides `fallbackData`. If the backend is down, the frontend works fully in demo mode with mock data. The `ApiDebugDrawer` component shows real vs mock request status.
- **ROS coordinate conventions**: The backend uses ROS coordinate frames; `pose.ts` converts quaternion orientations to Euler angles for Three.js (Y-up). When working with positions, note the axis swap: ROS Y → Three.js Z.
- **Reactive backend**: All backend endpoints use Project Reactor (`Mono`/`Flux`). `Mono.fromSupplier()` wraps blocking SDK calls.

## Testing

Frontend tests use Vitest + jsdom + React Testing Library. Test globals are enabled (`vitest/globals`). Setup file imports `@testing-library/jest-dom/vitest` matchers.