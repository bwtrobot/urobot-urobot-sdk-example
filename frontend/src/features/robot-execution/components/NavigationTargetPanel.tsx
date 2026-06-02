import type { NavigationPath, TopologyPath } from '../../../shared/types/api';
import './robot-execution.css';

interface NavigationTargetPanelProps {
  navPaths: NavigationPath[];
  topoPaths: TopologyPath[];
}

export function NavigationTargetPanel({ navPaths, topoPaths }: NavigationTargetPanelProps) {
  return (
    <section className="side-card">
      <h2>导航目标</h2>
      <label>
        导航路径
        <select>
          {navPaths.map((path) => (
            <option key={path.id} value={path.uuid}>
              {path.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        拓扑路径
        <select>
          {topoPaths.map((path) => (
            <option key={path.id} value={path.uuid}>
              {path.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
