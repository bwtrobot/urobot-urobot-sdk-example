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

  useEffect(() => {
    const mapId = selectedRobot?.map?.id;
    const editionId = selectedRobot?.map?.edition_id ?? selectedRobot?.map?.editionId;
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
  }, [selectedRobot]);

  const sendCommand = useCallback(
    async (commandCode: RobotCommandCode, commandParam: unknown) => {
      if (!selectedRobotId) return;
      const payload = buildCommandPayload(commandCode, commandParam);
      const response = await sendRobotCommand(selectedRobotId, payload);
      const taskId = response.data;
      setDemoMode((current) => current || response.source === 'mock');
      setTasks((current) => [
        { taskId, commandCode, source: response.source, status: response.source === 'mock' ? '演示执行中' : '已下发' },
        ...current,
      ]);
      const taskResponse = await getTaskResults(selectedRobotId, [taskId]);
      setTasks((current) =>
        current.map((task) =>
          task.taskId === taskId
            ? { ...task, status: taskResponse.data[0]?.task_status ?? task.status, result: taskResponse.data[0] }
            : task,
        ),
      );
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
