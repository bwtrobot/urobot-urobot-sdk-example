import SoonSpace from 'soonspacejs';
import * as THREE from 'three';
import type {
  MapEdition,
  NavigationPath,
  RobotRuntime,
  TopologyPath,
  Vector3Value,
} from '../../../shared/types/api';
import { runtimePoseToSceneTransform } from '../../../shared/utils/pose';
import type { LayerVisibility } from '../components/LayerDropdown';

export interface RenderSettings {
  pointSize: 'small' | 'medium' | 'large';
  opacity: 'low' | 'medium' | 'solid';
  bimWireframe: boolean;
}

export interface SpatialSceneAdapter {
  mount(container: HTMLDivElement): void;
  loadEdition(edition: MapEdition | null): void;
  updateRobotRuntime(runtime: RobotRuntime | null): void;
  setNavigationData(navPaths: NavigationPath[], topoPaths: TopologyPath[]): void;
  setLayerVisibility(layers: LayerVisibility): void;
  setRenderSettings(settings: RenderSettings): void;
  dispose(): void;
}

interface SoonSpaceHandle {
  dispose?: () => void;
  destroy?: () => void;
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

class ThreeSpatialSceneAdapter implements SpatialSceneAdapter {
  private container: HTMLDivElement | null = null;
  private soonspace: SoonSpaceHandle | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private frameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly groups = {
    bim: new THREE.Group(),
    globalPointCloud: new THREE.Group(),
    groundPointCloud: new THREE.Group(),
    paths: new THREE.Group(),
  };
  private readonly robot = new THREE.Group();

  mount(container: HTMLDivElement) {
    this.dispose();
    this.container = container;
    this.soonspace = new SoonSpace({ el: container }) as SoonSpaceHandle;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    scene.background = new THREE.Color(0xf6f8fb);
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
    directionalLight.position.set(8, 12, 6);
    scene.add(directionalLight);
    scene.add(new THREE.GridHelper(20, 20, 0xc6d0dc, 0xe0e6ee));

    Object.values(this.groups).forEach((group) => scene.add(group));
    this.buildRobotMesh();
    scene.add(this.robot);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animate();
  }

  loadEdition(edition: MapEdition | null) {
    this.clearGroup(this.groups.bim);
    this.clearGroup(this.groups.globalPointCloud);
    this.clearGroup(this.groups.groundPointCloud);

    if (!edition) {
      return;
    }

    this.groups.bim.add(this.createBimPlaceholder(edition));
    this.groups.globalPointCloud.add(
      this.createPointCloudPlaceholder(0x2f80ed, -1.6, edition.globalMap),
    );
    this.groups.groundPointCloud.add(
      this.createPointCloudPlaceholder(0x18a058, 1.6, edition.groundMap),
    );
  }

  updateRobotRuntime(runtime: RobotRuntime | null) {
    const pose = runtime?.ros_odom?.pose;
    this.robot.visible = Boolean(pose);

    if (!pose) {
      return;
    }

    const transform = runtimePoseToSceneTransform(pose);
    this.robot.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    this.robot.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
    );
  }

  setNavigationData(navPaths: NavigationPath[], topoPaths: TopologyPath[]) {
    this.clearGroup(this.groups.paths);

    navPaths.forEach((path) => {
      const line = this.createLineFromPositions(
        path.nodes.map((node) => node.position),
        0xf97316,
      );
      if (line) {
        this.groups.paths.add(line);
      }
    });

    topoPaths.forEach((path) => {
      const nodeById = new Map(path.nodes.map((node) => [node.id, node.position]));
      path.edges.forEach((edge) => {
        const start = nodeById.get(edge.snode);
        const end = nodeById.get(edge.enode);
        if (!start || !end) {
          return;
        }

        const line = this.createLineFromPositions([start, end], 0x6366f1);
        if (line) {
          this.groups.paths.add(line);
        }
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
        const material = object.material as THREE.MeshStandardMaterial;
        material.wireframe = settings.bimWireframe;
        material.opacity = opacity;
        material.transparent = opacity < 1;
        material.needsUpdate = true;
      }
    });
  }

  dispose() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    Object.values(this.groups).forEach((group) => this.clearGroup(group));
    this.clearGroup(this.robot);

    if (this.scene) {
      Object.values(this.groups).forEach((group) => this.scene?.remove(group));
      this.scene.remove(this.robot);
      this.scene.clear();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }

    this.soonspace?.dispose?.();
    this.soonspace?.destroy?.();
    this.soonspace = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
  }

  private resize() {
    if (!this.container || !this.camera || !this.renderer) {
      return;
    }

    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = () => {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  };

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

  private createBimPlaceholder(edition: MapEdition) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      opacity: 0.78,
      transparent: true,
      roughness: 0.65,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 3), material);
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1), material.clone());
    core.position.y = 0.86;
    group.add(slab, core);

    if (edition.bim) {
      const transform = runtimePoseToSceneTransform({
        position: edition.bim.position,
        orientation: edition.bim.orientation,
      });
      group.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z,
      );
      group.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
      );
      group.scale.set(
        edition.bim.scale.x,
        edition.bim.scale.z,
        edition.bim.scale.y,
      );
    }

    return group;
  }

  private createPointCloudPlaceholder(color: number, offsetX: number, source?: string) {
    const count = source ? 260 : 90;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const column = index % 26;
      const row = Math.floor(index / 26);
      positions[index * 3] = offsetX + (column - 13) * 0.14;
      positions[index * 3 + 1] = ((index * 17) % 9) * 0.02;
      positions[index * 3 + 2] = (row - 5) * 0.28;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color,
        size: pointSizes.medium,
        opacity: opacityValues.medium,
        transparent: true,
      }),
    );
  }

  private createLineFromPositions(positions: Vector3Value[], color: number) {
    if (positions.length < 2) {
      return null;
    }

    const points = positions.map(
      (position) => new THREE.Vector3(position.x, position.z + 0.03, position.y),
    );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, linewidth: 2 }),
    );
  }

  private clearGroup(group: THREE.Group) {
    group.children.slice().forEach((child) => {
      group.remove(child);
      this.disposeObject(child);
    });
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        child.geometry.dispose();
        this.disposeMaterial(child.material);
      }

      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        this.disposeMaterial(child.material);
      }
    });
  }

  private disposeMaterial(
    material: THREE.Material | THREE.Material[] | undefined,
  ) {
    if (!material) {
      return;
    }

    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material.dispose();
  }
}

export function createSpatialScene(): SpatialSceneAdapter {
  return new ThreeSpatialSceneAdapter();
}
