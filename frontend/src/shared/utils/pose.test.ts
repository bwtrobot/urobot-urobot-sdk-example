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
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
    expect(result.w).toBeCloseTo(1);
  });

  it('ROS 绕 Z 轴旋转 90° 变为 Three.js 绕 Y 轴旋转 90°', () => {
    const sin45 = Math.sin(Math.PI / 4);
    const cos45 = Math.cos(Math.PI / 4);
    const result = rosQuaternionToThree({ x: 0, y: 0, z: sin45, w: cos45 });
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