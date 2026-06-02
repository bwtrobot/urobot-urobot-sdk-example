import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCw } from 'lucide-react';
import './robot-execution.css';

export type MoveDirection = 'forward' | 'backward' | 'left' | 'right';

interface MotionPadProps {
  onMove: (direction: MoveDirection) => void;
  onRotate: (angularVelocity: number) => void;
}

export function MotionPad({ onMove, onRotate }: MotionPadProps) {
  return (
    <div className="motion-pad" aria-label="运动遥控键盘">
      <span />
      <button type="button" aria-label="前进" onClick={() => onMove('forward')}>
        <ArrowUp size={18} />
      </button>
      <span />
      <button type="button" aria-label="左移" onClick={() => onMove('left')}>
        <ArrowLeft size={18} />
      </button>
      <button type="button" aria-label="拖动旋转" onClick={() => onRotate(0.4)}>
        <RotateCw size={18} />
      </button>
      <button type="button" aria-label="右移" onClick={() => onMove('right')}>
        <ArrowRight size={18} />
      </button>
      <span />
      <button type="button" aria-label="后退" onClick={() => onMove('backward')}>
        <ArrowDown size={18} />
      </button>
      <span />
    </div>
  );
}
