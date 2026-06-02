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
  private cpsPlugin: CpsSoonmanagerPlugin | null = null;
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
      this.loadPointCloud(edition.globalMap, 0x00ff00, this.groups.globalPointCloud),
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
    Object.values(this.groups).forEach((group) => this.clearGroup(group));
    this.clearGroup(this.robot);

    // 销毁 SoonSpace 实例（内部清理 scene、renderer、controls）
    if (this.ssp) {
      this.ssp.dispose();
      this.ssp = null;
    }
    this.cpsPlugin = null;
  }

  // ── BIM 加载 ──

  private async loadBim(edition: MapEdition) {
    if (!edition.bim || !this.ssp) return;

    // 注册 CPS 插件并加载 BIM 场景
    const cpsPlugin = this.ssp.registerPlugin(CpsSoonmanagerPlugin, 'cps');
    this.cpsPlugin = cpsPlugin;

    cpsPlugin.setPath(edition.bim.fileUrl);
    await cpsPlugin.loadScene();

    // CPS 插件加载的模型通过 sceneGroup 访问，移入 bim 分组统一管理图层可见性
    if (cpsPlugin.sceneGroup) {
      const sceneObj = cpsPlugin.sceneGroup as unknown as THREE.Object3D;
      sceneObj.parent?.remove(sceneObj);
      this.groups.bim.add(sceneObj);
    }

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
        materials.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
            mat.wireframe = settings.bimWireframe;
            mat.opacity = opacity;
            mat.transparent = opacity < 1;
            mat.needsUpdate = true;
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