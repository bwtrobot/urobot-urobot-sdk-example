# SoonSpace.js BIM + 点云渲染 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 spatial viewer 渲染引擎从原生 Three.js 替换为 SoonSpace.js，加载真实 PCD 点云和 CPS 平台 BIM 场景，修正坐标变换。

**Architecture:** SoonSpace.js 接管场景创建、相机控制和渲染循环。PCDLoader 加载点云后添加到 `ssp.viewport.scene`。cps-soonmanager 插件加载 BIM 场景。所有 ROS 坐标通过 `robotToThreeMatrix` 变换到 Three.js Y-up 坐标系。`SpatialSceneAdapter` 接口不变，`SpatialViewer.tsx` 及 UI 组件零改动。

**Tech Stack:** SoonSpace.js 2.15.8, @soonspacejs/plugin-cps-soonmanager, Three.js PCDLoader, TypeScript

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `frontend/package.json` | 修改 | 添加 `@soonspacejs/plugin-cps-soonmanager` 依赖 |
| `frontend/src/shared/utils/pose.ts` | 重写 | 修正坐标变换，添加 `robotToThreeMatrix`、位置/四元数变换函数 |
| `frontend/src/features/spatial-viewer/lib/spatialScene.ts` | 重写 | `ThreeSpatialSceneAdapter` → `SoonSpaceSceneAdapter` |
| `frontend/src/features/spatial-viewer/components/SpatialViewer.tsx` | 不变 | — |
| `frontend/src/features/spatial-viewer/components/LayerDropdown.tsx` | 不变 | — |
| `frontend/src/features/spatial-viewer/components/RenderDropdown.tsx` | 不变 | — |

---

### Task 1: 安装 cps-soonmanager 插件

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd frontend && npm install @soonspacejs/plugin-cps-soonmanager
```

- [ ] **Step 2: 验证安装**

Run: `ls node_modules/@soonspacejs/plugin-cps-soonmanager/package.json`
Expected: 文件存在

- [ ] **Step 3: 验证类型检查通过**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add @soonspacejs/plugin-cps-soonmanager dependency"
```

---

### Task 2: 修正坐标变换 pose.ts

**Files:**
- Modify: `frontend/src/shared/utils/pose.ts`

- [ ] **Step 1: 编写测试**

在 `frontend/src/shared/utils/pose.test.ts` 中：

```typescript
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { rosPositionToThree, rosQuaternionToThree, robotToThreeMatrix } from './pose';

describe('rosPositionToThree', () => {
  it('将 ROS (x,y,z) 转换为 Three.js (x, z, -y)', () => {
    const result = rosPositionToThree({ x: 1, y: 2, z: 3 });
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(3);
    expect(result.z).toBeCloseTo(-2);
  });

  it('零向量保持不变', () => {
    const result = rosPositionToThree({ x: 0, y: 0, z: 0 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });
});

describe('rosQuaternionToThree', () => {
  it('identity 四元数保持 identity', () => {
    const result = rosQuaternionToThree({ x: 0, y: 0, z: 0, w: 1 });
    // identity 经过坐标系变换后仍然是 identity
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
    expect(result.w).toBeCloseTo(1);
  });

  it('ROS 绕 Z 轴旋转 90° 变为 Three.js 绕 Y 轴旋转 90°', () => {
    // ROS 绕 Z 轴 90°: quat = (0, 0, sin(45°), cos(45°))
    const sin45 = Math.sin(Math.PI / 4);
    const cos45 = Math.cos(Math.PI / 4);
    const result = rosQuaternionToThree({ x: 0, y: 0, z: sin45, w: cos45 });
    // Three.js 绕 Y 轴 90°: quat = (0, sin(45°), 0, cos(45°))
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(sin45);
    expect(result.z).toBeCloseTo(0);
    expect(result.w).toBeCloseTo(cos45);
  });
});

describe('robotToThreeMatrix', () => {
  it('矩阵变换与 rosPositionToThree 一致', () => {
    const v = new THREE.Vector3(1, 2, 3);
    v.applyMatrix4(robotToThreeMatrix);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(3);
    expect(v.z).toBeCloseTo(-2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd frontend && npx vitest run src/shared/utils/pose.test.ts`
