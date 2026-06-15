package com.bwton.urobot.interfaces.response;

import java.util.Set;

public class RealtimeSnapshot {
    private String robotId;
    private RealtimeConnectionStatus status;
    private String robotInfo;
    private Set<String> subscribedTopics;

    public String getRobotId() {
        return robotId;
    }

    public void setRobotId(String robotId) {
        this.robotId = robotId;
    }

    public RealtimeConnectionStatus getStatus() {
        return status;
    }

    public void setStatus(RealtimeConnectionStatus status) {
        this.status = status;
    }

    public String getRobotInfo() {
        return robotInfo;
    }

    public void setRobotInfo(String robotInfo) {
        this.robotInfo = robotInfo;
    }

    public Set<String> getSubscribedTopics() {
        return subscribedTopics;
    }

    public void setSubscribedTopics(Set<String> subscribedTopics) {
        this.subscribedTopics = subscribedTopics;
    }
}
