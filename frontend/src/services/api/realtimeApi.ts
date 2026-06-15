import { apiRequest, http, type ApiRequestResult } from './httpClient';
import type {
  RealtimeControlMessage,
  RealtimeEvent,
  RealtimeSnapshot,
} from '../../shared/types/api';

type RealtimeEventListener = (event: RealtimeEvent) => void;
type RealtimeBinaryListener = (topic: string, data: ArrayBuffer) => void;
type RealtimeStatusListener = (status: 'open' | 'closed' | 'error' | 'mock') => void;

interface RealtimeClientOptions {
  robotId: string;
  onEvent: RealtimeEventListener;
  onBinary?: RealtimeBinaryListener;
  onStatus?: RealtimeStatusListener;
  maxRetries?: number;
}

export interface RealtimeClient {
  connect(): void;
  send(message: RealtimeControlMessage): void;
  subscribe(topics: string[], options?: { binary?: boolean; throttleRate?: number }): void;
  unsubscribe(topic: string): void;
  close(): void;
}

const mockSnapshot: RealtimeSnapshot = {
  status: 'DISCONNECTED',
  robotInfo: undefined,
  subscribedTopics: [],
};

function getWsBaseUrl() {
  const configured = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, '');

  const baseURL = http.defaults.baseURL ?? '/api';
  if (/^https?:\/\//.test(baseURL)) {
    return baseURL.replace(/^http/, 'ws').replace(/\/$/, '');
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (import.meta.env.DEV && baseURL === '/api') {
    // 开发环境的 HTTP API 仍走 Vite 代理，实时 WS 默认直连后端，避免和 Vite HMR 连接混在同一端口。
    return `${protocol}//${window.location.hostname}:8080`;
  }

  return `${protocol}//${window.location.host}${baseURL}`.replace(/\/$/, '');
}

function decodeBinaryFrame(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 2) return null;

  const topicLength = view.getUint16(0, false);
  if (view.byteLength < 2 + topicLength) return null;

  const topicBytes = new Uint8Array(buffer, 2, topicLength);
  const topic = new TextDecoder().decode(topicBytes);
  return {
    topic,
    data: buffer.slice(2 + topicLength),
  };
}

export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  const maxRetries = options.maxRetries ?? 5;
  let socket: WebSocket | null = null;
  let closedByUser = false;
  let retryCount = 0;
  let reconnectTimer: number | undefined;
  const pendingMessages: RealtimeControlMessage[] = [];

  function scheduleReconnect() {
    if (closedByUser || retryCount >= maxRetries) {
      options.onStatus?.('closed');
      return;
    }

    retryCount += 1;
    const delay = Math.min(8000, 500 * 2 ** (retryCount - 1));
    reconnectTimer = window.setTimeout(openSocket, delay);
  }

  function flushPending() {
    const messages = pendingMessages.splice(0);
    messages.forEach((message) => send(message));
  }

  function openSocket() {
    window.clearTimeout(reconnectTimer);
    closedByUser = false;

    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    let currentSocket: WebSocket;
    try {
      currentSocket = new WebSocket(`${getWsBaseUrl()}/robot/realtime/${encodeURIComponent(options.robotId)}`);
      currentSocket.binaryType = 'arraybuffer';
      socket = currentSocket;
    } catch {
      options.onStatus?.('mock');
      scheduleReconnect();
      return;
    }

    currentSocket.onopen = () => {
      if (socket !== currentSocket || closedByUser) {
        currentSocket.close();
        return;
      }
      // 注意：此处不重置 retryCount。传输层握手成功不代表业务连接可用，
      // 若握手后业务 connect 立即失败并被服务端关闭，重置计数会让重连次数永远耗不尽，形成死循环。
      // retryCount 仅在收到业务层 CONNECTED 事件后重置（见 onmessage）。
      options.onStatus?.('open');
      send({ action: 'connect' });
      flushPending();
    };

    currentSocket.onmessage = (message) => {
      if (socket !== currentSocket || closedByUser) return;
      if (typeof message.data === 'string') {
        const event = JSON.parse(message.data) as RealtimeEvent;
        // 业务层确认连接已建立后才清零重试计数，确保失败场景下的重连预算可被正常耗尽。
        if (event.type === 'connected' || event.status === 'CONNECTED') {
          retryCount = 0;
        }
        options.onEvent(event);
        return;
      }

      if (message.data instanceof ArrayBuffer) {
        const frame = decodeBinaryFrame(message.data);
        if (frame) options.onBinary?.(frame.topic, frame.data);
      }
    };

    currentSocket.onerror = () => {
      if (socket !== currentSocket || closedByUser) return;
      options.onStatus?.('error');
    };

    currentSocket.onclose = () => {
      if (socket === currentSocket) {
        socket = null;
      }
      if (!closedByUser) scheduleReconnect();
    };
  }

  function send(message: RealtimeControlMessage) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return;
    }
    pendingMessages.push(message);
  }

  return {
    connect: openSocket,
    send,
    subscribe: (topics, subscribeOptions) => {
      send({
        action: 'subscribe',
        topics,
        binary: subscribeOptions?.binary,
        throttleRate: subscribeOptions?.throttleRate,
      });
    },
    unsubscribe: (topic) => send({ action: 'unsubscribe', topic }),
    close: () => {
      closedByUser = true;
      window.clearTimeout(reconnectTimer);
      pendingMessages.length = 0;

      const currentSocket = socket;
      socket = null;
      if (!currentSocket) return;

      if (currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(JSON.stringify({ action: 'close' } satisfies RealtimeControlMessage));
        currentSocket.close();
        return;
      }

      if (currentSocket.readyState === WebSocket.CONNECTING) {
        currentSocket.onopen = () => currentSocket.close();
        currentSocket.onmessage = null;
        currentSocket.onerror = null;
        currentSocket.onclose = null;
      }
    },
  };
}

export function getRealtimeSnapshot(robotId: string): Promise<ApiRequestResult<RealtimeSnapshot>> {
  return apiRequest<RealtimeSnapshot>({
    method: 'GET',
    url: `/robot/realtime/${robotId}/snapshot`,
    fallbackData: mockSnapshot,
  });
}
