import type { AxiosAdapter } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, clearApiLogs, getApiLogs, http } from './httpClient';

describe('apiRequest', () => {
  const originalAdapter = http.defaults.adapter;

  afterEach(() => {
    http.defaults.adapter = originalAdapter;
    clearApiLogs();
  });

  it('returns real result data and logs a successful request', async () => {
    http.defaults.adapter = vi.fn(async (config) => ({
      data: { result: { id: 'robot-1', name: 'Unit 1' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })) as AxiosAdapter;

    const result = await apiRequest<{ id: string; name: string }>({
      method: 'GET',
      url: '/robots/robot-1',
      fallbackData: { id: 'fallback', name: 'Fallback' },
    });

    expect(result).toEqual({
      data: { id: 'robot-1', name: 'Unit 1' },
      source: 'real',
    });
    expect(getApiLogs()).toMatchObject([
      {
        method: 'GET',
        url: '/robots/robot-1',
        status: 'success',
        source: 'real',
      },
    ]);
  });

  it('returns fallback mock data with a reason and logs a mock request when the real request fails', async () => {
    http.defaults.adapter = vi.fn(async () => {
      throw new Error('network unavailable');
    }) as AxiosAdapter;

    const result = await apiRequest<{ id: string; name: string }>({
      method: 'POST',
      url: '/robots/robot-1/tasks',
      data: { type: 'navigate' },
      fallbackData: { id: 'task-1', name: 'Fallback task' },
      fallbackReason: 'Using mock task response',
    });

    expect(result).toEqual({
      data: { id: 'task-1', name: 'Fallback task' },
      source: 'mock',
      reason: 'Using mock task response',
    });
    expect(getApiLogs()).toMatchObject([
      {
        method: 'POST',
        url: '/robots/robot-1/tasks',
        status: 'mock',
        source: 'mock',
        reason: 'Using mock task response',
      },
    ]);
  });

  it('logs requests when crypto.randomUUID is unavailable', async () => {
    http.defaults.adapter = vi.fn(async () => {
      throw new Error('network unavailable');
    }) as AxiosAdapter;
    const cryptoValue = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });

    let result;
    try {
      result = await apiRequest<{ id: string }>({
        method: 'GET',
        url: '/robots/random-id-fallback',
        fallbackData: { id: 'fallback' },
      });
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: cryptoValue,
      });
    }

    expect(result?.source).toBe('mock');
    expect(getApiLogs()[0].id).toMatch(/^log-/);
  });

  it('notifies subscribers when request logs change', async () => {
    http.defaults.adapter = vi.fn(async (config) => ({
      data: { result: ['robot-1'] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })) as AxiosAdapter;
    const subscriber = vi.fn();
    const unsubscribe = getApiLogs.subscribe(subscriber);

    await apiRequest<string[]>({
      method: 'GET',
      url: '/robots',
      fallbackData: [],
    });
    unsubscribe();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'success',
          url: '/robots',
        }),
      ]),
    );
  });

  it('keeps successful request semantics when a log subscriber throws', async () => {
    http.defaults.adapter = vi.fn(async (config) => ({
      data: { result: { id: 'robot-1' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })) as AxiosAdapter;
    const unsubscribe = getApiLogs.subscribe(() => {
      throw new Error('subscriber failed');
    });

    const result = await apiRequest<{ id: string }>({
      method: 'GET',
      url: '/robots/robot-1',
      fallbackData: { id: 'fallback' },
    });
    unsubscribe();

    expect(result).toEqual({
      data: { id: 'robot-1' },
      source: 'real',
    });
    expect(getApiLogs()[0]).toMatchObject({
      status: 'success',
      source: 'real',
    });
  });

  it('returns a cloned fallback value so consumers cannot mutate shared mock state', async () => {
    http.defaults.adapter = vi.fn(async () => {
      throw new Error('network unavailable');
    }) as AxiosAdapter;
    const fallbackData = { rows: [{ id: 'mock-robot' }] };

    const first = await apiRequest<typeof fallbackData>({
      method: 'GET',
      url: '/robots',
      fallbackData,
    });
    first.data.rows[0].id = 'changed';
    const second = await apiRequest<typeof fallbackData>({
      method: 'GET',
      url: '/robots',
      fallbackData,
    });

    expect(second.data.rows[0].id).toBe('mock-robot');
    expect(second.data).not.toBe(fallbackData);
  });
});
