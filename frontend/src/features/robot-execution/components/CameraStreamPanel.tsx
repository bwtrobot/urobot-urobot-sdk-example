import { Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './robot-execution.css';

interface CameraStreamPanelProps {
  imageUrl?: string;
  visible: boolean;
  onClose: () => void;
}

export function CameraStreamPanel({ imageUrl, visible, onClose }: CameraStreamPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 280, height: 190 });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    let mode: 'move' | 'resize' | null = null;
    let startX = 0;
    let startY = 0;
    let startPosition = position;
    let startSize = size;

    function pointerMove(event: PointerEvent) {
      if (!mode) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (mode === 'move') {
        setPosition({ x: Math.max(0, startPosition.x + dx), y: Math.max(0, startPosition.y + dy) });
      } else {
        setSize({ width: Math.max(220, startSize.width + dx), height: Math.max(140, startSize.height + dy) });
      }
    }

    function pointerUp() {
      mode = null;
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
    }

    function pointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('[data-camera-close]')) return;
      mode = target.closest('[data-camera-resize]') ? 'resize' : 'move';
      startX = event.clientX;
      startY = event.clientY;
      startPosition = position;
      startSize = size;
      window.addEventListener('pointermove', pointerMove);
      window.addEventListener('pointerup', pointerUp);
    }

    panel.addEventListener('pointerdown', pointerDown);
    return () => {
      panel.removeEventListener('pointerdown', pointerDown);
      pointerUp();
    };
  }, [position, size]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className="camera-stream-panel"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: size.width, height: size.height }}
    >
      <div className="camera-stream-header">
        <strong>相机画面</strong>
        <button type="button" data-camera-close onClick={onClose} aria-label="关闭相机画面">
          <X size={16} />
        </button>
      </div>
      {imageUrl ? <img src={imageUrl} alt="实时相机画面" /> : <div className="camera-stream-empty">等待图像</div>}
      <button type="button" className="camera-resize" data-camera-resize aria-label="调整相机画面大小">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
