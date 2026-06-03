import type { RobotRuntime, RobotSummary } from '../../../shared/types/api';
import './robot-execution.css';

interface RobotStatusCardProps {
  robot?: RobotSummary;
  runtime?: RobotRuntime;
  demoMode: boolean;
}

export function RobotStatusCard({ robot, runtime, demoMode }: RobotStatusCardProps) {
  const power = robot?.terminalPower ?? robot?.terminal_power ?? runtime?.soc;
  const pose = runtime?.ros_odom?.pose?.position;

  return (
    <section className="side-card">
      <div className="side-card-header">
        <h2>{robot?.name ?? '未选择机器人'}</h2>
        {demoMode ? <span className="demo-badge">演示数据</span> : null}
      </div>
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
