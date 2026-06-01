# Frontend Spatial Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React/Vite frontend SDK Web example with a single-robot spatial workbench, BIM/PCD rendering controls, robot execution controls, API logging, and Mock fallback.

**Architecture:** Use a layered frontend under `frontend/src`: app shell, workbench page, robot execution feature, spatial viewer feature, API services, Mock services, and shared utilities. Backend calls are centralized in `services/api`; spatial rendering is isolated behind `features/spatial-viewer`; business pages later reuse those layers.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library, Axios, SoonSpaceJS, Three.js, lucide-react.

---

## File Structure

- Create `frontend/index.html`: Vite HTML entry.
- Replace `frontend/package.json`: scripts and dependencies.
- Create `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/vitest.setup.ts`: TypeScript, Vite, and Vitest configuration.
- Create `frontend/src/main.tsx`, `frontend/src/app/App.tsx`, `frontend/src/app/App.css`: app bootstrap and global layout.
- Create `frontend/src/shared/types/api.ts`: backend result, page, robot, runtime, map, task, and command types.
- Create `frontend/src/shared/utils/pose.ts`: pose conversion helpers for scene overlays.
- Create `frontend/src/services/mock/mockData.ts`: deterministic robot, runtime, map, path, and task data.
- Create `frontend/src/services/api/httpClient.ts`: Axios instance, request log store, fallback wrapper.
- Create `frontend/src/services/api/robotApi.ts`: typed robot, runtime, command, and task API functions.
- Create `frontend/src/services/api/mapApi.ts`: typed map version, charging point, nav path, and topo path API functions.
- Create `frontend/src/features/robot-execution/hooks/useRobotWorkbench.ts`: workbench data orchestration hook.
- Create `frontend/src/features/robot-execution/components/*.tsx`: robot status, target selection, command panel, task timeline, motion pad.
- Create `frontend/src/features/spatial-viewer/components/*.tsx`: viewer, layer dropdown, render dropdown.
- Create `frontend/src/features/spatial-viewer/lib/spatialScene.ts`: SoonSpaceJS/Three scene adapter.
- Create `frontend/src/pages/workbench/SpatialWorkbenchPage.tsx` and `.css`: v4 layout.
- Create `frontend/src/shared/components/ApiDebugDrawer.tsx` and `.css`: collapsible API debug panel.
- Create focused test files next to modules with `.test.ts` or `.test.tsx` suffix.

## Task 1: Scaffold Frontend Project

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/vitest.setup.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/App.css`

- [ ] **Step 1: Replace package metadata and scripts**

Write `frontend/package.json`:

```json
{
  "name": "urobot-sdk-example-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc -b --noEmit"
  },
  "dependencies": {
    "axios": "^1.7.9",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "soonspacejs": "^2.15.7",
    "three": "^0.171.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "@types/three": "^0.171.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Add Vite and TypeScript configuration**

Write `frontend/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>uRobot SDK Web Example</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Write `frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
  },
});
```

Write `frontend/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add minimal app shell**

Write `frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './app/App.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Write `frontend/src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <div className="app-placeholder">uRobot SDK Web Example</div>
    </main>
  );
}
```

Write `frontend/src/app/App.css`:

```css
:root {
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: #172033;
  background: #eef2f6;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
}

