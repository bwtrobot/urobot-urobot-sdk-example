import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { rosPositionToThree, rosQuaternionToThree, robotToThreeMatrix, threePositionToRos, threeQuaternionToRos } from './pose';

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

describe('threePositionToRos', () => {
  it('将 Three.js (x,y,z) 转换为 ROS (x, -z, y)', () => {
    const result = threePositionToRos({ x: 1, y: 3, z: -2 });
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
  });

  it('零向量保持不变', () => {
    const result = threePositionToRos({ x: 0, y: 0, z: 0 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });

  it('与 rosPositionToThree 互为逆运算', () => {
    const ros = { x: 5, y: -3, z: 7 };
    const three = rosPositionToThree(ros);
    const back = threePositionToRos(three);
    expect(back.x).toBeCloseTo(ros.x);
    expect(back.y).toBeCloseTo(ros.y);
    expect(back.z).toBeCloseTo(ros.z);
  });
});

describe('threeQuaternionToRos', () => {
  it('identity 四元数保持 identity', () => {
    const result = threeQuaternionToRos({ x: 0, y: 0, z: 0, w: 1 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
    expect(result.w).toBeCloseTo(1);
  });

  it('Three.js 绕 Y 轴旋转 90° 变为 ROS 绕 Z 轴旋转 90°', () => {
    const sin45 = Math.sin(Math.PI / 4);
    const cos45 = Math.cos(Math.PI / 4);
    const result = threeQuaternionToRos({ x: 0, y: sin45, z: 0, w: cos45 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(sin45);
    expect(result.w).toBeCloseTo(cos45);
  });

  it('与 rosQuaternionToThree 互为逆运算', () => {
    const rosQ = { x: 0.1, y: 0.2, z: 0.3, w: 0.927 };
    const threeQ = rosQuaternionToThree(rosQ);
    const back = threeQuaternionToRos(threeQ);
    expect(back.x).toBeCloseTo(rosQ.x);
    expect(back.y).toBeCloseTo(rosQ.y);
    expect(back.z).toBeCloseTo(rosQ.z);
    expect(back.w).toBeCloseTo(rosQ.w);
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