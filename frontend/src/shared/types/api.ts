export interface ApiResult<T> {
  success?: boolean;
  errcode?: string;
  errmsg?: string;
  result: T;
}

export interface PageResult<T> {
  rows: T[];
  total_count?: number;
  totalCount?: number;
  page_no?: number;
  pageNo?: number;
  page_size?: number;
  pageSize?: number;
  total_page?: number;
  totalPage?: number;
}

export interface Vector3Value {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionValue {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface RobotSummary {
  id: string;
  name: string;
  map?: {
    id?: string;
    name?: string;
    edition_id?: string;
    editionId?: string;
  };
  terminalSn?: string;
  terminal_sn?: string;
  status?: string;
  statusValue?: number;
  status_value?: number;
  terminalType?: string;
  terminal_type?: string;
  terminalTypeValue?: number;
  terminal_type_value?: number;
  terminalPower?: number;
  terminal_power?: number;
  deviceTypeDesc?: string;
  device_type_desc?: string;
}

export interface RuntimePose {
  position: Vector3Value;
  orientation: QuaternionValue;
}

export interface RobotRuntime {
  soc?: number;
  robot_id?: string;
  robot_name?: string;
  terminal_status?: string;
  terminal_status_value?: number;
  control_status?: string;
  map_name?: string;
  map_name_str?: string;
  ros_odom?: {
    pose?: RuntimePose;
  };
  charge?: {
    status?: number;
    org_value?: number;
  };
  cpu_load?: number;
  used_memory?: number;
  cpu_temperature?: number;
  net_ip_address?: string;
  version_path?: string;
  package_path?: string;
}

export interface MapBimInfo {
  name: string;
  fileUrl: string;
  position: Vector3Value;
  scale: Vector3Value;
  orientation: QuaternionValue;
}

export interface MapEdition {
  id: string;
  mapId: string;
  name: string;
  mapName: string;
  createTime?: string;
  globalMap?: string;
  groundMap?: string;
  bim?: MapBimInfo;
}

export interface MapPoint {
  id: string;
  uuid: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  editionId?: string;
  editionName?: string;
}

export interface PathNode {
  id: string;
  name: string;
  uuid: string;
  order: number;
  position: Vector3Value;
  orientation?: QuaternionValue;
}

export interface PathEdge {
  id: string;
  snode: string;
  enode: string;
  passable: string;
}

export interface TopologyPath {
  id: string;
  uuid: string;
  name: string;
  mapId: string;
  mapName?: string;
  editionId: string;
  editionName?: string;
  coordinateFrame?: 'ROBOT' | 'THREE';
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface NavigationPath {
  id: string;
  uuid: string;
  name: string;
  mapId: string;
  mapName?: string;
  editionId: string;
  editionName?: string;
  coordinateFrame?: 'ROBOT' | 'THREE';
  nodes: PathNode[];
}

export interface RobotCommand {
  type: number;
  messagesType: string;
  callbackUrl?: string;
  params: {
    task_id?: string;
    task_command_info: Array<{
      command_id: string;
      command_code: string;
      command_param: unknown;
      parallel_commands?: unknown[] | null;
    }>;
  };
}

export interface TaskResult {
  task_id: string;
  task_status: string;
  messages_type?: string;
  command_resp_list?: Array<{
    status: string;
    result?: string;
    description?: string;
    task_command_code: string;
    task_command_id: string;
  }>;
}

export type RealtimeConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'KICKED'
  | 'ERROR';

export type RealtimeEventType =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'reconnecting'
  | 'kicked'
  | 'error'
  | 'topic'
  | 'robot_info'
  | 'task_reply';

export interface RealtimeEvent {
  type: RealtimeEventType | string;
  robotId?: string;
  robot_id?: string;
  topic?: string;
  taskId?: string;
  task_id?: string;
  status?: string;
  jsonData?: string;
  json_data?: string;
  binarySize?: number;
  binary_size?: number;
  reason?: string;
  timestamp?: string;
}

// 实时推送摘要条目：摘要级 Topic 推送在工作台中按时间累积展示
export interface RealtimePushSummaryEntry {
  id: string;
  type: string;
  topic?: string;
  timestamp: string;
  jsonSummary?: string;
  binarySize?: number;
}

export interface RealtimeSnapshot {
  robotId?: string;
  robot_id?: string;
  status: RealtimeConnectionStatus;
  robotInfo?: string;
  robot_info?: string;
  subscribedTopics?: string[];
  subscribed_topics?: string[];
}

export interface RealtimeControlMessage {
  action: RealtimeAction;
  topic?: string;
  topics?: string[];
  binary?: boolean;
  throttleRate?: number;
}

export type RealtimeAction = 'connect' | 'subscribe' | 'unsubscribe' | 'close';

export interface RealtimeTopicSubscription {
  topic: string;
  label: string;
  binary?: boolean;
  throttleRate?: number;
  minFps?: number;
  maxFps?: number;
}
