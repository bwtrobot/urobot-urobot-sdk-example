import { apiRequest, type ApiRequestResult } from './httpClient';
import {
  createMockTaskResult,
  mockNarrationRuntime,
  mockRobots,
  mockRuntime,
} from '../mock/mockData';
import type {
  ControlNarrationParams,
  NarrationRuntimeInfo,
  PageResult,
  RobotCommand,
  RobotRuntime,
  RobotSummary,
  TaskResult,
} from '../../shared/types/api';

export type RobotCommandCode =
  | 'navigation'
  | 'topology_navigation'
  | 'robot_tts'
  | 'charge_manager'
  | 'robot_pause'
  | 'emergency_stop'
  | 'base_move'
  | 'cmd_vel'
  | 'pose_init';

const commandTypeByCode: Record<RobotCommandCode, number> = {
  navigation: 0,
  topology_navigation: 22,
  robot_tts: 33,
  charge_manager: 23,
  robot_pause: 21,
  emergency_stop: 20,
  base_move: 23,
  cmd_vel: 23,
  pose_init: 24,
};

function createStandardUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function buildPageResult<T>(rows: T[]): PageResult<T> {
  return {
    rows,
    total_count: rows.length,
    page_no: 1,
    page_size: rows.length,
    total_page: rows.length > 0 ? 1 : 0,
  };
}

function normalizeRuntimeResponse(data: RobotRuntime | { rows?: RobotRuntime[] }): RobotRuntime | undefined {
  if (data && typeof data === 'object' && 'rows' in data) {
    return data.rows?.[0];
  }

  return data as RobotRuntime;
}

export function buildCommandPayload(
  commandCode: RobotCommandCode,
  commandParam: unknown,
): RobotCommand {
  const taskId = createStandardUuid();
  const commandId = createStandardUuid();

  return {
    type: commandTypeByCode[commandCode],
    messagesType: 'task_submit',
    params: {
      task_id: taskId,
      task_command_info: [
        {
          command_id: commandId,
          command_code: commandCode,
          command_param: commandParam,
          parallel_commands: null,
        },
      ],
    },
  };
}

export async function listRobots() {
  return apiRequest<PageResult<RobotSummary>>({
    method: 'GET',
    url: '/robot/page',
    fallbackData: buildPageResult(mockRobots),
  });
}

export async function getRobotRuntime(robotId: string): Promise<ApiRequestResult<RobotRuntime>> {
  const runtime = await apiRequest<RobotRuntime | { rows?: RobotRuntime[] }>({
    method: 'GET',
    url: `/robot/runtime/${robotId}`,
    fallbackData: mockRuntime,
  });

  const normalized = normalizeRuntimeResponse(runtime.data);

  if (!normalized) {
    return {
      data: structuredClone(mockRuntime),
      source: 'mock' as const,
      reason: 'Empty runtime response',
    };
  }

  return {
    ...runtime,
    data: normalized,
  };
}

export async function sendRobotCommand(robotId: string, payload: RobotCommand) {
  const taskId = payload.params.task_id ?? createStandardUuid();

  return apiRequest<string>({
    method: 'POST',
    url: `/robot/command/${robotId}`,
    data: payload,
    fallbackData: taskId,
  });
}

export async function controlNarration(robotId: string, params: ControlNarrationParams) {
  requireText(params.editionId, 'editionId');
  requireText(params.processId, 'processId');
  requireText(params.command, 'command');

  return apiRequest<NarrationRuntimeInfo>({
    method: 'POST',
    url: `/robot/${robotId}/narration/control`,
    data: params,
    fallbackData: {
      ...mockNarrationRuntime[0],
      ...params,
      accepted: true,
      mode: 'mock',
      status: params.command === 'stop' ? 'stopped' : params.command,
      currentNodeId: params.nodeId ?? mockNarrationRuntime[0]?.currentNodeId,
      currentNodeName: params.nodeName ?? mockNarrationRuntime[0]?.currentNodeName,
      updateTime: new Date().toISOString(),
    },
  });
}

function requireText(value: string | undefined, fieldName: string) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} 不能为空`);
  }
}

export async function getNarrationRuntime(robotId: string) {
  return apiRequest<NarrationRuntimeInfo[]>({
    method: 'GET',
    url: `/robot/${robotId}/narration/runtime`,
    fallbackData: mockNarrationRuntime,
  });
}

export async function activateMap(robotId: string, editionId: string) {
  return apiRequest<string>({
    method: 'POST',
    url: `/robot/${robotId}/activate-map`,
    data: { editionId },
    fallbackData: createStandardUuid(),
  });
}

// 每批最多查询的 taskId 数量，避免 GET URL 超长
const TASK_IDS_BATCH_SIZE = 10;

export async function getTaskResults(robotId: string, taskIds: string[]) {
  if (taskIds.length === 0) {
    return { data: [] as TaskResult[], source: 'real' as const };
  }

  // taskIds 数量较少时直接查询，超出批次上限时分批并发查询后合并结果
  if (taskIds.length <= TASK_IDS_BATCH_SIZE) {
    return fetchTaskResultsBatch(robotId, taskIds);
  }

  const batches: string[][] = [];
  for (let i = 0; i < taskIds.length; i += TASK_IDS_BATCH_SIZE) {
    batches.push(taskIds.slice(i, i + TASK_IDS_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map((batch) => fetchTaskResultsBatch(robotId, batch)),
  );

  return {
    data: results.flatMap((r) => r.data),
    source: results.some((r) => r.source === 'mock') ? 'mock' as const : 'real' as const,
  };
}

function fetchTaskResultsBatch(robotId: string, taskIds: string[]) {
  // Spring indexed 数组格式: taskIds[0]=xxx&taskIds[1]=yyy
  const params = new URLSearchParams();
  taskIds.forEach((taskId, index) => params.append(`taskIds[${index}]`, taskId));

  return apiRequest<TaskResult[]>({
    method: 'GET',
    url: `/robot/task-result/${robotId}`,
    params,
    fallbackData: taskIds.map((taskId) => createMockTaskResult(taskId)),
  });
}
