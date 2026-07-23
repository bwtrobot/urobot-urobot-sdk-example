import { describe, expect, it } from 'vitest';
import type { NarrationProcessNodeSummary, NarrationRuntimeSegment } from '../../../shared/types/api';
import { buildNarrationNodeBehaviors, getNarrationNodeStatus } from './narrationPanelUtils';

describe('narrationPanelUtils', () => {
  const node: NarrationProcessNodeSummary = {
    id: 'node-inspection',
    name: '巡检点',
    selfScripts: ['script-a', 'script-b', 'script-c'],
    selfScriptNames: ['欢迎词'],
    selfScriptValids: [true, true, false],
  };

  const segments: NarrationRuntimeSegment[] = [
    { nodeId: 'node-inspection', segmentType: 'self', selfIndex: 0, taskStatus: 'finished' },
    { nodeId: 'node-inspection', segmentType: 'self', selfIndex: 1, taskStatus: 'executing' },
    { nodeId: 'node-inspection', segmentType: 'SELF', selfIndex: 2, taskStatus: 'wrong-case' },
  ];

  it('展开视图下按 selfIndex 命中对应行为状态', () => {
    expect(buildNarrationNodeBehaviors(node, segments, 'expanded')).toEqual([
      { index: 0, scriptId: 'script-a', name: '欢迎词', valid: true, status: 'finished' },
      { index: 1, scriptId: 'script-b', name: 'script-b', valid: true, status: 'executing' },
      { index: 2, scriptId: 'script-c', name: 'script-c', valid: false, status: undefined },
    ]);
  });

  it('折叠视图下不显示逐条行为状态', () => {
    expect(buildNarrationNodeBehaviors(node, segments, 'collapsed').map((item) => item.status)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('节点级状态只匹配小写 self 聚合段', () => {
    expect(getNarrationNodeStatus('node-inspection', [
      { nodeId: 'node-inspection', segmentType: 'SELF', taskStatus: 'wrong-case' },
      { nodeId: 'node-inspection', segmentType: 'self', selfIndex: null, taskStatus: 'executing' },
    ])).toBe('executing');
  });
});
