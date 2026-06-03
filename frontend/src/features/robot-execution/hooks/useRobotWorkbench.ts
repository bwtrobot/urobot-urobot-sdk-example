import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChargingPoints, getMapEdition, getMapEditions, listNavigationPaths, listTopologyPaths } from '../../../services/api/mapApi';
import { threePositionToRos, threeQuaternionToRos } from '../../../shared/utils/pose';
import {
  buildCommandPayload,
  getRobotRuntime,
  getTaskResults,
  listRobots,
  sendRobotCommand,
  type RobotCommandCode,
} from '../../../services/api/robotApi';
import type { MapEdition, NavigationPath, PathNode, RobotRuntime, RobotSummary, TaskResult, TopologyPath } from '../../../shared/types/api';

// 任务终态集合，轮询到这些状态时停止
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'timeout', '完成', '失败', '已取消', '超时']);

export interface WorkbenchTask {
  taskId: string;
  commandCode: RobotCommandCode;
  source: 'real' | 'mock';
  status: string;
  result?: TaskResult;
}

export type ActivePathType = 'nav' | 'topo';

export function useRobotWorkbench() {
  const [robots, setRobots] = useState<RobotSummary[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('');
  const [runtime, setRuntime] = useState<RobotRuntime | undefined>();
  const [edition, setEdition] = useState<MapEdition | undefined>();
  const [navPaths, setNavPaths] = useState<NavigationPath[]>([]);
  const [topoPaths, setTopoPaths] = useState<TopologyPath[]>([]);
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // 路径互斥选择状态
  const [activePathType, setActivePathType] = useState<ActivePathType>('nav');
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void listRobots().then((response) => {
      if (cancelled) return;
      const rows = response.data.rows;
      setRobots(rows);
      setSelectedRobotId((current) => current || rows[0]?.id || '');
      setDemoMode(response.source === 'mock');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRobot = useMemo(
    () => robots.find((robot) => robot.id === selectedRobotId),
    [robots, selectedRobotId],
  );

  useEffect(() => {
    if (!selectedRobotId) return;
    let cancelled = false;

    async function refreshRuntime() {
      const response = await getRobotRuntime(selectedRobotId);
      if (!cancelled) {
        setRuntime(response.data);
        setDemoMode((current) => current || response.source === 'mock');
      }
    }

    void refreshRuntime();
    const timer = window.setInterval(refreshRuntime, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedRobotId]);

  // 从 version_path 中解析 editionId，格式: {mapId}/maincenter/{editionId}
  const runtimeEditionId = useMemo(() => {
    const versionPath = runtime?.version_path;
    if (!versionPath) return undefined;
    const parts = versionPath.split('/');
    return parts.length >= 3 ? parts[parts.length - 1] : undefined;
  }, [runtime]);

  useEffect(() => {
    const mapId = selectedRobot?.map?.id;
    // 优先使用 robot 列表中的 editionId，其次从 runtime 的 version_path 解析
    const editionId = selectedRobot?.map?.edition_id ?? selectedRobot?.map?.editionId ?? runtimeEditionId;
    if (!mapId && !editionId) return;
    let cancelled = false;

    async function loadMapData() {
      const editionResponse = editionId ? await getMapEdition(editionId) : await getMapEditions(mapId as string);
      const currentEdition = editionResponse.data[0];
      if (!currentEdition || cancelled) return;

      const [navResponse, topoResponse] = await Promise.all([
        listNavigationPaths(currentEdition.id),
        listTopologyPaths(currentEdition.id),
        getChargingPoints(currentEdition.id),
      ]);

      if (!cancelled) {
        setEdition(currentEdition);
        setNavPaths(navResponse.data.rows);
        setTopoPaths(topoResponse.data.rows);
        setDemoMode(
          (current) =>
            current ||
            editionResponse.source === 'mock' ||
            navResponse.source === 'mock' ||
            topoResponse.source === 'mock',
        );
      }
    }

    void loadMapData();
    return () => {
      cancelled = true;
    };
  }, [selectedRobot, runtimeEditionId]);

  // 当路径数据加载完成后，自动选中第一条路径
  useEffect(() => {
    const paths = activePathType === 'nav' ? navPaths : topoPaths;
    if (paths.length > 0 && !paths.find((p) => p.id === selectedPathId)) {
      setSelectedPathId(paths[0].id);
      setSelectedNodeIds(new Set());
    }
  }, [activePathType, navPaths, topoPaths, selectedPathId]);

  // 切换路径类型时重置选中状态
  const handlePathTypeChange = useCallback((type: ActivePathType) => {
    setActivePathType(type);
    setSelectedPathId('');
    setSelectedNodeIds(new Set());
  }, []);

  // 当前路径类型下的路径列表
  const currentPaths = useMemo(
    () => (activePathType === 'nav' ? navPaths : topoPaths),
    [activePathType, navPaths, topoPaths],
  );

  // 当前选中路径
  const activePath = useMemo(
    () => currentPaths.find((p) => p.id === selectedPathId),
    [currentPaths, selectedPathId],
  );

  // 当前路径的节点列表
  const activeNodes: PathNode[] = useMemo(
    () => activePath?.nodes ?? [],
    [activePath],
  );

  // 跟踪活跃的任务轮询，在机器人切换或组件卸载时取消
  const pollingAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // 组件卸载时取消所有进行中的轮询
      pollingAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    // 切换机器人时取消上一个机器人的轮询
    pollingAbortRef.current?.abort();
    pollingAbortRef.current = null;
  }, [selectedRobotId]);

  const sendCommand = useCallback(
    async (commandCode: RobotCommandCode, commandParam: unknown) => {
      if (!selectedRobotId) return;
      const payload = buildCommandPayload(commandCode, commandParam);

      // 取消前一个任务的轮询，避免并发轮询
      pollingAbortRef.current?.abort();
      const abortController = new AbortController();
      pollingAbortRef.current = abortController;

      try {
        const response = await sendRobotCommand(selectedRobotId, payload);
        const taskId = response.data;
        setDemoMode((current) => current || response.source === 'mock');
        setTasks((current) => [
          { taskId, commandCode, source: response.source, status: response.source === 'mock' ? '演示执行中' : '已下发' },
          ...current,
        ]);

        // 轮询监控任务最终状态，支持取消
        const maxPolls = 30;
        const pollInterval = 2000;
        for (let i = 0; i < maxPolls; i++) {
          if (abortController.signal.aborted) break;
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          if (abortController.signal.aborted) break;
          const taskResponse = await getTaskResults(selectedRobotId, [taskId]);
          if (abortController.signal.aborted) break;
          const latestStatus = taskResponse.data[0]?.task_status ?? '';
          setTasks((current) =>
            current.map((task) =>
              task.taskId === taskId
                ? { ...task, status: latestStatus || task.status, result: taskResponse.data[0] }
                : task,
            ),
          );
          if (TERMINAL_STATUSES.has(latestStatus)) break;
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('发送命令失败', error);
        }
      }
    },
    [selectedRobotId],
  );

  // 根据选中节点构造并下发导航指令
  const navigateToSelected = useCallback(() => {
    if (selectedNodeIds.size === 0 || !activePath) return;

    const coordinateFrame = activePath.coordinateFrame ?? 'ROBOT';
    const selectedNodes = activeNodes
      .filter((n) => selectedNodeIds.has(n.id))
      .sort((a, b) => a.order - b.order);

    // 根据 coordinateFrame 转换坐标到 ROS 坐标系
    function toRosPosition(node: PathNode) {
      if (coordinateFrame === 'THREE') {
        return threePositionToRos(node.position);
      }
      return node.position;
    }

    function toRosOrientation(node: PathNode) {
      if (coordinateFrame === 'THREE' && node.orientation) {
        return threeQuaternionToRos(node.orientation);
      }
      return node.orientation ?? { x: 0, y: 0, z: 0, w: 1 };
    }

    if (selectedNodes.length === 1) {
      // 单点导航
      const node = selectedNodes[0];
      void sendCommand('navigation', {
        point_name: node.name || node.id,
        position: toRosPosition(node),
        orientation: toRosOrientation(node),
        look_at: true,
      });
    } else {
      // 多点导航
      const points = selectedNodes.map((node) => ({
        position: toRosPosition(node),
        orientation: toRosOrientation(node),
        look_at: true,
      }));
      void sendCommand('topology_navigation', { point: points });
    }
  }, [selectedNodeIds, activePath, activeNodes, sendCommand]);

  return {
    robots,
    selectedRobot,
    selectedRobotId,
    setSelectedRobotId,
    runtime,
    edition,
    navPaths,
    topoPaths,
    tasks,
    demoMode,
    loading,
    sendCommand,
    // 路径互斥选择
    activePathType,
    handlePathTypeChange,
    selectedPathId,
    setSelectedPathId,
    selectedNodeIds,
    setSelectedNodeIds,
    currentPaths,
    activePath,
    activeNodes,
    navigateToSelected,
    // 位姿标定
    isCalibrating,
    setIsCalibrating,
  };
}
