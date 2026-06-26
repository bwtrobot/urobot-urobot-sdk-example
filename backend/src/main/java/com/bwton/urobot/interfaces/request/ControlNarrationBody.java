package com.bwton.urobot.interfaces.request;

import com.fasterxml.jackson.annotation.JsonAlias;

public class ControlNarrationBody {
    @JsonAlias("editionId")
    private String editionId;
    @JsonAlias("processId")
    private String processId;
    @JsonAlias("processName")
    private String processName;
    private String command;
    @JsonAlias("operationSource")
    private String operationSource;
    @JsonAlias("nodeId")
    private String nodeId;
    @JsonAlias("nodeName")
    private String nodeName;

    public String getEditionId() {
        return editionId;
    }

    public void setEditionId(String editionId) {
        this.editionId = editionId;
    }

    public String getProcessId() {
        return processId;
    }

    public void setProcessId(String processId) {
        this.processId = processId;
    }

    public String getProcessName() {
        return processName;
    }

    public void setProcessName(String processName) {
        this.processName = processName;
    }

    public String getCommand() {
        return command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public String getOperationSource() {
        return operationSource;
    }

    public void setOperationSource(String operationSource) {
        this.operationSource = operationSource;
    }

    public String getNodeId() {
        return nodeId;
    }

    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public String getNodeName() {
        return nodeName;
    }

    public void setNodeName(String nodeName) {
        this.nodeName = nodeName;
    }

    @Override
    public String toString() {
        return "ControlNarrationBody{" +
                "editionId='" + editionId + '\'' +
                ", processId='" + processId + '\'' +
                ", processName='" + processName + '\'' +
                ", command='" + command + '\'' +
                ", operationSource='" + operationSource + '\'' +
                ", nodeId='" + nodeId + '\'' +
                ", nodeName='" + nodeName + '\'' +
                '}';
    }
}
