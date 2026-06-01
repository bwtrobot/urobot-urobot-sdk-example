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
    // Runtime pose is Z-up. Three/SoonSpace scenes are Y-up.
    position: {
      x: pose.position.x,
      y: pose.position.z,
      z: pose.position.y,
    },
    rotation: {
      x: 0,
      y: quaternionToYaw(pose.orientation),
      z: 0,
    },
  };
}
