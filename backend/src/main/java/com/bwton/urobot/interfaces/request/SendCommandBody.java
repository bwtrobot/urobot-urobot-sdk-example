package com.bwton.urobot.interfaces.request;

public class SendCommandBody {
    private Integer type;
    private String messagesType;
    private Object params;
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

    public Object getParams() {
        return params;
    }

    public void setParams(Object params) {
        this.params = params;
    }

    public String getCallbackUrl() {
        return callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }
}
