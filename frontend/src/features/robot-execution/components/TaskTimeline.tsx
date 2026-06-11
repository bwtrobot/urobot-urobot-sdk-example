import type { WorkbenchTask } from '../hooks/useRobotWorkbench';
import './robot-execution.css';

interface TaskTimelineProps {
  tasks: WorkbenchTask[];
}

export function TaskTimeline({ tasks }: TaskTimelineProps) {
  return (
    <section className="side-card task-card">
      <h2>任务记录</h2>
      <div className="task-list">
        {tasks.length === 0 ? <p className="muted">暂无任务</p> : null}
        {tasks.map((task) => (
          <article key={task.taskId} className="task-row">
            <strong>{task.commandCode}</strong>
            <span>
              {task.status}
              {task.realtimeSource ? <em>WS</em> : null}
              {task.compensationStatus === 'polling' ? <em>HTTP 补偿</em> : null}
            </span>
            <code>{task.taskId}</code>
            {task.updatedAt ? <small>{new Date(task.updatedAt).toLocaleTimeString()}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
