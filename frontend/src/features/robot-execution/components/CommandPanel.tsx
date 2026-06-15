import { Crosshair, MapPin, Navigation, OctagonAlert, Pause, Play } from 'lucide-react';
import type { RobotCommandCode } from '../../../services/api/robotApi';
import './robot-execution.css';

type InteractionMode = 'idle' | 'calibrating' | 'nav-picking';

interface CommandPanelProps {
  robotName?: string;
  interactionMode: InteractionMode;
  onCommand: (commandCode: RobotCommandCode, commandParam: unknown) => void;
  onStartCalibration?: () => void;
  onStartNavPick?: () => void;
  onConfirmInteraction?: () => void;
  onCancelInteraction?: () => void;
}

export function CommandPanel({
  robotName,
  interactionMode,
  onCommand,
  onStartCalibration,
  onStartNavPick,
  onConfirmInteraction,
  onCancelInteraction,
}: CommandPanelProps) {
  const isInteracting = interactionMode !== 'idle';

  return (
    <section className="side-card">
      <h2>快捷指令</h2>
      <div className="command-grid">
        {/* 单点导航：点击点云选点+拖拽设朝向 */}
        {interactionMode === 'nav-picking' ? (
          <>
            <button type="button" disabled={!robotName} onClick={onConfirmInteraction}>
              <Navigation size={16} />
              确认导航
            </button>
            <button type="button" onClick={onCancelInteraction}>
              取消
            </button>
          </>
        ) : (
          <button type="button" disabled={!robotName || isInteracting} onClick={onStartNavPick}>
            <MapPin size={16} />
            单点导航
          </button>
        )}
        <select
          disabled={!robotName || isInteracting}
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            onCommand('base_move', { key: e.target.value });
            e.target.value = '';
          }}
        >
          <option value="" disabled>姿态控制</option>
          <option value="lie">卧倒</option>
          <option value="stand">站立</option>
        </select>
        {/* 位姿标定 */}
        {interactionMode === 'calibrating' ? (
          <>
            <button type="button" disabled={!robotName} onClick={onConfirmInteraction}>
              <Crosshair size={16} />
              确认标定
            </button>
            <button type="button" onClick={onCancelInteraction}>
              取消
            </button>
          </>
        ) : (
          <button type="button" disabled={!robotName || isInteracting} onClick={onStartCalibration}>
            <Crosshair size={16} />
            位姿标定
          </button>
        )}
        <button type="button" disabled={isInteracting} onClick={() => onCommand('robot_pause', true)}>
          <Pause size={16} />
          暂停
        </button>
        <button type="button" disabled={isInteracting} onClick={() => onCommand('robot_pause', false)}>
          <Play size={16} />
          继续
        </button>
        <button type="button" className="danger" onClick={() => onCommand('emergency_stop', {})}>
          <OctagonAlert size={16} />
          急停
        </button>
      </div>
      {interactionMode !== 'idle' && (
        <div className="calibration-hint">
          {interactionMode === 'calibrating'
            ? '点击蓝色地面点云吸附位置，拖拽设置朝向'
            : '点击蓝色地面点云选择目标点，拖拽设置朝向'}
        </div>
      )}
    </section>
  );
}
