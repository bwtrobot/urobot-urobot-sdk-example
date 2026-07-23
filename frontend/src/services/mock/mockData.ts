import type {
  MapEdition,
  MapItem,
  MapPoint,
  NavigationPath,
  NarrationProcessSummary,
  NarrationRuntimeInfo,
  PathNode,
  RobotRuntime,
  RobotSummary,
  SegmentMode,
  TaskResult,
  TopologyPath,
} from '../../shared/types/api';

const identityOrientation = {
  x: 0,
  y: 0,
  z: 0,
  w: 1,
};

const baseNodes: PathNode[] = [
  {
    id: 'node-start',
    uuid: 'node-start',
    name: '起点',
    order: 1,
    position: { x: 0, y: 0, z: 0 },
    orientation: identityOrientation,
  },
  {
    id: 'node-inspection',
    uuid: 'node-inspection',
    name: '巡检点',
    order: 2,
    position: { x: 4.2, y: 1.1, z: 0 },
    orientation: identityOrientation,
  },
  {
    id: 'node-dock',
    uuid: 'node-dock',
    name: '充电桩',
    order: 3,
    position: { x: 8.4, y: -1.5, z: 0 },
    orientation: identityOrientation,
  },
];

function clonePathNodes(): PathNode[] {
  return baseNodes.map((node) => ({
    ...node,
    position: { ...node.position },
    orientation: node.orientation ? { ...node.orientation } : undefined,
  }));
}

export const mockMaps: MapItem[] = [
  { id: 'map-main', name: 'Main Facility', createTime: '2026-01-15T08:00:00.000Z' },
  { id: 'map-lab', name: '仿真实验室', createTime: '2026-03-10T10:30:00.000Z' },
];

export const mockRobots: RobotSummary[] = [
  {
    id: 'robot-alpha',
    name: 'uRobot Alpha',
    terminalSn: 'UR-ALPHA-001',
    terminal_sn: 'UR-ALPHA-001',
    status: '空闲',
    statusValue: 1,
    status_value: 1,
    terminalType: 'AMR',
    terminal_type: 'AMR',
    terminalPower: 86,
    terminal_power: 86,
    deviceTypeDesc: 'Autonomous mobile robot',
    device_type_desc: 'Autonomous mobile robot',
    map: {
      id: 'map-main',
      name: 'Main Facility',
      edition_id: 'edition-main-v1',
      editionId: 'edition-main-v1',
    },
  },
  {
    id: 'robot-beta',
    name: 'uRobot Beta',
    terminalSn: 'UR-BETA-002',
    terminal_sn: 'UR-BETA-002',
    status: '忙碌',
    statusValue: 2,
    status_value: 2,
    terminalType: 'AMR',
    terminal_type: 'AMR',
    terminalPower: 64,
    terminal_power: 64,
    deviceTypeDesc: 'Autonomous mobile robot',
    device_type_desc: 'Autonomous mobile robot',
    map: {
      id: 'map-main',
      name: 'Main Facility',
      edition_id: 'edition-main-v1',
      editionId: 'edition-main-v1',
    },
  },
  {
    id: 'robot-gamma',
    name: 'uRobot Gamma',
    terminalSn: 'UR-GAMMA-003',
    terminal_sn: 'UR-GAMMA-003',
    status: '离线',
    statusValue: 0,
    status_value: 0,
    terminalType: 'AMR',
    terminal_type: 'AMR',
    terminalPower: 0,
    terminal_power: 0,
    deviceTypeDesc: 'Autonomous mobile robot',
    device_type_desc: 'Autonomous mobile robot',
    map: {
      id: 'map-main',
      name: 'Main Facility',
      edition_id: 'edition-main-v1',
      editionId: 'edition-main-v1',
    },
  },
];

export const mockRuntime: RobotRuntime = {
  soc: 86,
  robot_id: 'robot-alpha',
  robot_name: 'uRobot Alpha',
  terminal_status: 'Online',
  terminal_status_value: 1,
  control_status: 'Auto',
  map_name: 'Main Facility',
  map_name_str: 'Main Facility',
  ros_odom: {
    pose: {
      position: { x: 2.5, y: 1.25, z: 0 },
      orientation: identityOrientation,
    },
  },
  charge: {
    status: 0,
    org_value: 0,
  },
  cpu_load: 31,
  used_memory: 48,
  cpu_temperature: 42,
  net_ip_address: '192.168.10.24',
};

export const mockEdition: MapEdition & {
  bim: NonNullable<MapEdition['bim']> & {
    transform: Pick<NonNullable<MapEdition['bim']>, 'position' | 'scale' | 'orientation'>;
  };
} = {
  id: 'edition-main-v1',
  mapId: 'map-main',
  name: 'Main Facility v1',
  mapName: 'Main Facility',
  createTime: '2026-01-15T08:00:00.000Z',
  globalMap: '/mock/maps/main-facility/global-map.pcd',
  groundMap: '/mock/maps/main-facility/ground-map.pcd',
  bim: {
    name: 'Main Facility BIM',
    fileUrl: '/mock/bim/main-facility.ifc',
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    orientation: identityOrientation,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      orientation: identityOrientation,
    },
  },
};

export const mockChargingPoints: MapPoint[] = [
  {
    id: 'charge-1',
    uuid: 'charge-1',
    name: 'Charging Dock A',
    x: 8.4,
    y: -1.5,
    z: 0,
    rotationZ: 0,
    editionId: 'edition-main-v1',
    editionName: 'Main Facility v1',
  },
  {
    id: 'charge-2',
    uuid: 'charge-2',
    name: 'Charging Dock B',
    x: -3.2,
    y: 5.6,
    z: 0,
    rotationZ: 1.57,
    editionId: 'edition-main-v1',
    editionName: 'Main Facility v1',
  },
];

