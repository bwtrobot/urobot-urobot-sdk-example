import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRobotFocusViewpoint } from './spatialCamera';

describe('createRobotFocusViewpoint', () => {
  it('根据机器人位置生成斜上方初始视角', () => {
    const target = new THREE.Vector3(2, 0.5, -3);

    const viewpoint = createRobotFocusViewpoint(target, 1.2);

    expect(viewpoint.target).toEqual({ x: 2, y: 0.8, z: -3 });
    expect(viewpoint.position.x).toBeGreaterThan(viewpoint.target.x);
    expect(viewpoint.position.y).toBeGreaterThan(viewpoint.target.y);
    expect(viewpoint.position.z).toBeGreaterThan(viewpoint.target.z);
  });

  it('对过小包围盒使用最小观察距离', () => {
    const target = new THREE.Vector3(0, 0, 0);

    const viewpoint = createRobotFocusViewpoint(target, 0);

    expect(viewpoint.position.x).toBeCloseTo(2.4);
    expect(viewpoint.position.y).toBeCloseTo(1.9);
    expect(viewpoint.position.z).toBeCloseTo(2.4);
    expect(viewpoint.target).toEqual({ x: 0, y: 0.3, z: 0 });
  });
});
