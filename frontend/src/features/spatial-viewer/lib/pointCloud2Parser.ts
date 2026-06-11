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

interface PointCloud2Message {
  fields: PointField[];
  point_step: number;
  width?: number;
  height?: number;
  data: Uint8Array | ArrayBuffer | number[];
}

const FLOAT32 = 7;
const UINT32 = 6;

export class PointCloud2Parser {
  static parse(buffer: ArrayBuffer, maxPoints = 20000): ParsedPointCloud {
    const message = decodeCbor(buffer) as PointCloud2Message;
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

function normalizeData(data: Uint8Array | ArrayBuffer | number[]) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

function decodeCbor(buffer: ArrayBuffer): unknown {
  const view = new DataView(buffer);
  let offset = 0;

  function readLength(additional: number): number {
    if (additional < 24) return additional;
    if (additional === 24) return view.getUint8(offset++);
    if (additional === 25) {
      const value = view.getUint16(offset, false);
      offset += 2;
      return value;
    }
    if (additional === 26) {
      const value = view.getUint32(offset, false);
      offset += 4;
      return value;
    }
    throw new Error('暂不支持该 CBOR 长度编码');
  }

  function readItem(): unknown {
    const initial = view.getUint8(offset++);
    const major = initial >> 5;
    const additional = initial & 0x1f;
    const length = readLength(additional);

    if (major === 0) return length;
    if (major === 1) return -1 - length;
    if (major === 2) {
      const bytes = new Uint8Array(buffer, offset, length);
      offset += length;
      return new Uint8Array(bytes);
    }
    if (major === 3) {
      const bytes = new Uint8Array(buffer, offset, length);
      offset += length;
      return new TextDecoder().decode(bytes);
    }
    if (major === 4) {
      const array = [];
      for (let i = 0; i < length; i += 1) array.push(readItem());
      return array;
    }
    if (major === 5) {
      const object: Record<string, unknown> = {};
      for (let i = 0; i < length; i += 1) {
        const key = String(readItem());
        object[key] = readItem();
      }
      return object;
    }
    if (major === 7 && additional === 26) {
      const value = view.getFloat32(offset, false);
      offset += 4;
      return value;
    }
    if (major === 7 && additional === 27) {
      const value = view.getFloat64(offset, false);
      offset += 8;
      return value;
    }
    if (major === 7 && additional === 20) return false;
    if (major === 7 && additional === 21) return true;
    if (major === 7 && additional === 22) return null;
    throw new Error('暂不支持该 CBOR 数据类型');
  }

  return readItem();
}
