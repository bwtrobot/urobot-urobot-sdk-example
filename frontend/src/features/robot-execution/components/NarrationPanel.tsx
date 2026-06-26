import { Pause, Play, RefreshCw, Square, StepForward } from 'lucide-react';
import type {
  NarrationCommand,
  NarrationProcessNodeSummary,
  NarrationProcessSummary,
  NarrationRuntimeInfo,
} from '../../../shared/types/api';
import './robot-execution.css';

interface NarrationPanelProps {
  editionId?: string;
  processes: NarrationProcessSummary[];
  selectedProcessId: string;
  onProcessSelect: (processId: string) => void;
  runtime: NarrationRuntimeInfo[];
  onControl: (
    command: NarrationCommand,
    options?: {
      processId?: string;
      processName?: string;
      editionId?: string;
      nodeId?: string;
      nodeName?: string;
    },
  ) => void;
}

export function NarrationPanel({
  editionId,
  processes,
  selectedProcessId,
  onProcessSelect,
  runtime,
  onControl,
}: NarrationPanelProps) {
  const selectedProcess = processes.find((process) => process.id === selectedProcessId);
  const currentRuntime = runtime.find((item) => item.processId === selectedProcessId) ?? runtime[0];
  const runtimeNodeStatus = new Map(
    currentRuntime?.nodes?.map((node) => [node.nodeId, node.status ?? '']) ?? [],
  );
  const canControl = Boolean(editionId && selectedProcess);

  function send(command: NarrationCommand, node?: NarrationProcessNodeSummary) {
    if (!editionId || !selectedProcess) return;
    onControl(command, {
      editionId,
      processId: selectedProcess.id,
      processName: selectedProcess.name,
      nodeId: node?.id,
      nodeName: node?.name,
    });
  }

  return (
    <section className="side-card narration-card">
      <h2>讲解导览</h2>
      {processes.length === 0 ? (
        <p className="muted">当前地图版本无讲解流程</p>
      ) : (
        <>
          <label>
            讲解流程
            <select
              value={selectedProcessId}
              disabled={!editionId}
              onChange={(event) => onProcessSelect(event.target.value)}
            >
              {processes.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </label>

          <div className="narration-runtime">
            <span>{currentRuntime?.status ?? '未开始'}</span>
            <strong>{currentRuntime?.currentNodeName ?? selectedProcess?.name ?? '-'}</strong>
          </div>

          <div className="command-grid">
            <button type="button" disabled={!canControl} onClick={() => send('start')}>
              <Play size={16} />
              开始
            </button>
            <button type="button" disabled={!canControl} onClick={() => send('pause')}>
              <Pause size={16} />
              暂停
            </button>
            <button type="button" disabled={!canControl} onClick={() => send('resume')}>
              <RefreshCw size={16} />
              恢复
            </button>
            <button type="button" disabled={!canControl} onClick={() => send('stop')}>
              <Square size={16} />
              停止
            </button>
          </div>

          <ul className="narration-node-list">
            {(selectedProcess?.nodes ?? []).map((node) => {
              const active = currentRuntime?.currentNodeId === node.id || currentRuntime?.currentNodeId === node.navNodeId;
              const status = runtimeNodeStatus.get(node.id) ?? runtimeNodeStatus.get(node.navNodeId ?? '');
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    disabled={!canControl}
                    className={active ? 'active' : undefined}
                    onClick={() => send('node-pick', node)}
                  >
                    <span className="node-name">{node.name}</span>
                    <span className="narration-node-meta">
                      {status || (active ? '当前' : `#${node.order ?? '-'}`)}
                    </span>
                    <StepForward size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