Expected: FAIL — `rosPositionToThree` 和 `robotToThreeMatrix` 未导出

- [ ] **Step 3: 实现修正后的 pose.ts**

将 `frontend/src/shared/utils/pose.ts` 重写为：

```typescript
import * as THREE from 'three';
import type { QuaternionValue, Vector3Value } from '../types/api';

/**
 * ROS/Robot 坐标系 (Z-up) → Three.js/SoonSpace 坐标系 (Y-up) 变换矩阵
 * 参考后端 PoseUtils.java 的 robotToThreeMatrix
 * Robot(x, y, z) → Three.js(x, z, -y)
 */
export const robotToThreeMatrix = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(1, 0, 0),   // X → X
  new THREE.Vector3(0, 0, -1),  // Y → -Z
  new THREE.Vector3(0, 1, 0),   // Z → Y
);

/**
 * ROS 位置坐标转 Three.js 位置坐标
 */
export function rosPositionToThree(p: Vector3Value): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.z, -p.y);
}

/**
 * ROS 四元数转 Three.js 四元数（通过坐标系变换矩阵）
 */
export function rosQuaternionToThree(q: QuaternionValue): THREE.Quaternion {
  const obj = new THREE.Object3D();
  obj.quaternion.set(q.x, q.y, q.z, q.w);
  obj.applyMatrix4(robotToThreeMatrix);
  return obj.quaternion.clone();
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd frontend && npx vitest run src/shared/utils/pose.test.ts`
Expected: PASS — 所有测试通过

- [ ] **Step 5: 运行全量测试确认无回归**

Run: `cd frontend && npx vitest run`
Expected: 现有 `spatialScene` 测试如有引用 `runtimePoseToSceneTransform`，可能需要后续 Task 修复。记录失败用例。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/utils/pose.ts frontend/src/shared/utils/pose.test.ts
git commit -m "fix: correct ROS-to-Three.js coordinate transform with robotToThreeMatrix"
```

---

### Task 3: 重写 spatialScene.ts — SoonSpaceSceneAdapter

**Files:**
- Rewrite: `frontend/src/features/spatial-viewer/lib/spatialScene.ts`

- [ ] **Step 1: 重写 spatialScene.ts**

将 `frontend/src/features/spatial-viewer/lib/spatialScene.ts` 替换为：

```typescript
import * as THREE from 'three';
import SoonSpace from 'soonspacejs';
import CpsSoonmanagerPlugin from '@soonspacejs/plugin-cps-soonmanager';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import type {
  MapEdition,
  NavigationPath,
  RobotRuntime,
  TopologyPath,
  Vector3Value,
} from '../../../shared/types/api';
import {
  robotToThreeMatrix,
  rosPositionToThree,
  rosQuaternionToThree,
} from '../../../shared/utils/pose';
import type { LayerVisibility } from '../components/LayerDropdown';

export interface RenderSettings {
  pointSize: 'small' | 'medium' | 'large';
  opacity: 'low' | 'medium' | 'solid';
  bimWireframe: boolean;
}

export interface SpatialSceneAdapter {
  mount(container: HTMLDivElement): void;
  loadEdition(edition: MapEdition | null): Promise<void>;
  updateRobotRuntime(runtime: RobotRuntime | null): void;
  setNavigationData(navPaths: NavigationPath[], topoPaths: TopologyPath[]): void;
  setLayerVisibility(layers: LayerVisibility): void;
  setRenderSettings(settings: RenderSettings): void;
  dispose(): void;
}

const pointSizes: Record<RenderSettings['pointSize'], number> = {
  small: 0.06,
  medium: 0.1,
  large: 0.16,
};

