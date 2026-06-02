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

// 坐标系变换四元数（从 robotToThreeMatrix 提取），预计算避免每次创建
const basisQuat = new THREE.Quaternion().setFromRotationMatrix(robotToThreeMatrix);
const basisQuatInv = basisQuat.clone().invert();

/**
 * ROS 四元数转 Three.js 四元数
 * 使用相似变换: q_three = R * q_ros * R^(-1)
 */
export function rosQuaternionToThree(q: QuaternionValue): THREE.Quaternion {
  const rosQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  return new THREE.Quaternion()
    .copy(basisQuat)
    .multiply(rosQuat)
    .multiply(basisQuatInv);
}