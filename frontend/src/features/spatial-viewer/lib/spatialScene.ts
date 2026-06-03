import * as THREE from 'three';
import SoonSpace from 'soonspacejs';
import CpsSoonmanagerPlugin from '@soonspacejs/plugin-cps-soonmanager';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import type {
  MapEdition,
  NavigationPath,
  PathNode,
  QuaternionValue,
  RobotRuntime,
  TopologyPath,
  Vector3Value,
} from '../../../shared/types/api';
import {
  robotToThreeMatrix,
  rosPositionToThree,
  rosQuaternionToThree,
  threePositionToRos,
  threeQuaternionToRos,
} from '../../../shared/utils/pose';
import type { LayerVisibility } from '../components/LayerDropdown';

export interface RenderSettings {
  pointSize: 'small' | 'medium' | 'large';
  opacity: 'low' | 'medium' | 'solid';
  bimWireframe: boolean;
}

export interface ActivePathData {
  type: 'nav' | 'topo';
  path: NavigationPath | TopologyPath;
  selectedNodeIds: Set<string>;
}

export interface SpatialSceneAdapter {
  mount(container: HTMLDivElement): void;
  loadEdition(edition: MapEdition | null): Promise<void>;
  updateRobotRuntime(runtime: RobotRuntime | null): void;
  setNavigationData(navPaths: NavigationPath[], topoPaths: TopologyPath[]): void;
  setActivePathData(data: ActivePathData | null): void;
  setLayerVisibility(layers: LayerVisibility): void;
  setRenderSettings(settings: RenderSettings): void;
  // 位姿标定
  enterPoseCalibration(): void;
  exitPoseCalibration(): void;
  confirmCalibration(): { position: Vector3Value; orientation: QuaternionValue } | null;
  onPoseConfirmed(cb: (pose: { position: Vector3Value; orientation: QuaternionValue }) => void): () => void;
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
    // 保留旧接口兼容，但不再使用——由 setActivePathData 替代
    this.clearGroup(this.groups.paths);
  }

  setActivePathData(data: ActivePathData | null) {
    this.clearGroup(this.groups.paths);
    if (!data) return;

    const { type, path, selectedNodeIds } = data;
    const coordinateFrame = path.coordinateFrame ?? 'ROBOT';

    // 渲染路径线条
    if (type === 'nav') {
      const line = this.createLineFromPositions(
        path.nodes.map((n) => n.position),
        0xf97316,
        coordinateFrame,
      );
      if (line) this.groups.paths.add(line);
    } else {
      const topoPath = path as TopologyPath;
      const nodeById = new Map(topoPath.nodes.map((n) => [n.id, n.position]));
      topoPath.edges.forEach((edge) => {
        const start = nodeById.get(edge.snode);
        const end = nodeById.get(edge.enode);
        if (!start || !end) return;
        const line = this.createLineFromPositions([start, end], 0x6366f1, coordinateFrame);
        if (line) this.groups.paths.add(line);
      });
    }

    // 渲染节点圆球和名称标签
    path.nodes.forEach((node) => {
      const isSelected = selectedNodeIds.has(node.id);
      const radius = isSelected ? 0.15 : 0.1;
      const color = isSelected ? 0xfbbf24 : 0x94a3b8;

      // 计算节点在 Three.js 坐标系中的位置
      const pos = coordinateFrame === 'THREE'
        ? new THREE.Vector3(node.position.x, node.position.y, node.position.z)
        : rosPositionToThree(node.position);

      // 圆球标记
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshStandardMaterial({ color }),
      );
      sphere.position.copy(pos);
      this.groups.paths.add(sphere);

      // 名称文字标签（Canvas Sprite）
      if (node.name) {
        const sprite = this.createTextSprite(node.name);
        sprite.position.copy(pos);
        sprite.position.y += 0.25;
        this.groups.paths.add(sprite);
      }
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

  private createLineFromPositions(
    positions: Vector3Value[],
    color: number,
    coordinateFrame: 'ROBOT' | 'THREE' = 'ROBOT',
  ) {
    if (positions.length < 2) return null;

    // 路径详情可能来自 SDK 的 THREE 坐标，也可能来自 mock/旧接口的 ROBOT 坐标。
    const points = positions.map((p) => {
      const v = coordinateFrame === 'THREE'
        ? new THREE.Vector3(p.x, p.y, p.z)
        : rosPositionToThree(p);
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

  // ── 文字标签 ──

  private createTextSprite(text: string): THREE.Sprite {
    const scale = Math.min(window.devicePixelRatio, 2) * 2;
    const fontSize = 14 * scale;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    ctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const padding = 4 * scale;
    canvas.width = metrics.width + padding * 2;
    canvas.height = fontSize + padding * 2;

    // 重设 font（canvas 尺寸变更后会重置）
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#1e293b';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    // 保持文字大小适中
    sprite.scale.set(canvas.width / canvas.height * 0.3, 0.3, 1);
    return sprite;
  }

  // ── 位姿标定 ──

  private calibrationState: {
    active: boolean;
    groundPlane: THREE.Mesh | null;
    marker: THREE.Mesh | null;
    arrow: THREE.ArrowHelper | null;
    confirmCallback: ((pose: { position: Vector3Value; orientation: QuaternionValue }) => void) | null;
    mouseDownHandler: ((e: MouseEvent) => void) | null;
    mouseMoveHandler: ((e: MouseEvent) => void) | null;
    mouseUpHandler: ((e: MouseEvent) => void) | null;
    isDragging: boolean;
    markerPosition: THREE.Vector3 | null;
  } = {
    active: false,
    groundPlane: null,
    marker: null,
    arrow: null,
    confirmCallback: null,
    mouseDownHandler: null,
    mouseMoveHandler: null,
    mouseUpHandler: null,
    isDragging: false,
    markerPosition: null,
  };

  enterPoseCalibration() {
    if (!this.ssp || this.calibrationState.active) return;
    this.calibrationState.active = true;

    // 禁用相机控制器，防止标定拖拽被相机控制拦截
    this.ssp.controls.enabled = false;

    // 创建不可见地面平面作为 Raycaster 拾取目标
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    ground.rotation.x = -Math.PI / 2; // 水平放置
    this.ssp.viewport.scene.add(ground);
    this.calibrationState.groundPlane = ground;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const renderer = this.ssp.viewport.renderer;
    const camera = this.ssp.viewport.camera;

    // 获取 canvas 元素
    const canvas = renderer.domElement;

    // 鼠标按下：放置/移动标记位置
    this.calibrationState.mouseDownHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(ground);
      if (intersects.length === 0) return;

      const point = intersects[0].point;
      this.calibrationState.markerPosition = point.clone();

      // 放置或移动绿色圆球标记
      if (!this.calibrationState.marker) {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 24, 24),
          new THREE.MeshStandardMaterial({ color: 0x22c55e }),
        );
        marker.position.copy(point);
        this.ssp!.viewport.scene.add(marker);
        this.calibrationState.marker = marker;

        // 创建红色朝向箭头
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(0, 0, -1), point, 1.0, 0xef4444, 0.2, 0.1,
        );
        this.ssp!.viewport.scene.add(arrow);
        this.calibrationState.arrow = arrow;
      } else {
        this.calibrationState.marker.position.copy(point);
        this.calibrationState.arrow!.position.copy(point);
      }

      this.calibrationState.isDragging = true;
    };

    // 鼠标移动：拖拽设定朝向
    this.calibrationState.mouseMoveHandler = (e: MouseEvent) => {
      if (!this.calibrationState.isDragging || !this.calibrationState.arrow || !this.calibrationState.markerPosition) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(ground);
      if (intersects.length === 0) return;

      // 计算从标记位置到鼠标位置的方向
      const target = intersects[0].point;
      const dir = new THREE.Vector3().subVectors(target, this.calibrationState.markerPosition).normalize();
      if (dir.length() > 0.01) {
        this.calibrationState.arrow.setDirection(dir);
      }
    };

    // 鼠标抬起：结束拖拽
    this.calibrationState.mouseUpHandler = () => {
      this.calibrationState.isDragging = false;
    };

    canvas.addEventListener('mousedown', this.calibrationState.mouseDownHandler);
    canvas.addEventListener('mousemove', this.calibrationState.mouseMoveHandler);
    canvas.addEventListener('mouseup', this.calibrationState.mouseUpHandler);
  }

  exitPoseCalibration() {
    if (!this.ssp) return;
    const state = this.calibrationState;

    // 恢复相机控制器
    this.ssp.controls.enabled = true;

    // 清理事件监听
    const canvas = this.ssp.viewport.renderer.domElement;
    if (state.mouseDownHandler) canvas.removeEventListener('mousedown', state.mouseDownHandler);
    if (state.mouseMoveHandler) canvas.removeEventListener('mousemove', state.mouseMoveHandler);
    if (state.mouseUpHandler) canvas.removeEventListener('mouseup', state.mouseUpHandler);

    // 清理 3D 对象
    if (state.groundPlane) {
      this.ssp.viewport.scene.remove(state.groundPlane);
      state.groundPlane.geometry.dispose();
      (state.groundPlane.material as THREE.Material).dispose();
    }
    if (state.marker) {
      this.ssp.viewport.scene.remove(state.marker);
      state.marker.geometry.dispose();
      (state.marker.material as THREE.Material).dispose();
    }
    if (state.arrow) {
      this.ssp.viewport.scene.remove(state.arrow);
    }

    // 重置状态
    this.calibrationState = {
      active: false, groundPlane: null, marker: null, arrow: null,
      confirmCallback: null, mouseDownHandler: null, mouseMoveHandler: null,
      mouseUpHandler: null, isDragging: false, markerPosition: null,
    };
  }

  onPoseConfirmed(cb: (pose: { position: Vector3Value; orientation: QuaternionValue }) => void): () => void {
    this.calibrationState.confirmCallback = cb;
    return () => { this.calibrationState.confirmCallback = null; };
  }

  /** 外部调用确认标定，返回当前标记的 ROS 坐标位姿 */
  confirmCalibration(): { position: Vector3Value; orientation: QuaternionValue } | null {
    const { marker, arrow, confirmCallback } = this.calibrationState;
    if (!marker || !arrow) return null;

    // 将 Three.js 位置转换为 ROS 坐标
    const position = threePositionToRos(marker.position);

    // 从箭头方向计算四元数：箭头方向在 XZ 平面，转为绕 Y 轴的旋转
    const dir = arrow.getWorldDirection(new THREE.Vector3());
    const yaw = Math.atan2(dir.x, dir.z);
    const threeQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const orientation = threeQuaternionToRos(threeQuat);

    const pose = { position, orientation };
    if (confirmCallback) confirmCallback(pose);
    return pose;
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
