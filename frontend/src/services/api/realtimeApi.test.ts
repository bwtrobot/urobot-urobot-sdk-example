import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRealtimeClient } from './realtimeApi';

describe('createRealtimeClient', () => {
  const originalWebSocket = globalThis.WebSocket;

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.WebSocket = originalWebSocket;
  });

  it('开发环境默认直连后端 WebSocket 端口，避免走 Vite HMR 端口', () => {
    const urls: string[] = [];

    class MockWebSocket {
      static readonly OPEN = 1;
      static readonly CONNECTING = 0;
      readonly readyState = MockWebSocket.CONNECTING;
      binaryType: BinaryType = 'blob';
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;

      constructor(url: string) {
        urls.push(url);
      }

      send() {}

      close() {}
    }

    vi.stubGlobal('WebSocket', MockWebSocket);

    const client = createRealtimeClient({
      robotId: 'robot-1',
      onEvent: vi.fn(),
    });

    client.connect();

    expect(urls).toEqual(['ws://localhost:8080/robot/realtime/robot-1']);
  });
});
