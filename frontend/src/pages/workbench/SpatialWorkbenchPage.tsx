import { useCallback, useRef, useState } from 'react';
import { CameraStreamPanel } from '../../features/robot-execution/components/CameraStreamPanel';
import { CommandPanel } from '../../features/robot-execution/components/CommandPanel';
import { MotionPad, type MoveDirection } from '../../features/robot-execution/components/MotionPad';
import { NavigationTargetPanel } from '../../features/robot-execution/components/NavigationTargetPanel';
import { RealtimePushSummary } from '../../features/robot-execution/components/RealtimePushSummary';
import { RealtimeTopicControls } from '../../features/robot-execution/components/RealtimeTopicControls';
import { RobotStatusCard } from '../../features/robot-execution/components/RobotStatusCard';
import { TaskTimeline } from '../../features/robot-execution/components/TaskTimeline';
import { useRobotWorkbench } from '../../features/robot-execution/hooks/useRobotWorkbench';
import type { LayerVisibility } from '../../features/spatial-viewer/components/LayerDropdown';
import { SpatialViewer, type SpatialViewerHandle } from '../../features/spatial-viewer/components/SpatialViewer';
import type { ActivePathData, RenderSettings } from '../../features/spatial-viewer/lib/spatialScene';
import type { PointCloud2Message } from '../../features/spatial-viewer/lib/pointCloud2Parser';
import { ApiDebugDrawer } from '../../shared/components/ApiDebugDrawer';
import { getRobotStatusLabel, isRobotOffline } from '../../shared/utils/robotStatus';
import './spatial-workbench-page.css';

const defaultLayers: LayerVisibility = {
  bim: true,
  globalPointCloud: true,
  groundPointCloud: true,
  realtimePointCloud: true,
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
  const viewerRef = useRef<SpatialViewerHandle>(null);
  const [cameraImageUrl, setCameraImageUrl] = useState<string | undefined>();
  const [cameraVisible, setCameraVisible] = useState(false);
  // 点云 → 三维场景；相机 → 右下角「接口调试」下方的画面面板（rosbridge msg.data 为 base64）
  const handleRealtimeTopic = useCallback((topic: string, message: Record<string, unknown>) => {
    if (topic === '/x_nav/current_pointcloud') {
      viewerRef.current?.getAdapter().updateRealtimePointCloud(message as unknown as PointCloud2Message);
      return;
    }
    if (topic.includes('/camera/') && topic.endsWith('/webp')) {
      const data = message.data;
      if (typeof data !== 'string') return;
      const format = typeof message.format === 'string' ? message.format : 'webp';
      setCameraImageUrl(`data:image/${format};base64,${data}`);
      setCameraVisible(true);
    }
  }, []);
  const workbench = useRobotWorkbench({ onRealtimeTopicMessage: handleRealtimeTopic });
  const [layers, setLayers] = useState(defaultLayers);
  const [renderSettings, setRenderSettings] = useState(defaultRenderSettings);

  // 进入场景交互模式（位姿标定 / 单点导航共用同一套点云选点交互）
  function enterSceneInteraction(mode: 'calibrating' | 'nav-picking') {
    viewerRef.current?.getAdapter().enterPoseCalibration();
    workbench.setInteractionMode(mode);
  }

  function cancelSceneInteraction() {
    viewerRef.current?.getAdapter().exitPoseCalibration();
    workbench.setInteractionMode('idle');
  }

  // 确认交互：根据当前模式下发不同命令
  function confirmSceneInteraction() {
    const adapter = viewerRef.current?.getAdapter();
    if (!adapter) return;
    const pose = adapter.confirmCalibration();
    if (pose) {
      if (workbench.interactionMode === 'calibrating') {
        // 位姿标定 → pose_init
        void workbench.sendCommand('pose_init', {
          position: pose.position,
          orientation: pose.orientation,
        });
      } else {
        // 单点导航 → navigation（与参考项目一致，仅传 position + orientation）
        void workbench.sendCommand('navigation', {
          position: pose.position,
          orientation: pose.orientation,
        });
      }
    }
    adapter.exitPoseCalibration();
    workbench.setInteractionMode('idle');
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
          {workbench.robots.map((robot) => {
            const offline = isRobotOffline(robot);
            return (
              <option key={robot.id} value={robot.id} disabled={offline}>
                {robot.name} · {getRobotStatusLabel(robot)}
                {offline ? '（不可选）' : ''}
              </option>
            );
          })}
        </select>
      </header>

      <div className="workbench-grid">
        <SpatialViewer
          ref={viewerRef}
          edition={workbench.edition ?? null}
          robot={workbench.selectedRobot ?? null}
          runtime={workbench.runtime ?? null}
          navPaths={workbench.navPaths}
          topoPaths={workbench.topoPaths}
          activePathData={activePathData}
          layers={layers}
          renderSettings={renderSettings}
          onLayersChange={setLayers}
          onRenderSettingsChange={setRenderSettings}
          motionPad={<MotionPad onMove={handleMove} onRotate={handleRotate} />}
          debugDrawer={(
            <>
              <ApiDebugDrawer />
              <CameraStreamPanel
                imageUrl={cameraImageUrl}
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
              />
            </>
          )}
        />

        <aside className="workbench-side">
          <RobotStatusCard
            robot={workbench.selectedRobot}
            runtime={workbench.runtime}
            demoMode={workbench.demoMode}
            realtimeStatus={workbench.realtimeStatus}
          />
          <RealtimeTopicControls
            subscribedTopics={workbench.subscribedTopics}
            onSubscribe={workbench.subscribeRealtimeTopic}
            onUnsubscribe={workbench.unsubscribeRealtimeTopic}
            onFpsChange={workbench.setRealtimeTopicFps}
          />
          <RealtimePushSummary events={workbench.realtimeEvents} />
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
            interactionMode={workbench.interactionMode}
            onCommand={(commandCode, commandParam) => void workbench.sendCommand(commandCode, commandParam)}
            onStartCalibration={() => enterSceneInteraction('calibrating')}
            onStartNavPick={() => enterSceneInteraction('nav-picking')}
            onConfirmInteraction={confirmSceneInteraction}
            onCancelInteraction={cancelSceneInteraction}
          />
          <TaskTimeline tasks={workbench.tasks} />
        </aside>
      </div>
    </main>
  );
}