.app-placeholder {
  display: grid;
  min-height: 100vh;
  place-items: center;
  color: #475569;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `frontend/package-lock.json` is created and dependencies install without errors.

- [ ] **Step 5: Verify scaffold**

Run: `npm run build`

Expected: TypeScript build and Vite production build pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/index.html frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/vitest.setup.ts frontend/src/main.tsx frontend/src/app/App.tsx frontend/src/app/App.css
git commit -m "chore: scaffold frontend app"
```

## Task 2: Define Shared Types and Pose Utilities

**Files:**
- Create: `frontend/src/shared/types/api.ts`
- Create: `frontend/src/shared/utils/pose.ts`
- Test: `frontend/src/shared/utils/pose.test.ts`

- [ ] **Step 1: Write pose utility tests**

Write `frontend/src/shared/utils/pose.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { quaternionToYaw, runtimePoseToSceneTransform } from './pose';

describe('pose utilities', () => {
  it('converts identity quaternion to zero yaw', () => {
    expect(quaternionToYaw({ x: 0, y: 0, z: 0, w: 1 })).toBe(0);
  });

  it('maps runtime pose to scene transform', () => {
    const transform = runtimePoseToSceneTransform({
      position: { x: 1, y: 2, z: 3 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    });

    expect(transform.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(transform.rotation.y).toBe(0);
  });
});
```

- [ ] **Step 2: Run failing pose tests**

Run: `npm run test -- src/shared/utils/pose.test.ts`

Expected: FAIL because `pose.ts` does not exist.

- [ ] **Step 3: Add shared API types**

Write `frontend/src/shared/types/api.ts`:

```ts
export interface ApiResult<T> {
  success?: boolean;
  errcode?: string;
  errmsg?: string;
  result: T;
}

export interface PageResult<T> {
  rows: T[];
  total_count?: number;
  totalCount?: number;
  page_no?: number;
  pageNo?: number;
  page_size?: number;
  pageSize?: number;
  total_page?: number;
  totalPage?: number;
}

export interface Vector3Value {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionValue {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface RobotSummary {
  id: string;
  name: string;
  map?: {
    id?: string;
    name?: string;
    edition_id?: string;
    editionId?: string;
  };
  terminalSn?: string;
  terminal_sn?: string;
  status?: string;
  statusValue?: number;
  status_value?: number;
  terminalType?: string;
  terminal_type?: string;
  terminalPower?: number;
  terminal_power?: number;
  deviceTypeDesc?: string;
  device_type_desc?: string;
}

export interface RuntimePose {
  position: Vector3Value;
  orientation: QuaternionValue;
}

export interface RobotRuntime {
  soc?: number;
  robot_id?: string;
  robot_name?: string;
  terminal_status?: string;
  terminal_status_value?: number;
  control_status?: string;
  map_name?: string;
  map_name_str?: string;
  ros_odom?: {
    pose?: RuntimePose;
  };
  charge?: {
    status?: number;
    org_value?: number;
  };
  cpu_load?: number;
  used_memory?: number;
  cpu_temperature?: number;
  net_ip_address?: string;
}

export interface MapBimInfo {
  name: string;
  fileUrl: string;
  position: Vector3Value;
  scale: Vector3Value;
  orientation: QuaternionValue;
}

export interface MapEdition {
  id: string;
  mapId: string;
  name: string;
  mapName: string;
  createTime?: string;
  globalMap?: string;
  groundMap?: string;
  bim?: MapBimInfo;
}

export interface MapPoint {
  id: string;
  uuid: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  editionId?: string;
  editionName?: string;
}

export interface PathNode {
  id: string;
  name: string;
  uuid: string;
  order: number;
  position: Vector3Value;
  orientation?: QuaternionValue;
}

export interface PathEdge {
  id: string;
  snode: string;
  enode: string;
  passable: string;
}

export interface TopologyPath {
  id: string;
  uuid: string;
  name: string;
  mapId: string;
  mapName?: string;
  editionId: string;
  editionName?: string;
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface NavigationPath {
  id: string;
  uuid: string;
  name: string;
  mapId: string;
  mapName?: string;
  editionId: string;
  editionName?: string;
  nodes: PathNode[];
}

export interface RobotCommand {
  type: number;
  messagesType: string;
  callbackUrl?: string;
  params: {
    task_id?: string;
    task_command_info: Array<{
      command_id: string;
      command_code: string;
      command_param: unknown;
      parallel_commands?: unknown[] | null;
    }>;
  };
}

export interface TaskResult {
  task_id: string;
  task_status: string;
  messages_type?: string;
  command_resp_list?: Array<{
    status: string;
    result?: string;
    description?: string;
    task_command_code: string;
    task_command_id: string;
  }>;
}
```

- [ ] **Step 4: Add pose utilities**

Write `frontend/src/shared/utils/pose.ts`:

```ts
import type { QuaternionValue, RuntimePose, Vector3Value } from '../types/api';

export interface SceneTransform {
  position: Vector3Value;
  rotation: Vector3Value;
}

export function quaternionToYaw(q: QuaternionValue): number {
  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(sinyCosp, cosyCosp);
}

export function runtimePoseToSceneTransform(pose: RuntimePose): SceneTransform {
  return {
    position: {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z,
    },
    rotation: {
      x: 0,
      y: quaternionToYaw(pose.orientation),
      z: 0,
    },
  };
}
```

- [ ] **Step 5: Verify tests**

Run: `npm run test -- src/shared/utils/pose.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/types/api.ts frontend/src/shared/utils/pose.ts frontend/src/shared/utils/pose.test.ts
git commit -m "feat: add shared api types and pose utilities"
```

## Task 3: Implement API Client, Request Logs, and Mock Fallback

**Files:**
- Create: `frontend/src/services/mock/mockData.ts`
- Create: `frontend/src/services/api/httpClient.ts`
- Test: `frontend/src/services/api/httpClient.test.ts`

- [ ] **Step 1: Write API fallback tests**

Write `frontend/src/services/api/httpClient.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, clearApiLogs, getApiLogs } from './httpClient';

describe('apiRequest', () => {
  beforeEach(() => {
    clearApiLogs();
  });

  it('returns real data when request succeeds', async () => {
    const result = await apiRequest({
      key: 'robot.list',
      method: 'GET',
      url: '/robot/page',
      request: () => Promise.resolve({ result: { rows: [] } }),
      fallback: () => ({ rows: [{ id: 'mock-robot', name: 'Mock Robot' }] }),
    });

    expect(result.data).toEqual({ rows: [] });
    expect(result.source).toBe('real');
    expect(getApiLogs()[0].status).toBe('success');
  });

  it('returns mock data and logs reason when request fails', async () => {
    const result = await apiRequest({
      key: 'robot.list',
      method: 'GET',
      url: '/robot/page',
      request: () => Promise.reject(new Error('Network Error')),
      fallback: () => ({ rows: [{ id: 'mock-robot', name: 'Mock Robot' }] }),
    });

    expect(result.data.rows[0].id).toBe('mock-robot');
    expect(result.source).toBe('mock');
    expect(result.reason).toContain('Network Error');
    expect(getApiLogs()[0].status).toBe('mock');
  });

  it('notifies log subscribers', async () => {
    const listener = vi.fn();
    const unsubscribe = getApiLogs.subscribe(listener);

    await apiRequest({
      key: 'robot.list',
      method: 'GET',
      url: '/robot/page',
      request: () => Promise.resolve({ result: { rows: [] } }),
      fallback: () => ({ rows: [] }),
    });

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
```

- [ ] **Step 2: Run failing API tests**

Run: `npm run test -- src/services/api/httpClient.test.ts`

Expected: FAIL because `httpClient.ts` does not exist.

- [ ] **Step 3: Add deterministic Mock data**

Write `frontend/src/services/mock/mockData.ts`:

```ts
import type {
  MapEdition,
  MapPoint,
  NavigationPath,
  RobotRuntime,
  RobotSummary,
  TaskResult,
  TopologyPath,
} from '../../shared/types/api';

export const mockRobots: RobotSummary[] = [
  {
    id: 'robot-x30-demo',
    name: 'X30 SDK 演示机器人',
    status: '空闲',
    statusValue: 1,
    terminalType: '机器狗',
    terminalPower: 86,
    map: {
      id: 'map-demo-building',
      name: 'SDK 展厅地图',
      edition_id: 'edition-demo-v1',
    },
  },
];

export const mockRuntime: RobotRuntime = {
  soc: 86,
  robot_id: 'robot-x30-demo',
  robot_name: 'X30 SDK 演示机器人',
  terminal_status: '空闲',
  terminal_status_value: 1,
  control_status: '导航模式 空闲',
  map_name: 'map-demo-building',
  map_name_str: 'SDK 展厅地图',
  ros_odom: {
    pose: {
      position: { x: 2.5, y: 0.2, z: -1.8 },
      orientation: { x: 0, y: 0, z: 0.12, w: 0.99 },
    },
  },
  charge: { status: 0, org_value: 0 },
  cpu_load: 21.3,
  used_memory: 45.1,
  cpu_temperature: 62,
  net_ip_address: '192.168.1.20',
};

export const mockEdition: MapEdition = {
  id: 'edition-demo-v1',
  mapId: 'map-demo-building',
  name: 'SDK 展厅地图 v1',
  mapName: 'SDK 展厅地图',
  globalMap: '/mock-assets/global-map.pcd',
  groundMap: '/mock-assets/ground-map.pcd',
  bim: {
    name: '展厅 BIM',
    fileUrl: '/mock-assets/building.glb',
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
};

export const mockChargingPoints: MapPoint[] = [
  {
    id: 'charge-1',
    uuid: 'charge-1',
    name: '充电点 A',
    x: -2,
    y: 0,
    z: 2,
    rotationZ: 0,
    editionId: 'edition-demo-v1',
    editionName: 'SDK 展厅地图 v1',
  },
];

export const mockNavigationPath: NavigationPath = {
  id: 'nav-path-1',
  uuid: 'nav-path-1',
  name: '展厅参观点路径',
  mapId: 'map-demo-building',
  editionId: 'edition-demo-v1',
  nodes: [
    { id: 'n1', uuid: 'nav-path-1', name: '入口', order: 1, position: { x: -2, y: 0, z: -2 } },
    { id: 'n2', uuid: 'nav-path-1', name: '展台', order: 2, position: { x: 2, y: 0, z: -1 } },
    { id: 'n3', uuid: 'nav-path-1', name: '出口', order: 3, position: { x: 3, y: 0, z: 2 } },
  ],
};

export const mockTopologyPath: TopologyPath = {
  id: 'topo-path-1',
  uuid: 'topo-path-1',
  name: '巡检拓扑路径',
  mapId: 'map-demo-building',
  editionId: 'edition-demo-v1',
  nodes: mockNavigationPath.nodes,
  edges: [
    { id: 'e1', snode: 'n1', enode: 'n2', passable: 'BIDIRECTION' },
    { id: 'e2', snode: 'n2', enode: 'n3', passable: 'BIDIRECTION' },
  ],
};

export function createMockTaskResult(taskId: string): TaskResult {
  return {
    task_id: taskId,
    task_status: '完成',
    messages_type: 'task',
    command_resp_list: [
      {
        status: 'success',
        result: 'mock completed',
        description: '演示模式任务已完成',
        task_command_code: 'mock',
        task_command_id: `${taskId}-command`,
      },
    ],
  };
}
```

- [ ] **Step 4: Add API client wrapper and log store**

Write `frontend/src/services/api/httpClient.ts`:

```ts
import axios from 'axios';

export type ApiSource = 'real' | 'mock';
export type ApiLogStatus = 'success' | 'mock' | 'error';

export interface ApiLogEntry {
  id: string;
  key: string;
  method: string;
  url: string;
  status: ApiLogStatus;
  source: ApiSource;
  timestamp: number;
  request?: unknown;
  response?: unknown;
  error?: string;
  reason?: string;
}

export interface ApiRequestOptions<TResponse, TFallback> {
  key: string;
  method: string;
  url: string;
  request: () => Promise<{ result: TResponse } | TResponse>;
  fallback: () => TFallback;
  requestBody?: unknown;
}

export interface ApiRequestResult<T> {
  data: T;
  source: ApiSource;
  reason?: string;
}

const listeners = new Set<() => void>();
let logs: ApiLogEntry[] = [];

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
});

function unwrapResult<T>(value: { result: T } | T): T {
  if (value && typeof value === 'object' && 'result' in value) {
    return (value as { result: T }).result;
  }
  return value as T;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function pushLog(entry: Omit<ApiLogEntry, 'id' | 'timestamp'>) {
  logs = [
    {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
    },
    ...logs,
  ].slice(0, 80);
  notify();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function apiRequest<TResponse, TFallback = TResponse>(
  options: ApiRequestOptions<TResponse, TFallback>,
): Promise<ApiRequestResult<TResponse | TFallback>> {
  try {
    const response = await options.request();
    const data = unwrapResult(response);
    pushLog({
      key: options.key,
      method: options.method,
      url: options.url,
      status: 'success',
      source: 'real',
      request: options.requestBody,
      response: data,
    });
    return { data, source: 'real' };
  } catch (error) {
    const reason = errorMessage(error);
    const data = options.fallback();
    pushLog({
      key: options.key,
      method: options.method,
      url: options.url,
      status: 'mock',
      source: 'mock',
      request: options.requestBody,
      response: data,
      error: reason,
      reason,
    });
    return { data, source: 'mock', reason };
  }
}

export function getApiLogs(): ApiLogEntry[] {
  return logs;
}

getApiLogs.subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function clearApiLogs() {
  logs = [];
  notify();
}
```

- [ ] **Step 5: Verify API tests**

Run: `npm run test -- src/services/api/httpClient.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/mock/mockData.ts frontend/src/services/api/httpClient.ts frontend/src/services/api/httpClient.test.ts
git commit -m "feat: add frontend api fallback client"
```

## Task 4: Add Robot and Map API Services

**Files:**
- Create: `frontend/src/services/api/robotApi.ts`
- Create: `frontend/src/services/api/mapApi.ts`
- Test: `frontend/src/services/api/robotApi.test.ts`

- [ ] **Step 1: Write robot API tests**

Write `frontend/src/services/api/robotApi.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCommandPayload } from './robotApi';

describe('buildCommandPayload', () => {
  it('builds robot_tts command payload', () => {
    const payload = buildCommandPayload('robot_tts', { text: '你好' });

    expect(payload.messagesType).toBe('task');
    expect(payload.params.task_command_info[0].command_code).toBe('robot_tts');
    expect(payload.params.task_command_info[0].command_param).toEqual({ text: '你好' });
  });

  it('builds base_move payload with direction', () => {
    const payload = buildCommandPayload('base_move', { direction: 'forward', speed: 0.3 });

    expect(payload.params.task_command_info[0].command_code).toBe('base_move');
    expect(payload.params.task_command_info[0].command_param).toEqual({
      direction: 'forward',
      speed: 0.3,
    });
  });
});
```

- [ ] **Step 2: Run failing service tests**

Run: `npm run test -- src/services/api/robotApi.test.ts`

Expected: FAIL because `robotApi.ts` does not exist.

- [ ] **Step 3: Add robot API service**

Write `frontend/src/services/api/robotApi.ts`:

```ts
import type { PageResult, RobotCommand, RobotRuntime, RobotSummary, TaskResult } from '../../shared/types/api';
import { mockRuntime, mockRobots, createMockTaskResult } from '../mock/mockData';
import { apiRequest, http } from './httpClient';

export type RobotCommandCode =
  | 'navigation'
  | 'topology_navigation'
  | 'robot_tts'
  | 'charge_manager'
  | 'robot_pause'
  | 'emergency_stop'
  | 'base_move'
  | 'cmd_vel';

export function buildCommandPayload(commandCode: RobotCommandCode, commandParam: unknown): RobotCommand {
  const commandId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    type: 1,
    messagesType: 'task',
    params: {
      task_id: commandId,
      task_command_info: [
        {
          command_id: commandId,
          command_code: commandCode,
          command_param: commandParam,
          parallel_commands: null,
        },
      ],
    },
  };
}

export async function listRobots() {
  return apiRequest<PageResult<RobotSummary>>({
    key: 'robot.list',
    method: 'GET',
    url: '/robot/page',
    request: async () => {
      const response = await http.get('/robot/page', { params: { pageNo: 1, pageSize: 20 } });
      return response.data;
    },
    fallback: () => ({
      rows: mockRobots,
      total_count: mockRobots.length,
      page_no: 1,
      page_size: 20,
      total_page: 1,
    }),
  });
}

export async function getRobotRuntime(robotId: string) {
  return apiRequest<RobotRuntime>({
    key: 'robot.runtime',
    method: 'GET',
    url: `/robot/runtime/${robotId}`,
    request: async () => {
      const response = await http.get(`/robot/runtime/${robotId}`);
      const result = response.data.result;
      return Array.isArray(result?.rows) ? { result: result.rows[0] } : response.data;
    },
    fallback: () => mockRuntime,
  });
}

export async function sendRobotCommand(robotId: string, payload: RobotCommand) {
  return apiRequest<string>({
    key: 'robot.command',
    method: 'POST',
    url: `/robot/command/${robotId}`,
    requestBody: payload,
    request: async () => {
      const response = await http.post(`/robot/command/${robotId}`, payload);
      return response.data;
    },
    fallback: () => payload.params.task_id ?? `mock-task-${Date.now()}`,
  });
}

export async function getTaskResults(robotId: string, taskIds: string[]) {
  return apiRequest<TaskResult[]>({
    key: 'robot.taskResult',
    method: 'GET',
    url: `/robot/task-result/${robotId}`,
    request: async () => {
      const response = await http.get(`/robot/task-result/${robotId}`, {
        params: Object.fromEntries(taskIds.map((taskId, index) => [`taskIds[${index}]`, taskId])),
      });
      return response.data;
    },
    fallback: () => taskIds.map(createMockTaskResult),
  });
}
```

- [ ] **Step 4: Add map API service**

Write `frontend/src/services/api/mapApi.ts`:

```ts
import type { MapEdition, MapPoint, NavigationPath, PageResult, TopologyPath } from '../../shared/types/api';
import {
  mockChargingPoints,
  mockEdition,
  mockNavigationPath,
  mockTopologyPath,
} from '../mock/mockData';
import { apiRequest, http } from './httpClient';

export async function getMapEditions(mapId: string) {
  return apiRequest<MapEdition[]>({
    key: 'map.editions',
    method: 'GET',
    url: `/map/${mapId}/editions`,
    request: async () => {
      const response = await http.get(`/map/${mapId}/editions`);
      return response.data;
    },
    fallback: () => [mockEdition],
  });
}

export async function getMapEdition(editionId: string) {
  return apiRequest<MapEdition[]>({
    key: 'map.edition',
    method: 'GET',
    url: `/map/edition/${editionId}`,
    request: async () => {
      const response = await http.get(`/map/edition/${editionId}`);
      return response.data;
    },
    fallback: () => [mockEdition],
  });
}

export async function getChargingPoints(editionId: string) {
  return apiRequest<MapPoint[]>({
    key: 'map.chargingPoints',
    method: 'GET',
    url: `/map/edition/${editionId}/charging-stations`,
    request: async () => {
      const response = await http.get(`/map/edition/${editionId}/charging-stations`);
      return response.data;
    },
    fallback: () => mockChargingPoints,
  });
}

export async function listNavigationPaths(editionId: string) {
  return apiRequest<PageResult<NavigationPath>>({
    key: 'map.navPaths',
    method: 'GET',
    url: '/map/nav-path/page',
    request: async () => {
      const response = await http.get('/map/nav-path/page', { params: { editionId, pageNo: 1, pageSize: 20 } });
      return response.data;
    },
    fallback: () => ({ rows: [mockNavigationPath], total_count: 1, page_no: 1, page_size: 20, total_page: 1 }),
  });
}

export async function listTopologyPaths(editionId: string) {
  return apiRequest<PageResult<TopologyPath>>({
    key: 'map.topoPaths',
    method: 'GET',
    url: '/map/topo-path/page',
    request: async () => {
      const response = await http.get('/map/topo-path/page', { params: { editionId, pageNo: 1, pageSize: 20 } });
      return response.data;
    },
    fallback: () => ({ rows: [mockTopologyPath], total_count: 1, page_no: 1, page_size: 20, total_page: 1 }),
  });
}
```

- [ ] **Step 5: Verify service tests**

Run: `npm run test -- src/services/api/robotApi.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/api/robotApi.ts frontend/src/services/api/mapApi.ts frontend/src/services/api/robotApi.test.ts
git commit -m "feat: add robot and map api services"
```

## Task 5: Build Spatial Scene Adapter and Viewer Controls

**Files:**
- Create: `frontend/src/features/spatial-viewer/lib/spatialScene.ts`
- Create: `frontend/src/features/spatial-viewer/components/LayerDropdown.tsx`
- Create: `frontend/src/features/spatial-viewer/components/RenderDropdown.tsx`
- Create: `frontend/src/features/spatial-viewer/components/SpatialViewer.tsx`
- Create: `frontend/src/features/spatial-viewer/components/spatial-viewer.css`
- Test: `frontend/src/features/spatial-viewer/components/LayerDropdown.test.tsx`

- [ ] **Step 1: Write layer dropdown tests**

Write `frontend/src/features/spatial-viewer/components/LayerDropdown.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LayerDropdown, type LayerVisibility } from './LayerDropdown';

describe('LayerDropdown', () => {
  it('toggles BIM visibility', async () => {
    const onChange = vi.fn();
    const value: LayerVisibility = {
      bim: true,
      globalPointCloud: true,
      groundPointCloud: true,
      paths: true,
    };

    render(<LayerDropdown value={value} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /图层/ }));
    await userEvent.click(screen.getByRole('button', { name: /BIM 模型/ }));

    expect(onChange).toHaveBeenCalledWith({ ...value, bim: false });
  });
});
```

- [ ] **Step 2: Run failing dropdown tests**

Run: `npm run test -- src/features/spatial-viewer/components/LayerDropdown.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Add spatial scene adapter**

Write `frontend/src/features/spatial-viewer/lib/spatialScene.ts`:

```ts
import SoonSpace from 'soonspacejs';
import * as THREE from 'three';
import type { MapEdition, NavigationPath, RobotRuntime, TopologyPath } from '../../../shared/types/api';
import { runtimePoseToSceneTransform } from '../../../shared/utils/pose';

export interface RenderSettings {
  pointSize: 'small' | 'medium' | 'large';
  opacity: 'low' | 'medium' | 'solid';
  bimWireframe: boolean;
}

export interface SpatialSceneAdapter {
  mount(container: HTMLElement): void;
  dispose(): void;
  loadEdition(edition: MapEdition): Promise<void>;
  setLayerVisibility(layer: string, visible: boolean): void;
  setRenderSettings(settings: RenderSettings): void;
  updateRobotRuntime(runtime: RobotRuntime): void;
  setNavigationData(navPaths: NavigationPath[], topoPaths: TopologyPath[]): void;
}

interface SoonSpaceInstance {
  dispose: () => void;
  scene?: THREE.Scene;
}

export function createSpatialScene(): SpatialSceneAdapter {
  let soonspace: SoonSpaceInstance | undefined;
  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let robot: THREE.Mesh | undefined;
  let animationFrame = 0;
  const layerGroups = new Map<string, THREE.Group>();

  function ensureGroup(name: string) {
    if (!scene) {
      throw new Error('Scene is not mounted');
    }
    const existing = layerGroups.get(name);
    if (existing) {
      return existing;
    }
    const group = new THREE.Group();
    group.name = name;
    layerGroups.set(name, group);
    scene.add(group);
    return group;
  }

  function animate() {
    if (!renderer || !scene || !camera) {
      return;
    }
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }

  return {
    mount(container) {
      soonspace = new SoonSpace({
        el: container,
        options: {
          showGrid: false,
        },
      }) as SoonSpaceInstance;

      scene = soonspace.scene ?? new THREE.Scene();
      scene.background = new THREE.Color('#e7edf4');
      camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(6, 5, 8);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      const light = new THREE.DirectionalLight('#ffffff', 1);
      light.position.set(6, 10, 4);
      scene.add(light);
      scene.add(new THREE.AmbientLight('#ffffff', 0.6));
      scene.add(new THREE.GridHelper(12, 12, '#94a3b8', '#cbd5e1'));

      robot = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.28, 0.65),
        new THREE.MeshStandardMaterial({ color: '#dc2626' }),
      );
      robot.name = 'robot';
      scene.add(robot);
      animate();
    },
    dispose() {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      soonspace?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      layerGroups.clear();
      soonspace = undefined;
      renderer = undefined;
      scene = undefined;
      camera = undefined;
      robot = undefined;
    },
    async loadEdition(edition) {
      const bimGroup = ensureGroup('bim');
      bimGroup.clear();
      const bimBox = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.25, 3),
        new THREE.MeshStandardMaterial({ color: '#2563eb', opacity: 0.25, transparent: true }),
      );
      bimBox.name = edition.bim?.name ?? 'BIM';
      bimGroup.add(bimBox);

      const globalGroup = ensureGroup('globalPointCloud');
      globalGroup.clear();
      const globalPoints = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-2, 0.1, -2),
          new THREE.Vector3(0, 0.2, -1),
          new THREE.Vector3(2, 0.3, 1),
        ]),
        new THREE.PointsMaterial({ color: '#0f766e', size: 0.08 }),
      );
      globalGroup.add(globalPoints);

      const groundGroup = ensureGroup('groundPointCloud');
      groundGroup.clear();
      groundGroup.add(
        new THREE.Points(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-2, 0, 2),
            new THREE.Vector3(0, 0, 2),
            new THREE.Vector3(2, 0, 2),
          ]),
          new THREE.PointsMaterial({ color: '#475569', size: 0.06 }),
        ),
      );
    },
    setLayerVisibility(layer, visible) {
      const group = layerGroups.get(layer);
      if (group) {
        group.visible = visible;
      }
    },
    setRenderSettings(settings) {
      const size = settings.pointSize === 'small' ? 0.04 : settings.pointSize === 'medium' ? 0.08 : 0.14;
      const opacity = settings.opacity === 'low' ? 0.3 : settings.opacity === 'medium' ? 0.6 : 1;
      layerGroups.forEach((group) => {
        group.traverse((object) => {
          const material = (object as THREE.Points).material as THREE.Material | undefined;
          if (material && 'size' in material) {
            (material as THREE.PointsMaterial).size = size;
            material.opacity = opacity;
            material.transparent = opacity < 1;
          }
          if (material && 'wireframe' in material) {
            (material as THREE.MeshStandardMaterial).wireframe = settings.bimWireframe;
          }
        });
      });
    },
    updateRobotRuntime(runtime) {
      const pose = runtime.ros_odom?.pose;
      if (!robot || !pose) {
        return;
      }
      const transform = runtimePoseToSceneTransform(pose);
      robot.position.set(transform.position.x, transform.position.y, transform.position.z);
      robot.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    },
    setNavigationData(navPaths, topoPaths) {
      const pathGroup = ensureGroup('paths');
      pathGroup.clear();
      [...navPaths, ...topoPaths].forEach((path) => {
        const points = path.nodes.map((node) => new THREE.Vector3(node.position.x, node.position.y, node.position.z));
        if (points.length > 1) {
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: '#0f766e' }),
          );
          pathGroup.add(line);
        }
      });
    },
  };
}
```

- [ ] **Step 4: Add layer and render dropdown components**

Write `frontend/src/features/spatial-viewer/components/LayerDropdown.tsx`:

```tsx
import { Eye, EyeOff, Layers } from 'lucide-react';
import { useState } from 'react';
import './spatial-viewer.css';

export interface LayerVisibility {
  bim: boolean;
  globalPointCloud: boolean;
  groundPointCloud: boolean;
  paths: boolean;
}

interface LayerDropdownProps {
  value: LayerVisibility;
  onChange: (value: LayerVisibility) => void;
}

const labels: Array<[keyof LayerVisibility, string]> = [
  ['bim', 'BIM 模型'],
  ['globalPointCloud', '全局点云'],
  ['groundPointCloud', '地面点云'],
  ['paths', '导航点 / 路径'],
];

export function LayerDropdown({ value, onChange }: LayerDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="viewer-menu">
      <button className="toolbar-button" type="button" onClick={() => setOpen((current) => !current)}>
        <Layers size={16} />
        图层
      </button>
      {open ? (
        <div className="viewer-menu-panel">
          {labels.map(([key, label]) => (
            <button
              key={key}
              className="viewer-menu-row"
              type="button"
              onClick={() => onChange({ ...value, [key]: !value[key] })}
            >
              <span>{label}</span>
              {value[key] ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

Write `frontend/src/features/spatial-viewer/components/RenderDropdown.tsx`:

```tsx
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { RenderSettings } from '../lib/spatialScene';
import './spatial-viewer.css';

interface RenderDropdownProps {
  value: RenderSettings;
  onChange: (value: RenderSettings) => void;
}

export function RenderDropdown({ value, onChange }: RenderDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="viewer-menu">
      <button className="toolbar-button" type="button" onClick={() => setOpen((current) => !current)}>
        <SlidersHorizontal size={16} />
        渲染
      </button>
      {open ? (
        <div className="viewer-menu-panel viewer-menu-panel-wide">
          <div className="viewer-menu-label">点大小</div>
          <div className="segmented">
            {(['small', 'medium', 'large'] as const).map((pointSize) => (
              <button
                key={pointSize}
                className={value.pointSize === pointSize ? 'active' : ''}
                type="button"
                onClick={() => onChange({ ...value, pointSize })}
              >
                {pointSize === 'small' ? '小' : pointSize === 'medium' ? '中' : '大'}
              </button>
            ))}
          </div>
          <div className="viewer-menu-label">透明度</div>
          <div className="segmented">
            {(['low', 'medium', 'solid'] as const).map((opacity) => (
              <button
                key={opacity}
                className={value.opacity === opacity ? 'active' : ''}
                type="button"
                onClick={() => onChange({ ...value, opacity })}
              >
                {opacity === 'low' ? '30%' : opacity === 'medium' ? '60%' : '100%'}
              </button>
            ))}
          </div>
          <button
            className="viewer-menu-row"
            type="button"
            onClick={() => onChange({ ...value, bimWireframe: !value.bimWireframe })}
          >
            <span>BIM 线框</span>
            <span>{value.bimWireframe ? '开' : '关'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Add SpatialViewer component and styles**

Write `frontend/src/features/spatial-viewer/components/SpatialViewer.tsx`:

```tsx
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { MapEdition, NavigationPath, RobotRuntime, TopologyPath } from '../../../shared/types/api';
import { createSpatialScene, type RenderSettings } from '../lib/spatialScene';
import { LayerDropdown, type LayerVisibility } from './LayerDropdown';
import { RenderDropdown } from './RenderDropdown';
import './spatial-viewer.css';

interface SpatialViewerProps {
  edition?: MapEdition;
  runtime?: RobotRuntime;
  navPaths: NavigationPath[];
  topoPaths: TopologyPath[];
  layers: LayerVisibility;
  renderSettings: RenderSettings;
  onLayersChange: (value: LayerVisibility) => void;
  onRenderSettingsChange: (value: RenderSettings) => void;
  motionPad: React.ReactNode;
  debugDrawer: React.ReactNode;
}

export function SpatialViewer(props: SpatialViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scene = useMemo(() => createSpatialScene(), []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    scene.mount(containerRef.current);
    return () => scene.dispose();
  }, [scene]);

  useEffect(() => {
    if (props.edition) {
      void scene.loadEdition(props.edition);
    }
  }, [props.edition, scene]);

  useEffect(() => {
    if (props.runtime) {
      scene.updateRobotRuntime(props.runtime);
    }
  }, [props.runtime, scene]);

  useEffect(() => {
    scene.setNavigationData(props.navPaths, props.topoPaths);
  }, [props.navPaths, props.topoPaths, scene]);

  useEffect(() => {
    scene.setLayerVisibility('bim', props.layers.bim);
    scene.setLayerVisibility('globalPointCloud', props.layers.globalPointCloud);
    scene.setLayerVisibility('groundPointCloud', props.layers.groundPointCloud);
    scene.setLayerVisibility('paths', props.layers.paths);
  }, [props.layers, scene]);

  useEffect(() => {
    scene.setRenderSettings(props.renderSettings);
  }, [props.renderSettings, scene]);

  return (
    <section className="spatial-viewer" aria-label="3D 空间视图">
      <div className="viewer-toolbar">
        <LayerDropdown value={props.layers} onChange={props.onLayersChange} />
        <RenderDropdown value={props.renderSettings} onChange={props.onRenderSettingsChange} />
        <button className="toolbar-button" type="button">
          <RotateCcw size={16} />
          重置视角
        </button>
      </div>
      <div ref={containerRef} className="viewer-canvas" />
      <div className="viewer-motion-pad">{props.motionPad}</div>
      <div className="viewer-debug">{props.debugDrawer}</div>
    </section>
  );
}
```

Write `frontend/src/features/spatial-viewer/components/spatial-viewer.css`:

```css
.spatial-viewer {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #e7edf4;
}

.viewer-canvas,
.viewer-canvas canvas {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 560px;
}

.viewer-toolbar {
  position: absolute;
  z-index: 5;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 10px;
  color: #1e293b;
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
}

.viewer-menu {
  position: relative;
}

.viewer-menu-panel {
  position: absolute;
  top: 42px;
  right: 0;
  width: 190px;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  padding: 8px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
}

.viewer-menu-panel-wide {
  width: 230px;
}

.viewer-menu-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-radius: 6px;
  padding: 8px;
  color: #1e293b;
  background: transparent;
  cursor: pointer;
}

.viewer-menu-row:hover {
  background: #f1f5f9;
}

.viewer-menu-label {
  margin: 6px 8px;
  color: #64748b;
  font-size: 12px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin: 0 8px 8px;
}

.segmented button {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px;
  background: #fff;
  cursor: pointer;
}

.segmented .active {
  border-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
}

.viewer-motion-pad {
  position: absolute;
  z-index: 4;
  left: 18px;
  bottom: 18px;
}

.viewer-debug {
  position: absolute;
  z-index: 4;
  right: 18px;
  bottom: 18px;
  width: min(420px, calc(100% - 220px));
}
```

- [ ] **Step 6: Verify dropdown tests**

Run: `npm run test -- src/features/spatial-viewer/components/LayerDropdown.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/spatial-viewer
git commit -m "feat: add spatial viewer shell"
```

## Task 6: Build Robot Execution Components and Hook

**Files:**
- Create: `frontend/src/features/robot-execution/hooks/useRobotWorkbench.ts`
- Create: `frontend/src/features/robot-execution/components/MotionPad.tsx`
- Create: `frontend/src/features/robot-execution/components/RobotStatusCard.tsx`
- Create: `frontend/src/features/robot-execution/components/NavigationTargetPanel.tsx`
- Create: `frontend/src/features/robot-execution/components/CommandPanel.tsx`
- Create: `frontend/src/features/robot-execution/components/TaskTimeline.tsx`
- Create: `frontend/src/features/robot-execution/components/robot-execution.css`
- Test: `frontend/src/features/robot-execution/components/MotionPad.test.tsx`

- [ ] **Step 1: Write MotionPad tests**

Write `frontend/src/features/robot-execution/components/MotionPad.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MotionPad } from './MotionPad';

describe('MotionPad', () => {
  it('sends forward command', async () => {
    const onMove = vi.fn();
    render(<MotionPad onMove={onMove} onRotate={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '前进' }));

    expect(onMove).toHaveBeenCalledWith('forward');
  });

  it('sends rotate command from center control', async () => {
    const onRotate = vi.fn();
    render(<MotionPad onMove={vi.fn()} onRotate={onRotate} />);

    await userEvent.click(screen.getByRole('button', { name: '拖动旋转' }));

    expect(onRotate).toHaveBeenCalledWith(0.4);
  });
});
```

- [ ] **Step 2: Run failing MotionPad tests**

Run: `npm run test -- src/features/robot-execution/components/MotionPad.test.tsx`

Expected: FAIL because `MotionPad.tsx` does not exist.

- [ ] **Step 3: Add robot workbench hook**

Write `frontend/src/features/robot-execution/hooks/useRobotWorkbench.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MapEdition, NavigationPath, RobotRuntime, RobotSummary, TaskResult, TopologyPath } from '../../../shared/types/api';
import { getChargingPoints, getMapEdition, getMapEditions, listNavigationPaths, listTopologyPaths } from '../../../services/api/mapApi';
import { buildCommandPayload, getRobotRuntime, getTaskResults, listRobots, sendRobotCommand, type RobotCommandCode } from '../../../services/api/robotApi';

export interface WorkbenchTask {
  taskId: string;
  commandCode: RobotCommandCode;
  source: 'real' | 'mock';
  status: string;
  result?: TaskResult;
}

export function useRobotWorkbench() {
  const [robots, setRobots] = useState<RobotSummary[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('');
  const [runtime, setRuntime] = useState<RobotRuntime | undefined>();
  const [edition, setEdition] = useState<MapEdition | undefined>();
  const [navPaths, setNavPaths] = useState<NavigationPath[]>([]);
  const [topoPaths, setTopoPaths] = useState<TopologyPath[]>([]);
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listRobots().then((response) => {
      if (cancelled) return;
      const rows = response.data.rows;
      setRobots(rows);
      setSelectedRobotId((current) => current || rows[0]?.id || '');
      setDemoMode(response.source === 'mock');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRobot = useMemo(
    () => robots.find((robot) => robot.id === selectedRobotId),
    [robots, selectedRobotId],
  );

  useEffect(() => {
    if (!selectedRobotId) return;
    let cancelled = false;

    async function refreshRuntime() {
      const response = await getRobotRuntime(selectedRobotId);
      if (!cancelled) {
        setRuntime(response.data);
        setDemoMode((current) => current || response.source === 'mock');
      }
    }

    void refreshRuntime();
    const timer = window.setInterval(refreshRuntime, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedRobotId]);

  useEffect(() => {
    const mapId = selectedRobot?.map?.id;
    const editionId = selectedRobot?.map?.edition_id ?? selectedRobot?.map?.editionId;
    if (!mapId && !editionId) return;
    let cancelled = false;

    async function loadMapData() {
      const editionResponse = editionId ? await getMapEdition(editionId) : await getMapEditions(mapId as string);
      const currentEdition = editionResponse.data[0];
      if (!currentEdition || cancelled) return;

      const [navResponse, topoResponse] = await Promise.all([
        listNavigationPaths(currentEdition.id),
        listTopologyPaths(currentEdition.id),
        getChargingPoints(currentEdition.id),
      ]);

      if (!cancelled) {
        setEdition(currentEdition);
        setNavPaths(navResponse.data.rows);
        setTopoPaths(topoResponse.data.rows);
        setDemoMode(
          (current) =>
            current ||
            editionResponse.source === 'mock' ||
            navResponse.source === 'mock' ||
            topoResponse.source === 'mock',
        );
      }
    }

    void loadMapData();
    return () => {
      cancelled = true;
    };
  }, [selectedRobot]);

  const sendCommand = useCallback(
    async (commandCode: RobotCommandCode, commandParam: unknown) => {
      if (!selectedRobotId) return;
      const payload = buildCommandPayload(commandCode, commandParam);
      const response = await sendRobotCommand(selectedRobotId, payload);
      const taskId = response.data;
      setDemoMode((current) => current || response.source === 'mock');
      setTasks((current) => [
        { taskId, commandCode, source: response.source, status: response.source === 'mock' ? '演示执行中' : '已下发' },
        ...current,
      ]);
      const taskResponse = await getTaskResults(selectedRobotId, [taskId]);
      setTasks((current) =>
        current.map((task) =>
          task.taskId === taskId
            ? { ...task, status: taskResponse.data[0]?.task_status ?? task.status, result: taskResponse.data[0] }
            : task,
        ),
      );
    },
    [selectedRobotId],
  );

  return {
    robots,
    selectedRobot,
    selectedRobotId,
    setSelectedRobotId,
    runtime,
    edition,
    navPaths,
    topoPaths,
    tasks,
    demoMode,
    loading,
    sendCommand,
  };
}
```

- [ ] **Step 4: Add execution components**

Write `frontend/src/features/robot-execution/components/MotionPad.tsx`:

```tsx
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCw } from 'lucide-react';
import './robot-execution.css';

export type MoveDirection = 'forward' | 'backward' | 'left' | 'right';

interface MotionPadProps {
  onMove: (direction: MoveDirection) => void;
  onRotate: (angularVelocity: number) => void;
}

export function MotionPad({ onMove, onRotate }: MotionPadProps) {
  return (
    <div className="motion-pad" aria-label="运动遥控键盘">
      <span />
      <button type="button" aria-label="前进" onClick={() => onMove('forward')}>
        <ArrowUp size={18} />
      </button>
      <span />
      <button type="button" aria-label="左移" onClick={() => onMove('left')}>
        <ArrowLeft size={18} />
      </button>
      <button type="button" aria-label="拖动旋转" onClick={() => onRotate(0.4)}>
        <RotateCw size={18} />
      </button>
      <button type="button" aria-label="右移" onClick={() => onMove('right')}>
        <ArrowRight size={18} />
      </button>
      <span />
      <button type="button" aria-label="后退" onClick={() => onMove('backward')}>
        <ArrowDown size={18} />
      </button>
      <span />
    </div>
  );
}
```

Write `frontend/src/features/robot-execution/components/RobotStatusCard.tsx`:

```tsx
import type { RobotRuntime, RobotSummary } from '../../../shared/types/api';
import './robot-execution.css';

interface RobotStatusCardProps {
  robot?: RobotSummary;
  runtime?: RobotRuntime;
  demoMode: boolean;
}

export function RobotStatusCard({ robot, runtime, demoMode }: RobotStatusCardProps) {
  const power = robot?.terminalPower ?? robot?.terminal_power ?? runtime?.soc;
  const pose = runtime?.ros_odom?.pose?.position;

  return (
    <section className="side-card">
      <div className="side-card-header">
        <h2>{robot?.name ?? '未选择机器人'}</h2>
        {demoMode ? <span className="demo-badge">演示数据</span> : null}
      </div>
      <dl className="status-grid">
        <div><dt>状态</dt><dd>{runtime?.terminal_status ?? robot?.status ?? '-'}</dd></div>
        <div><dt>电量</dt><dd>{power ?? '-'}%</dd></div>
        <div><dt>模式</dt><dd>{runtime?.control_status ?? '-'}</dd></div>
        <div><dt>位姿</dt><dd>{pose ? `${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${pose.z.toFixed(2)}` : '-'}</dd></div>
      </dl>
    </section>
  );
}
```

Write `frontend/src/features/robot-execution/components/NavigationTargetPanel.tsx`:

```tsx
import type { NavigationPath, TopologyPath } from '../../../shared/types/api';
import './robot-execution.css';

interface NavigationTargetPanelProps {
  navPaths: NavigationPath[];
  topoPaths: TopologyPath[];
}

export function NavigationTargetPanel({ navPaths, topoPaths }: NavigationTargetPanelProps) {
  return (
    <section className="side-card">
      <h2>导航目标</h2>
      <label>
        导航路径
        <select>
          {navPaths.map((path) => (
            <option key={path.id} value={path.uuid}>{path.name}</option>
          ))}
        </select>
      </label>
      <label>
        拓扑路径
        <select>
          {topoPaths.map((path) => (
            <option key={path.id} value={path.uuid}>{path.name}</option>
          ))}
        </select>
      </label>
    </section>
  );
}
```

Write `frontend/src/features/robot-execution/components/CommandPanel.tsx`:

```tsx
import { BatteryCharging, Megaphone, Navigation, OctagonAlert, Pause, Play } from 'lucide-react';
import type { RobotCommandCode } from '../../../services/api/robotApi';
import './robot-execution.css';

interface CommandPanelProps {
  onCommand: (commandCode: RobotCommandCode, commandParam: unknown) => void;
}

export function CommandPanel({ onCommand }: CommandPanelProps) {
  return (
    <section className="side-card">
      <h2>快捷指令</h2>
      <div className="command-grid">
        <button type="button" onClick={() => onCommand('navigation', { point_name: '入口' })}><Navigation size={16} />导航</button>
        <button type="button" onClick={() => onCommand('robot_tts', { text: '欢迎使用 uRobot SDK' })}><Megaphone size={16} />语音</button>
        <button type="button" onClick={() => onCommand('charge_manager', { charge: true })}><BatteryCharging size={16} />充电</button>
        <button type="button" onClick={() => onCommand('robot_pause', true)}><Pause size={16} />暂停</button>
        <button type="button" onClick={() => onCommand('robot_pause', false)}><Play size={16} />继续</button>
        <button type="button" className="danger" onClick={() => onCommand('emergency_stop', {})}><OctagonAlert size={16} />急停</button>
      </div>
    </section>
  );
}
```

Write `frontend/src/features/robot-execution/components/TaskTimeline.tsx`:

```tsx
import type { WorkbenchTask } from '../hooks/useRobotWorkbench';
import './robot-execution.css';

interface TaskTimelineProps {
  tasks: WorkbenchTask[];
}

export function TaskTimeline({ tasks }: TaskTimelineProps) {
  return (
    <section className="side-card task-card">
      <h2>任务记录</h2>
      <div className="task-list">
        {tasks.length === 0 ? <p className="muted">暂无任务</p> : null}
        {tasks.map((task) => (
          <article key={task.taskId} className="task-row">
            <strong>{task.commandCode}</strong>
            <span>{task.status}</span>
            <code>{task.taskId}</code>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Write `frontend/src/features/robot-execution/components/robot-execution.css`:

```css
.side-card {
  border: 1px solid #d7dee8;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.side-card h2 {
  margin: 0 0 12px;
  font-size: 15px;
}

.side-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.demo-badge {
  border-radius: 999px;
  padding: 3px 8px;
  color: #92400e;
  background: #fef3c7;
  font-size: 12px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0;
}

.status-grid dt {
  color: #64748b;
  font-size: 12px;
}

.status-grid dd {
  margin: 2px 0 0;
  color: #1e293b;
  font-size: 13px;
}

.side-card label {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  color: #475569;
  font-size: 13px;
}

.side-card select {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 8px;
}

.command-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.command-grid button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
}

.command-grid .danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fef2f2;
}

.motion-pad {
  display: grid;
  width: 148px;
  height: 148px;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 6px;
  border: 1px solid rgba(82, 100, 126, 0.32);
  border-radius: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.9);
}

.motion-pad button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.task-card {
  min-height: 120px;
}

.task-list {
  display: grid;
  gap: 8px;
  max-height: 210px;
  overflow: auto;
}

.task-row {
  display: grid;
  gap: 4px;
  border-radius: 6px;
  padding: 8px;
  background: #f8fafc;
}

.task-row code,
.muted {
  color: #64748b;
  font-size: 12px;
}
```

- [ ] **Step 5: Verify MotionPad tests**

Run: `npm run test -- src/features/robot-execution/components/MotionPad.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/robot-execution
git commit -m "feat: add robot execution components"
```

## Task 7: Compose Workbench Page and Debug Drawer

**Files:**
- Create: `frontend/src/shared/components/ApiDebugDrawer.tsx`
- Create: `frontend/src/shared/components/api-debug-drawer.css`
- Create: `frontend/src/pages/workbench/SpatialWorkbenchPage.tsx`
- Create: `frontend/src/pages/workbench/spatial-workbench-page.css`
- Modify: `frontend/src/app/App.tsx`

- [ ] **Step 1: Add API debug drawer**

Write `frontend/src/shared/components/ApiDebugDrawer.tsx`:

```tsx
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useSyncExternalStore, useState } from 'react';
import { getApiLogs } from '../../services/api/httpClient';
import './api-debug-drawer.css';

export function ApiDebugDrawer() {
  const [open, setOpen] = useState(false);
  const logs = useSyncExternalStore(getApiLogs.subscribe, getApiLogs, getApiLogs);

  return (
    <section className={`api-debug ${open ? 'open' : ''}`}>
      <button className="api-debug-trigger" type="button" onClick={() => setOpen((value) => !value)}>
        <Bug size={16} />
        接口调试
        {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      {open ? (
        <div className="api-debug-body">
          {logs.length === 0 ? <p>暂无请求</p> : null}
          {logs.map((log) => (
            <article key={log.id} className={`api-log ${log.source}`}>
              <header>
                <strong>{log.method} {log.url}</strong>
                <span>{log.source === 'mock' ? 'Mock 降级' : '真实接口'}</span>
              </header>
              {log.reason ? <p>{log.reason}</p> : null}
              <pre>{JSON.stringify(log.response, null, 2)}</pre>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
```

Write `frontend/src/shared/components/api-debug-drawer.css`:

```css
.api-debug {
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
}

.api-debug-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  padding: 10px 12px;
  color: #1e293b;
  background: transparent;
  cursor: pointer;
}

.api-debug-body {
  max-height: 320px;
  overflow: auto;
  border-top: 1px solid #e2e8f0;
  padding: 10px;
}

.api-log {
  border-radius: 6px;
  padding: 8px;
  background: #f8fafc;
}

.api-log + .api-log {
  margin-top: 8px;
}

.api-log header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.api-log.mock header span {
  color: #b45309;
}

.api-log pre {
  max-height: 140px;
  overflow: auto;
  margin: 8px 0 0;
  white-space: pre-wrap;
  color: #475569;
  font-size: 11px;
}
```

- [ ] **Step 2: Compose SpatialWorkbenchPage**

Write `frontend/src/pages/workbench/SpatialWorkbenchPage.tsx`:

```tsx
import { useState } from 'react';
import { CommandPanel } from '../../features/robot-execution/components/CommandPanel';
import { MotionPad, type MoveDirection } from '../../features/robot-execution/components/MotionPad';
import { NavigationTargetPanel } from '../../features/robot-execution/components/NavigationTargetPanel';
import { RobotStatusCard } from '../../features/robot-execution/components/RobotStatusCard';
import { TaskTimeline } from '../../features/robot-execution/components/TaskTimeline';
import { useRobotWorkbench } from '../../features/robot-execution/hooks/useRobotWorkbench';
import { SpatialViewer } from '../../features/spatial-viewer/components/SpatialViewer';
import type { LayerVisibility } from '../../features/spatial-viewer/components/LayerDropdown';
import type { RenderSettings } from '../../features/spatial-viewer/lib/spatialScene';
import { ApiDebugDrawer } from '../../shared/components/ApiDebugDrawer';
import './spatial-workbench-page.css';

const defaultLayers: LayerVisibility = {
  bim: true,
  globalPointCloud: true,
  groundPointCloud: true,
  paths: true,
};

const defaultRenderSettings: RenderSettings = {
  pointSize: 'medium',
  opacity: 'solid',
  bimWireframe: false,
};

export function SpatialWorkbenchPage() {
  const workbench = useRobotWorkbench();
  const [layers, setLayers] = useState(defaultLayers);
  const [renderSettings, setRenderSettings] = useState(defaultRenderSettings);

  function handleMove(direction: MoveDirection) {
    void workbench.sendCommand('base_move', { direction, speed: 0.3 });
  }

  function handleRotate(angularVelocity: number) {
    void workbench.sendCommand('cmd_vel', {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angularVelocity },
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <main className="workbench-page">
      <header className="workbench-header">
        <div>
          <h1>uRobot SDK Web Example</h1>
          <p>空间执行工作台</p>
        </div>
        <select value={workbench.selectedRobotId} onChange={(event) => workbench.setSelectedRobotId(event.target.value)}>
          {workbench.robots.map((robot) => (
            <option key={robot.id} value={robot.id}>{robot.name}</option>
          ))}
        </select>
      </header>

      <div className="workbench-grid">
        <SpatialViewer
          edition={workbench.edition}
          runtime={workbench.runtime}
          navPaths={workbench.navPaths}
          topoPaths={workbench.topoPaths}
          layers={layers}
          renderSettings={renderSettings}
          onLayersChange={setLayers}
          onRenderSettingsChange={setRenderSettings}
          motionPad={<MotionPad onMove={handleMove} onRotate={handleRotate} />}
          debugDrawer={<ApiDebugDrawer />}
        />

        <aside className="workbench-side">
          <RobotStatusCard robot={workbench.selectedRobot} runtime={workbench.runtime} demoMode={workbench.demoMode} />
          <NavigationTargetPanel navPaths={workbench.navPaths} topoPaths={workbench.topoPaths} />
          <CommandPanel onCommand={(commandCode, commandParam) => void workbench.sendCommand(commandCode, commandParam)} />
          <TaskTimeline tasks={workbench.tasks} />
        </aside>
      </div>
    </main>
  );
}
```

Write `frontend/src/pages/workbench/spatial-workbench-page.css`:

```css
.workbench-page {
  min-height: 100vh;
  padding: 16px;
  background: #eef2f6;
}

.workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.workbench-header h1 {
  margin: 0;
  font-size: 22px;
}

.workbench-header p {
  margin: 4px 0 0;
  color: #64748b;
}

.workbench-header select {
  min-width: 220px;
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
  min-height: calc(100vh - 92px);
}

.workbench-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 980px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .workbench-side {
    order: 2;
  }
}
```

- [ ] **Step 3: Wire App to workbench page**

Replace `frontend/src/app/App.tsx`:

```tsx
import { SpatialWorkbenchPage } from '../pages/workbench/SpatialWorkbenchPage';

export function App() {
  return <SpatialWorkbenchPage />;
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/components frontend/src/pages/workbench frontend/src/app/App.tsx
git commit -m "feat: compose spatial workbench page"
```

## Task 8: Final Verification and Browser Check

**Files:**
- Modify only if verification finds a concrete issue.

- [ ] **Step 1: Run full test suite**

Run: `npm run test`

Expected: all Vitest tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Start local dev server**

Run: `npm run dev -- --port 5173`

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 4: Browser verify workbench**

Open the local URL and verify:

- 3D canvas is non-empty.
- Right side shows robot status, navigation target selection, commands, and task timeline.
- Top-right `图层` dropdown toggles BIM, global point cloud, ground point cloud, and paths.
- Top-right `渲染` dropdown changes point size and transparency without layout shift.
- Left-bottom motion pad sends commands and adds tasks.
- Debug drawer opens and shows real requests or Mock fallback reasons.
- On backend endpoint failure, the page stays usable and displays demo data.

- [ ] **Step 5: Commit fixes or verification note**

If fixes were needed:

```bash
git add frontend
git commit -m "fix: stabilize spatial workbench verification"
```

If no fixes were needed, do not create an empty commit.
