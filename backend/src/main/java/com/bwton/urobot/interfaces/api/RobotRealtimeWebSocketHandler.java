package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.RealtimeOutboundMessage;
import com.bwton.urobot.application.RobotRealtimeService;
import com.bwton.urobot.interfaces.request.RealtimeControlMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class RobotRealtimeWebSocketHandler implements WebSocketHandler {
    private final RobotRealtimeService realtimeService;
    private final ObjectMapper objectMapper;

    public RobotRealtimeWebSocketHandler(RobotRealtimeService realtimeService, ObjectMapper objectMapper) {
        this.realtimeService = realtimeService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String robotId = resolveRobotId(session);
        Sinks.Many<RealtimeOutboundMessage> sink = realtimeService.attachBrowserSession(robotId, session.getId());

        Mono<Void> inbound = session.receive()
                .filter(message -> message.getType() == WebSocketMessage.Type.TEXT)
                .flatMap(message -> handleControlMessage(robotId, message.getPayloadAsText()))
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

    @SuppressWarnings("unchecked")
    private String resolveRobotId(WebSocketSession session) {
        Object value = session.getAttributes().get("robotId");
        if (value instanceof String) {
            return (String) value;
        }
        Map<String, String> pathVariables = (Map<String, String>) session.getAttributes().get("org.springframework.web.reactive.HandlerMapping.uriTemplateVariables");
        return pathVariables == null ? "" : pathVariables.getOrDefault("robotId", "");
    }
}
