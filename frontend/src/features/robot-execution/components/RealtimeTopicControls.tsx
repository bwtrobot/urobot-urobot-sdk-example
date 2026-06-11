import { RadioTower } from 'lucide-react';
import { realtimeTopicCatalog } from '../hooks/useRobotWorkbench';
import './robot-execution.css';

interface RealtimeTopicControlsProps {
  subscribedTopics: Set<string>;
  onSubscribe: (topic: string, options?: { binary?: boolean; throttleRate?: number }) => void;
  onUnsubscribe: (topic: string) => void;
  onFpsChange: (topic: string, fps: number, binary?: boolean) => void;
}

export function RealtimeTopicControls({
  subscribedTopics,
  onSubscribe,
  onUnsubscribe,
  onFpsChange,
}: RealtimeTopicControlsProps) {
  return (
    <section className="side-card realtime-card">
      <div className="side-card-header">
        <h2>实时 Topic</h2>
        <RadioTower size={16} aria-hidden="true" />
      </div>
      <div className="realtime-topic-list">
        {realtimeTopicCatalog.map((item) => {
          const checked = subscribedTopics.has(item.topic);
          const fps = item.throttleRate ? Math.round(1000 / item.throttleRate) : undefined;
          return (
            <div key={item.topic} className="realtime-topic-row">
              <label className="realtime-topic-toggle">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onSubscribe(item.topic, { binary: item.binary, throttleRate: item.throttleRate });
                    } else {
                      onUnsubscribe(item.topic);
                    }
                  }}
                />
                <span>{item.label}</span>
              </label>
              <code>{item.topic}</code>
              {item.minFps && item.maxFps ? (
                <label className="realtime-fps">
                  <span>{fps} fps</span>
                  <input
                    type="range"
                    min={item.minFps}
                    max={item.maxFps}
                    defaultValue={fps}
                    disabled={!checked}
                    onChange={(event) => onFpsChange(item.topic, Number(event.target.value), item.binary)}
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
