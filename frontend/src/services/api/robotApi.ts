import { apiRequest } from './httpClient';
import {
  createMockTaskResult,
  mockRobots,
  mockRuntime,
} from '../mock/mockData';
import type {
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
  | 'cmd_vel';

let idCounter = 0;

function createUniqueId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
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

export function buildCommandPayload(
  commandCode: RobotCommandCode,
  commandParam: unknown,
): RobotCommand {
  const taskId = createUniqueId('task');
  const commandId = createUniqueId('command');

  return {
    type: 1,
    messagesType: 'task',
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

export async function getRobotRuntime(robotId: string) {
  const runtime = await apiRequest<RobotRuntime | { rows?: RobotRuntime[] }>({
    method: 'GET',
    url: `/robot/runtime/${robotId}`,
    fallbackData: mockRuntime,
  });

  const data = runtime.data;
  const normalized = data && typeof data === 'object' && 'rows' in data
    ? data.rows?.[0]
    : data;

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
  const taskId = payload.params.task_id ?? createUniqueId('mock-task');

  return apiRequest<string>({
    method: 'POST',
    url: `/robot/command/${robotId}`,
    data: payload,
    fallbackData: taskId,
  });
}

export async function getTaskResults(robotId: string, taskIds: string[]) {
  const params = Object.fromEntries(taskIds.map((taskId, index) => [`taskIds[${index}]`, taskId]));

  return apiRequest<TaskResult[]>({
    method: 'GET',
    url: `/robot/task-result/${robotId}`,
    params,
    fallbackData: taskIds.map((taskId) => createMockTaskResult(taskId)),
  });
}
