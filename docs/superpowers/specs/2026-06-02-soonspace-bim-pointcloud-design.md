# SoonSpace.js BIM + 点云渲染设计

## 目标

将 spatial viewer 的渲染引擎从原生 Three.js 切换到 SoonSpace.js，实现：
1. PCD 点云加载：globalMap（红色）、groundMap（蓝色）
2. BIM 场景加载：通过 `cps-soonmanager` 插件加载 CPS 平台生产的场景
3. 坐标对齐：以点云（ROS 坐标系）为参考，BIM 应用自身变换参数对齐

## 约束

- 前端页面布局保持不变
- `SpatialViewer.tsx` 及所有 UI 组件（LayerDropdown、RenderDropdown）零改动
- `SpatialSceneAdapter` 接口不变，仅替换实现类

## 依赖

- `@xwbuilders/soonspacejs`（最新版，npm 安装）
- `@xwbuilders/plugin-cps-soonmanager`（最新版，npm 安装）
- Three.js `PCDLoader`（来自 `three/examples/jsm/loaders/PCDLoader`）

## 架构

### 整体结构

```
SpatialViewer.tsx (不变)
  └── SoonSpaceSceneAdapter (替换 ThreeSpatialSceneAdapter)
        ├── SoonSpace 实例 (场景、相机、控制器、渲染循环)
        ├── CpsSoonmanager 插件 (加载 BIM 场景)
        ├── PCDLoader (加载点云 → 添加到 ssp.scene)
        ├── 机器人 mesh (添加到 ssp.scene)
        └── 路径 lines (添加到 ssp.scene)
```

### 工厂函数

```typescript
// createSpatialScene() 返回 SoonSpaceSceneAdapter 而非 ThreeSpatialSceneAdapter
export function createSpatialScene(): SpatialSceneAdapter {
  return new SoonSpaceSceneAdapter();
}
```

## 坐标变换

### robotToThreeMatrix

参考后端 `PoseUtils.java`，统一坐标变换矩阵：

```typescript
// Robot/ROS 坐标系 (Z-up) → Three.js/SoonSpace 坐标系 (Y-up)
// Robot(x, y, z) → Three.js(x, z, -y)
const robotToThreeMatrix = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(1, 0, 0),   // X → X
  new THREE.Vector3(0, 0, -1),  // Y → -Z
  new THREE.Vector3(0, 1, 0),   // Z → Y
);
```

### 各数据源的变换策略

| 数据源 | 原始坐标系 | 变换方式 |
|--------|-----------|---------|
| PCD 点云 (globalMap/groundMap) | ROS (Z-up) | `points.applyMatrix4(robotToThreeMatrix)` |
| BIM 模型 | Three.js (Y-up) | 直接应用 edition.bim 的 position/scale/orientation |
| 机器人位姿 (runtime) | ROS (Z-up) | position 和 quaternion 通过 robotToThreeMatrix 变换 |
| 路径节点 (nav/topo) | ROS (Z-up) | 每个节点 position 通过 robotToThreeMatrix 变换 |

### pose.ts 修正

当前 `runtimePoseToSceneTransform` 映射为 `(x, z, y)` 缺少 Y 轴取反，需修正为 `(x, z, -y)` 并使用矩阵变换四元数：

```typescript
export const robotToThreeMatrix = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 1, 0),
);

// 位置变换：Robot(x,y,z) → Three.js(x, z, -y)
export function rosPositionToThree(p: Vector3Value): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.z, -p.y);
}

// 四元数变换：通过矩阵变换
export function rosQuaternionToThree(q: QuaternionValue): THREE.Quaternion {
  const obj = new THREE.Object3D();
  obj.quaternion.set(q.x, q.y, q.z, q.w);
  obj.applyMatrix4(robotToThreeMatrix);
  return obj.quaternion;
}
```

## 模块实现

### 1. BIM 加载 (cps-soonmanager)

```typescript
private cpsPlugin: CpsSoonmanager | null = null;

async loadBim(bimInfo: MapBimInfo) {
  this.cpsPlugin = ssp.registerPlugin(CpsSoonmanager, 'cps');
  // 加载 CPS 平台生产的 BIM 场景
  await this.cpsPlugin.loadScene(bimInfo.fileUrl);

  // 应用 BIM 变换参数（已是 Three.js 坐标系）
  // position、scale、orientation 直接设置到 BIM 场景根节点
}
```

### 2. 点云加载 (PCDLoader)

```typescript
async loadPointCloud(url: string, color: number, group: THREE.Group) {
  const loader = new PCDLoader();
  const points = await loader.loadAsync(url);

  // 设置颜色
  const material = points.material as THREE.PointsMaterial;
  material.color.set(color);
  material.size = pointSizes.medium;

  // ROS 坐标 → Three.js 坐标
  points.applyMatrix4(robotToThreeMatrix);
  group.add(points);
}
```

- globalMap → 红色 (0xff0000)
- groundMap → 蓝色 (0x0000ff)

### 3. 机器人 mesh

保持现有 body + heading cone 设计。位姿更新时使用 `rosPositionToThree` 和 `rosQuaternionToThree` 变换。

### 4. 路径渲染

导航路径（橙色）和拓扑路径（靛色）的节点坐标通过 `rosPositionToThree` 变换后用 Three.js Line 添加到 `ssp.scene`。

### 5. 图层与渲染设置

保持现有 group 分组和 visibility/material 控制逻辑不变。BIM wireframe 设置需要适配 cps-soonmanager 加载的模型材质遍历方式。

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/package.json` | 修改 | 添加 soonspacejs、plugin-cps-soonmanager 依赖 |
| `frontend/src/features/spatial-viewer/lib/spatialScene.ts` | 重写 | ThreeSpatialSceneAdapter → SoonSpaceSceneAdapter |
| `frontend/src/shared/utils/pose.ts` | 修改 | 修正坐标变换，添加 robotToThreeMatrix |
| `frontend/src/features/spatial-viewer/components/SpatialViewer.tsx` | 不变 | — |
| `frontend/src/features/spatial-viewer/components/LayerDropdown.tsx` | 不变 | — |
| `frontend/src/features/spatial-viewer/components/RenderDropdown.tsx` | 不变 | — |

## SoonSpace 初始化

```typescript
mount(container: HTMLDivElement) {
  this.ssp = new SoonSpace({
    el: container,
    options: {
      showInfo: false,
      background: { color: '#f6f8fb' },
    },
    events: {
      modelClick: (e) => { /* 预留模型点击事件 */ },
    },
  });

  // 灯光
  this.ssp.addAmbientLight({ color: 0xffffff, intensity: 0.7 });
  this.ssp.addDirectionalLight({
    color: 0xffffff, intensity: 0.75,
    position: { x: 8, y: 12, z: 6 },
  });

  // 添加分组到 scene
  Object.values(this.groups).forEach(g => this.ssp.scene.add(g));
  this.ssp.scene.add(this.robot);
}
```

## 资源释放

```typescript
dispose() {
  // 卸载 CPS 插件场景
  this.cpsPlugin?.unloadScene();
  // 清理各 group
  Object.values(this.groups).forEach(g => this.clearGroup(g));
  this.clearGroup(this.robot);
  // 销毁 SoonSpace 实例
  this.ssp?.dispose();
  this.ssp = null;
}
```