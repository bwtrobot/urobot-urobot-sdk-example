import { useRef, useState } from 'react';
import { CommandPanel } from '../../features/robot-execution/components/CommandPanel';
import { MotionPad, type MoveDirection } from '../../features/robot-execution/components/MotionPad';
import { NavigationTargetPanel } from '../../features/robot-execution/components/NavigationTargetPanel';
import { RobotStatusCard } from '../../features/robot-execution/components/RobotStatusCard';
import { TaskTimeline } from '../../features/robot-execution/components/TaskTimeline';
import { useRobotWorkbench } from '../../features/robot-execution/hooks/useRobotWorkbench';
import type { LayerVisibility } from '../../features/spatial-viewer/components/LayerDropdown';
import { SpatialViewer, type SpatialViewerHandle } from '../../features/spatial-viewer/components/SpatialViewer';
import type { ActivePathData, RenderSettings } from '../../features/spatial-viewer/lib/spatialScene';
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
  const viewerRef = useRef<SpatialViewerHandle>(null);
  const [layers, setLayers] = useState(defaultLayers);
  const [renderSettings, setRenderSettings] = useState(defaultRenderSettings);

  // 位姿标定回调
  function handleStartCalibration() {
    viewerRef.current?.getAdapter().enterPoseCalibration();
    workbench.setIsCalibrating(true);
  }

  function handleCancelCalibration() {
    viewerRef.current?.getAdapter().exitPoseCalibration();
    workbench.setIsCalibrating(false);
  }

  function handleConfirmCalibration() {
    const adapter = viewerRef.current?.getAdapter();
    if (!adapter) return;
    // 调用 confirmCalibration 获取标定位姿并下发 pose_init 指令
    const pose = adapter.confirmCalibration();
    if (pose) {
      void workbench.sendCommand('pose_init', {
        position: pose.position,
        orientation: pose.orientation,
      });
    }
    adapter.exitPoseCalibration();
    workbench.setIsCalibrating(false);
  }

  function handleMove(direction: MoveDirection) {
    void workbench.sendCommand('base_move', { key: moveKeyByDirection[direction] });
  }

  // 构造当前激活路径的渲染数据
  const activePathData: ActivePathData | null = workbench.activePath
    ? { type: workbench.activePathType, path: workbench.activePath, selectedNodeIds: workbench.selectedNodeIds }
    : null;

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
          ref={viewerRef}
          edition={workbench.edition ?? null}
          runtime={workbench.runtime ?? null}
          navPaths={workbench.navPaths}
          topoPaths={workbench.topoPaths}
          activePathData={activePathData}
          layers={layers}
          renderSettings={renderSettings}
          onLayersChange={setLayers}
          onRenderSettingsChange={setRenderSettings}
          motionPad={<MotionPad onMove={handleMove} onRotate={handleRotate} />}
          debugDrawer={<ApiDebugDrawer />}
        />

        <aside className="workbench-side">
          <RobotStatusCard robot={workbench.selectedRobot} runtime={workbench.runtime} demoMode={workbench.demoMode} />
          <NavigationTargetPanel
            activePathType={workbench.activePathType}
            onPathTypeChange={workbench.handlePathTypeChange}
            selectedPathId={workbench.selectedPathId}
            onPathSelect={workbench.setSelectedPathId}
            currentPaths={workbench.currentPaths}
            activeNodes={workbench.activeNodes}
            selectedNodeIds={workbench.selectedNodeIds}
            onSelectedNodeIdsChange={workbench.setSelectedNodeIds}
            onNavigate={() => workbench.navigateToSelected()}
          />
          <CommandPanel
            robotName={workbench.selectedRobot?.name}
            isCalibrating={workbench.isCalibrating}
            onCommand={(commandCode, commandParam) => void workbench.sendCommand(commandCode, commandParam)}
            onStartCalibration={handleStartCalibration}
            onCancelCalibration={handleCancelCalibration}
            onConfirmCalibration={handleConfirmCalibration}
          />
          <TaskTimeline tasks={workbench.tasks} />
        </aside>
      </div>
    </main>
  );
}
