package com.bwton.urobot.application;

import com.bwton.urobot.interfaces.response.RealtimeEvent;

public class RealtimeOutboundMessage {
    private final RealtimeEvent event;
    private final String topic;
    private final byte[] binaryData;

    private RealtimeOutboundMessage(RealtimeEvent event, String topic, byte[] binaryData) {
        this.event = event;
        this.topic = topic;
        this.binaryData = binaryData;
    }

    public static RealtimeOutboundMessage text(RealtimeEvent event) {
        return new RealtimeOutboundMessage(event, null, null);
    }

    public static RealtimeOutboundMessage binary(String topic, byte[] binaryData) {
        return new RealtimeOutboundMessage(null, topic, binaryData);
    }

    public boolean isBinary() {
        return binaryData != null;
    }

    public RealtimeEvent getEvent() {
        return event;
    }

    public String getTopic() {
        return topic;
    }

    public byte[] getBinaryData() {
        return binaryData;
    }
}
