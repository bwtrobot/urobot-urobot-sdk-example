import type {
  NarrationProcessNodeSummary,
  NarrationRuntimeSegment,
  SegmentMode,
} from '../../../shared/types/api';

export interface NarrationNodeBehavior {
  index: number;
  scriptId: string;
  name: string;
  valid: boolean;
  status?: string;
}

export function getNarrationNodeStatus(
  nodeId: string,
  segments: NarrationRuntimeSegment[] = [],
) {
  // SDK 运行时 segmentType 实际返回小写 self，写成 SELF 会永远匹配不到。
  return segments.find((segment) => segment.segmentType === 'self' && segment.nodeId === nodeId)?.taskStatus;
}

export function buildNarrationNodeBehaviors(
  node: NarrationProcessNodeSummary,
  segments: NarrationRuntimeSegment[] = [],
  segmentMode: SegmentMode,
): NarrationNodeBehavior[] {
  const scripts = node.selfScripts ?? [];
  return scripts.map((scriptId, index) => {
    const matchedSegment = segmentMode === 'expanded'
      ? segments.find((segment) =>
        segment.segmentType === 'self' &&
        segment.nodeId === node.id &&
        segment.selfIndex === index)
      : undefined;

    return {
      index,
      scriptId,
      name: node.selfScriptNames?.[index] ?? scriptId,
      valid: node.selfScriptValids?.[index] !== false,
      status: matchedSegment?.taskStatus,
    };
  });
}