const opacityValues: Record<RenderSettings['opacity'], number> = {
  low: 0.35,
  medium: 0.65,
  solid: 1,
};

const pcdLoader = new PCDLoader();

class SoonSpaceSceneAdapter implements SpatialSceneAdapter {
  private ssp: SoonSpace | null = null;
  private cpsPlugin: InstanceType<typeof CpsSoonmanagerPlugin> | null = null;
  private renderSettings: RenderSettings = {
    pointSize: 'medium',
    opacity: 'solid',
    bimWireframe: false,
  };

  private readonly groups = {
    helpers: new THREE.Group(),
    bim: new THREE.Group(),
    globalPointCloud: new THREE.Group(),
    groundPointCloud: new THREE.Group(),
    paths: new THREE.Group(),
  };
  private readonly robot = new THREE.Group();

  mount(container: HTMLDivElement) {
    this.dispose();

    const ssp = new SoonSpace({
      el: container,
      options: {
        showInfo: false,
        showGrid: false,
        background: {
          color: 0xf6f8fb,
        },
      },
    });

    // 灯光
    ssp.createAmbientLight({ id: 'ambient', intensity: 0.7, color: 0xffffff });
    ssp.createDirectionalLight({
      id: 'directional',
      intensity: 0.75,
      color: 0xffffff,
      position: { x: 8, y: 12, z: 6 },
    });

    // 网格辅助线
    this.groups.helpers.add(new THREE.GridHelper(20, 20, 0xc6d0dc, 0xe0e6ee));

    // 将所有分组添加到 SoonSpace 的 Three.js 场景
    const scene = ssp.viewport.scene;
    Object.values(this.groups).forEach((group) => scene.add(group));
    this.buildRobotMesh();
    scene.add(this.robot);

    this.ssp = ssp;
  }

  async loadEdition(edition: MapEdition | null) {
    this.clearGroup(this.groups.bim);
    this.clearGroup(this.groups.globalPointCloud);
    this.clearGroup(this.groups.groundPointCloud);

    if (!edition) return;

    // 并行加载 BIM 和点云
    await Promise.all([
      this.loadBim(edition),
      this.loadPointCloud(edition.globalMap, 0xff0000, this.groups.globalPointCloud),
      this.loadPointCloud(edition.groundMap, 0x0000ff, this.groups.groundPointCloud),
    ]);

    this.applyRenderSettings();
  }

  updateRobotRuntime(runtime: RobotRuntime | null) {
    const pose = runtime?.ros_odom?.pose;
    this.robot.visible = Boolean(pose);
    if (!pose) return;

    // ROS 坐标 → Three.js 坐标
    const threePos = rosPositionToThree(pose.position);
    this.robot.position.copy(threePos);

    const threeQuat = rosQuaternionToThree(pose.orientation);
    this.robot.quaternion.copy(threeQuat);
  }

  setNavigationData(navPaths: NavigationPath[], topoPaths: TopologyPath[]) {
    this.clearGroup(this.groups.paths);

    navPaths.forEach((path) => {
      const line = this.createLineFromPositions(
        path.nodes.map((node) => node.position),
        0xf97316,
      );
      if (line) this.groups.paths.add(line);
    });

    topoPaths.forEach((path) => {
      const nodeById = new Map(path.nodes.map((node) => [node.id, node.position]));
      path.edges.forEach((edge) => {
        const start = nodeById.get(edge.snode);
        const end = nodeById.get(edge.enode);
        if (!start || !end) return;

        const line = this.createLineFromPositions([start, end], 0x6366f1);
        if (line) this.groups.paths.add(line);
      });
    });
  }

  setLayerVisibility(layers: LayerVisibility) {
    this.groups.bim.visible = layers.bim;
    this.groups.globalPointCloud.visible = layers.globalPointCloud;
    this.groups.groundPointCloud.visible = layers.groundPointCloud;
    this.groups.paths.visible = layers.paths;
  }

