package com.bwton.urobot.interfaces.request;

import java.util.Map;

public class SendCommandBody {
    private Integer type;
    private String messagesType;
    private Map<String, Object> params;
    private String callbackUrl;

    public Integer getType() {
        return type;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public String getMessagesType() {
        return messagesType;
    }

    public void setMessagesType(String messagesType) {
        this.messagesType = messagesType;
    }

    public Map<String, Object> getParams() {
        return params;
    }

    public void setParams(Map<String, Object> params) {
        this.params = params;
    }

    public String getCallbackUrl() {
        return callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }
}
