import { useState } from 'react';
import { CommandPanel } from '../../features/robot-execution/components/CommandPanel';
import { MotionPad, type MoveDirection } from '../../features/robot-execution/components/MotionPad';
import { NavigationTargetPanel } from '../../features/robot-execution/components/NavigationTargetPanel';
import { RobotStatusCard } from '../../features/robot-execution/components/RobotStatusCard';
import { TaskTimeline } from '../../features/robot-execution/components/TaskTimeline';
import { useRobotWorkbench } from '../../features/robot-execution/hooks/useRobotWorkbench';
import type { LayerVisibility } from '../../features/spatial-viewer/components/LayerDropdown';
import { SpatialViewer } from '../../features/spatial-viewer/components/SpatialViewer';
import type { RenderSettings } from '../../features/spatial-viewer/lib/spatialScene';
import { ApiDebugDrawer } from '../../shared/components/ApiDebugDrawer';
import './spatial-workbench-page.css';

const defaultLayers: LayerVisibility = {
  bim: true,
  globalPointCloud: true,
  groundPointCloud: true,
  paths: true,
};

const defaultRenderSettings: RenderSettings = {
  pointSize: 'medium',
  opacity: 'solid',
  bimWireframe: false,
};

const moveKeyByDirection: Record<MoveDirection, string> = {
  forward: 'ArrowUp',
  backward: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

export function SpatialWorkbenchPage() {
  const workbench = useRobotWorkbench();
  const [layers, setLayers] = useState(defaultLayers);
  const [renderSettings, setRenderSettings] = useState(defaultRenderSettings);

  function handleMove(direction: MoveDirection) {
    void workbench.sendCommand('base_move', { key: moveKeyByDirection[direction] });
  }

  function handleRotate(angularVelocity: number) {
    void workbench.sendCommand('cmd_vel', {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angularVelocity },
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <main className="workbench-page">
      <header className="workbench-header">
        <div>
          <h1>uRobot SDK Web Example</h1>
          <p>空间执行工作台</p>
        </div>
        <select value={workbench.selectedRobotId} onChange={(event) => workbench.setSelectedRobotId(event.target.value)}>
          {workbench.robots.map((robot) => (
            <option key={robot.id} value={robot.id}>
              {robot.name}
            </option>
          ))}
        </select>
      </header>

      <div className="workbench-grid">
        <SpatialViewer
          edition={workbench.edition ?? null}
          runtime={workbench.runtime ?? null}
          navPaths={workbench.navPaths}
          topoPaths={workbench.topoPaths}
          layers={layers}
          renderSettings={renderSettings}
          onLayersChange={setLayers}
          onRenderSettingsChange={setRenderSettings}
          motionPad={<MotionPad onMove={handleMove} onRotate={handleRotate} />}
          debugDrawer={<ApiDebugDrawer />}
        />

        <aside className="workbench-side">
          <RobotStatusCard robot={workbench.selectedRobot} runtime={workbench.runtime} demoMode={workbench.demoMode} />
          <NavigationTargetPanel navPaths={workbench.navPaths} topoPaths={workbench.topoPaths} />
          <CommandPanel
            robotName={workbench.selectedRobot?.name}
            onCommand={(commandCode, commandParam) => void workbench.sendCommand(commandCode, commandParam)}
          />
          <TaskTimeline tasks={workbench.tasks} />
        </aside>
      </div>
    </main>
  );
}
