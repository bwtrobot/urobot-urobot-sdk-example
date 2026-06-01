import { describe, expect, it } from 'vitest';
import { quaternionToYaw, runtimePoseToSceneTransform } from './pose';

describe('pose utilities', () => {
  it('returns zero yaw for the identity quaternion', () => {
    expect(quaternionToYaw({ x: 0, y: 0, z: 0, w: 1 })).toBe(0);
  });

  it('maps a z-up runtime pose to a y-up scene transform', () => {
    const yaw = Math.PI / 2;
    const pose = {
      position: { x: 1, y: 2, z: 3 },
      orientation: {
        x: 0,
        y: 0,
        z: Math.sin(yaw / 2),
        w: Math.cos(yaw / 2),
      },
    };

    const transform = runtimePoseToSceneTransform(pose);

    expect(transform.position).toEqual({ x: 1, y: 3, z: 2 });
    expect(transform.rotation.x).toBe(0);
    expect(transform.rotation.y).toBeCloseTo(yaw);
    expect(transform.rotation.z).toBe(0);
  });
});
