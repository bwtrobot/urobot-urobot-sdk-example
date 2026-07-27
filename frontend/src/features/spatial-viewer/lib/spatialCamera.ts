import * as THREE from 'three';
import type { Vector3Value } from '../../../shared/types/api';

export interface RobotFocusViewpoint {
  position: Vector3Value;
  target: Vector3Value;
}

export function createRobotFocusViewpoint(target: THREE.Vector3, radius: number): RobotFocusViewpoint {
  const distance = Math.max(2.4, radius * 3);
  const lookAtTarget = {
    x: target.x,
    y: target.y + 0.3,
    z: target.z,
  };

  return {
    target: lookAtTarget,
    position: {
      x: lookAtTarget.x + distance,
      y: lookAtTarget.y + Math.max(1.6, radius * 1.4),
      z: lookAtTarget.z + distance,
    },
  };
}
