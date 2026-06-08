import { Navigation } from 'lucide-react';
import type { ActivePathType } from '../hooks/useRobotWorkbench';
import type { NavigationPath, PathNode, TopologyPath } from '../../../shared/types/api';
import './robot-execution.css';

interface NavigationTargetPanelProps {
  activePathType: ActivePathType;
  onPathTypeChange: (type: ActivePathType) => void;
  selectedPathId: string;
  onPathSelect: (pathId: string) => void;
  currentPaths: (NavigationPath | TopologyPath)[];
  activeNodes: PathNode[];
  selectedNodeIds: Set<string>;
  onSelectedNodeIdsChange: (ids: Set<string>) => void;
  onNavigate: () => void;
}

export function NavigationTargetPanel({
  activePathType,
  onPathTypeChange,
  selectedPathId,
  onPathSelect,
  currentPaths,
  activeNodes,
  selectedNodeIds,
  onSelectedNodeIdsChange,
  onNavigate,
}: NavigationTargetPanelProps) {
  // 全选/取消全选
  const allSelected = activeNodes.length > 0 && activeNodes.every((n) => selectedNodeIds.has(n.id));
  function handleToggleAll() {
    if (allSelected) {
      onSelectedNodeIdsChange(new Set());
    } else {
      onSelectedNodeIdsChange(new Set(activeNodes.map((n) => n.id)));
    }
  }

  // 单个节点勾选切换
  function handleToggleNode(nodeId: string) {
    const next = new Set(selectedNodeIds);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    onSelectedNodeIdsChange(next);
  }

  return (
    <section className="side-card">
      <h2>导航目标</h2>

      {/* 路径类型切换 */}
      <div className="path-type-radio" role="radiogroup" aria-label="路径类型">
        <label>
          <input
            type="radio"
            name="pathType"
            value="nav"
            checked={activePathType === 'nav'}
            onChange={() => onPathTypeChange('nav')}
          />
          导航路径
        </label>
        <label>
          <input
            type="radio"
            name="pathType"
            value="topo"
            checked={activePathType === 'topo'}
            onChange={() => onPathTypeChange('topo')}
          />
          拓扑路径
        </label>
      </div>

      {/* 路径选择下拉框 */}
      <label>
        选择路径
        <select value={selectedPathId} onChange={(e) => onPathSelect(e.target.value)}>
          {currentPaths.map((path) => (
            <option key={path.id} value={path.id}>
              {path.name}
            </option>
          ))}
        </select>
      </label>

      {/* 节点复选框列表 */}
      {activeNodes.length > 0 && (
        <div className="node-checklist">
          <label className="node-checklist-header">
            <input type="checkbox" checked={allSelected} onChange={handleToggleAll} />
            全选（{selectedNodeIds.size}/{activeNodes.length}）
          </label>
          <ul className="node-list">
            {activeNodes.map((node) => (
              <li key={node.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedNodeIds.has(node.id)}
                    onChange={() => handleToggleNode(node.id)}
                  />
                  <span className="node-name">{node.name || node.id}</span>
                  <span className="node-coord">
                    ({node.position.x.toFixed(1)}, {node.position.y.toFixed(1)}, {node.position.z.toFixed(1)})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 导航按钮 */}
      <button
        type="button"
        className="nav-action-btn"
        disabled={selectedNodeIds.size === 0}
        onClick={onNavigate}
      >
        <Navigation size={16} />
        导航到选中点位
      </button>
    </section>
  );
}