  setRenderSettings(settings: RenderSettings) {
    this.renderSettings = settings;
    this.applyRenderSettings();
  }

  dispose() {
    // 清理各分组
    Object.values(this.groups).forEach((group) => this.clearGroup(group));
    this.clearGroup(this.robot);

    // 销毁 SoonSpace 实例（内部会清理 scene、renderer、controls）
    if (this.ssp) {
      this.ssp.dispose();
      this.ssp = null;
    }
    this.cpsPlugin = null;
  }

  // ── BIM 加载 ──

  private async loadBim(edition: MapEdition) {
    if (!edition.bim || !this.ssp) return;

    // 注册 CPS 插件并加载场景
    const cpsPlugin = this.ssp.registerPlugin(CpsSoonmanagerPlugin, 'cps');
    this.cpsPlugin = cpsPlugin;

    await cpsPlugin.setPath(edition.bim.fileUrl);
    await cpsPlugin.loadScene();

    // 将 CPS 加载的场景对象移入 bim 分组以便统一管理图层可见性
    // CPS 插件加载的模型会直接添加到 ssp.viewport.scene，
    // 需要找到并移入 bim group
    const scene = this.ssp.viewport.scene;
    const cpsObjects: THREE.Object3D[] = [];
    scene.children.forEach((child) => {
      // CPS 加载的对象带有 userData.isSceneGroup 或由插件管理
      if (child !== this.robot && !Object.values(this.groups).includes(child as THREE.Group)) {
        cpsObjects.push(child);
      }
    });
    cpsObjects.forEach((obj) => {
      scene.remove(obj);
      this.groups.bim.add(obj);
    });

    // 应用 BIM 变换参数（已是 Three.js 坐标系，直接应用）
    const bim = edition.bim;
    this.groups.bim.position.set(bim.position.x, bim.position.y, bim.position.z);
    this.groups.bim.scale.set(bim.scale.x, bim.scale.y, bim.scale.z);
    this.groups.bim.quaternion.set(
      bim.orientation.x,
      bim.orientation.y,
      bim.orientation.z,
      bim.orientation.w,
    );
  }

  // ── 点云加载 ──

  private async loadPointCloud(url: string | undefined, color: number, group: THREE.Group) {
    if (!url) return;

    const points = await pcdLoader.loadAsync(url);
    const material = points.material as THREE.PointsMaterial;
    material.color.set(color);
    material.size = pointSizes[this.renderSettings.pointSize];

    // ROS 坐标系 → Three.js 坐标系
    points.applyMatrix4(robotToThreeMatrix);
    group.add(points);
  }

  // ── 机器人 mesh ──

  private buildRobotMesh() {
    this.clearGroup(this.robot);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45 }),
    );
    body.position.y = 0.18;

    const heading = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }),
    );
    heading.position.set(0, 0.38, -0.35);
    heading.rotation.x = Math.PI / 2;

    this.robot.add(body, heading);
    this.robot.visible = false;
  }

  // ── 路径渲染 ──

  private createLineFromPositions(positions: Vector3Value[], color: number) {
    if (positions.length < 2) return null;

    // ROS 坐标 → Three.js 坐标，+0.03 Y 偏移避免 Z-fighting
    const points = positions.map((p) => {
      const v = rosPositionToThree(p);
      v.y += 0.03;
      return v;
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, linewidth: 2 }),
    );
  }

  // ── 渲染设置 ──

  private applyRenderSettings() {
    const settings = this.renderSettings;
    const pointSize = pointSizes[settings.pointSize];
    const opacity = opacityValues[settings.opacity];

    [this.groups.globalPointCloud, this.groups.groundPointCloud].forEach((group) => {
      group.traverse((object) => {
        if (object instanceof THREE.Points) {
          const material = object.material as THREE.PointsMaterial;
          material.size = pointSize;
          material.opacity = opacity;
          material.transparent = opacity < 1;
          material.needsUpdate = true;
        }
      });
    });

    this.groups.bim.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: THREE.Material) => {
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
            material.wireframe = settings.bimWireframe;
            material.opacity = opacity;
            material.transparent = opacity < 1;
            material.needsUpdate = true;
          }
        });
      }
    });
  }

  // ── 工具方法 ──

  private clearGroup(group: THREE.Group) {
    group.children.slice().forEach((child) => {
      group.remove(child);
      this.disposeObject(child);
    });
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((m) => m?.dispose());
      }
    });
  }
}

