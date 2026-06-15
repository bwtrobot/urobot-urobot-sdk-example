package com.bwton.urobot.interfaces.request;

import java.util.ArrayList;
import java.util.List;

public class RealtimeControlMessage {
    private String action;
    private String topic;
    private List<String> topics = new ArrayList<>();
    private Boolean binary;
    private Long throttleRate;

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public List<String> getTopics() {
        return topics;
    }

    public void setTopics(List<String> topics) {
        this.topics = topics;
    }

    public Boolean getBinary() {
        return binary;
    }

    public void setBinary(Boolean binary) {
        this.binary = binary;
    }

    public Long getThrottleRate() {
        return throttleRate;
    }

    public void setThrottleRate(Long throttleRate) {
        this.throttleRate = throttleRate;
    }
}
