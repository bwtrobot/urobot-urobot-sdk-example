import { BatteryCharging, Megaphone, Navigation, OctagonAlert, Pause, Play } from 'lucide-react';
import type { RobotCommandCode } from '../../../services/api/robotApi';
import './robot-execution.css';

interface CommandPanelProps {
  robotName?: string;
  onCommand: (commandCode: RobotCommandCode, commandParam: unknown) => void;
}

export function CommandPanel({ robotName, onCommand }: CommandPanelProps) {
  return (
    <section className="side-card">
      <h2>快捷指令</h2>
      <div className="command-grid">
        <button type="button" onClick={() => onCommand('navigation', { point_name: '入口' })}>
          <Navigation size={16} />
          导航
        </button>
        <button type="button" onClick={() => onCommand('robot_tts', { text: '欢迎使用 uRobot SDK' })}>
          <Megaphone size={16} />
          语音
        </button>
        <button
          type="button"
          disabled={!robotName}
          onClick={() => onCommand('charge_manager', { action: 'charge_start', robot_name: robotName })}
        >
          <BatteryCharging size={16} />
          充电
        </button>
        <button type="button" onClick={() => onCommand('robot_pause', true)}>
          <Pause size={16} />
          暂停
        </button>
        <button type="button" onClick={() => onCommand('robot_pause', false)}>
          <Play size={16} />
          继续
        </button>
        <button type="button" className="danger" onClick={() => onCommand('emergency_stop', {})}>
          <OctagonAlert size={16} />
          急停
        </button>
      </div>
    </section>
  );
}