export function createSpatialScene(): SpatialSceneAdapter {
  return new SoonSpaceSceneAdapter();
}
```

- [ ] **Step 2: 调整 SpatialViewer.tsx 的 loadEdition 调用**

`loadEdition` 现在返回 `Promise<void>`（之前是同步的）。`SpatialViewer.tsx:70` 的调用方式：

```typescript
adapterRef.current.loadEdition(edition);
```

由于 `loadEdition` 返回 Promise，但 `useEffect` 中已经是 fire-and-forget 模式（不 await），无需改动。TypeScript 不会报错因为 `void` 返回和 `Promise<void>` 返回在非 await 场景下兼容。

如果 TypeScript 报错，在 `SpatialViewer.tsx:70` 改为：

```typescript
void adapterRef.current.loadEdition(edition);
```

- [ ] **Step 3: 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 运行全量测试**

Run: `cd frontend && npx vitest run`
Expected: 所有测试通过。如有旧 `runtimePoseToSceneTransform` 引用导致的失败，在下一步修复。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/spatial-viewer/lib/spatialScene.ts frontend/src/features/spatial-viewer/components/SpatialViewer.tsx
git commit -m "feat: replace Three.js with SoonSpace.js as main rendering engine

加载真实 PCD 点云（globalMap 红色、groundMap 蓝色）和 CPS 平台 BIM 场景。
坐标变换统一使用 robotToThreeMatrix。"
```

---

### Task 4: 修复引用旧 pose API 的代码和测试

**Files:**
- Modify: 所有引用 `runtimePoseToSceneTransform` 或 `quaternionToYaw` 的文件

- [ ] **Step 1: 搜索旧 API 引用**

Run: `cd frontend && grep -rn "runtimePoseToSceneTransform\|quaternionToYaw\|SceneTransform" src/`

查找所有仍然引用旧函数的文件。已知 `spatialScene.ts` 已重写不再引用。检查是否有其他文件引用。

- [ ] **Step 2: 修复发现的引用**

对每个引用旧 API 的文件，替换为新的 `rosPositionToThree` / `rosQuaternionToThree`。如果旧函数不再被任何文件使用，可以从 `pose.ts` 中移除（Task 2 已经重写了 pose.ts，旧函数已不存在）。

- [ ] **Step 3: 运行全量测试**

Run: `cd frontend && npx vitest run`
Expected: 所有测试通过

- [ ] **Step 4: 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**（如有改动）

```bash
git add -u frontend/src/
git commit -m "fix: update remaining references to old pose transform API"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动前端开发服务器**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: 在浏览器中验证**

打开 `http://localhost:5173`，确认：
1. SoonSpace.js 场景正常初始化（无白屏/报错）
2. 图层控制面板可切换各图层可见性
3. 渲染设置（点大小、透明度、线框模式）正常工作
4. 如果后端运行中：PCD 点云加载显示（红/蓝）、BIM 场景加载、机器人位姿更新
5. 如果后端未运行：demo 模式正常工作（mock 数据）

- [ ] **Step 3: 构建检查**

Run: `cd frontend && npm run build`
Expected: 构建成功，无错误

- [ ] **Step 4: 最终 commit**（如有修复）

```bash
git add -u frontend/
git commit -m "fix: address issues found during e2e verification"
```