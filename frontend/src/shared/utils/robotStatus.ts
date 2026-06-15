import type { RobotSummary } from '../types/api';

/** uTwin 机器人状态枚举：statusValue → 中文描述 */
export const ROBOT_STATUS_LABELS: Record<number, string> = {
  0: '离线',
  1: '空闲',
  2: '忙碌',
  3: '升级中',
};

/** 离线状态对应的 statusValue */
export const ROBOT_STATUS_OFFLINE = 0;

/** 兼容驼峰 / 下划线两种字段命名，取出机器人状态数值 */
export function getRobotStatusValue(robot: RobotSummary): number | undefined {
  return robot.statusValue ?? robot.status_value;
}

/** 机器人是否离线（statusValue===0 视为离线，不可选中） */
export function isRobotOffline(robot: RobotSummary): boolean {
  return getRobotStatusValue(robot) === ROBOT_STATUS_OFFLINE;
}

/** 机器人状态中文描述：优先用枚举映射，回退到原始 status 字符串 */
export function getRobotStatusLabel(robot: RobotSummary): string {
  const value = getRobotStatusValue(robot);
  if (value !== undefined && value in ROBOT_STATUS_LABELS) {
    return ROBOT_STATUS_LABELS[value];
  }
  return robot.status ?? '未知';
}