import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { getApiLogs } from '../../services/api/httpClient';
import './api-debug-drawer.css';

export function ApiDebugDrawer() {
  const [open, setOpen] = useState(false);
  const logs = useSyncExternalStore(getApiLogs.subscribe, getApiLogs, getApiLogs);

  return (
    <section className={`api-debug ${open ? 'open' : ''}`}>
      <button className="api-debug-trigger" type="button" onClick={() => setOpen((value) => !value)}>
        <Bug size={16} />
        接口调试
        {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      {open ? (
        <div className="api-debug-body">
          {logs.length === 0 ? <p>暂无请求</p> : null}
          {logs.map((log) => (
            <article key={log.id} className={`api-log ${log.source}`}>
              <header>
                <strong>
                  {log.method} {log.url}
                </strong>
                <span>{log.source === 'mock' ? 'Mock 降级' : '真实接口'}</span>
              </header>
              {log.reason ? <p>{log.reason}</p> : null}
              <pre>{JSON.stringify({ status: log.status, durationMs: log.durationMs, timestamp: log.timestamp }, null, 2)}</pre>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
