package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.RealtimeOutboundMessage;
import com.bwton.urobot.application.RobotRealtimeService;
import com.bwton.urobot.interfaces.request.RealtimeControlMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.CloseStatus;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class RobotRealtimeWebSocketHandler implements WebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(RobotRealtimeWebSocketHandler.class);
    private final RobotRealtimeService realtimeService;
    private final ObjectMapper objectMapper;

    public RobotRealtimeWebSocketHandler(RobotRealtimeService realtimeService, ObjectMapper objectMapper) {
        this.realtimeService = realtimeService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String robotId = resolveRobotId(session);
        // robotId 解析不到时直接拒绝握手，避免在 service 里留下 key 为空串的僵尸 session 并触发前端无限重连。
        if (robotId.isEmpty()) {
            log.warn("realtime ws 缺少 robotId，关闭连接: uri={}", session.getHandshakeInfo().getUri());
            return session.close(CloseStatus.BAD_DATA.withReason("missing robotId"));
        }

        Sinks.Many<RealtimeOutboundMessage> sink = realtimeService.attachBrowserSession(robotId, session.getId());

        Mono<Void> inbound = session.receive()
                .filter(message -> message.getType() == WebSocketMessage.Type.TEXT)
                // 单条控制指令失败只记录日志，不能让 error 冒泡终止整条浏览器 WS（否则前端 onclose 后会立即重连，形成死循环）。
                .flatMap(message -> handleControlMessage(robotId, message.getPayloadAsText())
                        .onErrorResume(error -> {
                            log.warn("处理实时控制指令失败: robotId={}", robotId, error);
                            return Mono.empty();
                        }))
                .doFinally(signalType -> realtimeService.detachBrowserSession(robotId, session.getId()))
                .then();

        Mono<Void> outbound = session.send(sink.asFlux().map(message -> toWebSocketMessage(session, message)));
        return Mono.when(inbound, outbound);
    }

    private Mono<Void> handleControlMessage(String robotId, String payload) {
        try {
            RealtimeControlMessage message = objectMapper.readValue(payload, RealtimeControlMessage.class);
            String action = message.getAction();
            if ("connect".equals(action)) {
                return realtimeService.connect(robotId);
            }
            if ("subscribe".equals(action)) {
                return realtimeService.subscribe(robotId, resolveTopics(message), Boolean.TRUE.equals(message.getBinary()), safeThrottleRate(message));
            }
            if ("unsubscribe".equals(action)) {
                return realtimeService.unsubscribe(robotId, message.getTopic());
            }
            if ("close".equals(action)) {
                return realtimeService.close(robotId);
            }
            return Mono.empty();
        } catch (Exception error) {
            return Mono.error(error);
        }
    }

    private List<String> resolveTopics(RealtimeControlMessage message) {
        List<String> topics = new ArrayList<>();
        if (message.getTopics() != null) {
            topics.addAll(message.getTopics());
        }
        if (message.getTopic() != null && !message.getTopic().trim().isEmpty()) {
            topics.add(message.getTopic());
        }
        return topics;
    }

    private long safeThrottleRate(RealtimeControlMessage message) {
        return message.getThrottleRate() == null ? 0L : message.getThrottleRate();
    }

    private WebSocketMessage toWebSocketMessage(WebSocketSession session, RealtimeOutboundMessage message) {
        if (message.isBinary()) {
            return session.binaryMessage(bufferFactory -> bufferFactory.wrap(encodeBinaryFrame(message.getTopic(), message.getBinaryData())));
        }
        try {
            return session.textMessage(objectMapper.writeValueAsString(message.getEvent()));
        } catch (Exception error) {
            return session.textMessage("{\"type\":\"error\",\"reason\":\"serialize failed\"}");
        }
    }

    private byte[] encodeBinaryFrame(String topic, byte[] data) {
        byte[] topicBytes = topic.getBytes(StandardCharsets.UTF_8);
        if (topicBytes.length > 65535) {
            throw new IllegalArgumentException("topic too long");
        }
        ByteBuffer buffer = ByteBuffer.allocate(2 + topicBytes.length + data.length);
        buffer.putShort((short) topicBytes.length);
        buffer.put(topicBytes);
        buffer.put(data);
        return buffer.array();
    }

    // WebFlux 默认不会把 HandlerMapping 的 URI 模板变量拷进 WebSocketSession attributes，
    // 因此直接从握手 URI 的最后一段解析 robotId（映射为 /robot/realtime/{robotId}）。
    private String resolveRobotId(WebSocketSession session) {
        String path = session.getHandshakeInfo().getUri().getPath();
        int idx = path.lastIndexOf('/');
        String raw = idx >= 0 ? path.substring(idx + 1) : path;
        // 前端使用 encodeURIComponent，需要解码还原。
        try {
            return URLDecoder.decode(raw, StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            return raw;
        }
    }
}
