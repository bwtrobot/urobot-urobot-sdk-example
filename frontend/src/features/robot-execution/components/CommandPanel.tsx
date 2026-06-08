import { Crosshair, Megaphone, Navigation, OctagonAlert, Pause, Play } from 'lucide-react';
import type { RobotCommandCode } from '../../../services/api/robotApi';
import './robot-execution.css';

interface CommandPanelProps {
  robotName?: string;
  isCalibrating?: boolean;
  onCommand: (commandCode: RobotCommandCode, commandParam: unknown) => void;
  onStartCalibration?: () => void;
  onCancelCalibration?: () => void;
  onConfirmCalibration?: () => void;
}

export function CommandPanel({
  robotName,
  isCalibrating,
  onCommand,
  onStartCalibration,
  onCancelCalibration,
  onConfirmCalibration,
}: CommandPanelProps) {
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
        {/* 位姿标定按钮（替代原充电按钮） */}
        {isCalibrating ? (
          <>
            <button type="button" disabled={!robotName} onClick={onConfirmCalibration}>
              <Crosshair size={16} />
              确认标定
            </button>
            <button type="button" onClick={onCancelCalibration}>
              取消
            </button>
          </>
        ) : (
          <button type="button" disabled={!robotName} onClick={onStartCalibration}>
            <Crosshair size={16} />
            位姿标定
          </button>
        )}
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
      {isCalibrating && (
        <div className="calibration-hint">
          点击地面设置位置，拖拽设置朝向
        </div>
      )}
    </section>
  );
}
