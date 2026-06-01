import type {
  MapEdition,
  MapPoint,
  NavigationPath,
  PathNode,
  RobotRuntime,
  RobotSummary,
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
    name: 'Start',
    order: 1,
    position: { x: 0, y: 0, z: 0 },
    orientation: identityOrientation,
  },
  {
    id: 'node-inspection',
    uuid: 'node-inspection',
    name: 'Inspection Point',
    order: 2,
    position: { x: 4.2, y: 1.1, z: 0 },
    orientation: identityOrientation,
  },
  {
    id: 'node-dock',
    uuid: 'node-dock',
    name: 'Charging Dock',
    order: 3,
    position: { x: 8.4, y: -1.5, z: 0 },
    orientation: identityOrientation,
  },
];

export const mockRobots: RobotSummary[] = [
  {
    id: 'robot-alpha',
    name: 'uRobot Alpha',
    terminalSn: 'UR-ALPHA-001',
    terminal_sn: 'UR-ALPHA-001',
    status: 'Online',
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
    status: 'Idle',
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
  nodes: baseNodes,
};

export const mockTopologyPath: TopologyPath = {
  id: 'topology-main',
  uuid: 'topology-main',
  name: 'Main Facility Topology',
  mapId: 'map-main',
  mapName: 'Main Facility',
  editionId: 'edition-main-v1',
  editionName: 'Main Facility v1',
  nodes: baseNodes,
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