export const mockNavigationPath: NavigationPath = {
  id: 'nav-path-main',
  uuid: 'nav-path-main',
  name: 'Main Inspection Route',
  mapId: 'map-main',
  mapName: 'Main Facility',
  editionId: 'edition-main-v1',
  editionName: 'Main Facility v1',
  nodes: clonePathNodes(),
};

export const mockTopologyPath: TopologyPath = {
  id: 'topology-main',
  uuid: 'topology-main',
  name: 'Main Facility Topology',
  mapId: 'map-main',
  mapName: 'Main Facility',
  editionId: 'edition-main-v1',
  editionName: 'Main Facility v1',
  nodes: clonePathNodes(),
  edges: [
    {
      id: 'edge-start-inspection',
      snode: 'node-start',
      enode: 'node-inspection',
      passable: 'true',
    },
    {
      id: 'edge-inspection-dock',
      snode: 'node-inspection',
      enode: 'node-dock',
      passable: 'true',
    },
  ],
};

export const mockNarrationProcesses: NarrationProcessSummary[] = [
  {
    id: 'narration-main-route',
    uuid: 'narration-main-route',
    name: '主路线讲解',
    navPathId: 'nav-path-main',
    navPathName: 'Main Inspection Route',
    valid: true,
    nodes: clonePathNodes().map((node) => ({
      id: node.id,
      uuid: node.uuid,
      name: node.name,
      navNodeId: node.id,
      order: node.order,
      position: node.position,
      rotation: node.orientation,
      selfScripts: node.id === 'node-inspection'
        ? ['script-welcome', 'script-device', 'script-safety']
        : [`script-${node.id}`],
      selfScriptNames: node.id === 'node-inspection'
        ? ['欢迎词', '设备介绍', '安全须知']
        : [`${node.name}讲解`],
      selfScriptValids: node.id === 'node-inspection'
        ? [true, true, false]
        : [true],
      stopover: node.id !== 'node-dock',
    })),
  },
];

function createBaseNarrationRuntime(): NarrationRuntimeInfo {
  return {
    robotId: 'robot-alpha',
    editionId: 'edition-main-v1',
    processId: 'narration-main-route',
    processName: '主路线讲解',
    command: 'start',
    status: 'idle',
    operationSource: 'web-example',
    currentNodeIndex: 1,
    currentNodeId: 'node-inspection',
    currentNodeName: '巡检点',
    nodes: [
      { nodeIndex: 0, nodeId: 'node-start', nodeName: '起点', status: 'pending' },
      { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', status: 'executing' },
      { nodeIndex: 2, nodeId: 'node-dock', nodeName: '充电桩', status: 'pending' },
    ],
    updateTime: new Date().toISOString(),
  };
}

export function createMockNarrationRuntime(segmentMode: SegmentMode = 'collapsed'): NarrationRuntimeInfo[] {
  const runtime = createBaseNarrationRuntime();
  if (segmentMode === 'expanded') {
    return [{
      ...runtime,
      taskIds: ['task-entrance', 'task-self-0', 'task-self-1', 'task-self-2', 'task-transition', 'task-exit'],
      latestTaskId: 'task-self-1',
      latestTaskStatus: 'executing',
      segments: [
        { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'entrance', selfIndex: null, taskId: 'task-entrance', taskStatus: 'finished' },
        { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'self', selfIndex: 0, taskId: 'task-self-0', taskStatus: 'finished' },
        { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'self', selfIndex: 1, taskId: 'task-self-1', taskStatus: 'executing' },
        { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'self', selfIndex: 2, taskId: 'task-self-2', taskStatus: 'pending' },
        { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'transition', selfIndex: null, fromNodeId: 'node-inspection', toNodeId: 'node-dock', taskId: 'task-transition', taskStatus: 'pending' },
        { nodeIndex: 2, nodeId: 'node-dock', nodeName: '充电桩', segmentType: 'exit', selfIndex: null, taskId: 'task-exit', taskStatus: 'pending' },
      ],
    }];
  }

  return [{
    ...runtime,
    taskIds: ['task-entrance', 'task-self-all', 'task-transition', 'task-exit'],
    latestTaskId: 'task-self-all',
    latestTaskStatus: 'executing',
    segments: [
      { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'entrance', selfIndex: null, taskId: 'task-entrance', taskStatus: 'finished' },
      { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'self', selfIndex: null, taskId: 'task-self-all', taskStatus: 'executing' },
      { nodeIndex: 1, nodeId: 'node-inspection', nodeName: '巡检点', segmentType: 'transition', selfIndex: null, fromNodeId: 'node-inspection', toNodeId: 'node-dock', taskId: 'task-transition', taskStatus: 'pending' },
      { nodeIndex: 2, nodeId: 'node-dock', nodeName: '充电桩', segmentType: 'exit', selfIndex: null, taskId: 'task-exit', taskStatus: 'pending' },
    ],
  }];
}

export const mockNarrationRuntime: NarrationRuntimeInfo[] = createMockNarrationRuntime('collapsed');

export function createMockTaskResult(taskId: string): TaskResult {
  return {
    task_id: taskId,
    task_status: 'completed',
    messages_type: 'mock',
    command_resp_list: [
      {
        status: 'success',
        result: 'ok',
        description: 'Mock task completed successfully',
        task_command_code: 'mock_command',
        task_command_id: `${taskId}-command-1`,
      },
    ],
  };
}
