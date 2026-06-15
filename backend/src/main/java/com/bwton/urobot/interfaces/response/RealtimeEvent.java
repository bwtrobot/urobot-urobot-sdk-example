package com.bwton.urobot.interfaces.response;

import java.time.Instant;

public class RealtimeEvent {
    private String type;
    private String robotId;
    private String topic;
    private String taskId;
    private String status;
    private String jsonData;
    private Integer binarySize;
    private String reason;
    private Instant timestamp;

    public static RealtimeEvent of(String type, String robotId) {
        RealtimeEvent event = new RealtimeEvent();
        event.setType(type);
        event.setRobotId(robotId);
        event.setTimestamp(Instant.now());
        return event;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getRobotId() {
        return robotId;
    }

    public void setRobotId(String robotId) {
        this.robotId = robotId;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getJsonData() {
        return jsonData;
    }

    public void setJsonData(String jsonData) {
        this.jsonData = jsonData;
    }

    public Integer getBinarySize() {
        return binarySize;
    }

    public void setBinarySize(Integer binarySize) {
        this.binarySize = binarySize;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
