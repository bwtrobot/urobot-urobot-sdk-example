import { Activity } from 'lucide-react';
import type { RealtimePushSummaryEntry } from '../../../shared/types/api';
import './robot-execution.css';

interface RealtimePushSummaryProps {
  events: RealtimePushSummaryEntry[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  topic: 'Topic',
  robot_info: '机器人状态',
  task_reply: '任务回执',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString();
}

export function RealtimePushSummary({ events }: RealtimePushSummaryProps) {
  return (
    <section className="side-card realtime-card">
      <div className="side-card-header">
        <h2>实时推送</h2>
        <Activity size={16} aria-hidden="true" />
      </div>
      {events.length === 0 ? (
        <p className="realtime-summary-empty">暂无推送</p>
      ) : (
        <ul className="realtime-summary-list">
          {events.map((event) => (
            <li key={event.id} className="realtime-summary-row">
              <div className="realtime-summary-meta">
                <span className="realtime-summary-type">
                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                </span>
                <time className="realtime-summary-time">{formatTime(event.timestamp)}</time>
              </div>
              {event.topic ? <code className="realtime-summary-topic">{event.topic}</code> : null}
              {event.jsonSummary ? (
                <p className="realtime-summary-json">{event.jsonSummary}</p>
              ) : null}
              {event.binarySize != null ? (
                <span className="realtime-summary-binary">binary {formatBytes(event.binarySize)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
