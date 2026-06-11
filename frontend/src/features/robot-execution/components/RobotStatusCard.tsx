import type { RealtimeConnectionStatus, RobotRuntime, RobotSummary } from '../../../shared/types/api';
import './robot-execution.css';

interface RobotStatusCardProps {
  robot?: RobotSummary;
  runtime?: RobotRuntime;
  demoMode: boolean;
  realtimeStatus: RealtimeConnectionStatus;
}

const realtimeStatusLabel: Record<RealtimeConnectionStatus, string> = {
  DISCONNECTED: '未连接',
  CONNECTING: '连接中',
  CONNECTED: '已连接',
  RECONNECTING: '重连中',
  KICKED: '被挤占',
  ERROR: '连接错误',
};

export function RobotStatusCard({ robot, runtime, demoMode, realtimeStatus }: RobotStatusCardProps) {
  const power = robot?.terminalPower ?? robot?.terminal_power ?? runtime?.soc;
  const pose = runtime?.ros_odom?.pose?.position;

  return (
    <section className="side-card">
      <div className="side-card-header">
        <h2>{robot?.name ?? '未选择机器人'}</h2>
        {demoMode ? <span className="demo-badge">演示数据</span> : null}
      </div>
      <div className={`realtime-status realtime-status-${realtimeStatus.toLowerCase()}`}>
        <span>实时通道</span>
        <strong>{realtimeStatusLabel[realtimeStatus]}</strong>
      </div>
      {realtimeStatus === 'KICKED' ? <p className="realtime-warning">实时连接已被其他客户端挤占</p> : null}
      <dl className="status-grid">
        <div>
          <dt>状态</dt>
          <dd>{runtime?.terminal_status ?? robot?.status ?? '-'}</dd>
        </div>
        <div>
          <dt>电量</dt>
          <dd>{power != null ? `${power}%` : '-'}</dd>
        </div>
        <div>
          <dt>模式</dt>
          <dd>{runtime?.control_status ?? '-'}</dd>
        </div>
        <div>
          <dt>位姿</dt>
          <dd>{pose ? `${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${pose.z.toFixed(2)}` : '-'}</dd>
        </div>
      </dl>
    </section>
  );
}
