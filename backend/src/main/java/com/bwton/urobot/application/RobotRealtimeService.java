package com.bwton.urobot.application;

import com.bwton.urobot.interfaces.response.RealtimeConnectionStatus;
import com.bwton.urobot.interfaces.response.RealtimeEvent;
import com.bwton.urobot.interfaces.response.RealtimeSnapshot;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.ws.model.DisconnectReason;
import com.bwton.utwin.opensdk.ws.model.TopicData;
import com.bwton.utwin.opensdk.ws.model.Topics;
import com.bwton.utwin.opensdk.ws.realtime.RobotRealtimeClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class RobotRealtimeService {
    private static final Duration LAST_SESSION_CLOSE_DELAY = Duration.ofSeconds(5);
    private final UTwinClient uTwinClient;
    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, RealtimeRobotSession> sessions = new ConcurrentHashMap<>();

    public RobotRealtimeService(UTwinClient uTwinClient, ObjectMapper objectMapper) {
        this.uTwinClient = uTwinClient;
        this.objectMapper = objectMapper;
    }

    public Sinks.Many<RealtimeOutboundMessage> attachBrowserSession(String robotId, String sessionId) {
        RealtimeRobotSession session = getSession(robotId);
        BrowserRealtimeSession browserSession = new BrowserRealtimeSession(sessionId);
        session.browserSessions.put(sessionId, browserSession);
        cancelPendingClose(session);
        browserSession.sink.tryEmitNext(RealtimeOutboundMessage.text(statusEvent(robotId, session.status, null)));
        return browserSession.sink;
    }

    public void detachBrowserSession(String robotId, String sessionId) {
        RealtimeRobotSession session = sessions.get(robotId);
        if (session == null) return;
        session.browserSessions.remove(sessionId);
        if (session.browserSessions.isEmpty()) {
            // 页面刷新时浏览器 WS 会短暂断开，延迟关闭 SDK 连接可避免频繁挤占和重连。
            session.pendingClose = Mono.delay(LAST_SESSION_CLOSE_DELAY)
                    .subscribeOn(Schedulers.parallel())
                    .subscribe(ignored -> {
                        if (session.browserSessions.isEmpty()) {
                            close(robotId).subscribe();
                        }
                    });
        }
    }

    public Mono<Void> connect(String robotId) {
        RealtimeRobotSession session = getSession(robotId);
        if (session.client != null && session.client.isConnected()) {
            session.status = RealtimeConnectionStatus.CONNECTED;
            broadcastText(session, statusEvent(robotId, session.status, null));
            return Mono.empty();
        }

        session.status = RealtimeConnectionStatus.CONNECTING;
        broadcastText(session, statusEvent(robotId, session.status, null));

        return Mono.fromRunnable(() -> {
            RobotRealtimeClient client = uTwinClient.robot().realtime(robotId);
            session.client = client;
            registerCallbacks(session, client);
            client.connect();
            subscribe(robotId, Collections.singletonList(Topics.ROBOT_UPLOAD_INFO), false, 0L).block();
        }).subscribeOn(Schedulers.boundedElastic()).then().onErrorResume(error -> {
            session.status = RealtimeConnectionStatus.ERROR;
            broadcastText(session, statusEvent(robotId, session.status, error.getMessage()));
            return Mono.error(error);
        });
    }

    public Mono<Void> subscribe(String robotId, List<String> topics, boolean binary, long throttleRate) {
        RealtimeRobotSession session = getSession(robotId);
        if (topics == null || topics.isEmpty()) return Mono.empty();

        return Mono.fromRunnable(() -> {
            RobotRealtimeClient client = session.client != null ? session.client : uTwinClient.robot().realtime(robotId);
            session.client = client;
            registerCallbacks(session, client);

            for (String topic : topics) {
                if (topic == null || topic.trim().isEmpty()) continue;
                RealtimeSubscription subscription = new RealtimeSubscription(binary, throttleRate);
                session.subscriptions.put(topic, subscription);
                client.onTopic(topic, data -> handleTopic(session, data));
            }
            broadcastText(session, statusEvent(robotId, session.status, null));
        }).subscribeOn(Schedulers.boundedElastic()).then();
    }

    public Mono<Void> unsubscribe(String robotId, String topic) {
        RealtimeRobotSession session = getSession(robotId);
        if (topic == null || topic.trim().isEmpty()) return Mono.empty();

        return Mono.fromRunnable(() -> {
            session.subscriptions.remove(topic);
            if (session.client != null) {
                session.client.unsubscribe(topic);
            }
            broadcastText(session, statusEvent(robotId, session.status, null));
        }).subscribeOn(Schedulers.boundedElastic()).then();
    }

    public Mono<Void> close(String robotId) {
        RealtimeRobotSession session = sessions.get(robotId);
        if (session == null) return Mono.empty();

        return Mono.fromRunnable(() -> {
            if (session.client != null) {
                session.client.close();
            }
            session.client = null;
            session.robotInfoJson = null;
            session.subscriptions.clear();
            session.status = RealtimeConnectionStatus.DISCONNECTED;
            broadcastText(session, statusEvent(robotId, session.status, "closed"));
        }).subscribeOn(Schedulers.boundedElastic()).then();
    }

    public RealtimeSnapshot snapshot(String robotId) {
        RealtimeRobotSession session = getSession(robotId);
        RealtimeSnapshot snapshot = new RealtimeSnapshot();
        snapshot.setRobotId(robotId);
        snapshot.setStatus(session.status);
        snapshot.setRobotInfo(session.robotInfoJson);
        snapshot.setSubscribedTopics(new LinkedHashSet<>(session.subscriptions.keySet()));
        return snapshot;
    }

    public void registerTask(String robotId, String taskId) {
        if (robotId == null || taskId == null || taskId.trim().isEmpty()) return;
        RealtimeRobotSession session = sessions.get(robotId);
        if (session == null || session.client == null || !session.client.isConnected()) return;
        session.client.registerTask(taskId);
    }

    private RealtimeRobotSession getSession(String robotId) {
        return sessions.computeIfAbsent(robotId, RealtimeRobotSession::new);
    }

    private void registerCallbacks(RealtimeRobotSession session, RobotRealtimeClient client) {
        if (session.callbacksRegistered) return;
        session.callbacksRegistered = true;

        client.onConnected(() -> {
            session.status = RealtimeConnectionStatus.CONNECTED;
            broadcastText(session, statusEvent(session.robotId, session.status, null));
        });
        client.onDisconnected(reason -> {
            session.status = reason == DisconnectReason.NETWORK_ERROR || reason == DisconnectReason.HEARTBEAT_TIMEOUT
                    ? RealtimeConnectionStatus.RECONNECTING
                    : RealtimeConnectionStatus.DISCONNECTED;
            broadcastText(session, statusEvent(session.robotId, session.status, reason.name()));
        });
        client.onKicked(() -> {
            session.status = RealtimeConnectionStatus.KICKED;
            broadcastText(session, statusEvent(session.robotId, session.status, "kicked by another client"));
        });
        client.onTaskResult(data -> handleTaskResult(session, data));
    }

    private void handleTopic(RealtimeRobotSession session, TopicData data) {
        String topic = data.topic();
        RealtimeSubscription subscription = session.subscriptions.get(topic);
        if (subscription == null) return;

        if (Topics.ROBOT_UPLOAD_INFO.equals(topic) && data.hasJson()) {
            session.robotInfoJson = data.jsonData();
        }

        if (subscription.binary && data.hasBinary() && shouldForwardBinary(subscription)) {
            broadcastBinary(session, topic, data.binaryData());
            return;
        }

        RealtimeEvent event = RealtimeEvent.of(resolveTopicEventType(topic), session.robotId);
        event.setTopic(topic);
        event.setJsonData(data.jsonData());
        event.setBinarySize(data.hasBinary() ? data.binaryData().length : null);
        broadcastText(session, event);
    }

    private boolean shouldForwardBinary(RealtimeSubscription subscription) {
        long now = System.currentTimeMillis();
        if (subscription.throttleRate <= 0 || now - subscription.lastForwardAt >= subscription.throttleRate) {
            subscription.lastForwardAt = now;
            return true;
        }
        return false;
    }

    private void handleTaskResult(RealtimeRobotSession session, TopicData data) {
        RealtimeEvent event = RealtimeEvent.of("task_reply", session.robotId);
        event.setTopic(data.topic());
        event.setJsonData(data.jsonData());
        event.setBinarySize(data.hasBinary() ? data.binaryData().length : null);

        if (data.hasJson()) {
            extractTaskFields(data.jsonData(), event);
        }
        broadcastText(session, event);
    }

    private void extractTaskFields(String jsonData, RealtimeEvent event) {
        try {
            JsonNode root = objectMapper.readTree(jsonData);
            event.setTaskId(firstText(root, "task_id", "taskId", "taskID"));
            event.setStatus(firstText(root, "task_status", "taskStatus", "status"));
        } catch (Exception ignored) {
            // SDK 推送格式可能随平台版本扩展，解析失败时仍透传原始 jsonData 给前端。
        }
    }

    private String firstText(JsonNode root, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode node = root.findValue(fieldName);
            if (node != null && !node.isNull()) return node.asText();
        }
        return null;
    }

    private String resolveTopicEventType(String topic) {
        return Topics.ROBOT_UPLOAD_INFO.equals(topic) ? "robot_info" : "topic";
    }

    private RealtimeEvent statusEvent(String robotId, RealtimeConnectionStatus status, String reason) {
        RealtimeEvent event = RealtimeEvent.of(status == RealtimeConnectionStatus.KICKED ? "kicked" : status.name().toLowerCase(), robotId);
        event.setStatus(status.name());
        event.setReason(reason);
        return event;
    }

    private void broadcastText(RealtimeRobotSession session, RealtimeEvent event) {
        RealtimeOutboundMessage message = RealtimeOutboundMessage.text(event);
        for (BrowserRealtimeSession browserSession : session.browserSessions.values()) {
            browserSession.sink.tryEmitNext(message);
        }
    }

    private void broadcastBinary(RealtimeRobotSession session, String topic, byte[] data) {
        RealtimeOutboundMessage message = RealtimeOutboundMessage.binary(topic, data);
        for (BrowserRealtimeSession browserSession : session.browserSessions.values()) {
            browserSession.sink.tryEmitNext(message);
        }
    }

    private void cancelPendingClose(RealtimeRobotSession session) {
        Disposable pendingClose = session.pendingClose;
        if (pendingClose != null && !pendingClose.isDisposed()) {
            pendingClose.dispose();
        }
        session.pendingClose = null;
    }

    private static class RealtimeRobotSession {
        private final String robotId;
        private final ConcurrentMap<String, BrowserRealtimeSession> browserSessions = new ConcurrentHashMap<>();
        private final ConcurrentMap<String, RealtimeSubscription> subscriptions = new ConcurrentHashMap<>();
        private volatile RobotRealtimeClient client;
        private volatile RealtimeConnectionStatus status = RealtimeConnectionStatus.DISCONNECTED;
        private volatile String robotInfoJson;
        private volatile boolean callbacksRegistered;
        private volatile Disposable pendingClose;

        private RealtimeRobotSession(String robotId) {
            this.robotId = robotId;
        }
    }

    private static class BrowserRealtimeSession {
        private final Sinks.Many<RealtimeOutboundMessage> sink = Sinks.many().multicast().onBackpressureBuffer();

        private BrowserRealtimeSession(String sessionId) {
        }
    }

    private static class RealtimeSubscription {
        private final boolean binary;
        private final long throttleRate;
        private volatile long lastForwardAt;

        private RealtimeSubscription(boolean binary, long throttleRate) {
            this.binary = binary;
            this.throttleRate = Math.max(0L, throttleRate);
        }
    }
}
