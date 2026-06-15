import { describe, expect, it } from 'vitest';
import { PointCloud2Parser } from './pointCloud2Parser';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

describe('PointCloud2Parser', () => {
  it('解析 rosbridge JSON 消息中 base64 编码的点云数据', () => {
    const pointStep = 12;
    const buffer = new ArrayBuffer(pointStep * 2);
    const view = new DataView(buffer);
    // point 0 = (1, 2, 3)
    view.setFloat32(0, 1, true);
    view.setFloat32(4, 2, true);
    view.setFloat32(8, 3, true);
    // point 1 = (4, 5, 6)
    view.setFloat32(12, 4, true);
    view.setFloat32(16, 5, true);
    view.setFloat32(20, 6, true);

    const cloud = PointCloud2Parser.parse({
      fields: [
        { name: 'x', offset: 0, datatype: 7 },
        { name: 'y', offset: 4, datatype: 7 },
        { name: 'z', offset: 8, datatype: 7 },
      ],
      point_step: pointStep,
      width: 2,
      height: 1,
      data: toBase64(new Uint8Array(buffer)),
    });

    expect(cloud.count).toBe(2);
    expect(Array.from(cloud.positions)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('缺少 rgb 字段时回退为默认颜色（非全零）', () => {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setFloat32(0, 0, true);
    view.setFloat32(4, 0, true);
    view.setFloat32(8, 0, true);

    const cloud = PointCloud2Parser.parse({
      fields: [
        { name: 'x', offset: 0, datatype: 7 },
        { name: 'y', offset: 4, datatype: 7 },
        { name: 'z', offset: 8, datatype: 7 },
      ],
      point_step: 12,
      width: 1,
      height: 1,
      data: toBase64(new Uint8Array(buffer)),
    });

    expect(cloud.count).toBe(1);
    expect(cloud.colors[2]).toBeGreaterThan(0);
  });

  it('按 maxPoints 截断超出的点', () => {
    const pointStep = 12;
    const buffer = new ArrayBuffer(pointStep * 5);
    const cloud = PointCloud2Parser.parse(
      {
        fields: [
          { name: 'x', offset: 0, datatype: 7 },
          { name: 'y', offset: 4, datatype: 7 },
          { name: 'z', offset: 8, datatype: 7 },
        ],
        point_step: pointStep,
        width: 5,
        height: 1,
        data: toBase64(new Uint8Array(buffer)),
      },
      3,
    );

    expect(cloud.count).toBe(3);
  });
});