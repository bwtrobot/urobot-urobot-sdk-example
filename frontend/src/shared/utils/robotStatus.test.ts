import { describe, it, expect } from 'vitest';
import { getRobotStatusValue, getRobotStatusLabel, isRobotOffline } from './robotStatus';
import type { RobotSummary } from '../types/api';

const makeRobot = (over: Partial<RobotSummary>): RobotSummary => ({
  id: 'robot-1',
  name: '机器人 1',
  ...over,
});

describe('getRobotStatusValue', () => {
  it('优先取驼峰 statusValue', () => {
    expect(getRobotStatusValue(makeRobot({ statusValue: 2, status_value: 0 }))).toBe(2);
  });

  it('缺少驼峰时回退到下划线 status_value', () => {
    expect(getRobotStatusValue(makeRobot({ status_value: 1 }))).toBe(1);
  });

  it('两者都缺失时返回 undefined', () => {
    expect(getRobotStatusValue(makeRobot({}))).toBeUndefined();
  });
});

describe('isRobotOffline', () => {
  it('statusValue 为 0 时判定离线', () => {
    expect(isRobotOffline(makeRobot({ statusValue: 0 }))).toBe(true);
  });

  it('statusValue 非 0 时判定在线', () => {
    expect(isRobotOffline(makeRobot({ statusValue: 1 }))).toBe(false);
    expect(isRobotOffline(makeRobot({ statusValue: 2 }))).toBe(false);
  });

  it('statusValue 缺失时不判定为离线', () => {
    expect(isRobotOffline(makeRobot({}))).toBe(false);
  });
});

describe('getRobotStatusLabel', () => {
  it('按枚举返回中文描述', () => {
    expect(getRobotStatusLabel(makeRobot({ statusValue: 0 }))).toBe('离线');
    expect(getRobotStatusLabel(makeRobot({ statusValue: 1 }))).toBe('空闲');
    expect(getRobotStatusLabel(makeRobot({ statusValue: 2 }))).toBe('忙碌');
    expect(getRobotStatusLabel(makeRobot({ statusValue: 3 }))).toBe('升级中');
  });

  it('未知数值回退到原始 status 字符串', () => {
    expect(getRobotStatusLabel(makeRobot({ statusValue: 99, status: 'Charging' }))).toBe('Charging');
  });

  it('无数值无字符串时返回未知', () => {
    expect(getRobotStatusLabel(makeRobot({}))).toBe('未知');
  });
});