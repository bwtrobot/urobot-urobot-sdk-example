import { useCallback, useEffect, useMemo, useState } from 'react';
import { getChargingPoints, getMapEdition, getMapEditions, listNavigationPaths, listTopologyPaths } from '../../../services/api/mapApi';
import {
  buildCommandPayload,
  getRobotRuntime,
  getTaskResults,
  listRobots,
  sendRobotCommand,
  type RobotCommandCode,
} from '../../../services/api/robotApi';
import type { MapEdition, NavigationPath, RobotRuntime, RobotSummary, TaskResult, TopologyPath } from '../../../shared/types/api';

// 任务终态集合，轮询到这些状态时停止
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'timeout', '完成', '失败', '已取消', '超时']);

export interface WorkbenchTask {
  taskId: string;
  commandCode: RobotCommandCode;
  source: 'real' | 'mock';
  status: string;
  result?: TaskResult;
}

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

  const sendCommand = useCallback(
    async (commandCode: RobotCommandCode, commandParam: unknown) => {
      if (!selectedRobotId) return;
      const payload = buildCommandPayload(commandCode, commandParam);

      try {
        const response = await sendRobotCommand(selectedRobotId, payload);
        const taskId = response.data;
        setDemoMode((current) => current || response.source === 'mock');
        setTasks((current) => [
          { taskId, commandCode, source: response.source, status: response.source === 'mock' ? '演示执行中' : '已下发' },
          ...current,
        ]);

        // 轮询监控任务最终状态
        const maxPolls = 30;
        const pollInterval = 2000;
        for (let i = 0; i < maxPolls; i++) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          const taskResponse = await getTaskResults(selectedRobotId, [taskId]);
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
        console.error('发送命令失败', error);
      }
    },
    [selectedRobotId],
  );

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
  };
}
