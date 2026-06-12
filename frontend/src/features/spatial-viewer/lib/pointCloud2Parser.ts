import * as THREE from 'three';

export interface ParsedPointCloud {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

interface PointField {
  name: string;
  offset: number;
  datatype: number;
}

// rosbridge JSON 推送的 PointCloud2 消息：点数据以 base64 字符串承载在 data 字段。
export interface PointCloud2Message {
  fields: PointField[];
  point_step: number;
  width?: number;
  height?: number;
  data: string | Uint8Array | ArrayBuffer | number[];
}

const FLOAT32 = 7;
const UINT32 = 6;

export class PointCloud2Parser {
  static parse(message: PointCloud2Message, maxPoints = 20000): ParsedPointCloud {
    const data = normalizeData(message.data);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const pointStep = message.point_step;
    const x = findField(message.fields, 'x');
    const y = findField(message.fields, 'y');
    const z = findField(message.fields, 'z');
    const rgb = findOptionalField(message.fields, 'rgb') ?? findOptionalField(message.fields, 'rgba');
    const total = Math.min(maxPoints, Math.floor(data.byteLength / pointStep), (message.width ?? 0) * (message.height ?? 1) || maxPoints);
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);

    for (let index = 0; index < total; index += 1) {
      const offset = index * pointStep;
      const px = readNumber(view, offset + x.offset, x.datatype);
      const py = readNumber(view, offset + y.offset, y.datatype);
      const pz = readNumber(view, offset + z.offset, z.datatype);

      positions[index * 3] = px;
      positions[index * 3 + 1] = py;
      positions[index * 3 + 2] = pz;

      if (rgb) {
        const value = view.getUint32(offset + rgb.offset, true);
        colors[index * 3] = ((value >> 16) & 0xff) / 255;
        colors[index * 3 + 1] = ((value >> 8) & 0xff) / 255;
        colors[index * 3 + 2] = (value & 0xff) / 255;
      } else {
        colors[index * 3] = 0.05;
        colors[index * 3 + 1] = 0.55;
        colors[index * 3 + 2] = 0.8;
      }
    }

    return { positions, colors, count: total };
  }
}

export function applyRobotToThree(positions: Float32Array) {
  const matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const vector = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    vector.set(positions[i], positions[i + 1], positions[i + 2]).applyMatrix4(matrix);
    positions[i] = vector.x;
    positions[i + 1] = vector.y;
    positions[i + 2] = vector.z;
  }
}

function findField(fields: PointField[], name: string): PointField {
  const field = fields.find((item) => item.name === name);
  if (!field) throw new Error(`PointCloud2 缺少 ${name} 字段`);
  return field;
}

function findOptionalField(fields: PointField[], name: string): PointField | undefined {
  return fields.find((item) => item.name === name);
}

function readNumber(view: DataView, offset: number, datatype: number) {
  if (datatype === FLOAT32) return view.getFloat32(offset, true);
  if (datatype === UINT32) return view.getUint32(offset, true);
  return view.getFloat32(offset, true);
}

function normalizeData(data: string | Uint8Array | ArrayBuffer | number[]) {
  // rosbridge JSON 推送里点云字节以 base64 字符串承载在 data 字段
  if (typeof data === 'string') return base64ToUint8Array(data);
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
